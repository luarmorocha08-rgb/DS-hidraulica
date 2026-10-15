# Configuração e deploy

## 1. Requisitos

- Node.js 22+
- PostgreSQL 15+ (Neon, Supabase ou próprio)

## 2. Banco de dados

1. Crie o banco (Neon: novo projeto → copie a *connection string* com
   `?sslmode=require`; Supabase: Project Settings → Database → *URI*).
2. Configure `DATABASE_URL` no `.env` (local) e no provedor de hospedagem.
3. Aplique as migrations e os dados iniciais:

```bash
npm run db:migrate   # cria as tabelas (src/db/migrations)
npm run db:seed      # horários padrão, tipos de atendimento e serviços sugeridos
```

Alterações futuras no schema: edite `src/db/schema.ts`, rode
`npm run db:generate -- --name descricao` e versione o SQL gerado.

## 3. Primeiro acesso ao painel

```bash
npm run admin:create -- --email voce@empresa.com.br --name "Seu Nome" --role owner
```

Acesse `/admin`, depois siga o **checklist de lançamento** do painel
(WhatsApp, endereço, revisão dos serviços, fotos, área de atendimento…).

## 4. Variáveis de ambiente

Veja `.env.example`. Obrigatórias em produção: `DATABASE_URL`, `AUTH_SECRET`
(≥ 32 caracteres aleatórios), `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET`.

## 5. Anexos de clientes (fotos/vídeos)

- `STORAGE_DRIVER=local` grava em `STORAGE_DIR` — para **VPS/servidor próprio,
  Railway ou Render com disco persistente**.
- `STORAGE_DRIVER=vercel-blob` usa uma **Blob store privada da Vercel**
  (conectada ao projeto; a Vercel injeta `BLOB_READ_WRITE_TOKEN`). É o que a
  publicação atual usa.
- `STORAGE_DRIVER=s3` usa qualquer armazenamento compatível com S3
  (**Supabase Storage, Cloudflare R2, AWS S3**) — **obrigatório na Vercel**,
  onde o disco é temporário. Crie um bucket **privado** e preencha as
  variáveis `S3_*` do `.env.example`. Os anexos dos clientes só são entregues
  pelo painel (`/api/files`) e as imagens do site por `/api/media`.

## 6. Hospedagem

**VPS / Docker / Railway / Render**

```bash
npm ci
npm run build
npm run db:migrate
npm start            # porta 3000 (use um proxy reverso com HTTPS)
```

**Vercel** — conecte o repositório, configure as variáveis, rode
`npm run db:migrate` apontando para o banco de produção e use um driver de
armazenamento externo (item 5).

## 7. Lembretes e reenvio de notificações

Agende uma chamada **a cada hora**:

```
GET https://seusite.com.br/api/cron/reminders
Authorization: Bearer <CRON_SECRET>
```

(Vercel Cron, GitHub Actions, `cron` do servidor ou serviço como cron-job.org.)
Envia lembretes ~24h antes dos atendimentos confirmados e reenvia falhas.

## 8. Integrações

| Integração | Como ativar | Sem configuração |
| --- | --- | --- |
| E-mail (Resend) | `RESEND_API_KEY`, `EMAIL_FROM` (domínio verificado), `ADMIN_NOTIFY_EMAIL` | Notificação registrada como "não enviada" |
| WhatsApp Business Platform (Cloud API) | `WHATSAPP_CLOUD_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, templates aprovados (`WHATSAPP_TEMPLATE_*`) | Idem; o botão "clique para conversar" (wa.me) funciona só com o número no painel |
| Busca de CEP | ViaCEP (público, no navegador) | Cliente preenche manualmente |
| Mapa | OpenStreetMap (pré-visualização) e links do Google Maps | — |
| Google Analytics / Search Console | Adicionar após a definição do domínio; atualizar a política de privacidade | — |
| Google Calendar | Planejado; a agenda é a fonte da verdade no banco | — |

Templates de WhatsApp sugeridos (corpo com variáveis):

- `WHATSAPP_TEMPLATE_STATUS`: "Olá, {{1}}! Sua solicitação {{2}} na DS Hidráulica está: {{3}}."
- `WHATSAPP_TEMPLATE_REMINDER`: "Olá, {{1}}! Lembrete do seu atendimento na DS Hidráulica: {{2}}. Protocolo {{3}}."
- `WHATSAPP_TEMPLATE_ADMIN_ALERT`: "Nova {{1}} pelo site. Protocolo {{2}} — {{3}}."

## 9. Antes de divulgar

- [ ] `npm test` (com `TEST_DATABASE_URL` para o teste de concorrência)
- [ ] Checklist de lançamento do painel completo
- [ ] Política de privacidade e termos revisados
- [ ] Cidade/região informadas para SEO local; site enviado ao Search Console
- [ ] Backups automáticos do banco ativados no provedor
