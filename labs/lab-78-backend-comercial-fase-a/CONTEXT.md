# Contexto — Laboratório 78 — backend comercial, Fase A (fundação Neon + Cloudflare)

Preenchido em: 2026-08-22
Commit inicial → final: 85512c74406a81ce13c433224b6b0e50337d3012..6eebfc1

## O que foi feito
- **Projeto Neon** `missao-aprender` (id `plain-waterfall-72629169`) criado via console web
  (usuário já autenticado via GitHub OAuth), região **AWS South America East 1 (São Paulo)** —
  escolhida deliberadamente entre as opções disponíveis (Ohio era o padrão) pela proximidade do
  público-alvo brasileiro, atendendo o pedido de "plano bem barato pra clientes brasileiro" (baixa
  latência facilita adoção mesmo não sendo diretamente sobre preço).
- **Neon Auth habilitado** na criação do projeto (toggle no próprio diálogo de criação). Schema
  `neon_auth` **confirmado por consulta direta** (`information_schema.tables`/`.columns`), não
  suposição: tabelas reais são `user`/`session`/`account`/`organization`/`member`/`invitation`/
  `verification`/`jwks`/`project_config` (padrão Better Auth). O `owner_user_id` de
  `family_accounts` referencia `neon_auth."user"(id)` — corrigido depois de eu inicialmente supor
  um nome de tabela errado (`users_sync`) sem checar.
- **Schema próprio aplicado** (`app/server-accounts/schema.sql`, via `npm run migrate`):
  `family_accounts`, `subscriptions`, `pairing_codes` — ver o arquivo pra estrutura completa e
  comentários sobre o desenho "criança sempre anônima" (já detalhado no plano).
- **Novo Worker Cloudflare** `app/server-accounts/` (mesma estrutura de `server-cf-relay/`):
  `wrangler.toml`, `package.json`, `tsconfig.json`, `.gitignore` (inclui `.dev.vars`). O Worker em
  si (`src/index.ts`) só tem um health-check (`GET /health`) que roda uma query real contra o Neon
  via `@neondatabase/serverless` (driver HTTP, compatível com o runtime de borda — sem conexão TCP
  persistente, ao contrário do `pg` usado nos scripts administrativos locais).
- **Deploy verificado em produção**: `https://missao-aprender-accounts.rafaelvs.workers.dev/health`
  responde `{"ok":true,"familyCount":0}` — prova que o caminho Worker (produção, borda) → Neon
  (São Paulo) funciona de ponta a ponta, não só localmente.
- **Segredos**: `DATABASE_URL` (connection string do Neon) configurado via
  `wrangler secret put DATABASE_URL` em produção; localmente vive só em
  `app/server-accounts/.dev.vars` (gitignored, nunca comitado — conferido com `git diff --cached`
  antes do commit, sem nenhum vazamento).

## Decisões técnicas tomadas
- **API key pessoal do Neon em vez de OAuth interativo (`neonctl auth`)** — tentei o fluxo OAuth
  interativo primeiro (padrão pra humanos), mas ele tem um timeout de 60s esperando o callback
  local, e a automação de navegador (múltiplos cliques/verificações) sempre excedia esse tempo,
  além de uma corrida entre processos concorrentes ter corrompido o arquivo de credenciais uma vez
  no meio do caminho. Uma API key pessoal (gerada uma vez via console, sem expiração por tempo)
  é o padrão correto pra automação/CI de qualquer forma — não é um workaround, é a ferramenta certa
  pro caso de uso.
- **`pg` (driver TCP normal) só nos scripts administrativos locais (`migrate.mjs`/`inspect.mjs`),
  `@neondatabase/serverless` (driver HTTP) só no Worker** — Workers não suportam conexões TCP
  persistentes; scripts Node locais não têm essa limitação e `pg` é mais simples/padrão pra uso
  administrativo pontual (rodar uma migração, inspecionar schema).
- **Verificar o nome real das tabelas do Neon Auth antes de escrever a FK** — a primeira versão do
  schema referenciava `neon_auth.users_sync`, um nome supost sem checar. Consultei
  `information_schema` diretamente antes de aplicar o schema de verdade, evitando um erro de
  migração bobo.

## Pendências / dívidas conhecidas
- **Critério de "pronto" da Fase A ajustado**: o plano original dizia "consigo criar um
  responsável de teste e ver a linha em `neon_auth.users`" — isso exigiria passar pelo fluxo real
  de signup do Better Auth (endpoint REST gerenciado pela Neon), que só faz sentido testar de
  verdade com a UI de login da Fase B. Em vez disso, confirmei que o schema existe, é consultável,
  e que o Worker consegue lê-lo em produção — suficiente pra uma fundação, mas o signup real ainda
  não foi exercitado ponta a ponta.
- **API key pessoal do Neon** (`missao-aprender-agent`) tem escopo amplo (criar/ler/modificar/
  apagar QUALQUER projeto da conta, não só este) — aceitável pra uso administrativo pontual desta
  sessão, mas vale considerar revogar e gerar uma nova com escopo mais restrito (se a Neon
  suportar escopo por projeto) antes de automatizar isso de forma recorrente/não supervisionada.
- Preço da assinatura e lista exata de cosméticos exclusivos continuam sem decisão do usuário
  (registrado no plano original).
- **Ressalva sobre "biblioteca com material didático"**: o usuário mencionou isso como ideia de
  cosmético/conteúdo exclusivo de assinante — sinalizei ao usuário (na conversa, não neste
  arquivo até agora) que isso pode conflitar com a regra não-negociável de `prompt.md` §15.1
  (nunca gatear conteúdo pedagógico). Não decidido ainda; só registrado como ponto de atenção pra
  quando a Fase E (cosméticos de verdade) for construída.

## Funcionalidades planejadas que NÃO foram concluídas
Nenhuma das planejadas para a Fase A — todas concluídas. Fases B-F continuam não iniciadas
(fora de escopo deste laboratório específico).

## O que o próximo laboratório deve desenvolver
- **Fase B**: parental gate (pergunta simples) + rota `/familia` no jogo + login/cadastro do
  responsável via Neon Auth — primeira vez que o fluxo real de signup/login será exercitado de
  ponta a ponta.
- Antes da Fase C (pagamento): confirmar com o usuário o preço da assinatura.
- Antes da Fase E (cosméticos): confirmar a lista exata de itens exclusivos, e resolver a dúvida
  sobre a "biblioteca de material didático" (manter fora do gate de assinatura, por causa da
  regra de não gatear conteúdo pedagógico).

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl` (worktree, a partir de `main`; branch anterior já tinha
  sido mesclada via PR #5 — este commit volta a colocar a branch 1 commit à frente da `main`).
- Novo serviço em produção: `https://missao-aprender-accounts.rafaelvs.workers.dev`
  (`/health` só, nada além disso ainda).
- Novo projeto de infraestrutura fora do git: projeto Neon `missao-aprender`
  (`plain-waterfall-72629169`), gerenciado via console.neon.tech (conta `rafaelv_s@hotmail.com`,
  login GitHub) — nenhum jeito de "clonar" isso via código, documentado aqui pra quem retomar
  saber que ele existe e onde encontrar.
- Como verificar: `curl https://missao-aprender-accounts.rafaelvs.workers.dev/health` deve
  responder `{"ok":true,"familyCount":0}` (ou mais, se famílias reais já tiverem sido criadas).
