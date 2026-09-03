-- lab-142, G6 (docs/prompts/05-escala-e-viabilidade.md): "todo o progresso pago mora só no
-- aparelho — limpar dados apaga o que a família pagou, sem backup e sem restauração. Isso é uma
-- fila de suporte e de estorno esperando para acontecer, não só um detalhe de anti-cheat."
--
-- Diferente de `progress_snapshots` (lab-119, resumo de 5 números pro e-mail semanal), esta
-- tabela guarda o `Profile`+`Progress` INTEIROS do jogo — o suficiente pra restaurar de verdade
-- (nome/avatar/equipados + XP/moedas/missões/cosméticos desbloqueados/posições de mobília/etc.),
-- não só exibir um resumo. `jsonb` em vez de colunas por campo de propósito: este Worker é um
-- pacote separado do jogo, sem import de `app/src/types.ts` — modelar cada campo aqui criaria
-- acoplamento de schema toda vez que `Progress` ganhasse um campo novo no jogo (ver
-- `isValidProgressBackupPayload`, `src/domain.ts`, pro mesmo raciocínio na validação).
--
-- Uma linha por família (chave primária `family_account_id`), sempre SOBRESCRITA — é o estado
-- MAIS RECENTE, não um histórico (mesmo espírito de `progress_snapshots`).
create table if not exists progress_backups (
  family_account_id uuid primary key references family_accounts(id),
  profile jsonb not null,
  progress jsonb not null,
  updated_at timestamptz not null default now()
);
