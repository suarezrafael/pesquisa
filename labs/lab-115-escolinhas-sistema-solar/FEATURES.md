# Laboratório 115 — Escolinhas nos planetas do Sistema Solar + nível mínimo por distância

Status: em andamento
Início: 2026-08-29
Commit inicial: 39144d83f8d16aec5aa568cf409ab6d188b84381

## Objetivo do laboratório
Pedido do usuário: "crie escolinhas com perguntas tbm nos planetas novos para ampliar a elevação
dos níveis, e quanto mais longe o planeta mais alto deve ser o nível do usuário." Dois pedidos
combinados:
1. Cada um dos 6 planetas novos da frente Sistema Solar (Mercúrio, Vênus, Júpiter, Saturno, Urano,
   Netuno — labs 110-114) ganha uma escolinha com pergunta, cuja recompensa dá XP de verdade
   (ajuda a subir de nível — ao contrário dos "Quizzes Surpresa" do Prédio dos Enigmas, que dão só
   moeda de propósito).
2. Viajar pra um planeta mais distante do Sol exige um nível mínimo mais alto — cria um laço de
   progressão (fazer as escolinhas mais próximas sobe de nível, o que libera viajar mais longe).

## Investigado antes de planejar
- `isQuestUnlocked`/`completedQuestIds`/`badgesEarnedAt` (`progression.ts`) são todos POSICIONAIS
  e contam contra `quests.length` (30, fixo) — misturar perguntas de planeta nesse mesmo array ou
  nesse mesmo `completedQuestIds` quebraria as contagens de emblema ("Metade do Caminho"/"Mestre
  das Missões"), fazendo um jogador terminar as 30 + 6 de planeta cedo demais.
- Precedente já existe pra isolar um banco de perguntas do principal: `data/surpriseQuizzes.ts` +
  `handleSurpriseQuizCorrect` (App.tsx) — deliberadamente fora de `completedQuestIds`/badges,
  premia só na hora via `collectCoin`. MESMA técnica de isolamento, mas aqui precisa dar XP de
  verdade (o pedido é explicitamente sobre subir de nível), então precisa de uma lista de
  concluídas própria (`completedPlanetQuestIds`) em vez de reaproveitar o wrapper de moeda direto.
- As escolinhas do planeta principal (`quests.forEach` em `World3D.tsx`) usam
  `terrainGroundRadial`/`settleMeshOnTerrain` — sistema pesado, feito pra relevo IRREGULAR
  (montanhas, lab-95). Os 6 planetas novos são esferas PERFEITAS (`MeshBuilder.CreateSphere` +
  `PhysicsShapeType.SPHERE`), sem relevo — não precisam desse sistema; posição
  `localUp.scale(radius)` já cai exatamente na superfície, mesmo padrão já usado pra posicionar
  moedas/foguete/rochas nesses planetas.
- `DESTINATION_PLANETS` (registro genérico do lab-110) já é o único lugar que sabe "quais planetas
  existem" — o seletor (`PlanetPickerPanel`) já lê só dali. Adicionar `requiredLevel` ali e
  bloquear o botão "Viajar" no seletor cobre 100% dos pontos de embarque (não existe outro caminho
  pra chamar `boardRocket` com um planeta específico).
- Ordem real de distância ao Sol entre os 6 novos: Mercúrio < Vênus < (Terra/planeta principal) <
  (Marte) < Júpiter < Saturno < Urano < Netuno.

## Decisões técnicas tomadas
- **Marte fica de fora do nível mínimo** — já é alcançável sem nenhum requisito desde o lab-60;
  adicionar um nível mínimo agora mudaria comportamento já em produção pra quem já joga. Só os 6
  planetas desta frente (que nunca tiveram requisito nenhum, lançados juntos) recebem
  `requiredLevel`.
- **Nível mínimo escalona com a ordem real de distância**: Mercúrio=2, Vênus=3, Júpiter=5,
  Saturno=7, Urano=9, Netuno=11 — alcançável naturalmente completando escolinhas do planeta
  principal + as novas escolinhas de planeta (cada uma dá XP), sem exigir bloqueio artificial logo
  de cara.
- **Perguntas de astronomia real sobre cada planeta** (não lógica/matemática/leitura genérica) —
  tema natural pro contexto ("você acabou de pousar em Júpiter"), e ideia já cogitada (não pedida)
  no CONTEXT.md do lab-114 como possível próxima frente.
- **Uma escolinha por planeta novo** (não várias) — os planetas são pequenos e sem rocha/cratera
  (gigantes gasosos/gelo) ou já lotados de rocha (Mercúrio/Vênus); uma única pergunta temática por
  parada mantém a visita rápida, consistente com "moedas escondidas, sem combate" (lab-110).
- **Escolinha isolada em `completedPlanetQuestIds`** — não conta pra `completedQuestIds`/badges do
  planeta principal, mesmo espírito de isolamento do Quiz Surpresa, mas com XP de verdade (preenche
  o pedido "ampliar a elevação dos níveis").
- **Estrutura visual simplificada** (não a escolinha completa com paredes/fundação/professor do
  planeta principal) — planetas são esferas perfeitas, sem risco de "casinha enterrada" (lab-95);
  um totem/quiosque simples com o professor parado ao lado é suficiente e evita reimplementar
  `settleMeshOnTerrain` (desnecessário aqui).

## Funcionalidades planejadas
- [ ] `types.ts`: `Progress.completedPlanetQuestIds: string[]` (novo campo).
- [ ] `storage.ts`: `emptyProgress.completedPlanetQuestIds: []`.
- [ ] `data/planetQuests.ts` (novo): um `Quest` de astronomia por planeta novo
      (`Record<string, Quest>`, chave = id do planeta), com `xpReward`/`coinReward` de verdade.
- [ ] `progression.ts`: `applyPlanetQuestCompletion(progress, quest, event?)` — idempotente via
      `completedPlanetQuestIds`, aplica multiplicador do evento semanal, NÃO mexe em
      `completedQuestIds`/`badges`.
- [ ] `useProgress.ts`: `completePlanetQuest(quest)` (mesmo formato de `completeQuest`).
- [ ] `DESTINATION_PLANETS` (`World3D.tsx`): `requiredLevel` por planeta (Mercúrio/Vênus/Júpiter/
      Saturno/Urano/Netuno; Marte e planeta principal sem requisito).
- [ ] `World3D.tsx`: escolinha simplificada (totem + professor) em cada `buildXIfNeeded()` dos 6
      planetas novos, gatilho de proximidade chamando `onSelectPlanetQuest(planetId)`.
- [ ] `PlanetPickerPanel.tsx`: recebe nível atual do jogador, mostra 🔒 + "Nível X necessário" e
      desabilita "Viajar" pra planetas acima do nível atual.
- [ ] `App.tsx`: estado/handler pra abrir/resolver a escolinha de planeta (reaproveita
      `QuestModal`/`RewardToast` já existentes).
- [ ] Testes (`progression.test.ts`): `applyPlanetQuestCompletion` — recompensa normal, idempotência
      (repetir não duplica XP), isolamento de `completedQuestIds`/badges.
- [ ] Verificação ao vivo (dev server + browser automation): nível bloqueando/liberando viagem,
      pelo menos uma escolinha de planeta respondida com XP creditado.

## Fora de escopo (explicitamente adiado)
- Nível mínimo em Marte ou no planeta principal — nenhum dos dois nunca teve requisito, fora do
  pedido.
- Múltiplas escolinhas por planeta novo.
- Qualquer mudança em `isQuestUnlocked`/badges do planeta principal.
