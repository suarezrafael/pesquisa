# missao-aprender-accounts

Worker de contas/pagamento pra fase comercial do jogo (assinatura → cosméticos exclusivos). Ver o
plano completo em [`../../docs/plano-comercial-backend.md`](../../docs/plano-comercial-backend.md)
antes de mexer aqui — este README documenta só o que já existe (Fase A), não o desenho inteiro.

**URL em produção**: `https://missao-aprender-accounts.rafaelvs.workers.dev`
**Status**: Fases A-D concluídas — login/cadastro (direto no Neon Auth, Fase B), Stripe
Checkout/webhook/status de assinatura (Fase C), pareamento do entitlement com o jogo (Fase D),
Customer Portal do Stripe pra autoatendimento de cobrança (lab-83). Cosmético de verdade gateado
por esse entitlement (parte da Fase E) já existe do lado do jogo — ver
`docs/plano-comercial-backend.md` e `labs/lab-82-.../CONTEXT.md`. Fase F em andamento: relatório
semanal de progresso por e-mail (lab-119, ver nota de privacidade abaixo).

## Rotas

| Rota | Método | Autenticação | Função |
|---|---|---|---|
| `/health` | GET | nenhuma | Resposta estática barata (`{ ok: true }`) — prova só que o Worker está de pé, não consulta o Neon (lab-88: consultar o banco aqui deixava qualquer monitor de disponibilidade normal impedir o compute do Neon de suspender, queimando a cota gratuita) |
| `/checkout` | POST | Bearer JWT (Neon Auth) | Cria a sessão do Stripe Checkout, devolve `{ url }` |
| `/subscription` | GET | Bearer JWT (Neon Auth) | Status da assinatura da família do usuário (`{ status }`) |
| `/billing-portal` | POST | Bearer JWT (Neon Auth) | Cria uma sessão do Stripe Customer Portal, devolve `{ url }` (gerenciar pagamento/cancelar) |
| `/pairing/generate` | POST | Bearer JWT (Neon Auth) | Gera um código de 6 dígitos (`pairing_codes`, expira em 15min) |
| `/pairing/redeem` | POST | nenhuma (chamado pelo jogo, criança sem conta) | Troca o código por um token de entitlement (HMAC, 180 dias) |
| `/entitlement` | GET | Bearer = token de entitlement (**não** o JWT do Neon Auth) | `{ active, expiresAt }` — status real da assinatura da família pareada |
| `/progress-summary` | POST | Bearer = token de entitlement | (lab-119, Fase F) Grava um resumo MÍNIMO de progresso (nível/XP/moedas/missões/emblemas — nunca conteúdo bruto) em `progress_snapshots`, sobrescrevendo o anterior — alimenta o relatório semanal por e-mail |
| `/webhooks/stripe` | POST | assinatura HMAC do Stripe | Atualiza `subscriptions` a partir dos eventos do Stripe |

**Nota de privacidade (lab-119)**: até este laboratório, nenhuma tabela deste Worker guardava
progresso da criança — só o `localStorage` dela. `/progress-summary` muda isso conscientemente
(decisão registrada em `labs/lab-119-.../FEATURES.md`), mas com um limite duplo: só um RESUMO de
5 números (nunca resposta de quest/apelido/avatar/horário de atividade) e só enquanto a família
tiver entitlement ativo — sem assinatura, o jogo nunca chama este endpoint.

A lógica de negócio pura (quais status do Stripe contam como entitlement ativo, regras do código
de pareamento) mora em `src/domain.ts`, sem import de `neon`/`Stripe`/`jose` — é o que permite
`npm run test` (Vitest) cobrir essas regras sem mockar banco/rede. Rode os testes antes de mexer
em qualquer coisa relacionada a entitlement/assinatura.

O JWT do responsável é obtido pelo front-end via
`fetch('<VITE_NEON_AUTH_URL>/token', { credentials: 'include' })` — **não** via
`authClient.token()` do SDK `@neondatabase/auth`, que se mostrou não confiável nesta versão (bug
real encontrado e documentado em `labs/lab-80-.../CONTEXT.md`: retornava dados de sessão em vez
de um JWT). O Worker verifica esse JWT contra o JWKS do Neon Auth (`jose`), sem segredo
compartilhado entre os dois serviços.

O token de entitlement (Fase D) é um tipo DIFERENTE de token — assinado pelo próprio Worker
(HMAC/HS256, `ENTITLEMENT_SECRET`), emitido só pra quem resgata um código de pareamento válido.
Não tem nenhuma relação com o Neon Auth: a criança nunca tem conta lá.

## O que existe agora (Fase A)

- **Projeto Neon** `missao-aprender` (id `plain-waterfall-72629169`), região **AWS South America
  East 1 (São Paulo)** — escolhida de propósito pela proximidade do público-alvo brasileiro.
- **Neon Auth** (Managed Better Auth) habilitado no projeto — schema `neon_auth` com as tabelas
  `user`/`session`/`account`/`organization`/etc., prontas pra guardar login do RESPONSÁVEL (nunca
  da criança — ver princípio de design no plano). Nenhuma UI de login existe ainda (Fase B).
- **Schema próprio, migração versionada** (`migrations/*.sql`, aplicado via `npm run migrate`):
  `family_accounts`, `subscriptions`, `pairing_codes`, `entitlement_tokens`, `product_events`, entre
  outras — ver os arquivos em `migrations/` pra estrutura exata e comentários. `migrate.mjs` aplica
  só os arquivos ainda não registrados em `schema_migrations` (uma linha por arquivo já aplicado),
  cada um dentro de uma transação. Pra uma mudança de schema nova, crie
  `migrations/000N_descricao.sql` (idempotente — `if not exists` sempre que possível) em vez de
  editar um arquivo já aplicado em produção.
- **Worker de health-check** (`src/index.ts`): `GET /health` devolve `{ ok: true }` sem tocar o
  Neon (lab-88 — ver tabela de rotas acima pro motivo). A conectividade Worker → Neon é validada
  organicamente pelas rotas de verdade (`/subscription`, `/entitlement`, etc.), que já rodam
  queries reais e são autenticadas/rate-limitadas.

## Segredos (nunca comitados)

- `DATABASE_URL` (connection string do Neon) — local: `app/server-accounts/.dev.vars`
  (gitignored); produção: `wrangler secret put DATABASE_URL` (já configurado no Worker deployado).
- `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` (modo teste, Fase C) — mesmo esquema:
  `.dev.vars` local, `wrangler secret put <NOME>` em produção (já configurados).
- `STRIPE_PRICE_ID` **não** é secreto — é uma var comum em `[vars]` no `wrangler.toml` (só um
  identificador público do catálogo de produtos do Stripe).
- `ENTITLEMENT_SECRET` (Fase D) — segredo próprio do Worker pra assinar/verificar o token de
  entitlement do jogo (HMAC/HS256), sem relação com o Neon Auth. Mesmo esquema: `.dev.vars`
  local, `wrangler secret put ENTITLEMENT_SECRET` em produção (já configurado).
- `RESEND_API_KEY` (lab-119, Fase F) — chave da API do Resend, usada só por
  `sendWeeklyProgressEmails` (chamado pelo Cron semanal). Mesmo esquema: `.dev.vars` local,
  `wrangler secret put RESEND_API_KEY` em produção. **Ainda NÃO configurado** (nem local nem em
  produção) — o resto do recurso (endpoint `/progress-summary`, tabela `progress_snapshots`,
  Cron Trigger) já está deployado e funciona; só o envio de verdade do e-mail semanal depende de
  uma conta Resend do usuário. Até lá, o Cron semanal roda e loga a falha
  (`[weekly-email] erro de rede...`) sem quebrar nada, sem impacto no restante do Worker.
- Existe também uma **API key pessoal do Neon** (`missao-aprender-agent`, visível em
  Account Settings → API keys no console do Neon) usada só nesta sessão pra criar o projeto/rodar
  migrações via `neonctl`/scripts locais — não fica em nenhum arquivo do repositório. Se for
  revogada, qualquer script administrativo (`migrate.mjs`, `inspect.mjs`) vai precisar de uma nova
  via `NEON_API_KEY` no ambiente.

## Rodando localmente

```bash
cd app/server-accounts
npm install
npm run migrate   # aplica as migrações pendentes de migrations/ contra o Neon (lê DATABASE_URL de .dev.vars)
npm run dev       # wrangler dev — simulador local
```

## Publicando

```bash
cd app/server-accounts
npm install
npx wrangler secret put DATABASE_URL   # só na primeira vez, ou se a connection string mudar
npm run deploy
```

## Próximas fases (ver o plano)

Fase E (cosmético gateado de verdade, consultando `entitlement.active` no front-end) concluída.
Fase F em andamento: relatório semanal por e-mail construído neste laboratório, falta
`RESEND_API_KEY` (ver "Segredos" acima) e migrar a hospedagem do front-end pro Cloudflare Pages
(o Vercel Hobby proíbe uso comercial — Cloudflare Pages paralelo já existe, ver
`labs/lab-109-.../CONTEXT.md`, falta o corte de DNS de verdade).
