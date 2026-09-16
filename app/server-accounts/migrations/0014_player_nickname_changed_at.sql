-- Troca segura de nickname depois do onboarding — instante da última troca, pra reforçar o
-- cooldown no servidor (não só na UI, docs/prompts/01-seguranca.md §3). null = nunca trocou
-- (inclusive toda linha criada antes desta coluna existir).
alter table player_identities add column if not exists nickname_changed_at timestamptz;
