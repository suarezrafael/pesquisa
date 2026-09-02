# Contexto — Laboratório 130 — Mobília desbloqueada por planeta conquistado

Preenchido em: 2026-08-30
Commit inicial → final: 7667e1daa7f4027769e4b6db6ee4be9979800214..HEAD

## O que foi feito

Pedido original do usuário (backlog discutido em chat): *"cada planeta deve subir o nivel das
perguntas para liberar mais itens na casinha de cada um"* — escolhido entre 4 opções de backlog via
`AskUserQuestion`. Completar as 6 escolinhas de um planeta-destino (Mercúrio/Vênus/Júpiter/Saturno/
Urano/Netuno) agora concede, de graça, um item de mobília exclusivo e temático daquele planeta pra
"Minha Casa".

- **`data/planetQuests.ts`**: `findPlanetIdForQuest(questId)` (acha a qual planeta uma pergunta
  pertence) e `isPlanetFullyCompleted(planetId, completedPlanetQuestIds)` (as 6 já respondidas?) —
  funções puras, só dados, sem depender de `Progress`.
- **`data/furniture.ts`**: `planetReward?: string` novo em `FurnitureOption` + 6 itens novos
  (`cost: 0`), um por planeta, temáticos do que já existe em cada um no jogo: Meteorito de Mercúrio
  ☄️ (crateras, lab-110), Vulcão de Vênus 🌋 (superfície vulcânica, lab-111), Mancha Vermelha de
  Júpiter 🟠 (decalque já existente, lab-112), Anel de Saturno 💍 (anel já existente, lab-113),
  Cristal de Urano 🧊 (gigante de gelo, lab-114), Redemoinho de Netuno 🌊 (ventos/Mancha Escura,
  lab-114). `findFurnitureRewardForPlanet(planetId)` novo.
- **`state/progression.ts`**: `unlockGeneric` agora rejeita itens com `planetReward` (mesma
  checagem que já rejeitava `subscriptionOnly`) — ninguém compra um item de conquista com moeda,
  mesmo tendo `cost: 0`. `unlockPlanetFurnitureReward(progress, planetId)` novo — mesmo formato de
  `unlockMarsReward` (lab-94): idempotente, `{ progress, granted, item }`. `applyPlanetQuestCompletion`
  agora, na resposta que COMPLETA o planeta pela primeira vez, chama essa concessão e expõe o item
  concedido via um campo novo em `CompletionResult` (`unlockedFurnitureItem?: FurnitureOption`).
- **`components/RewardToast.tsx`** e **`App.tsx`**: `unlockedFurnitureItem` flui do resultado de
  `completePlanetQuest` até uma nova linha de bônus condicional no toast ("🎉 Planeta conquistado!
  Novo item pra Minha Casa: ☄️ Meteorito de Mercúrio!") — mesmo padrão já usado pro bônus de evento
  semanal e de assinante, sem precisar de um segundo modal.
- **`world3d/MyHousePanel.tsx`**: terceiro estado visual na grade de mobília — itens `planetReward`
  ainda não concedidos mostram "🔒 Conquiste o planeta" (em vez do botão de compra por moeda, que
  ficaria clicável de graça com `cost: 0` sem essa checagem).

## Decisões técnicas tomadas

Ver `FEATURES.md` (seção "Decisões técnicas tomadas") pro racional completo. Resumo:
- Reaproveitar quase integralmente o padrão de `unlockMarsReward` (lab-94) — concessão de graça,
  idempotente, disparada por um evento de gameplay, nunca pela compra normal.
- Checagem de "planeta completo" dentro de `applyPlanetQuestCompletion` (domínio puro,
  `progression.ts`), não em `App.tsx`/`World3D.tsx` — mantém a regra testável sem montar a cena 3D,
  seguindo `docs/prompts/03-arquitetura-sistema.md` §1.
- Anúncio via `RewardToast` estendido, não um toast novo — evita empilhar dois modais na mesma
  interação (responder a última pergunta do planeta JÁ é o mesmo evento que ganhar o item).
- 6 nomes/emojis temáticos amarrados ao que cada planeta já é no jogo, não genéricos — reforça a
  conexão "você conquistou ESTE planeta" em vez de um prêmio aleatório.

## Pendências / dívidas conhecidas

- **A verificação ao vivo do fluxo completo (responder as 6 escolinhas reais de um planeta → ver o
  toast → abrir Minha Casa → ver "✓ Tem") NÃO foi concluída** — tentativa real, não abandonada sem
  esforço: `npm run build`/`npm run test` confirmados limpos, e a navegação até o balcão de "Minha
  Casa" (dentro do interior 3D da casa, lab-123) foi tentada com `window.__debugTeleport` mas
  esbarrou num problema NA PRÓPRIA TÉCNICA DE TESTE, não no produto: o interior da casa usa um
  sistema de coordenadas próprio (`HOUSE_INTERIOR_CENTER`, sala plana, ver `enterHouseInterior()`/
  `exitHouseInterior()` em `World3D.tsx`) com um raio de saída (`HOUSE_TRIGGER_DISTANCE = 1.2`) bem
  perto do próprio ponto de entrada — teleportes de debug feitos às cegas (sem saber a posição
  exata da porta-de-dentro vs. do balcão) acabaram disparando a SAÍDA da casa em vez de aproximar do
  balcão, repetidamente, e o `__debugTeleport` não atualiza a flag de estado `insideHouseInterior`
  do jeito que o movimento real do jogador atualiza. **Isso é uma limitação da automação, não um
  bug encontrado no produto** — o fluxo porta→interior→balcão em si é código do lab-123, não tocado
  por este laboratório, e já foi verificado ao vivo naquela ocasião (ver
  `labs/lab-123-casa-interior-3d/CONTEXT.md`: "balcão abre o catálogo de verdade").
- **Confiança na integração ao vivo vem de três verificações mais baratas e diretas, feitas de
  verdade nesta sessão**: (1) as 8 novas unidades de teste em `progression.test.ts` cobrem
  exatamente a condição de concessão (só na 6ª pergunta, nunca antes, nunca de novo depois, sem
  confundir planetas, e a impossibilidade de compra direta); (2) `unlockedFurnitureIds` testado
  aceitando um id novo (`anel_saturno`) via `localStorage` real, recarregando a página sem quebrar
  nada (HUD/moeda continuaram corretos) — confirma que o formato de dado novo não quebra
  `loadProgress`/render do resto do jogo; (3) revisão de código linha a linha do novo terceiro
  estado do `MyHousePanel` (o `usable`/`affordable` existentes não mudaram, só um `if` novo foi
  inserido ANTES do botão de compra, na mesma posição/prioridade da checagem `subscriptionOnly` já
  em produção há vários laboratórios).
- **Se o usuário reportar que o item não aparece ao completar um planeta de verdade**, o primeiro
  lugar a checar é se a resposta da 6ª pergunta realmente passou por `applyPlanetQuestCompletion`
  (não por um caminho alternativo) — o resto da cadeia (`RewardToast`/`App.tsx`) é passagem direta,
  pouco espaço pra erro ali.

## Funcionalidades planejadas que NÃO foram concluídas

Todas as funcionalidades de código planejadas em `FEATURES.md` foram concluídas. Só a verificação
ao vivo do roteiro completo ficou parcial, pelo motivo explicado acima.

## O que o próximo laboratório deve desenvolver

Do backlog maior discutido em chat, ainda não formalizado em labs: baús de tesouro escondidos,
bônus por limpar um planeta inteiro (item relacionado a este, mas distinto — bônus imediato na
mesma resposta, não mobília), persistência de "Minha Casa" pra assinante (arquitetural, G6 do doc
de escala, precisa de conversa de produto/privacidade antes), combo de respostas certas seguidas,
mini-desafios temáticos por planeta, corrida/parkour temático, colecionável exclusivo por planeta
(sobreposto em espírito com este laboratório — confirmar com o usuário se ainda faz sentido como
item separado), segundo "chefe" em Júpiter, vitrine de troféus mais visual, emotes/danças, evento
sazonal, mascote/pet colecionável, cartão-postal colecionável, boletim/certificado do explorador,
clima ativo por planeta, "distress call" de NPC perdido. Sem prioridade única — perguntar ao
usuário antes de escolher o próximo.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`.
- `npm run test` (em `app/`): 60/60 passando (52→60, 8 testes novos em `progression.test.ts`).
- `npm run build` (em `app/`): typecheck + build de produção sem erros.
- Verificação ao vivo: parcial, ver "Pendências" acima — build/testes confirmados, persistência de
  `localStorage` confirmada, navegação até o balcão dentro do interior da casa não concluída por
  limitação da técnica de teleporte de debug usada, não do produto.
- Como verificar de novo (melhor que a tentativa desta sessão): jogar normalmente (não via
  `__debugTeleport`) — responder as 6 escolinhas reais de um planeta caminhando/voando de foguete,
  confirmar o toast "🎉 Planeta conquistado!" na 6ª, depois entrar em Minha Casa andando de verdade
  (porta → balcão) e confirmar "✓ Tem" no item daquele planeta.
