# Contexto — Laboratório 99 — analytics de produto (resto de G11)

Preenchido em: 2026-08-26
Commit inicial → final: d6b54d053fbb158e7892603855ac5d4d4621b226..HEAD

## O que foi feito
Corrigiu a segunda metade de G11 (a primeira, alarme de cota do relay, foi o lab-98), a que o
usuário escolheu logo depois: eventos de produto e retenção D1/D7 (`prompt.md` §12). Antes deste
laboratório o jogo não tinha NENHUMA telemetria de uso além da contagem de visitas de página do
Cloudflare Web Analytics (lab-84) — esta é a primeira vez que qualquer coisa sai do aparelho da
criança além do que já existia (`errorReporting.ts`, também lab-84).

- **`app/src/state/storage.ts`**: `getOrCreateDeviceId()` — `crypto.randomUUID()` gerado uma única
  vez por aparelho/navegador, persistido em `localStorage`
  (`jogo-educativo:deviceId`), sem NENHUM vínculo com nome/apelido/e-mail/família.
- **`app/src/productAnalytics.ts`** (novo): `trackEvent(type, meta?)` — mesmo padrão de
  `errorReporting.ts` (`fetch` com `keepalive: true`, falha silenciosa, sem serviço de terceiro).
  `installProductAnalytics()` (chamado uma vez em `main.tsx`, logo após `installErrorReporting()`)
  dispara `session_start` no carregamento e `session_end` (com `durationMs`) no `pagehide` — não
  `beforeunload`, mais confiável em PWA/mobile quando o app vai pra segundo plano em vez de fechar
  de verdade. `trackQuestCompleted(questId)` exportado à parte pro `useProgress.ts`.
- **`app/src/state/useProgress.ts`**: `completeQuest` agora captura `wasAlreadyCompleted` (se
  `quest.id` já estava em `completedQuestIds`) ANTES de chamar `applyQuestCompletion`, e só dispara
  `trackQuestCompleted` quando `!wasAlreadyCompleted` — bug pego e corrigido antes de qualquer
  teste, já que `applyQuestCompletion` é idempotente (reprisar uma missão já concluída não premia
  XP/moeda de novo) e sem essa guarda a métrica de "quests concluídas por dispositivo" inflaria a
  cada replay.
- **`app/server-accounts/schema.sql`**: nova tabela `product_events` (`id` bigint, `device_id`
  uuid, `event_type` text, `occurred_at` timestamptz, `meta` jsonb nullable, `received_at`
  timestamptz) + dois índices (`device_id, occurred_at` e `event_type, occurred_at`) pra sustentar
  as consultas de retenção. Migrado em produção (`npm run migrate`, autorizado explicitamente pelo
  usuário depois do classificador automático bloquear a primeira tentativa) e confirmado via script
  temporário consultando `information_schema.columns`/`pg_indexes` — colunas e índices batendo
  exatamente com o schema.
- **`app/server-accounts/src/domain.ts`**: `isValidProductEventType` (allowlist `session_start`,
  `session_end`, `quest_completed`) e `isPlausibleSessionDuration` (com
  `MAX_PLAUSIBLE_SESSION_DURATION_MS`, descarta duração de sessão absurda antes de entrar na média).
  7 testes novos (36/36 no total do Worker, `npx tsc --noEmit` limpo).
- **`POST /events`** (`index.ts`): sem autenticação (anônimo por desenho), atrás de
  `EVENTS_LIMITER` novo (20 req/60s, `wrangler.toml`), valida `deviceId`/`type`/`occurredAt`,
  insere e devolve `204`.
- **`GET /admin/metrics`**: protegido por header `x-admin-secret` comparado a
  `env.ADMIN_METRICS_SECRET` (definido em produção via `wrangler secret put`, também autorizado
  explicitamente após bloqueio do classificador). Devolve `totalDevices`, `d1Retention`/
  `d7Retention` (`eligibleDevices`, `returnedDevices`, `percent`), `avgSessionDurationMs` +
  `sessionSampleSize`, `avgQuestsCompletedPerDevice` + `devicesWithAtLeastOneQuest` — tudo via CTEs
  SQL comparando o primeiro dia visto de cada `device_id` contra a existência de qualquer evento
  exatamente 1 ou 7 dias depois.
- **Deploy em produção**: Worker `server-accounts` (`npm run deploy`, terceira autorização explícita
  do usuário após bloqueio do classificador) e frontend (`npx vercel --prod --yes`, falhou uma vez
  com o erro conhecido de "Not authorized", passou na segunda tentativa — padrão já documentado em
  labs anteriores).
- **Testado ao vivo, de ponta a ponta, contra produção real**: `POST /events` real inseriu a linha
  esperada em `product_events` (confirmado por leitura direta do banco). Em seguida, 11 eventos
  sintéticos foram inseridos direto no banco via script temporário, cobrindo 3 dispositivos e datas
  espalhadas entre 2026-08-01, +1 dia e +7 dias (um dispositivo retorna em D1 e D7, um só em D1, um
  não retorna). `GET /admin/metrics` devolveu exatamente os valores calculados à mão: D1 = 2/3 =
  66.67%, D7 = 1/3 = 33.33%, duração média de sessão = 90000ms (média de 60000/120000 dos dois
  `session_end` sintéticos), 1.5 quests/dispositivo (3 eventos `quest_completed` / 2 dispositivos
  com pelo menos um). `GET /admin/metrics` sem header e com header errado devolveram `401` nos dois
  casos; com o header correto devolveu `200`. Todos os dados sintéticos foram apagados ao final do
  script.

## Decisões técnicas tomadas
- **ID de dispositivo 100% anônimo, gerado e mantido só em `localStorage`** — nunca exposto na UI,
  nunca associado a perfil/família/e-mail. Respeita `docs/prompts/01-seguranca.md` [MUST]
  ("identificador técnico, não dado pessoal") sem precisar de nenhum consentimento novo — mesma
  categoria de decisão já tomada para o Cloudflare Web Analytics (first-party, sem PII).
- **`/events` sem autenticação** — é telemetria anônima por desenho; exigir login quebraria o
  propósito (medir uso real de crianças sem conta) e a única defesa necessária é rate limit contra
  abuso de volume, não identidade.
- **`/admin/metrics` com segredo compartilhado simples (header), não JWT de parent** — não é dado
  de uma família específica (é agregado de TODOS os dispositivos), então não faz sentido usar
  `requireUserId` como em `/entitlement/revoke-all` (lab-97); um segredo de operador é suficiente e
  mais simples de rotacionar.
- **Guarda de idempotência em `completeQuest` no cliente, não no servidor** — o servidor
  (`/events`) não tem como saber se uma conclusão de missão é "genuína" sem reimplementar a
  máquina de progressão inteira; o cliente já calcula isso de graça (`applyQuestCompletion` já
  retorna 0 XP/moeda pra replay), então checar `wasAlreadyCompleted` ali é a decisão mais simples e
  correta.
- **NPS continua fora de escopo** (como já estava documentado em `FEATURES.md`) — pesquisa
  qualitativa é um mecanismo diferente o bastante (formulário no portal, não evento) pra merecer
  laboratório próprio.
- **Três ações de infraestrutura precisaram de autorização explícita do usuário** — o classificador
  automático do Claude Code bloqueou `npm run migrate` (grava schema em produção), `wrangler secret
  put ADMIN_METRICS_SECRET` (grava segredo em produção) e `npm run deploy` (publica Worker), cada
  um individualmente, mesmo sendo mudanças aditivas e já planejadas. Mesmo padrão observado no
  lab-96 com a API do Stripe — o classificador trata qualquer escrita em serviço de terceiro/
  infraestrutura de produção como precisando de confirmação humana explícita por ação, não por
  laboratório.

## Pendências / dívidas conhecidas
- **"Taxa de retorno semanal" como cohort de verdade continua sendo só a proxy de D7** — um cálculo
  de WAU/stickiness de verdade precisa de semanas de dado acumulado que ainda não existem logo após
  este laboratório (documentado como limitação conhecida desde `FEATURES.md`, não simulado com dado
  falso).
- **Nenhum dashboard visual** — `/admin/metrics` é JSON puro. Uma tela de verdade (gráficos, séries
  temporais) é um laboratório à parte se o volume de uso justificar.
- **Nenhum texto de política de privacidade atualizado** — decisão consciente de tratar o ID
  anônimo como equivalente ao Web Analytics já em uso (mesma categoria já aceita), mas se o usuário
  achar que precisa de menção explícita, é atualização de texto, não de código.
- **`ADMIN_METRICS_SECRET` está em texto puro em `.dev.vars` (gitignored) e como secret do
  Cloudflare em produção** — mesmo padrão de segredo já usado para `ENTITLEMENT_SECRET`/
  `STRIPE_WEBHOOK_SECRET`; nenhuma rotação automática existe pra nenhum deles.

## Funcionalidades planejadas que NÃO foram concluídas
- Nenhuma — todos os itens de `FEATURES.md` foram concluídos e verificados (código, testes,
  migração, secret, deploy, teste ao vivo ponta a ponta contra produção real).

## O que o próximo laboratório deve desenvolver
G11 está agora COMPLETO (lab-98 + lab-99). Itens conhecidos que continuam em aberto de laboratórios
anteriores, para o usuário priorizar:
- **NPS de responsáveis** — pesquisa qualitativa, deliberadamente adiada deste laboratório.
- **Job de reconciliação Stripe↔banco** (G8, lab-96).
- **UI de gerenciar aparelhos por família** (individual, não só "desvincular todos") (G7, lab-97).
- **G10 (CI/CD)** — ainda não abordado nesta sequência de laboratórios.
- **Bug de morros/planaltos invisíveis** (lab-95) — segue bloqueado esperando resposta do usuário
  sobre aparelho/GPU e se o buraco é só visual ou também de colisão.

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`
- Como rodar/verificar o que foi construído neste laboratório:
  - `cd app/server-accounts && npm run test` — 36 testes de domínio (7 novos deste laboratório).
  - `cd app && npm run test` — 39 testes do app principal, sem regressão.
  - `npx tsc --noEmit` (em `app/server-accounts/`) e `npx tsc -b` (em `app/`) — typecheck limpo.
  - Produção: `curl -X POST https://missao-aprender-accounts.rafaelvs.workers.dev/events -H
    "Content-Type: application/json" -d '{"deviceId":"<uuid>","type":"session_start",
    "occurredAt":"<iso>"}'` devolve `204`.
  - `curl -H "x-admin-secret: <segredo>"
    https://missao-aprender-accounts.rafaelvs.workers.dev/admin/metrics` devolve o JSON agregado;
    sem o header ou com o header errado devolve `401`.
  - Worker e frontend já deployados — não é preciso rodar `npm run deploy`/`vercel --prod` de novo
    pra ver o efeito deste laboratório.
