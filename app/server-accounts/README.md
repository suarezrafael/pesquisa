# missao-aprender-accounts

Worker de contas/pagamento pra fase comercial do jogo (assinatura → cosméticos exclusivos). Ver o
plano completo em [`../../docs/plano-comercial-backend.md`](../../docs/plano-comercial-backend.md)
antes de mexer aqui — este README documenta só o que já existe (Fase A), não o desenho inteiro.

**URL em produção**: `https://missao-aprender-accounts.rafaelvs.workers.dev`
**Status**: Fase A (fundação) concluída — só existe um health-check. Nenhuma rota de
autenticação/pagamento/pareamento real ainda (Fases B-D).

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

Fase B (portal `/familia` só leitura + parental gate), Fase C (Stripe Checkout + webhook), Fase D
(pareamento com o jogo), Fase E (cosmético gateado de verdade), Fase F (lançamento comercial —
inclui migrar a hospedagem do front-end pro Cloudflare Pages, porque o Vercel Hobby proíbe uso
comercial).
