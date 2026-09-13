# Laboratório 181 — Circuito de descoberta e álbum de planetas

Status: concluído
Início: 2026-09-13
Fim: 2026-09-13
Commit inicial: 57e52fc5fce618db0099fe6f004e014e0b4632f2

## Objetivo do laboratório

Uma visão por planeta (não só a lista plana atual) do que já foi descoberto e do que falta — postal,
"objeto acionável" (baú ou pote de moedas de Marte) e o 3º slot (escolinha de astronomia ou segredo
visual) — com destaque de "próxima descoberta" sempre grátis, dentro do `AchievementsPanel.tsx` já
existente.

Origem: `docs/growth-retention-monetization-backlog.md`, "Lab 181", item 7 da ordem sugerida,
próximo item recomendado após o lab-180 (`CONTEXT.md` do lab-180, "O que o próximo laboratório
deve desenvolver").

## Investigação prévia (antes de codar)

- `AchievementsPanel.tsx` hoje é um modal só com 3 seções em LISTA PLANA (badges, postais, pets) —
  nenhuma visão agrupada por planeta.
- Cada planeta-destino já tem exatamente 3 "slots" de descoberta graças ao lab-179 (unificados sob
  `planet_interaction_completed`/`kind`): `collectible` (postal, `data/postcards.ts`, todos os 7
  planetas), `actionable_object` (baú de tesouro pra 6 planetas via `data/treasureChests.ts`, OU o
  pote de moedas de Marte — persistido em `progress.unlockedHatIds` via `unlockMarsReward`,
  confirmado durável, não é só `marsClearedThisVisit` que é por-visita), e o 3º slot varia:
  `educational_quiz` (`data/planetQuests.ts`, 6 planetas) OU `visual_secret`
  (`data/planetSecrets.ts`, só Marte).
- Não existe hoje nenhuma função que enumere "tudo que dá pra descobrir no planeta X" cruzando os 4
  catálogos — `progression.ts` JÁ importa os 4 helpers relevantes
  (`findPostcardByPlanetId`/`findTreasureChestById`/`findPlanetSecretByPlanetId`/
  `findPlanetIdForQuest`+`isPlanetFullyCompleted`), então uma função nova ali não introduz import
  circular novo.
- `discoverable_collected` do backlog é REDUNDANTE com `planet_interaction_completed` (lab-179) —
  já existe, já tem `weeklyFunnel.planetInteractionCompleted` cobrindo "descobertas por semana".
  Reaproveitado, não recriado.
- `album_planet_opened` é genuinamente novo (não existe visão de álbum por planeta ainda).
- `DESTINATION_PLANETS`/`DESTINATION_PLANET_LIST` (id/nome/emoji dos 7 planetas) vive hoje DENTRO
  de `World3D.tsx`, junto de metadado 3D (raio, centro, `landingUp`) que não faz sentido importar
  na camada de domínio. Uma lista nova e mínima (`data/destinationPlanets.ts`, só id/nome/emoji)
  evita acoplar `progression.ts`/`AchievementsPanel.tsx` à engine 3D — `World3D.tsx` continua
  com a sua própria constante, sem mudança ali (risco zero de regressão no seletor de planeta).
- "NPCs" citado pelo backlog interpretado como a escolinha de astronomia já existente (o professor
  NPC = o slot `educational_quiz`) — sem conteúdo novo, mesmo espírito de reaproveitamento do
  lab-180.

## Funcionalidades planejadas

- [x] ~~`data/destinationPlanets.ts` novo~~ — descartado durante a implementação:
  `data/postcards.ts` já expõe `POSTCARD_CATALOG` com id/nome/emoji dos 7 planetas-destino, na
  mesma ordem de `DESTINATION_PLANET_LIST` (`World3D.tsx`), sem nenhum metadado 3D. Reaproveitado
  diretamente em `progression.ts` e `AchievementsPanel.tsx` — zero import novo, zero risco de
  duplicar a lista de planetas em dois lugares.
- [x] `planetDiscoverySlots(planetId, progress)` (`state/progression.ts`, função pura) — devolve os
  3 slots certos pro planeta (`collectible`/`actionable_object`/o 3º que varia) com
  `discovered: boolean` cada, cruzando os 4 catálogos existentes.
- [x] `nextPlanetDiscovery(progress)` (função pura) — acha a próxima descoberta ainda não feita,
  seguindo a ordem de `POSTCARD_CATALOG`; sempre grátis (nunca checa `entitlementActive`/assinatura
  — a regra inegociável do projeto é nunca gatear progresso/exploração, só cosmético).
- [x] Testes novos em `progression.test.ts` (cobrindo Marte com seus 2 catálogos diferentes vs. os
  outros 6 planetas, planeta 100% descoberto, progresso vazio, nome de planeta herdado de
  `Object.prototype`, escolinha descoberta na 1ª pergunta, marco permanente do pote de Marte) — 13
  testes novos (2 em `markMarsCoinPotFound`, 7 em `planetDiscoverySlots`, 4 em
  `nextPlanetDiscovery`), 198/198 no total.
- [x] Nova seção "Planetas" dentro do `AchievementsPanel.tsx` existente (não um painel novo — evita
  mais um ícone no `HudHeader`, que já tem ~11): lista dos 7 planetas com fração de progresso
  (ex. "1/3 descobertas"), expande ao tocar pra mostrar os 3 slots individuais; destaque "🎯
  Próxima descoberta" no topo da seção, mesmo padrão visual do `nextObjective` já usado pra
  badges/postais/pets. Verificado ao vivo (dev server): expandir Marte mostra os 3 slots
  corretos, e marcar o postal como coletado (via `localStorage`) atualiza o slot pra descoberto e
  avança a "próxima descoberta" pro pote de moedas alienígena (ver "Review automático do Copilot"
  no `CONTEXT.md`, rodadas 4-5, sobre o marco permanente novo que sustenta esse slot).
- [x] Evento novo `album_planet_opened` (`meta.planetId`) — dispara ao expandir um planeta
  específico na lista (sinal de interesse real, não só abrir o painel inteiro). Allowlist em
  `server-accounts/src/domain.ts`, validação em `index.ts`, `weeklyFunnel.albumPlanetOpened`.
  Verificado ao vivo via `window.fetch` monkey-patch: payload exato
  `{"type":"album_planet_opened","meta":{"planetId":"marte"}}` capturado ao expandir Marte.
- [x] `docs/event-catalog.md` atualizado com a linha nova + nota que `discoverable_collected` já é
  coberto por `planet_interaction_completed` (lab-179).

## Fora de escopo (explicitamente adiado)

- Colecionável aleatório pago, trading entre crianças, ranking competitivo — já excluídos pelo
  próprio backlog.
- Slot de "NPC" dedicado novo (não existe no modelo de dados atual, exigiria conteúdo novo — a
  escolinha de astronomia já cobre esse papel dentro do slot `educational_quiz`).
- D7 por número de descobertas (métrica citada pelo backlog) — `weeklyFunnel.planetInteractionCompleted`
  já mede alcance semanal desde o lab-179; um corte específico "D7" exigiria uma consulta de coorte
  nova (mesmo padrão do lab-185), fora do escopo pequeno deste lab.
