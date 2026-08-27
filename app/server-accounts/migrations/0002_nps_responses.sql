-- lab-103, resto de G11/`prompt.md` §12: NPS de pais/responsáveis. Diferente de `product_events`
-- (lab-99, 100% anônimo por device_id) -- aqui é o RESPONSÁVEL já autenticado no portal
-- respondendo por conta própria, então associar a `family_account_id` não introduz nenhum
-- problema novo de privacidade infantil (é dado do adulto, dado voluntariamente).
create table if not exists nps_responses (
  id uuid primary key default gen_random_uuid(),
  family_account_id uuid not null references family_accounts(id),
  score int not null check (score >= 0 and score <= 10),
  comment text,
  submitted_at timestamptz not null default now()
);

create index if not exists idx_nps_responses_family_submitted on nps_responses (family_account_id, submitted_at);
