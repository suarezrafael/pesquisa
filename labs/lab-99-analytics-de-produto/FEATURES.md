# Laboratório 99 — analytics de produto (resto de G11): D1/D7, sessão, quests

Status: em andamento
Início: 2026-08-26
Fim: -
Commit inicial: ec9d017ca11af5238d702c60908442072089604b

## Objetivo do laboratório
Corrigir a metade que faltava de G11 (`docs/prompts/05-escala-e-viabilidade.md`), escolhida pelo
usuário depois do lab-98 (que resolveu a metade de "alarme de cota"). `prompt.md` §12 exige
métricas pra validar product-market fit: D1/D7 retention, tempo médio por sessão, quests
concluídas por usuário, taxa de retorno semanal, NPS de responsáveis. Hoje NENHUMA dessas existe —
o jogo não tem telemetria de uso nenhuma além do Cloudflare Web Analytics (só contagem de visitas
de página, lab-84).

**NPS fica FORA deste laboratório de propósito** (ver "Fora de escopo") — é um mecanismo
fundamentalmente diferente (pesquisa qualitativa ao responsável, não telemetria de evento) que
merece seu próprio laboratório pequeno, em vez de inchar este aqui.

## Investigado antes de planejar — restrição central: privacidade infantil
- **`docs/prompts/01-seguranca.md` [MUST]**: "Nenhuma coleta de dado pessoal da criança além do
  mínimo necessário" e "Logs de aplicação nunca incluem dado pessoal da criança... Logar
  identificadores técnicos (ex.: `user_id`), não conteúdo sensível" — um identificador técnico
  ANÔNIMO é explicitamente permitido; nome/e-mail/dado de contato nunca.
- **Arquitetura atual** (`CLAUDE.md`): o jogo é frontend-only pra gameplay (`localStorage`, sem
  conta, sem PII de criança) — este laboratório é a PRIMEIRA vez que uma telemetria de uso
  (mesmo anônima) sai do aparelho da criança. Decisão de design: um ID totalmente aleatório
  (`crypto.randomUUID()`, sem relação com nome/apelido/e-mail), gerado e guardado só em
  `localStorage`, nunca exposto na UI, nunca logado junto de nada sensível — o mesmo padrão de
  "identificador técnico" que o `[MUST]` acima já autoriza.
- **`app/src/errorReporting.ts`** (lab-84) é o template a seguir: reporta pro próprio Worker de
  contas (não um serviço de terceiro), `fetch` com `keepalive: true`, falha silenciosa, limite de
  volume por sessão. Este laboratório usa exatamente o mesmo padrão pra eventos de produto.
- **`app/src/state/useProgress.ts`**: `completeQuest(quest)` é o ponto único onde uma missão é
  marcada concluída — hook natural pro evento `quest_completed`.
- **`app/src/main.tsx`**: `installErrorReporting()` já roda no topo, antes do `registerSW` — mesmo
  lugar pra `installProductAnalytics()`.
- **`app/server-accounts/wrangler.toml`**: padrão de rate limit por rota já estabelecido
  (`[[ratelimits]]`, `namespace_id` sequencial) — `/events` (novo) precisa do próprio, igual
  `/client-error` já tem o dele.

## Funcionalidades planejadas
- [ ] **`app/src/state/storage.ts`**: `getOrCreateDeviceId()` — UUID aleatório gerado uma vez,
  persistido em `localStorage` (`jogo-educativo:deviceId`), reaproveitado em toda sessão futura no
  mesmo aparelho/navegador.
- [ ] **`app/src/productAnalytics.ts`** (novo, mesmo padrão de `errorReporting.ts`):
  `trackEvent(type, meta?)` — `POST /events` no Worker de contas, silencioso em caso de falha,
  `keepalive: true`. `installProductAnalytics()` — dispara `session_start` no carregamento e
  `session_end` (com `durationMs` calculado) no `pagehide`.
- [ ] **`useProgress.ts`**: `completeQuest` dispara `trackEvent('quest_completed', { questId })`
  depois de aplicar o resultado.
- [ ] **`app/server-accounts/schema.sql`**: nova tabela `product_events` (`device_id`,
  `event_type`, `occurred_at`, `meta` jsonb nullable, `received_at`) + índices pra consulta de
  retenção (`device_id, occurred_at` e `event_type, occurred_at`).
- [ ] **`app/server-accounts/src/domain.ts`**: `PRODUCT_EVENT_TYPES` (allowlist:
  `session_start`, `session_end`, `quest_completed`) + `isValidProductEventType`.
- [ ] **`POST /events`** (`index.ts`): sem autenticação (anônimo por desenho), rate-limited
  (`EVENTS_LIMITER` novo), valida `deviceId`/`type`/`occurredAt`, insere, devolve `204`.
- [ ] **`GET /admin/metrics`**: protegido por segredo compartilhado (header, `wrangler secret put
  ADMIN_METRICS_SECRET`) — não é dado de família nenhuma específica, mas ainda é métrica de
  negócio, não fica público. Devolve D1/D7 retention, duração média de sessão, quests concluídas
  por dispositivo (média), total de dispositivos únicos vistos.
- [ ] Testes de domínio pra `isValidProductEventType` e qualquer outra lógica pura extraível.
- [ ] Testado ao vivo contra produção real: inserir eventos sintéticos (`session_start`/
  `session_end`/`quest_completed`) espalhados em vários dias diferentes direto no banco, conferir
  que `/admin/metrics` calcula D1/D7/duração/quests batendo com o valor esperado à mão. Testar
  `POST /events` de verdade (não só inserção direta) pra confirmar o caminho completo
  client→endpoint→banco funciona.

## Fora de escopo (explicitamente adiado)
- **NPS de responsáveis** — pesquisa qualitativa (formulário no portal, não evento), mecanismo
  fundamentalmente diferente do resto deste laboratório. Fica pra um laboratório próprio e pequeno.
- **Dashboard visual** — `/admin/metrics` devolve JSON puro, sem interface gráfica. Uma tela de
  verdade (gráficos, séries temporais) é um laboratório à parte se o volume de uso justificar.
- **"Taxa de retorno semanal" como cohort multi-semana de verdade** — a query de D7 retention serve
  de proxy razoável; um cálculo de WAU/stickiness exigiria semanas de dado acumulado pra ser
  significativo, que não existe ainda logo após este laboratório. Documentar isso como limitação
  conhecida, não tentar simular dado histórico falso pra preencher a métrica.
- **Consentimento explícito de analytics** — dado que o identificador é 100% anônimo (sem PII, sem
  vínculo com nome/e-mail/apelido) e first-party (não third-party tracker), tratado como
  equivalente ao Cloudflare Web Analytics já em uso desde o lab-84 (mesma categoria de decisão já
  tomada). Se o usuário achar que precisa de aviso explícito na política de privacidade, é uma
  atualização de texto, não de código — fica registrado como possível pendência.
