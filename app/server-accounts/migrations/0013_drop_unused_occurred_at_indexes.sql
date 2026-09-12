-- lab-185 (achado do review automático do Copilot, PR #55, 11ª rodada): depois de trocar
-- `handleAdminMetrics` de `occurred_at` pra `received_at` (7ª rodada) e criar os índices
-- equivalentes em `received_at` (`migrations/0011...`, 8ª rodada), `idx_product_events_occurred_at`
-- e `idx_product_events_device_occurred` ficaram sem NENHUMA query que os use — confirmado
-- grepando `src/index.ts` por `occurred_at`: só aparece mais no próprio `INSERT`, nenhum
-- WHERE/JOIN/ORDER. Manter os dois numa tabela de telemetria de alto volume de escrita
-- (`product_events`) custa atualização de índice morto em TODO insert, sem ganho de leitura
-- nenhum. `idx_product_events_type_occurred` (composto `event_type, occurred_at`) NÃO entra
-- aqui — o prefixo `event_type` sozinho ainda serve pra filtros só por tipo (`session_end`,
-- `quest_completed`), então não é totalmente morto como os outros dois.
drop index if exists idx_product_events_occurred_at;
drop index if exists idx_product_events_device_occurred;
