-- lab-165 (achado do review do Copilot, PR #39): `weeklyFunnel` (`handleAdminMetrics`) filtra
-- `product_events` só por `occurred_at >= now() - interval '7 days'`, sem `event_type` na
-- cláusula — nenhum dos dois índices compostos já existentes (`idx_product_events_device_occurred`,
-- `idx_product_events_type_occurred`, ambos com outra coluna na frente de `occurred_at`) serve pra
-- essa consulta, forçando um scan da tabela inteira. Índice simples em `occurred_at` sozinho
-- resolve — a tabela só tende a crescer, mesmo raciocínio de todo índice já existente aqui.
create index if not exists idx_product_events_occurred_at on product_events (occurred_at);
