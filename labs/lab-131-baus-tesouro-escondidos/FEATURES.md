# Laboratório 131 — Baús de tesouro escondidos

Status: concluído
Início: 2026-08-30
Fim: 2026-08-30
Commit inicial: 257c404fe7f9bf3f29658b57f625bfc1da8a03cf

## Objetivo do laboratório

Item do backlog de engajamento discutido em chat (*"me ajude a criar um backlog intressantes para
o jogo... baús de tesouro escondidos"*), escolhido pelo usuário via `AskUserQuestion` entre 4
opções. Um baú de tesouro escondido por planeta-destino (Mercúrio/Vênus/Júpiter/Saturno/Urano/
Netuno), achado por exploração (sem pergunta, sem combate), dando moeda bônus. Achado UMA VEZ SÓ
por planeta, pra sempre (persistido no `Progress`) — diferente das moedas comuns escondidas (que
resetam a cada sessão) e do pote de Marte (que reseta a cada visita): é uma descoberta rara, não um
farm repetível.

## Investigado antes de planejar

- **Marte já tem sua própria recompensa exclusiva de exploração** (pote de moedas ao vencer os
  inimigos, lab-128) — escopo deste laboratório fica nos MESMOS 6 planetas sem combate já usados
  por lab-127/129 (Mercúrio/Vênus/Júpiter/Saturno/Urano/Netuno), evitando redundância em Marte e o
  escopo bem maior do planeta principal (30 escolinhas, superfície mais cheia).
- **`PLANET_SCHOOL_DIRS`** (lab-127) já resolveu "onde colocar 1 elemento por planeta sem colidir
  com nada" via ângulo de ouro (`phi` 35°-145°, `theta = index * GOLDEN_ANGLE`), medido pro pior
  caso (Mercúrio, o menor). Reaproveitar a MESMA parametrização — só um `phi` mais perto do polo
  sul (165°, fora da faixa das escolinhas e longe da plataforma de pouso em `phi≈0`) — dá uma 7ª
  direção seguramente separada das outras 6 sem precisar remedir do zero.
- **Todos os 6 `landingUp` são literalmente `(0,1,0)`** (mesmo vetor pros 6 planetas) — descartada
  a ideia inicial de derivar a direção do baú rotacionando `landingUp` (como o pote de Marte fez
  com `MARS_UFO_DIR`): `Cross(landingUp, Up())` degenera pra vetor zero quando os dois são
  paralelos, que é exatamente o caso aqui.
- **`progressRef.current`** já é lido em tempo de CONSTRUÇÃO do planeta em outro lugar
  (`houseFurnitureNodes[item.id]?.setEnabled(progressRef.current.unlockedFurnitureIds.includes(...))`,
  lab-123/130) — mesmo padrão resolve "esconder o baú se já achado numa sessão anterior" sem
  inventar mecanismo novo: cada planeta só é construído uma vez por sessão (`builtPlanetIds`), então
  checar o `Progress` na hora de construir cobre tanto "primeira visita depois de já ter achado
  antes" quanto "revisita na MESMA sessão depois de achar" (o mesh já fica desabilitado e nunca é
  reconstruído).
- **`applyCoinCollected`/pote de Marte não aplicam multiplicador de evento semanal** (moeda flat) —
  mesmo espírito aqui: é recompensa de EXPLORAÇÃO, não de responder pergunta, então fica de fora do
  sistema de bônus de evento/assinante (que hoje só se aplica a `applyQuestCompletion`/
  `applyPlanetQuestCompletion`).

## Decisões técnicas tomadas

- **Achado permanente, não por visita** — novo campo `Progress.foundTreasureChestIds: string[]`
  (mesmo padrão de `completedPlanetQuestIds`/`unlockedFurnitureIds`, migração automática via
  `{...emptyProgress, ...raw}` em `loadProgress`, sem caso especial). Justificativa: "tesouro
  escondido" implica raridade/descoberta única — deixar resetar por visita viraria um jeito de
  farmar moeda saindo e voltando do planeta, na contramão da intenção do pedido.
- **15 moedas por baú, flat** (sem XP) — mesma filosofia do pote de Marte (lab-128): moeda pra
  cosmético, sem tocar em XP/nível (que fica reservado pra responder perguntas de verdade).
- **Mesh novo e distinto** (baú de madeira com fivela dourada), não reaproveita o visual das moedas
  comuns nem do pote de Marte — precisa ser reconhecível como "achado especial" à primeira vista.
- **Aviso leve, não um modal** — reaproveita o padrão de texto transitório já usado por
  `marsDeathMessage`/`weaponMessage`/`survivalDeathMessage` (classe CSS `.mars-death-message`,
  `useState<string|null>` + `window.setTimeout` pra sumir sozinho) em vez de um `RewardToast`/modal
  novo: é um bônus de exploração de fundo, não deveria interromper o jogo como uma missão faria.
- **Callback novo `onFindTreasureChest(chestId)`**, mesmo formato de prop→ref→gatilho de
  `onUnlockMarsReward` — mantém a lógica de concessão (`applyTreasureChestFound`, idempotente) em
  `progression.ts`, testável sem montar a cena 3D.

## Funcionalidades planejadas

- [x] `types.ts`/`state/storage.ts`: `foundTreasureChestIds: string[]` novo em `Progress`/
      `emptyProgress`.
- [x] `data/treasureChests.ts` novo: catálogo (`id`, `planetId`, `coinReward`) dos 6 baús +
      `findTreasureChestById`.
- [x] `state/progression.ts`: `applyTreasureChestFound(progress, chestId)` novo (idempotente, mesmo
      formato de retorno de `unlockMarsReward`).
- [x] `state/useProgress.ts`: `foundTreasureChest(chestId): boolean` novo (mesmo formato de
      `unlockMarsReward`).
- [x] `App.tsx`/`World3D.tsx`: prop `onFindTreasureChest` novo, mesmo padrão prop→ref de
      `onUnlockMarsReward`.
- [x] `World3D.tsx`: `TREASURE_CHEST_DIR` novo (ângulo de ouro, `phi=165°`, `theta=6*GOLDEN_ANGLE`);
      `buildTreasureChest(...)` novo (mesh + label + registro em `treasureChestMarkers`); chamado
      uma vez por planeta nos 6 `buildXIfNeeded()`; gatilho de proximidade novo (idempotente via
      `pivot.isEnabled()`); mensagem transitória (`treasureFoundMessage`) na descoberta.
- [x] Testes novos em `progression.test.ts`: achado credita a moeda certa uma única vez
      (idempotente em revisitas), baús de planetas diferentes não se confundem, chestId inexistente
      não quebra nada (4 testes novos, suite 60→64).
- [x] Verificação: `npm run build`/`npm run test` sem erros. Verificação ao vivo PARCIAL — o baú de
      Vênus foi visto renderizado corretamente na cena (label "💰 Baú de tesouro!" visível ao vivo
      depois de uma viagem de foguete real), mas o clique de coleta por proximidade não foi
      confirmado ao vivo — achado real de ferramenta documentado em `CONTEXT.md`
      (`window.__debugTeleport` não respeita `currentWorldCenter` fora do planeta principal, sempre
      devolvendo o avatar pra Terra).
