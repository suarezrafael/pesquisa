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
