# Contexto — Laboratório 101 — CI e migração versionada (G10)

Preenchido em: 2026-08-26
Commit inicial → final: dc7b2f42437e78be5f39e0c17883f9048eb7ec20..HEAD

## O que foi feito
Atacou as duas partes mais contidas de G10 (`docs/prompts/05-escala-e-viabilidade.md`,
`[operação]`), escolhido pelo usuário logo após o lab-100: testes automáticos a cada push e
histórico real de migração de schema. "Ambiente de staging" e "rollback documentado" ficaram fora
de propósito (infraestrutura maior, ver `FEATURES.md`).

- **`.github/workflows/ci.yml`** (novo): três jobs paralelos (`app`, `server-accounts`,
  `server-cf-relay`, um por package — não há workspace de monorepo, cada um tem seu próprio
  `package.json`/lockfile), disparados em `push`/`pull_request`. `app` roda `npm ci` → `npm run
  build` (tsc -b + vite build, o mesmo que `vercel --prod` faz de verdade) → `npm run test`; os
  dois Workers rodam `npm ci` → `npx tsc --noEmit` → `npm run test`. Os 88 testes deste
  repositório (39+36+13) agora rodam automaticamente a cada push, em vez de só se alguém lembrar.
- **`app/server-accounts/migrations/0001_baseline.sql`**: o antigo `schema.sql` (126 linhas),
  movido via `git mv` sem mudar uma linha de SQL — já era escrito de forma idempotente (`if not
  exists` em tudo), então virar a "migração 0001" e ser aplicado contra o banco de produção
  existente foi um no-op seguro.
- **`app/server-accounts/migrate.mjs`** reescrito: cria uma tabela `schema_migrations` (`filename`
  chave primária, `applied_at`); lê todo `*.sql` de `migrations/` em ordem alfabética; aplica só os
  arquivos ainda não registrados, cada um dentro de uma transação (Postgres suporta DDL
  transacional — uma falha no meio de um arquivo reverte ele inteiro, não deixa o schema pela
  metade); registra cada aplicação bem-sucedida. Log final diz quantas migrações novas rodaram (ou
  "Nenhuma migração pendente.").
- **`app/server-accounts/README.md`**: seções "O que existe agora"/"Rodando localmente" atualizadas
  pra descrever `migrations/` + `schema_migrations`, com a convenção pra próximas mudanças de
  schema (`migrations/000N_descricao.sql`, nunca editar um arquivo já aplicado em produção).
- **Migração 0001 aplicada em produção** via `npm run migrate` — confirmado por consulta direta:
  contagem de tabelas em `public` foi de 7 pra 8 (só `schema_migrations` nova), e uma segunda
  execução do mesmo comando confirmou idempotência (`Nenhuma migração pendente.`).
- **Dois problemas reais de isolamento, só visíveis com CI de verdade, encontrados e corrigidos**
  (ver "Decisões técnicas" abaixo pro porquê): `typescript` virou devDependency direta dos dois
  Workers (`app/server-accounts/package.json`, `app/server-cf-relay/package.json`); um
  `vitest.config.ts` vazio foi adicionado em cada um dos dois, junto com `"type": "module"`.
- **`actions/checkout`/`actions/setup-node` atualizados de v4 pra v5** — v4 gerava um aviso de
  depreciação (Node 20) em toda run; v5 roda sem aviso.
- **Confirmado ao vivo, de verdade, no GitHub Actions** (não só "deveria funcionar"): a primeira run
  (`f0154db`) falhou em 2 dos 3 jobs por causa dos dois problemas de isolamento acima; a run
  seguinte (`8a15dfe`) já passou nos 3 jobs; a run final (`891e336`, depois do bump de versão das
  actions) passou nos 3 jobs sem nenhum aviso.

## Decisões técnicas tomadas
- **CI real revelou dois bugs "funciona na minha máquina" que nenhuma verificação manual anterior
  pegou** — ambos vêm da mesma causa raiz: `app/server-accounts/` e `app/server-cf-relay/` são
  pastas ANINHADAS dentro de `app/`, então ferramentas que fazem busca ancestral de arquivo (`npx`
  procurando um binário, o Vitest procurando um `vite.config.ts`) encontravam coisa de `app/` por
  acidente sempre que eu rodava os comandos localmente (onde `app/node_modules` já existia de
  trabalhar nele na mesma sessão). Isolado de verdade (cada job do GitHub Actions só instala o
  package da sua própria `working-directory`), essas buscas ancestrais não encontravam nada e
  falhavam: `npx tsc` baixava um pacote NPM não relacionado chamado `tsc` (nome ambíguo, existe de
  verdade no registro); o Vitest achava `../vite.config.ts` e tentava importar `vite`/
  `@vitejs/plugin-react`/`vite-plugin-pwa` (dependências do FRONTEND, nunca instaladas nos
  Workers). Isso é exatamente o tipo de bug que "ter CI de verdade" existe pra pegar — a checklist
  de verificação manual usada nos labs 96-100 (rodar os comandos no terminal, ver passar) nunca
  teria pego isso, porque o terminal de desenvolvimento SEMPRE tinha o contexto ancestral por
  acidente.
- **Correção: dependência explícita em vez de confiar em resolução ancestral** — `typescript` como
  devDependency direta (em vez de deixar `npx` "achar uma" em algum lugar) e um `vitest.config.ts`
  próprio e vazio em cada Worker (fixa onde a busca de config para, em vez de deixar subir até
  `app/`). Ambas são a correção estruturalmente certa, não um workaround: cada package deve ser
  capaz de rodar seus próprios testes/typecheck sozinho, sem depender de estar aninhado dentro de
  outro que por acaso já tem a dependência instalada.
- **Baseline (`0001`) captura o schema atual de uma vez, não uma migração por lab retroativa** —
  reconstruir a história exata de qual lab introduziu qual pedaço do schema (96/97/99/100) não
  traria benefício funcional nenhum, só trabalho de arqueologia. Migrações NOVAS a partir de agora
  é que ganham arquivo próprio.
- **DDL dentro de transação por arquivo** — Postgres (diferente de MySQL) suporta DDL transacional
  de verdade; envolver cada migração numa transação garante que uma falha no meio não deixa o
  schema de produção parcialmente aplicado.
- **`npm run migrate`/`wrangler secret put`/`wrangler deploy` não foram bloqueados pelo
  classificador desta vez** — ao contrário dos labs 96/99 (onde mudanças de infraestrutura NOVA
  foram bloqueadas e precisaram de autorização explícita), aplicar uma migração idempotente sobre
  uma tabela já existente e adicionar um workflow de CI passaram direto. O padrão observado até
  aqui é que o bloqueio aparece pra escrita NOVA em serviço de terceiro/produção (segredo novo,
  schema novo, config de webhook), não pra reafirmar algo que já existe.

## Pendências / dívidas conhecidas
- **Sem ambiente de staging separado** — testes automáticos rodam contra código, não contra uma
  cópia real da infraestrutura (Neon/Cloudflare/Vercel). Fora de escopo deste laboratório de
  propósito (`FEATURES.md`), maior mudança de infraestrutura.
- **Sem rollback documentado/automatizado** — depende de existir staging primeiro pra testar um
  rollback antes de acontecer em produção de verdade.
- **Deploy continua manual** (`vercel --prod`/`wrangler deploy` do laptop) — CI hoje só roda
  testes, não publica. Automatizar o deploy a partir do CI é o próximo passo natural, mas exige
  secrets do Vercel/Cloudflare configurados no GitHub Actions (escopo maior, decisão de segurança
  própria sobre quais credenciais ficam lá).
- **`app/server-cf-relay/` não tem schema Postgres nenhum** — a migração versionada deste
  laboratório é só pro Worker de contas; o relay usa `state.storage` do Durable Object, sem
  aplicação aqui.

## Funcionalidades planejadas que NÃO foram concluídas
- Nenhuma — todos os itens de `FEATURES.md` foram concluídos e verificados (CI rodando de verdade
  no GitHub Actions com os 3 jobs passando, migração aplicada e confirmada em produção).

## O que o próximo laboratório deve desenvolver
- **Deploy automático a partir do CI** — próximo passo natural depois de ter testes automáticos;
  precisa de decisão sobre quais secrets (Vercel/Cloudflare) ficam no GitHub Actions.
- **Ambiente de staging separado** e **rollback documentado** — as duas partes de G10 deixadas de
  fora deste laboratório de propósito.
- **Job de reconciliação Stripe↔banco** (G8, lab-96), **NPS de responsáveis** (lab-99) e o **bug de
  morros invisíveis** (lab-95, ainda bloqueado esperando resposta do usuário) continuam em aberto.

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`
- Como rodar/verificar o que foi construído neste laboratório:
  - `gh run list` / aba Actions do GitHub — o workflow "CI" roda em todo push a esta branch, 3 jobs
    (`app`, `server-accounts`, `server-cf-relay`).
  - `cd app/server-accounts && npm run test` (36 testes) e `cd app/server-cf-relay && npm run
    test` (13 testes) — ambos com `vitest.config.ts` próprio agora, não dependem mais de estar
    aninhados dentro de `app/` pra funcionar isolados.
  - `cd app/server-accounts && npm run migrate` — aplica só migrações pendentes de `migrations/`;
    hoje (`0001_baseline.sql`) já está aplicada em produção, então roda e diz "Nenhuma migração
    pendente."
  - Nenhum deploy de Worker/frontend foi necessário neste laboratório — mudanças são só de CI/
    tooling de migração, não de comportamento do Worker em produção.
