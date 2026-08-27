# Laboratório 101 — CI e migração versionada (G10)

Status: em andamento
Início: 2026-08-26
Fim: -
Commit inicial: dc7b2f42437e78be5f39e0c17883f9048eb7ec20

## Objetivo do laboratório
G10 (`docs/prompts/05-escala-e-viabilidade.md` §"ordem de ataque", item 7 — próximo depois de G7/
G11 terem sido concluídos nos labs 96-100): "Não existe `.github/` na branch. Os testes só rodam se
alguém lembrar. Deploy é `vercel --prod`/`wrangler deploy` na mão, do laptop, direto em produção,
sem staging, sem smoke test, sem rollback documentado, sem migração versionada." Escolhido pelo
usuário logo após o lab-100, entre G10/reconciliação Stripe/NPS/bug de morros invisíveis.

Este laboratório ataca as DUAS partes mais contidas e de maior valor imediato: **testes automáticos
a cada push** e **histórico real de migração de schema**. "Ambiente de staging separado" e "rollback
documentado" ficam de fora de propósito (ver "Fora de escopo") — são mudanças de infraestrutura bem
maiores (uma segunda branch/DB do Neon, um segundo Worker/projeto Vercel) que merecem laboratório
próprio se/quando o volume de uso justificar o custo extra.

## Investigado antes de planejar
- **Nenhum `.github/` existe** (confirmado, `ls .github` falha) — zero automação hoje.
- **Três packages independentes, sem workspace de monorepo** (`app/`, `app/server-accounts/`,
  `app/server-cf-relay/`, cada um com seu próprio `package.json`/`node_modules`, nenhum
  `package.json` raiz) — o workflow de CI precisa rodar `npm ci` três vezes, uma por pasta.
- **Contagem de teste atual**: `app/` 39 testes (`npm run test`), `app/server-accounts/` 36 testes,
  `app/server-cf-relay/` 13 testes — nenhum rodando automaticamente hoje, todos passando na última
  verificação manual (lab-100).
- **`app/.env`/`app/.env.production`** já estão versionados no git (confirmado via `git ls-files`)
  e só contêm URLs públicas (`VITE_ACCOUNTS_API_URL`, `VITE_NEON_AUTH_URL`, `VITE_RELAY_URL`),
  nenhum segredo — `npm run build` (que inclui `tsc -b` + `vite build`) roda em CI sem precisar de
  nenhum secret novo no GitHub.
- **`app/server-accounts/schema.sql`** (126 linhas) já é escrito de forma idempotente (`if not
  exists`/`if not exists` em tudo, um `alter ... drop constraint if exists` + `add constraint`
  pro único caso não-idempotente por natureza) — reaplicado inteiro a cada `npm run migrate`, sem
  nenhum registro de QUANDO cada parte foi aplicada nem chance de aplicar só o que é novo. É
  exatamente o "sem migração versionada" que G10 aponta.
- **`app/server-cf-relay/`** não tem schema Postgres nenhum (usa `state.storage` do Durable
  Object) — migração versionada não se aplica a esse Worker.

## Funcionalidades planejadas
- [ ] **`.github/workflows/ci.yml`** (novo): dispara em `push` (qualquer branch) e `pull_request`.
  Três jobs paralelos, um por package (`app`, `app/server-accounts`, `app/server-cf-relay`), cada
  um: checkout, `actions/setup-node` (mesma versão do Node do ambiente de dev, `22.x`), `npm ci`
  (`working-directory` do package), typecheck (`npx tsc -b` no `app/`, `npx tsc --noEmit` nos
  Workers) + `npm run test`. `app/` também roda `npm run build` (mais próximo do que
  `vercel --prod` realmente faz).
- [ ] **`app/server-accounts/migrations/`** (novo diretório): `schema.sql` atual vira
  `migrations/0001_baseline.sql` (`git mv`, preserva a idempotência que já tinha — segue seguro de
  rodar contra o banco de produção já existente, onde vira só um no-op que fica registrado).
- [ ] **`app/server-accounts/migrate.mjs`** reescrito: cria (`if not exists`) uma tabela própria
  `schema_migrations` (`filename` chave primária, `applied_at`); lê todo `*.sql` de `migrations/`
  em ordem alfabética; aplica só os que ainda não estão em `schema_migrations`, cada um dentro de
  uma transação (Postgres suporta DDL transacional — se um arquivo falhar no meio, reverte
  inteiro); registra cada aplicação. Loga quantas migrações novas foram aplicadas (ou "nenhuma
  pendente").
- [ ] **`app/server-accounts/README.md`**: atualizar a seção "O que existe agora"/"Rodando
  localmente" pra descrever `migrations/` + `schema_migrations` em vez de `schema.sql` sozinho, e
  documentar a convenção pra próximas mudanças de schema (`migrations/000N_descricao.sql`).
- [ ] Rodar `npm run migrate` contra o Neon de produção pra confirmar que a migração 0001
  (idempotente) é aplicada sem erro E fica registrada em `schema_migrations` — o banco já tem tudo
  que ela cria, então isso só "bootstrapa" o histórico de versão sem mudar dado nenhum.
- [ ] Confirmar que o workflow de CI roda de verdade ao dar `git push` (ver os 3 jobs passando no
  GitHub Actions da branch).

## Fora de escopo (explicitamente adiado)
- **Ambiente de staging separado** (segunda branch/DB do Neon, segundo Worker/projeto Vercel) —
  mudança de infraestrutura bem maior, merece laboratório próprio se o volume de uso justificar.
- **Rollback documentado/automatizado** — depende de existir staging primeiro pra ter onde testar
  o rollback antes de produção; sem isso, "documentar rollback" seria só teoria não verificada.
- **Deploy automático a partir do CI** (hoje é manual, `vercel --prod`/`wrangler deploy` do
  laptop) — testes automáticos primeiro; automatizar o DEPLOY em cima disso é o próximo passo
  natural, mas maior escopo (precisa de secrets do Vercel/Cloudflare no GitHub Actions).
- **Reescrever a HISTÓRIA de migrações passadas** (uma migração por lab, 96/97/99/100) — não
  reconstruído; o baseline (`0001`) captura o estado atual completo de uma vez, migrações NOVAS
  daqui pra frente é que ganham arquivo próprio. Reescrever o passado não traria benefício
  funcional, só trabalho de arqueologia.
