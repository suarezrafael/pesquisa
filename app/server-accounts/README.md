# missao-aprender-accounts

Worker de contas/pagamento pra fase comercial do jogo (assinatura → cosméticos exclusivos). Ver o
plano completo em [`../../docs/plano-comercial-backend.md`](../../docs/plano-comercial-backend.md)
antes de mexer aqui — este README documenta só o que já existe (Fase A), não o desenho inteiro.

**URL em produção**: `https://missao-aprender-accounts.rafaelvs.workers.dev`
**Status**: Fases A-C concluídas — login/cadastro (direto no Neon Auth, Fase B) + Stripe
Checkout/webhook/status de assinatura (Fase C). Pareamento com o jogo (Fase D) ainda não existe.

## Rotas (Fase C)

| Rota | Método | Autenticação | Função |
|---|---|---|---|
| `/health` | GET | nenhuma | Prova que o Worker fala com o Neon (`{ ok, familyCount }`) |
| `/checkout` | POST | Bearer JWT (Neon Auth) | Cria a sessão do Stripe Checkout, devolve `{ url }` |
| `/subscription` | GET | Bearer JWT (Neon Auth) | Status da assinatura da família do usuário (`{ status }`) |
| `/webhooks/stripe` | POST | assinatura HMAC do Stripe | Atualiza `subscriptions` a partir dos eventos do Stripe |

O JWT é obtido pelo front-end via `fetch('<VITE_NEON_AUTH_URL>/token', { credentials: 'include' })`
— **não** via `authClient.token()` do SDK `@neondatabase/auth`, que se mostrou não confiável
nesta versão (bug real encontrado e documentado em `labs/lab-80-.../CONTEXT.md`: retornava dados
de sessão em vez de um JWT). O Worker verifica esse JWT contra o JWKS do Neon Auth (`jose`), sem
segredo compartilhado entre os dois serviços.

## O que existe agora (Fase A)

- **Projeto Neon** `missao-aprender` (id `plain-waterfall-72629169`), região **AWS South America
  East 1 (São Paulo)** — escolhida de propósito pela proximidade do público-alvo brasileiro.
- **Neon Auth** (Managed Better Auth) habilitado no projeto — schema `neon_auth` com as tabelas
  `user`/`session`/`account`/`organization`/etc., prontas pra guardar login do RESPONSÁVEL (nunca
  da criança — ver princípio de design no plano). Nenhuma UI de login existe ainda (Fase B).
- **Schema próprio** (`schema.sql`, aplicado via `npm run migrate`): `family_accounts`,
  `subscriptions`, `pairing_codes` — ver o arquivo pra estrutura exata e comentários.
- **Worker de health-check** (`src/index.ts`): `GET /health` roda uma query real contra o Neon
  via `@neondatabase/serverless` (driver HTTP, feito pra runtime de borda — sem conexão TCP
  persistente) e devolve `{ ok: true, familyCount: N }`. Prova que o caminho Worker → Neon
  funciona de ponta a ponta antes de construir qualquer rota de verdade.

## Segredos (nunca comitados)

- `DATABASE_URL` (connection string do Neon) — local: `app/server-accounts/.dev.vars`
  (gitignored); produção: `wrangler secret put DATABASE_URL` (já configurado no Worker deployado).
- `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` (modo teste, Fase C) — mesmo esquema:
  `.dev.vars` local, `wrangler secret put <NOME>` em produção (já configurados).
- `STRIPE_PRICE_ID` **não** é secreto — é uma var comum em `[vars]` no `wrangler.toml` (só um
  identificador público do catálogo de produtos do Stripe).
- Existe também uma **API key pessoal do Neon** (`missao-aprender-agent`, visível em
  Account Settings → API keys no console do Neon) usada só nesta sessão pra criar o projeto/rodar
  migrações via `neonctl`/scripts locais — não fica em nenhum arquivo do repositório. Se for
  revogada, qualquer script administrativo (`migrate.mjs`, `inspect.mjs`) vai precisar de uma nova
  via `NEON_API_KEY` no ambiente.

## Rodando localmente

```bash
cd app/server-accounts
npm install
npm run migrate   # aplica schema.sql contra o Neon (lê DATABASE_URL de .dev.vars)
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

Fase D (pareamento com o jogo), Fase E (cosmético gateado de verdade), Fase F (lançamento
comercial — inclui migrar a hospedagem do front-end pro Cloudflare Pages, porque o Vercel Hobby
proíbe uso comercial).
