# Laboratório 179 — Planetas interativos v1

Status: em andamento
Início: 2026-09-12
Fim: -
Commit inicial: 3d7d825aa76b3ea38dcb653b9f1031bf2ac94de5

## Objetivo do laboratório

Fechar o item `docs/growth-retention-monetization-backlog.md`, "Lab 179 - Planetas interativos v1"
(P1) — próximo item recomendado no `CONTEXT.md` do lab-185. Escopo do backlog: pelo menos 3
interações por planeta existente (NPC com fala catalogada, objeto acionável, mini-puzzle
ambiental, colecionável ou segredo visual), instrumentadas com eventos próprios, sem texto
livre/UGC.

## Investigação prévia (antes de codar)

Levantamento do código real feito antes de escrever este documento — achado principal: **muito
mais infraestrutura de interação já existe do que o backlog sugere**, o gap real é bem menor que
"21 interações novas" (7 planetas × 3):

- **6 dos 7 planetas-destino** (`mercurio`, `venus`, `jupiter`, `saturno`, `urano`, `netuno` —
  todos exceto `marte`) **já têm 3 interações reais, distintas, cada um**:
  - **`data/postcards.ts`** — cartão-postal colecionável, concedido de graça na primeira chegada
    (`applyPostcardCollected`, `progression.ts`) → categoria "colecionável".
  - **`data/treasureChests.ts`** — baú de tesouro 3D físico (modelo completo em `World3D.tsx`,
    achado por proximidade) → categoria "objeto acionável".
  - **`data/planetQuests.ts`** — 6 "escolinhas" de astronomia por planeta (`applyPlanetQuestCompletion`,
    dão XP de verdade) → categoria "desafio educativo" (satisfaz o critério de aceite "pelo menos
    uma interação conecta a desafio educativo curto").
  - **NENHUMA das 3 dispara evento de analytics hoje** — confirmado grepando `state/useProgress.ts`:
    só `completeQuest` (missão do planeta principal) chama `trackQuestCompleted`; os call sites de
    `applyPlanetQuestCompletion`/`applyTreasureChestFound`/`applyPostcardCollected` não chamam
    nenhuma função de `productAnalytics.ts`. Isso explica por que o backlog pede
    "instrumentar eventos" — as interações já existem, só não são medidas.
- **`marte` é o único planeta sem baú (`treasureChests.ts` exclui `marte` explicitamente, "Marte já
  tem sua própria recompensa exclusiva de exploração") e sem escolinha** (`planetQuests.ts` não tem
  chave `marte`) — tem só o cartão-postal (colecionável) + o combate contra ETs/robôs (lab-60) que,
  ao vencer, revela um "pote de moedas" na base alienígena (lab-128, objeto acionável/recompensa de
  exploração gated). Isso já dá 2 interações distintas a Marte; falta 1 pra bater o "pelo menos 3"
  do backlog.
- **Não existe NENHUM sistema de NPC com diálogo em planetas** — `WalkerNpc` (bolha de fala) existe
  só no mundo principal (hub), pra "pessoas" de fundo. Um comentário antigo em `World3D.tsx`
  (linha ~463, contexto de Marte) registra uma decisão explícita e anterior do usuário: "por
  enquanto o planetinha pode ter só árvores e rochas, não precisa NPC" — decisão de performance
  (mesmo espírito da contagem baixa de inimigos em Marte, "cada inimigo roda IA por quadro").
  Decisão deste lab: NÃO introduzir NPCs em planetas agora — usar a interação nova de Marte pra
  fechar o "≥3" com uma categoria mais barata (mini-puzzle ambiental ou segredo visual), coerente
  com essa restrição de performance já estabelecida, em vez de reabrir essa decisão sem necessidade
  (o backlog pede "pelo menos 3 interações", não exige as 5 categorias inteiras).
- **Padrão pra evento novo**: em vez de 1 evento por tipo de interação (o que o lab-185 fez pros 3
  eventos dele), este lab usa **1 evento genérico `planet_interaction_completed`** com
  `meta: { planetId, kind }` — o nome da métrica esperada no backlog
  (`planet_interactions_per_session`) já é uma contagem AGREGADA por tipo, não por tipo separado;
  um evento genérico com `kind` também deixa contar "quantos tipos distintos de interação uma
  criança já fez num planeta" com uma única query (`count(distinct meta->>'kind')`), o que é
  literalmente o critério de aceite "pelo menos 3 interações por planeta". `kind` allowlist:
  `collectible` (postcard), `actionable_object` (baú, pote de moedas de Marte),
  `educational_quiz` (escolinha), e o que a nova interação de Marte definir.
- **Nenhuma migração de banco necessária** — mesmo padrão do lab-185, `product_events` já tem tudo.

## Funcionalidades planejadas

- [ ] Evento novo `planet_interaction_completed` na allowlist `PRODUCT_EVENT_TYPES`
      (`app/server-accounts/src/domain.ts`) + tracker fino `trackPlanetInteractionCompleted(planetId, kind)`
      em `productAnalytics.ts`, mesmo padrão de `trackPlanetTravelCompleted`. Validação
      server-side de `kind` (allowlist fixa) e `planetId` (reaproveita `isValidDestinationPlanetId`
      já existente do lab-185) em `handleTrackEvent`, mesmo padrão de `isValidCosmeticSlot`.
      (referência: backlog, Lab 179, "instrumentar eventos"; "eventos não coletam PII")
- [ ] Instrumentar as 3 interações já existentes nos 6 planetas que já as têm: disparar
      `trackPlanetInteractionCompleted` nos call sites de `applyPostcardCollected` (`kind: 'collectible'`),
      `applyTreasureChestFound` (`kind: 'actionable_object'`) e `applyPlanetQuestCompletion`
      (`kind: 'educational_quiz'`) — em `useProgress.ts`/`App.tsx`, mesmo lugar onde
      `trackQuestCompleted` já é chamado hoje pra missões do planeta principal.
      (referência: backlog, Lab 179, "cada planeta tem objetivo/descoberta clara"; "pelo menos uma
      interação conecta a desafio educativo curto")
- [ ] Nova interação pra Marte fechar o "≥3" (categoria a definir na implementação: mini-puzzle
      ambiental ou segredo visual, evitando NPC por já ter uma decisão de performance registrada
      contra isso) — sem texto livre, com feedback audiovisual claro, instrumentada com o mesmo
      evento genérico (`kind` próprio).
      (referência: backlog, Lab 179, "pelo menos 3 interações por planeta existente")
- [ ] `GET /admin/metrics` ganha uma chave nova em `weeklyFunnel` (`planetInteractionCompleted`),
      mesmo padrão `weeklyDevices(tipo)` das chaves já existentes — dá visibilidade agregada sem
      esperar o backlog pedir uma query de coorte dedicada.
      (referência: backlog, Lab 179, "Métricas esperadas: planet_interactions_per_session")
- [ ] `docs/event-catalog.md` atualizado com o evento novo, incluindo a allowlist de `kind`.
- [ ] Teste automatizado das novas funções puras de validação em `domain.test.ts` (mesmo padrão de
      `isValidCosmeticSlot`).
- [ ] Verificado ao vivo num navegador real: cada uma das 3 interações já existentes disparando o
      evento genérico com o `kind` certo (postcard, baú, escolinha) em pelo menos um planeta; a
      interação nova de Marte funcionando e disparando seu próprio `kind`. Verificado ao vivo contra
      produção (leitura) confirmando o evento aceito pela allowlist.

## Fora de escopo (explicitamente adiado)

- Planeta novo, editor de mundo, narrativa longa, monetização (explicitamente fora de escopo no
  próprio item do backlog).
- Sistema de NPC com diálogo em planetas — decisão deste lab de não reabrir essa frente agora
  (ver investigação prévia); pode virar um lab futuro se o backlog priorizar.
- Métricas de coorte dedicadas (`return_after_planet_visit`, D1/D7 específico de quem visita
  planeta) — a infraestrutura de coorte do lab-185 (`cohortComparison`) já permite calcular isso
  manualmente via `?cohortSplitDate=`, mas uma métrica NOMEADA e exposta fica pra quando o backlog
  pedir explicitamente (mesmo espírito do lab-185, que não expôs toda métrica imaginável de uma vez).
