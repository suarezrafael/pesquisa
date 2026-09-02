# Laboratório 130 — Mobília desbloqueada por planeta conquistado

Status: concluído
Início: 2026-08-30
Fim: 2026-08-30
Commit inicial: 7667e1daa7f4027769e4b6db6ee4be9979800214

## Objetivo do laboratório

Pedido original do usuário (backlog discutido em chat, mesma mensagem que originou lab-127/128):
*"cada planeta deve subir o nivel das perguntas para liberar mais itens na casinha de cada um"* —
escolhido pelo usuário via `AskUserQuestion` entre 4 opções de backlog (as outras: baús de tesouro
escondidos, bônus por limpar planeta inteiro, persistência de Minha Casa pra assinante).

Interpretação confirmada pela combinação com o resto do backlog já resolvido: completar TODAS as 6
escolinhas de um planeta-destino (Mercúrio/Vênus/Júpiter/Saturno/Urano/Netuno, já expandidas no
lab-127) concede um item de mobília EXCLUSIVO e temático daquele planeta pra "Minha Casa" — de
graça, como recompensa por conquistar o planeta, não comprável com moeda.

## Investigado antes de planejar

- **Precedente exato já existe**: `unlockMarsReward` (`progression.ts`, lab-94) já concede um item
  (chapéu) de graça, de forma idempotente, disparado por um evento de gameplay (limpar Marte) — é
  o mesmo padrão de "recompensa automática por conquista", só trocando "chapéu" por "mobília" e
  "matar inimigos" por "responder todas as escolinhas do planeta".
- **`FurnitureOption`/`unlockGeneric`** (`furniture.ts`/`progression.ts`) já suportam um item não-
  comprável via o campo `subscriptionOnly` (que `unlockGeneric` rejeita na compra normal) — o mesmo
  mecanismo serve pra um novo campo `planetReward`, sem duplicar a checagem de compra.
- **`applyPlanetQuestCompletion`** (`progression.ts`, lab-115/127) já é o ponto único onde toda
  resposta de escolinha de planeta passa — é o lugar certo pra checar "esse planeta acabou de ficar
  100% completo?" sem duplicar lógica em `App.tsx`/`World3D.tsx`.
- **`planetQuests: Record<string, Quest[]>`** (lab-127) já lista as 6 perguntas de cada planeta —
  dá pra checar "planeta completo" comparando o array de ids do planeta contra
  `progress.completedPlanetQuestIds`, sem precisar de um contador novo no `Progress`.
- **`MyHousePanel.tsx`** já tem uma grade genérica que decide comprável/trancado/possuído por item
  — só precisa de um terceiro estado visual (trancado por planeta, não por assinatura) além dos dois
  que já existem.
- **`RewardToast.tsx`** já tem o padrão de "linha de bônus condicional" (usado pro evento semanal e
  pro bônus de assinante) — reaproveitável pra anunciar "novo item pra Minha Casa" sem criar um
  segundo toast/modal.

## Decisões técnicas tomadas

- **6 itens novos, um por planeta, `cost: 0` + `planetReward: '<planetId>'`** em
  `FURNITURE_CATALOG` — nomes/emojis temáticos amarrados ao que cada planeta já é no jogo (não
  genéricos): Meteorito de Mercúrio ☄️, Vulcão de Vênus 🌋 (superfície vulcânica, lab-111), Mancha
  Vermelha de Júpiter 🟠 (decalque já existente no planeta, lab-112), Anel de Saturno 💍 (anel já
  existente, lab-113), Cristal de Urano 🧊 (gigante de gelo, lab-114), Redemoinho de Netuno 🌊
  (ventos/Mancha Escura, lab-114).
- **`unlockGeneric` passa a rejeitar itens com `planetReward` definido** (mesmo `if` que já rejeita
  `subscriptionOnly`) — garante que ninguém "compra" o item de conquista por moeda mesmo com
  `cost: 0`; só a função de concessão dedicada (`unlockPlanetFurnitureReward`) pode adicioná-lo a
  `unlockedFurnitureIds`.
- **Checagem de "planeta completo" dentro de `applyPlanetQuestCompletion`**, não num efeito
  separado em `App.tsx`/`World3D.tsx` — mesma filosofia de manter regra de domínio em
  `progression.ts` (`docs/prompts/03-arquitetura-sistema.md` §1), testável sem precisar montar a
  cena 3D. `CompletionResult` ganha um campo novo opcional (`unlockedFurnitureItem?: FurnitureOption`),
  populado só quando a resposta atual foi a que completou o planeta pela primeira vez.
- **Anúncio via `RewardToast` estendido**, não um toast novo — evita empilhar dois modais
  (recompensa da pergunta + recompensa da mobília) na mesma interação; mostra as duas informações
  juntas ("respondeu a última pergunta de Mercúrio" já é a mesma ação que "ganhou o Meteorito").
- **`MyHousePanel` ganha um terceiro estado de trancado** ("🔒 Conquiste o planeta", cor neutra,
  igual ao padrão visual de "🔒 Assinantes" mas com texto diferente) pros itens `planetReward` ainda
  não concedidos — sem isso, o botão de compra por 0 moedas ficaria clicável e concederia o item de
  graça sem cumprir a condição real.

## Funcionalidades planejadas

- [x] `data/planetQuests.ts`: `findPlanetIdForQuest(questId)` e `isPlanetFullyCompleted(planetId,
      completedIds)` novos (funções puras, sem dependência de `Progress`).
- [x] `data/furniture.ts`: `planetReward?: string` novo em `FurnitureOption`; 6 itens novos
      (`cost: 0`); `findFurnitureRewardForPlanet(planetId)` novo.
- [x] `state/progression.ts`: `unlockGeneric` rejeita `planetReward`; `unlockPlanetFurnitureReward`
      novo (idempotente, mesmo formato de retorno de `unlockMarsReward`); `applyPlanetQuestCompletion`
      chama a concessão ao detectar planeta 100% completo e expõe `unlockedFurnitureItem` no
      `CompletionResult`.
- [x] `components/RewardToast.tsx`: prop `unlockedFurnitureItem?: FurnitureOption` novo, linha de
      bônus condicional quando presente.
- [x] `App.tsx`: `handleCompletePlanetQuest`/estado `reward` repassam `unlockedFurnitureItem`.
- [x] `world3d/MyHousePanel.tsx`: terceiro estado visual (trancado por planeta) pros itens
      `planetReward` ainda não concedidos.
- [x] Testes novos em `progression.test.ts`: planeta completo concede o item certo uma única vez
      (idempotente em respostas repetidas ou revisitas), item `planetReward` não pode ser comprado
      via `unlockFurniture` mesmo com moeda suficiente, planetas diferentes não se confundem (8
      testes novos, suite 52→60).
- [x] Verificação: `npm run build`/`npm run test` sem erros. Verificação ao vivo PARCIAL — ver
      `CONTEXT.md` pra detalhe e limitação encontrada (navegação de teleporte de debug dentro do
      interior da casa não reproduziu a distância/estado corretos pra abrir o painel ao vivo; o
      fluxo de porta→interior em si é código do lab-123, não tocado aqui).
