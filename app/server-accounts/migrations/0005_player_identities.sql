-- lab-159, Grupo B do backlog social (labs/lab-158-.../FEATURES.md, aprovado pelo usuário nesta
-- sessão): identidade de jogador persistente por PERFIL, não por família assinante — funciona
-- pra QUALQUER jogador, pago ou não, mesma regra de app/server-accounts nunca gatear cooperação
-- atrás de assinatura (docs/prompts/03-arquitetura-sistema.md), já seguida por `product_events`.
create table if not exists player_identities (
  id uuid primary key default gen_random_uuid(),
  nickname text not null,
  avatar_emoji text not null,
  -- Reaproveita o MESMO id anônimo já usado pela telemetria de produto (`getOrCreateDeviceId`,
  -- `state/storage.ts`) — evita inventar outro identificador de aparelho.
  device_id uuid not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

-- Busca por nickname é sempre EXATA (case-insensitive), nunca substring/wildcard (achado de
-- segurança do lab-158: o usuário escolheu busca livre, a opção mais arriscada das duas
-- oferecidas — permitir prefixo/substring abriria varredura do diretório inteiro por força
-- bruta alfabética). Índice funcional em `lower(nickname)` deixa esse tipo de busca rápido.
create index if not exists idx_player_identities_nickname_lower on player_identities (lower(nickname));

-- Rate limit de `GET /players/search` por IP — mesmo padrão de `pairing_redeem_attempts`
-- (0001_baseline.sql): o binding nativo de Rate Limiting do Workers já é a primeira camada
-- (`PLAYER_SEARCH_LIMITER`, wrangler.toml), mas essa tabela com UPSERT atômico é a defesa que
-- realmente segura em produção (achado real do lab-88: o binding nativo não bloqueou nenhuma das
-- 100 chamadas concorrentes de teste nesta conta Free).
create table if not exists player_search_attempts (
  ip text primary key,
  window_start timestamptz not null,
  count int not null default 1
);
