-- lab-101, G10: baseline de migração versionada -- este arquivo é o antigo `schema.sql` (Fase A
-- até o lab-100), movido pra cá sem mudar uma linha de SQL. `migrate.mjs` aplica ele como a
-- migração "0001" e registra em `schema_migrations`; como cada instrução aqui já é idempotente
-- (`if not exists` em tudo), rodar contra o banco de produção existente é um no-op seguro que só
-- "bootstrapa" o histórico de versão. Migrações NOVAS a partir de agora ganham arquivo próprio
-- (`000N_descricao.sql`) em vez de crescer este arquivo -- ver server-accounts/README.md.
--
-- Fase A do plano de backend comercial (ver ../../docs/plano-comercial-backend.md).
-- neon_auth.* já existe sozinho (gerenciado pelo Neon Auth/Better Auth, habilitado na criação do
-- projeto) -- guarda a identidade/sessão do RESPONSÁVEL, nunca da criança. Não criamos nada nesse
-- schema; só referenciamos `neon_auth."user"` (nome real confirmado via
-- information_schema.tables, não suposição -- ver server-accounts/inspect.mjs).

create extension if not exists "pgcrypto";

create table if not exists family_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references neon_auth."user"(id),
  created_at timestamptz not null default now()
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  family_account_id uuid not null references family_accounts(id),
  stripe_customer_id text not null,
  stripe_subscription_id text,
  status text not null check (status in ('trialing', 'active', 'past_due', 'canceled')),
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

-- lab-96, G8 (docs/prompts/05-escala-e-viabilidade.md): o `check` acima só cobria 4 dos 8 status
-- reais que o Stripe emite -- Pix/boleto no Brasil com frequência faz a assinatura nascer
-- `incomplete` (pagamento ainda não confirmado), e isso batia direto nessa constraint, o `insert`
-- falhava, o Worker devolvia 500, e o Stripe reenviava o mesmo evento indefinidamente. `alter
-- table` em vez de mudar a definição acima porque este arquivo é reaplicado inteiro por
-- `migrate.mjs` (`if not exists` em tudo) -- num banco onde a tabela já existe com a constraint
-- antiga, só um `alter` de verdade a substitui; o nome do `drop constraint` é o padrão que o
-- Postgres gera pra um `check` de coluna sem nome explícito (`<tabela>_<coluna>_check`).
alter table subscriptions drop constraint if exists subscriptions_status_check;
alter table subscriptions add constraint subscriptions_status_check
  check (status in (
    'trialing', 'active', 'past_due', 'canceled',
    'incomplete', 'incomplete_expired', 'unpaid', 'paused'
  ));

-- lab-96, G8: defesa em profundidade contra duplicata além da lógica em `upsertSubscription`
-- (`index.ts`) -- webhooks concorrentes pra MESMA assinatura (dois eventos quase simultâneos)
-- podiam os dois ver "não existe" no `select` e os dois tentarem `insert`, gerando duas linhas pra
-- uma assinatura só. Índice PARCIAL (`where ... is not null`) porque a coluna fica nula entre criar
-- a sessão de checkout e o Stripe confirmar a assinatura de verdade.
create unique index if not exists idx_subscriptions_stripe_subscription_id_unique
  on subscriptions (stripe_subscription_id) where stripe_subscription_id is not null;

-- lab-96, G8: guarda o `created` (timestamp do próprio evento do Stripe, não de quando o Worker
-- processou) do último evento realmente aplicado a esta assinatura -- usado por
-- `isEventNewerThan` (`domain.ts`) pra recusar um evento que chegue fora de ordem (o Stripe não
-- garante ordem de entrega; um retry de rede pode fazer um evento mais antigo chegar depois de um
-- mais novo já aplicado).
alter table subscriptions add column if not exists last_event_created_at timestamptz;

-- lab-96, G8: idempotência de verdade contra reentrega do Stripe (acontece sempre que o Worker não
-- responde 2xx a tempo, inclusive por instabilidade transitória sem relação com o evento em si).
-- Checado ANTES de aplicar qualquer mudança em `handleStripeWebhook`, gravado DEPOIS -- reentrega
-- do mesmo `event.id` vira um no-op (200 sem reprocessar) em vez de aplicar a mesma mudança de novo.
create table if not exists stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  created_at timestamptz not null default now()
);

-- Código curto (6 dígitos) que a criança digita UMA VEZ no jogo pra vincular o entitlement da
-- família, sem nunca precisar de e-mail/senha no client dela (ver docs/prompts/01-seguranca.md).
create table if not exists pairing_codes (
  code text primary key,
  family_account_id uuid not null references family_accounts(id),
  expires_at timestamptz not null,
  redeemed_at timestamptz
);

create index if not exists idx_subscriptions_family_account on subscriptions (family_account_id);
create index if not exists idx_pairing_codes_family_account on pairing_codes (family_account_id);

-- Rate limit de `/pairing/redeem` (lab-88, auditoria de segurança). Motivo de não usar o binding
-- nativo de Rate Limiting do Workers pra esta rota específica: testado ao vivo em produção (não
-- só localmente) e não bloqueou nenhuma das 100 chamadas concorrentes feitas contra um limite
-- configurado de 20/60s -- funciona perfeitamente na simulação local (`wrangler dev`), mas não
-- reflete o mesmo comportamento em produção nesta conta (Free), motivo não confirmado (não
-- documentado com clareza pela Cloudflare se é limitação de plano ou bug). Como este é o
-- endpoint mais crítico da auditoria (sem isso, força bruta do código de pareamento é praticamente
-- garantida dentro da janela de validade), a defesa principal não pode depender de um mecanismo
-- não verificado -- esta tabela implementa o mesmo limite via UPSERT atômico no Postgres, que já é
-- a peça de infraestrutura comprovadamente confiável deste Worker.
create table if not exists pairing_redeem_attempts (
  ip text primary key,
  window_start timestamptz not null,
  count int not null default 1
);

-- lab-97, resto de G7 (docs/prompts/05-escala-e-viabilidade.md): o rate limit e a corrida de
-- resgate duplo já foram corrigidos no lab-88, mas o token de entitlement em si continuava
-- puramente stateless -- uma vez emitido, válido por 180 dias sem NENHUM jeito de invalidar antes
-- da expiração (código vazado num grupo de WhatsApp virava assinatura compartilhada pelo tempo
-- todo). Cada linha aqui é um token realmente emitido (`jti` do JWT = chave primária) -- permite
-- revogar (`revoked_at`) e contar quantos aparelhos uma família tem ativos ao mesmo tempo.
create table if not exists entitlement_tokens (
  jti uuid primary key default gen_random_uuid(),
  family_account_id uuid not null references family_accounts(id),
  issued_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists idx_entitlement_tokens_family_account on entitlement_tokens (family_account_id);

-- lab-99, resto de G11 (prompt.md §12): telemetria de produto anônima -- `device_id` é um
-- `crypto.randomUUID()` gerado e guardado só no `localStorage` do aparelho da criança, sem NENHUM
-- vínculo com nome/e-mail/apelido/família (docs/prompts/01-seguranca.md [MUST] permite
-- identificador técnico anônimo, nunca dado pessoal). `meta` guarda detalhe específico do tipo de
-- evento (ex.: `questId` em `quest_completed`, `durationMs` em `session_end`).
create table if not exists product_events (
  id bigint generated always as identity primary key,
  device_id uuid not null,
  event_type text not null,
  occurred_at timestamptz not null,
  meta jsonb,
  received_at timestamptz not null default now()
);

-- Índices pensados pras duas consultas que `GET /admin/metrics` faz de verdade: "primeira e
-- últimas datas em que ESTE dispositivo apareceu" (retenção D1/D7) e "todos os eventos de UM tipo
-- num período" (duração de sessão, quests concluídas).
create index if not exists idx_product_events_device_occurred on product_events (device_id, occurred_at);
create index if not exists idx_product_events_type_occurred on product_events (event_type, occurred_at);
