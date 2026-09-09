# Laboratório 165 — catálogo de eventos e dashboard semanal de produto

Status: em andamento
Início: 2026-09-09
Fim: -
Commit inicial: 8ebf4484a6465b96eb58b251eb3fdba3870dfb55

## Objetivo do laboratório

Segundo item da sequência de prioridade confirmada pelo usuário
(`docs/market-metrics-engagement-backlog.md`, seção 6, "Lab 164" no documento — **renumerado para
lab-165** pelo mesmo motivo do lab-164: o "lab-163"/"lab-164" originais do documento já foram
consumidos por labs reais deste repositório com outro escopo).

Problema citado no documento: "sem eventos padronizados, não dá para saber se os recursos geram
engajamento real". Este lab não cria mais eventos de client (isso já foi feito lab a lab desde o
lab-99 até o lab-164) — documenta a taxonomia completa que já existe e estende o único endpoint de
métricas já existente (`GET /admin/metrics`, lab-99) pra reportar um FUNIL SEMANAL, não só médias
acumuladas de todo o histórico.

## Estado atual levantado antes de planejar o escopo

- `PRODUCT_EVENT_TYPES` (`server-accounts/src/domain.ts`) tem 9 tipos hoje: `session_start`,
  `session_end`, `quest_completed`, `play_click`, `parent_area_click` (lab-161),
  `time_to_first_control`/`time_to_first_learning_challenge`/`time_to_first_reward`/
  `activation_cycle_completed` (lab-164) — nenhum documentado num lugar só fora do código-fonte.
- `GET /admin/metrics` (`handleAdminMetrics`, lab-99) já calcula D1/D7 retention, duração média de
  sessão, média de missões concluídas por dispositivo, NPS — tudo como MÉDIA/TOTAL ACUMULADO desde
  o início, nunca "esta semana" isolada. Sem funil de ativação (os eventos do lab-164 nunca foram
  lidos de volta), sem números sociais (amigos), sem números de conversão adulta.
- Dados sociais (`player_identities`/`friendships`, labs 159-162) e comerciais
  (`family_accounts`/`subscriptions`, fase C) já existem em tabelas próprias — não é preciso criar
  evento de client novo pra "quantos pedidos de amizade essa semana" ou "quantas famílias assinaram
  essa semana", uma consulta SQL direta nessas tabelas já responde.
- Não existe hoje nenhum evento de `checkout_started`/`family_landing_viewed`/`parent_signup_started`
  (citados no documento como parte do funil de conversão adulta) — instrumentá-los é trabalho do
  `/familia`, fora do escopo deste lab de catálogo/dashboard (fica pro lab-166, que MEXE nessa
  página). Aqui a conversão adulta é aproximada com o que já existe:
  `parent_area_click` + `family_accounts` criadas + `subscriptions` ativadas na semana.

## Funcionalidades planejadas

- [ ] `docs/event-catalog.md` novo — taxonomia completa: nome do evento, quando dispara, arquivo
      de origem, propriedades em `meta` (se houver), qual métrica primária/de apoio do documento
      cada um alimenta (seção 4 do `market-metrics-engagement-backlog.md`), e uma nota explícita de
      que nenhum evento carrega PII infantil (nome real, e-mail, resposta de quest, texto de chat).
- [ ] `GET /admin/metrics` ganha um campo novo `weeklyFunnel` (últimos 7 dias, não a vida toda do
      produto): contagem de dispositivos únicos por evento de ativação (`play_click` →
      `time_to_first_control` → `time_to_first_learning_challenge` → `time_to_first_reward` →
      `activation_cycle_completed`), `quest_completed` da semana, `parent_area_click` da semana.
- [ ] Campo novo `weeklySocial`: pedidos de amizade enviados/aceitos na semana e novos jogadores
      registrados (`player_identities`) na semana — direto de `friendships`/`player_identities`,
      sem evento de client novo.
- [ ] Campo novo `weeklyCommercial`: famílias novas (`family_accounts.created_at`) e assinaturas
      ativadas (`subscriptions`, status `active`) na semana — direto das tabelas já existentes.
- [ ] Testes de domínio para qualquer lógica pura extraída (ex.: cálculo de janela de 7 dias, se
      virar uma função isolada e testável em `domain.ts`, mesmo padrão de `isOnlineNow`).

## Fora de escopo (explicitamente adiado)

- Instrumentar `checkout_started`/`family_landing_viewed`/`parent_signup_started` — pertence à
  reformulação da página familiar (lab-166), que vai mexer nesses fluxos de qualquer forma.
- Qualquer UI de dashboard (gráfico, painel visual) — o critério de aceite do documento aceita
  "dashboard OU relatório técnico"; `GET /admin/metrics` já é consumido como relatório técnico
  (JSON) desde o lab-99, sem UI, e este lab mantém esse padrão.
- Ferramenta de BI externa, funil por coorte de usuário individual (só agregado), qualquer dado que
  identifique uma criança específica.

## Critérios de aceite (citados do documento, seção 6)

Cada métrica primária tem eventos mapeados; eventos infantis não carregam PII; dashboard ou
relatório técnico mostra funil semanal.

## Métricas esperadas (citadas do documento)

Cobertura de eventos ≥ 90% pros funis definidos; decisões de backlog referenciam pelo menos uma
métrica.
