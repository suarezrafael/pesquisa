-- lab-119, Fase F: relatório semanal de progresso por e-mail. `docs/plano-comercial-backend.md`
-- documentava até aqui que NENHUMA tabela guarda progresso da criança -- mudança consciente,
-- confirmada com o usuário (ver labs/lab-119-.../FEATURES.md): só um RESUMO mínimo (5 números),
-- nunca resposta de quest/apelido/avatar/horário de atividade, e só enquanto a família tiver
-- entitlement ativo (ver `POST /progress-summary`/`handleProgressSummary` em `index.ts`).
--
-- Uma linha por família (chave primária `family_account_id`), sempre SOBRESCRITA -- este recurso
-- mostra o estado ATUAL no e-mail semanal, não um histórico (ver "Fora de escopo" no FEATURES.md).
create table if not exists progress_snapshots (
  family_account_id uuid primary key references family_accounts(id),
  level int not null,
  total_xp int not null,
  coins int not null,
  quests_completed int not null,
  badges_count int not null,
  updated_at timestamptz not null default now()
);
