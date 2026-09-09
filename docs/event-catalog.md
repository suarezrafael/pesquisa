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
- **Confiança do responsável** / **conversão adulta** — `parent_area_click` mede quem sequer chega
  na área dos responsáveis; famílias/assinaturas novas vêm direto de `family_accounts`/
  `subscriptions` (não são eventos, são estado já persistido — ver `weeklyCommercial` abaixo).
- **`title_play_click_rate`** — `play_click` / total de sessões (`session_start`).

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
| Assinaturas ativadas na semana | `subscriptions.updated_at` onde `status = 'active'` (Fase C) |

## Pendências conhecidas (fora de escopo deste lab, registradas pro backlog)

- `checkout_started`/`family_landing_viewed`/`parent_signup_started` (citados no documento como
  parte do funil de conversão adulta) ainda não existem como evento nem como estado consultável —
  vão nascer junto da reformulação da página familiar (lab-166), que mexe exatamente nesse fluxo.
- North Star "sessão de pelo menos 8 minutos com pelo menos 1 desafio educativo" ainda não é uma
  métrica isolada — precisaria de uma consulta cruzando `session_end.durationMs >= 8min` com
  `quest_completed` na MESMA sessão, e hoje não existe um id de sessão comum entre eventos de uma
  mesma sessão pra fazer esse cruzamento (só `device_id` + proximidade de horário). Registrar como
  possível item de um lab futuro se a métrica precisar ficar exata.
- `safe_social_session_rate` (sessões com 2+ jogadores) não tem fonte hoje — o relay de multiplayer
  (`server-cf-relay`) não persiste presença histórica, só estado em memória da sessão WebSocket
  atual.
