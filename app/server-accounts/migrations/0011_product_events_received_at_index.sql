-- lab-185 (achado do review automático do Copilot, PR #55, 8ª rodada): a 7ª rodada trocou
-- `handleAdminMetrics` (D0/D1/D7/`cohortComparison`/janela semanal do `weeklyFunnel`) de
-- `occurred_at` pra `received_at`, mas os únicos índices que existiam eram sobre `occurred_at`
-- (`idx_product_events_occurred_at`, `idx_product_events_device_occurred`) — nenhum deles serve pra
-- uma condição sobre `received_at`, forçando scan da tabela inteira nas duas consultas (mesmo
-- problema que `idx_product_events_occurred_at` já tinha resolvido pra `occurred_at` no lab-165).
-- Índice simples pra janela semanal (`where received_at >= ...`, sem `event_type` na cláusula, tal
-- qual seu equivalente em `occurred_at`), e composto pra CTE de retenção (`group by device_id`
-- + `min(received_at)`, e o join `pe.device_id = fs.device_id and pe.received_at::date = ...`).
create index if not exists idx_product_events_received_at on product_events (received_at);
create index if not exists idx_product_events_device_received on product_events (device_id, received_at);
