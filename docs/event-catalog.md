# Catálogo de eventos de produto

Data: 2026-09-09

Este documento existe pra resolver o problema citado em
`docs/market-metrics-engagement-backlog.md` ("Lab 164" no documento, lab-165 real deste
repositório): **sem eventos padronizados documentados, não dá pra saber se os recursos geram
engajamento real, nem confirmar que ninguém tratou um evento novo como sinônimo de outro já
existente.** Ele documenta a taxonomia COMPLETA que já existe hoje — nenhum evento novo foi criado
neste lab, só a extensão de `GET /admin/metrics` pra ler esses eventos de volta como funil semanal
(ver `labs/lab-165-catalogo-eventos-dashboard/CONTEXT.md`).

## Como funciona, em uma frase

Todo evento é enviado por `app/src/productAnalytics.ts` (`trackEvent`, chamado pelas funções
exportadas abaixo) via `POST /events` pro Worker (`app/server-accounts/src/index.ts`,
`handleTrackEvent`), gravado na tabela `product_events` (`device_id`, `event_type`, `occurred_at`,
`meta` opcional), e só é aceito se o tipo estiver na allowlist `PRODUCT_EVENT_TYPES`
(`app/server-accounts/src/domain.ts`) — um tipo desconhecido é recusado com 400, nunca vira uma
linha nova e imprevista na tabela.

## Garantia de privacidade (vale pra TODOS os eventos abaixo, sem exceção)

- `device_id` é um `crypto.randomUUID()` gerado e guardado só no `localStorage` do aparelho
  (`getOrCreateDeviceId`, `state/storage.ts`) — sem NENHUM vínculo com nome/apelido/e-mail/família.
- Nenhum evento carrega nome real, e-mail, resposta de quest, conteúdo de chat, ou qualquer outro
  dado de identificação da criança. `meta` (quando existe) só carrega números (duração/tempo em ms)
  ou um id de missão do catálogo público (`questId`) — nunca texto livre.
- `POST /events` nunca falha o jogo pra criança: toda chamada é `fetch(...).catch(() => {})`
  (`trackEvent`) — se a rede cair ou o Worker estiver fora, o evento simplesmente não é gravado,
  sem interromper nem re-tentar de um jeito visível.

## Tabela de eventos

| Evento | Dispara quando | Arquivo de origem | `meta` | Frequência |
| --- | --- | --- | --- | --- |
| `session_start` | Ao carregar o jogo (topo de `main.tsx`) | `productAnalytics.ts`, `installProductAnalytics` | — | 1x por carregamento de página |
| `session_end` | `pagehide` (fechar aba/app, mais confiável que `beforeunload` em PWA mobile) | `productAnalytics.ts`, `installProductAnalytics` | `durationMs` (validado, `isPlausibleSessionDuration`, teto 4h) | 1x por sessão |
| `play_click` | Clique em "Jogar" na `TitleScreen` (lab-161) | `components/TitleScreen.tsx` | — | 1x por clique |
| `parent_area_click` | Clique em "Área dos responsáveis" na `TitleScreen` (lab-161) | `components/TitleScreen.tsx` | — | 1x por clique |
| `quest_completed` | Primeira conclusão GENUÍNA de uma missão do planeta principal (`wasAlreadyCompleted` evita contar reprise) | `state/useProgress.ts`, `completeQuest` | `questId` | 1x por missão por perfil (pra sempre) |
| `time_to_first_control` | Primeiro frame com movimento real (teclado OU joystick combinados) NESTA sessão (lab-164) | `world3d/World3D.tsx`, laço de movimento | `durationMs` (desde `session_start`) | 1x por sessão |
| `time_to_first_learning_challenge` | Primeira missão aberta NESTA sessão (lab-164) | `App.tsx`, `handleSelectQuest` | `durationMs` | 1x por sessão |
| `time_to_first_reward` | Primeira conclusão genuína de missão NESTA sessão (lab-164) | `state/useProgress.ts`, `completeQuest` (via `trackFirstReward`) | `durationMs` | 1x por sessão |
| `activation_cycle_completed` | Igual ao de cima, mas só quando é a PRIMEIRA missão da vida do perfil (`completedQuestIds` vazio antes) E dentro de 10 minutos da sessão (lab-164) | `productAnalytics.ts`, `trackFirstReward` | `durationMs` | 0 ou 1x por perfil (a vida toda) |
| `family_landing_viewed` | Tela de proposta de valor exibida em `/familia`, depois do portão de matemática (lab-166) | `components/FamilyPortal.tsx`, `FamilyValueProp` | — | 1x por exibição (sem limite de sessão) |
| `parent_signup_started` | Clique em "Entrar / Criar conta" na tela de proposta de valor (lab-166) | `components/FamilyPortal.tsx`, `FamilyValueProp` | — | 1x por clique |
| `checkout_started` | `POST /checkout` devolve uma URL válida, antes do redirect pro Stripe (lab-166) | `components/FamilyPortal.tsx`, `Dashboard.handleSubscribe` | — | 1x por tentativa de checkout |
| `weekly_report_preview_viewed` | Clique em "Ver exemplo do relatório semanal" na tela de proposta de valor (lab-173) | `components/FamilyPortal.tsx`, `FamilyValueProp` | — | 1x por clique |
| `house_visited` | Clique em "🏠 Visitar casa" no perfil público de um amigo (lab-175) | `App.tsx`, `handleVisitHouse` | — | 1x por clique |

## Qual métrica do documento cada evento alimenta

Referência: `docs/market-metrics-engagement-backlog.md`, seção 4 ("North Star e métricas de
decisão").

- **North Star** (`validated_child_learning_sessions_per_week`) — hoje aproximada por
  `session_start` + `quest_completed` combinados (uma sessão com pelo menos 1 missão concluída);
  não temos ainda o corte de "pelo menos 8 minutos" isolado (precisaria cruzar `session_end.durationMs`
  com pelo menos 1 `quest_completed` na mesma sessão — não implementado neste lab, ver "Pendências").
- **Ativação infantil** (ciclo jogar+aprender+recompensa em até 10 min) —
  `time_to_first_control` → `time_to_first_learning_challenge` → `time_to_first_reward` →
  `activation_cycle_completed`, nessa ordem, formam o funil. Lido semanalmente por
  `GET /admin/metrics` → `weeklyFunnel` (lab-165).
- **Retenção infantil** (D1/D7) — já calculada desde o lab-99 a partir de QUALQUER evento
  (`handleAdminMetrics`, `d1Retention`/`d7Retention`), não depende de nenhum evento específico.
- **Confiança do responsável** / **conversão adulta** — `parent_area_click` → `family_landing_viewed`
  → `parent_signup_started` → `checkout_started` (lab-166) formam o funil completo, do primeiro
  clique na `TitleScreen` até o início do pagamento; famílias novas ainda vêm direto de
  `family_accounts` (não é evento, é estado já persistido — ver `weeklyCommercial` abaixo).
  `weekly_report_preview_viewed` (lab-173) mede interesse específico no benefício de relatório —
  não faz parte da SEQUÊNCIA obrigatória do funil (pode ou não acontecer entre
  `family_landing_viewed` e `parent_signup_started`), é lido em paralelo pra saber quantos
  responsáveis que veem a proposta clicam especificamente pra ver o exemplo do relatório.
- **`title_play_click_rate`** — `play_click` / total de sessões (`session_start`).
- **"Visitas por criança"** (métrica esperada de "Lab 171 - Casa visitável somente leitura",
  docs/market-metrics-engagement-backlog.md) — `house_visited` (lab-175), lido em paralelo (não
  faz parte de nenhum funil obrigatório), mede quantas vezes uma criança visita a casa de um amigo.

## O que NÃO é evento de client (mas ainda vira número no funil semanal)

Alguns números do documento (seção 4, "Métricas de apoio": `friend_request_sent_rate`,
`friend_accept_rate`, conversão de assinatura) já existem como ESTADO em tabelas próprias — criar
um evento de client duplicaria informação que o banco já tem de forma mais confiável (o evento
podia falhar silenciosamente por rede; a linha na tabela é a fonte de verdade real da ação).
`GET /admin/metrics` (`weeklySocial`/`weeklyCommercial`, lab-165) lê direto dessas tabelas:

| Métrica | Fonte real (não é `product_events`) |
| --- | --- |
| Pedidos de amizade enviados na semana | `friendships.created_at` (lab-160) |
| Pedidos de amizade aceitos na semana | `friendships.updated_at` onde `status = 'accepted'` (lab-160) |
| Jogadores novos na semana | `player_identities.created_at` (lab-159) |
| Famílias novas na semana | `family_accounts.created_at` (Fase A) |

## Pendências conhecidas (fora de escopo deste lab, registradas pro backlog)

- ~~`checkout_started`/`family_landing_viewed`/`parent_signup_started` ainda não existem~~ —
  **resolvido no lab-166** (`FamilyValueProp`/`Dashboard.handleSubscribe`, ver tabela acima).
- **"Assinaturas ativadas na semana" não existe hoje, de propósito** (achado do review do Copilot
  no PR #39, `weeklyCommercial`): a primeira versão deste lab tentou aproximar isso por
  `subscriptions.updated_at` onde `status = 'active'`, mas `updated_at` é tocado em QUALQUER
  webhook do Stripe pra aquela linha (renovação, tentativa de pagamento falha, etc. — ver
  `upsertSubscription`, `server-accounts/src/index.ts`), não só na transição real pra `active`;
  contar assim infla o número e mede a coisa errada. Uma métrica correta precisaria de uma coluna
  própria tipo `activated_at`, escrita só quando o status realmente TRANSICIONA pra `active` — isso
  é uma mudança de schema + lógica no handler do webhook, fora do escopo deste lab de
  catálogo/dashboard só-leitura. Candidato a lab futuro se essa métrica virar prioridade real.
- North Star "sessão de pelo menos 8 minutos com pelo menos 1 desafio educativo" ainda não é uma
  métrica isolada — precisaria de uma consulta cruzando `session_end.durationMs >= 8min` com
  `quest_completed` na MESMA sessão, e hoje não existe um id de sessão comum entre eventos de uma
  mesma sessão pra fazer esse cruzamento (só `device_id` + proximidade de horário). Registrar como
  possível item de um lab futuro se a métrica precisar ficar exata.
- `safe_social_session_rate` (sessões com 2+ jogadores) não tem fonte hoje — o relay de multiplayer
  (`server-cf-relay`) não persiste presença histórica, só estado em memória da sessão WebSocket
  atual.
