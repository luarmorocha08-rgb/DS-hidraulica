# DS Hidráulica — Arquitetura do projeto

Este documento descreve a arquitetura, as decisões técnicas e o plano de
implementação do site da DS Hidráulica. Ele acompanha o código e deve ser
atualizado quando uma decisão mudar.

## 1. Visão geral

```
┌────────────────────────────── Navegador ──────────────────────────────┐
│  Site público (Next.js App Router, React 19)                           │
│   • Hero 3D (Three.js + React Three Fiber + GSAP ScrollTrigger)        │
│   • Seções institucionais, serviços, diagnóstico, galeria, depoimentos │
│   • Fluxos: agendamento, visita ao local, orçamento, acompanhamento    │
│  Painel /admin (mesma aplicação, rotas protegidas)                     │
└──────────────┬───────────────────────────────────────┬────────────────┘
               │ Server Actions / Route Handlers        │ arquivos (anexos)
┌──────────────▼───────────────────────────────────────▼────────────────┐
│  Servidor Next.js (Node.js)                                            │
│   src/lib/availability.ts  → cálculo de horários (função pura)         │
│   src/lib/booking.ts       → reserva transacional (lock por dia)       │
│   src/lib/auth/*           → sessão JWT + bcrypt + papéis              │
│   src/lib/notifications/*  → e-mail / WhatsApp (somente se configurado)│
│   src/lib/storage/*        → anexos (disco local; trocar por S3/R2)    │
│   src/lib/rate-limit.ts    → limite de requisições no PostgreSQL       │
└──────────────┬────────────────────────────────────────────────────────┘
               │ Drizzle ORM (node-postgres)
┌──────────────▼──────────────┐
│ PostgreSQL (Neon/Supabase)  │
└─────────────────────────────┘
```

Uma única aplicação Next.js atende o site, o painel e a API. Isso mantém o
deploy simples (Vercel, Railway, Render ou VPS) e permite que o site público e
o painel compartilhem validações, tipos e regras de negócio.

## 2. Decisões técnicas

| Tema | Decisão | Motivo |
| --- | --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript | Rotas, Server Actions, SEO e streaming no mesmo projeto. |
| Renderização | `cacheComponents` desativado; páginas com dados do banco são dinâmicas | O banco não existe no momento do build e o conteúdo editado no painel precisa aparecer na hora. O volume de acessos de uma oficina não exige cache agressivo. |
| Estilo | Tailwind CSS v4 com tokens da marca em `globals.css` | Paleta e tipografia centralizadas. |
| Fontes | `@fontsource` (Russo One, Rajdhani, Montserrat, Barlow Condensed) | Auto-hospedadas, sem depender do Google Fonts no build. |
| Animações | GSAP + ScrollTrigger (scroll), Motion (microinterações) | ScrollTrigger sincroniza câmera e textos com o scroll; Motion cuida de transições de componentes. |
| 3D | Three.js + React Three Fiber + Drei | Cena declarativa, carregamento de GLB/GLTF, PBR. |
| Banco | PostgreSQL + Drizzle ORM + drizzle-kit (migrations SQL versionadas) | Driver puro em JS (funciona em qualquer host), SQL explícito para locks e transações. |
| Validação | Zod no servidor (e reaproveitada no cliente) | Uma só fonte de verdade para regras de formulário. |
| Autenticação | E-mail + senha (bcrypt), sessão JWT assinada (jose) em cookie httpOnly, com `sessionVersion` no banco para revogar | Sem dependência externa; papéis `owner`, `admin`, `staff`. |
| Concorrência de reservas | `pg_advisory_xact_lock` por dia + recálculo da disponibilidade dentro da transação | Suporta capacidade > 1 (vários atendimentos simultâneos), o que uma restrição `UNIQUE` não resolve. |
| Rate limit | Tabela `rate_limits` no PostgreSQL | Funciona em serverless (várias instâncias) sem Redis. |
| Anexos | Interface `StorageDriver`; driver local grava fora de `public/` | Arquivos de clientes nunca ficam públicos; só o painel lê. Trocar por S3/R2 em produção serverless. |
| Notificações | Fila na tabela `notifications`; drivers Resend (e-mail) e WhatsApp Cloud API | Se a integração não estiver configurada, a notificação fica registrada como `skipped` — nada é simulado. |
| Fuso horário | `America/Sao_Paulo` configurável; horários gravados em UTC (`timestamptz`) | Evita erro de horário entre servidor e cliente. |

## 3. Modelo de dados

Tabelas (ver `src/db/schema.ts`):

- **admins** — usuários do painel, papel, senha (hash), `session_version`.
- **customers** — clientes, identificados pelo telefone normalizado.
- **vehicles** — veículos de cada cliente (tipo, marca, modelo, ano).
- **services** — catálogo exibido no site (editável no painel; flag `reviewed`).
- **booking_types** — tipos de atendimento agendável e sua duração.
- **business_hours** — dias e horários de funcionamento (com intervalo).
- **schedule_settings** — intervalo entre horários, folga entre atendimentos,
  capacidade simultânea, antecedência mínima, janela máxima, confirmação automática.
- **holidays** / **schedule_blocks** — feriados, férias e bloqueios.
- **appointments** — agendamentos (oficina ou no local) com protocolo e status.
- **visit_requests** — solicitações de visita técnica com endereço e cobertura.
- **quote_requests** — pedidos de orçamento.
- **attachments** — fotos/vídeos anexados a qualquer solicitação.
- **request_events** — histórico de mudanças de status (cliente, admin, sistema).
- **gallery_items**, **testimonials**, **timeline_entries** — conteúdo do site.
- **site_settings** — dados da empresa (WhatsApp, endereço, textos, cobertura…).
- **notifications** — fila/registro de e-mails e WhatsApp.
- **audit_logs** — log de alterações administrativas.
- **rate_limits** — contadores por IP/ação.

## 4. Regras de agendamento

1. Os horários disponíveis são calculados a partir de `business_hours`,
   descontando intervalo de almoço, feriados, bloqueios, antecedência mínima e
   agendamentos `pending`/`confirmed` que se sobrepõem (incluindo a folga).
2. Um horário só é oferecido se cabe inteiro dentro do expediente e se o número
   de atendimentos sobrepostos é menor que a capacidade.
3. Ao reservar, o servidor abre uma transação, adquire um lock do dia
   (`pg_advisory_xact_lock`), recalcula a disponibilidade e só então grava.
   Duas pessoas clicando no mesmo horário: a segunda recebe "horário acabou de
   ser reservado" e vê a lista atualizada.
4. Status do agendamento: `pending` (aguardando confirmação da oficina),
   `confirmed`, `rejected`, `cancelled`, `completed`, `no_show`. O site nunca
   mostra "confirmado" para uma solicitação pendente. Atendimento no local é
   sempre `pending` (depende de análise de endereço e deslocamento).
5. Reagendamento e cancelamento pelo cliente: na página **Acompanhar**, com o
   protocolo + telefone usado no pedido, respeitando a antecedência mínima.

## 5. Experiência 3D

Ver `docs/MODELOS-3D.md`. Resumo:

- O hero é uma seção alta com um `<Canvas>` fixo (sticky). O progresso do
  scroll (0 → 1) é calculado pelo ScrollTrigger e alimenta câmera, cabine,
  iluminação, vista explodida e textos.
- **Caminhão:** carregado de `NEXT_PUBLIC_HERO_TRUCK_MODEL` (GLB). Sem modelo
  profissional, a etapa do caminhão **não é inventada**: a narrativa começa no
  ambiente industrial com a caixa de direção.
- **Caixa de direção:** usa `NEXT_PUBLIC_HERO_GEAR_MODEL` se existir; caso
  contrário, um modelo paramétrico de caixa de direção hidráulica integral de
  esferas recirculantes (carcaça, tampa lateral, tampa traseira, eixo de
  entrada com válvula rotativa, sem-fim, pistão-porca com cremalheira, setor,
  braço Pitman e vedações), desmontado ao longo dos eixos reais de montagem.
- **Níveis de qualidade:** `high` (cena completa, sombras, DPR até 2),
  `medium` (DPR 1, sem sombras), `low`/`prefers-reduced-motion`
  (sequência de imagens pré-renderizadas ou pôster estático).

## 6. Segurança e LGPD

- Validação Zod em todas as entradas no servidor; nunca confiar no cliente.
- Senhas com bcrypt (custo 12); cookie `httpOnly`, `secure`, `sameSite=lax`.
- Proxy (`src/proxy.ts`) faz a checagem otimista do cookie; cada página e
  ação do painel valida a sessão no banco e o papel exigido.
- Rate limit em login, envio de formulários e consulta de protocolo.
- Anexos: tipo MIME verificado pela assinatura do arquivo, tamanho máximo,
  nome aleatório, armazenados fora da pasta pública, servidos só ao painel.
- Consentimento explícito nos formulários, página de privacidade, finalidade
  declarada, exclusão/anonimização de cliente pelo painel.
- `audit_logs` registra quem alterou o quê.

## 7. Plano de implementação (fases)

| Fase | Entrega |
| --- | --- |
| 1 — Estrutura | Next.js, identidade visual, componentes base, rotas, layout responsivo, schema e migrations. |
| 2 — Site institucional | Menu, sobre, serviços, como funciona, diagnóstico, galeria, depoimentos, contato, rodapé. |
| 3 — Agendamento | Cálculo de disponibilidade, calendário, reserva transacional, confirmação, acompanhamento, reagendamento e cancelamento. |
| 4 — Visitas e orçamentos | Formulários completos, anexos, cobertura, status e notificações. |
| 5 — Painel administrativo | Login, dashboard, agenda, solicitações, clientes, conteúdo, configurações, usuários, auditoria. |
| 6 — Experiência 3D | Hero com caixa de direção explodida, suporte a GLB do caminhão, níveis de qualidade. |
| 7 — Refinamento | Animações de scroll, microinterações, SEO, dados estruturados. |
| 8 — Testes | Unitários (disponibilidade, cobertura, validação) e integração (reservas simultâneas no PostgreSQL). |
| 9 — Produção | `.env.example`, migrations, documentação de deploy. |

## 8. O que depende da DS Hidráulica

O sistema está pronto para receber, mas **não inventa**:

- Número de WhatsApp, telefone, e-mail, endereço e cidade de atendimento.
- Lista final de serviços (os 10 serviços são sugestões e ficam marcados como
  "não revisados" no painel até a confirmação).
- Fotografias reais (oficina, equipe, trabalhos) — imagens de demonstração são
  identificadas como tal.
- Depoimentos reais (a seção fica oculta enquanto não houver nenhum publicado).
- Linha do tempo da empresa.
- Modelos 3D profissionais do caminhão (e, se desejado, da caixa de direção).
- Valores de deslocamento e área de cobertura.
- Credenciais de e-mail transacional e WhatsApp Business Platform.

O painel mostra um **checklist de lançamento** com cada um desses itens.
