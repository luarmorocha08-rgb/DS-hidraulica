# DS Hidráulica — site e sistema de atendimento

Site institucional com experiência 3D, agendamento online com disponibilidade
real, solicitação de visita técnica, orçamento, acompanhamento por protocolo e
painel administrativo para a **DS Hidráulica** (direção hidráulica para
caminhões, ônibus e veículos pesados).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 ·
Three.js + React Three Fiber + Drei · GSAP ScrollTrigger · PostgreSQL +
Drizzle ORM · Zod · jose/bcrypt.

## Rodando localmente

```bash
cp .env.example .env          # preencha DATABASE_URL e AUTH_SECRET
npm install
npm run db:setup              # migrations + dados iniciais
npm run admin:create -- --email voce@exemplo.com --name "Seu Nome"
npm run dev                   # http://localhost:3000  ·  painel em /admin
```

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` / `build` / `start` | Desenvolvimento, build e produção |
| `npm test` | Testes (unitários + concorrência no PostgreSQL se `TEST_DATABASE_URL` existir) |
| `npm run lint` / `typecheck` | Qualidade de código |
| `npm run db:generate` / `db:migrate` / `db:seed` | Banco de dados |
| `npm run admin:create` | Cria/redefine administrador |
| `npm run hero:render` | Regenera pôsteres e sequência da intro 3D |

## Documentação

- [Arquitetura e decisões técnicas](docs/ARQUITETURA.md)
- [Experiência 3D e convenção dos modelos GLB](docs/MODELOS-3D.md)
- [Configuração, integrações e deploy](docs/DEPLOY.md)

## Estrutura

```
src/
  app/(site)/        páginas públicas (início, agendamento, visita, orçamento, acompanhar, serviços)
  app/admin/         painel (login + rotas protegidas)
  app/api/           disponibilidade, anexos, mídia, lembretes
  components/three/  cena 3D, roteiro do scroll, níveis de qualidade
  components/…       site, formulários, agendamento, painel
  db/                schema, migrations, dados iniciais
  lib/               regras de negócio (agenda, reservas, auth, notificações, storage…)
tests/               Vitest
```

## Situação

Funcional de ponta a ponta em ambiente local. **Não está pronto para
produção** até: dados reais da empresa no painel, revisão dos serviços e
textos legais, driver de armazenamento persistente para o host escolhido,
integrações de e-mail/WhatsApp configuradas e modelo 3D profissional do
caminhão (opcional). Veja o checklist em `docs/DEPLOY.md`.
