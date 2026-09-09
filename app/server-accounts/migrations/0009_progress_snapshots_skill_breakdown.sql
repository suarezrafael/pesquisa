-- lab-167 (docs/market-metrics-engagement-backlog.md §6, "Lab 166" no documento) — mapa de
-- habilidades: `progress_snapshots` (lab-119) ganha a contagem de missões concluídas por tipo
-- (lógica/matemática/leitura, `data/quests.ts` do client), usada por `buildWeeklyProgressEmail`
-- pra mostrar ponto forte/pra praticar mais/atividade sugerida no relatório semanal. Nullable
-- (não `not null`): clientes já sincronizando antes deste lab não mandam esses 3 campos até
-- recarregar a página (`isValidProgressSummary` os trata como opcionais de propósito) — uma
-- coluna obrigatória quebraria o `insert` deles.
alter table progress_snapshots add column if not exists logica_completed int;
alter table progress_snapshots add column if not exists matematica_completed int;
alter table progress_snapshots add column if not exists leitura_completed int;
