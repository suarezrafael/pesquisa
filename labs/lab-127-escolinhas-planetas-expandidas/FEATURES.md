# Laboratório 127 — Escolinhas dos planetas expandidas (6+ perguntas cada, igual à Terra)

Status: concluído
Início: 2026-08-30
Fim: 2026-08-30
Commit inicial: 9f8ca54bb91e675aa2a5ea6a97704739a7e9657c

## Objetivo do laboratório

Pedido do usuário, escolhido entre um backlog maior discutido em chat: *"os planetas precisam ter
as escolinhas para pdir perguntas igual a terra... cada planeta deve ter umas 6 questous no
minimo de desafios que ajudma a subir de nivel."* Hoje (lab-115) cada um dos 6 planetas-destino
(Mercúrio/Vênus/Júpiter/Saturno/Urano/Netuno) tem só **1** pergunta de astronomia — expandir pra
6 por planeta, igual ao padrão do planeta principal (várias escolinhas, não uma mega-pergunta).

## Investigado antes de planejar

- **Estrutura de dados atual**: `app/src/data/planetQuests.ts` é `Record<string, Quest>` — UMA
  quest por planeta. Precisa virar `Record<string, Quest[]>`.
- **Construção 3D atual**: `buildPlanetEscolinha(planetId, planetRoot, radius, localUp)`
  (`World3D.tsx` ~3640) é chamada UMA vez por planeta, todas com a MESMA direção relativa
  hardcoded `(0.6, 0.35, -0.72)` — funciona porque cada planeta tem seu próprio `TransformNode`
  raiz independente (`mercuryRoot`, `venusRoot`, etc.), então a mesma direção relativa nunca colide
  entre planetas diferentes. `planetQuestMarkers: { planetId, worldPos }[]` alimenta o laço de
  gatilho de proximidade (`handleInteractPress`-adjacent, ~linha 8070), que faz
  `planetQuests[marker.planetId]` pra achar a quest — token único por PLANETA, não por quest.
- **`applyPlanetQuestCompletion` (`progression.ts`) já funciona sem mudança nenhuma** — recebe um
  `Quest` individual e usa `quest.id` pra checar `completedPlanetQuestIds`; já suporta múltiplas
  quests por planeta desde que cada uma tenha um `id` único (`planet-mercurio-1`,
  `planet-mercurio-2`, etc.) — só precisa ser CHAMADA com a quest certa.
- **Medido ANTES de escolher a fórmula de distribuição das 6 escolinhas por planeta** (mesma
  disciplina do lab-125): o planeta MENOR (`MERCURY_RADIUS = 4`) é o caso mais apertado — testado
  várias combinações de fórmula golden-angle (mesmo estilo de `SCHOOL_DIRS`, usado pro planeta
  principal) num script à parte. A melhor encontrada (`phi` de 35° a 145°, `theta = index *
  GOLDEN_ANGLE`) dá separação angular mínima de 78° entre escolinhas — **5,46 unidades de arco
  mesmo no Mercúrio** (o pior caso), bem acima de `RESET_DISTANCE` (3,6) e
  `PLANET_SCHOOL_TRIGGER_DISTANCE` (1,2), e pelo menos 35° de distância do polo de pouso do
  foguete (`(0,1,0)`, `MERCURY_LANDING_UP`/etc.) — sem risco de escolinhas coladas umas nas outras
  nem perto da plataforma de pouso, em NENHUM dos 6 planetas (Mercúrio é o mais apertado; os outros
  5 têm raio maior, logo mais folga ainda).

## Decisões técnicas tomadas

- **6 perguntas REAIS de astronomia por planeta** (36 no total, 30 novas — a pergunta original de
  cada planeta do lab-115 vira a primeira das 6), sempre sobre fatos verdadeiros do próprio
  planeta (mesmo padrão do lab-115: "combina com o contexto de você acabou de pousar lá").
  Recompensa por pergunta mantida igual ao valor original do lab-115 por planeta (não dividida por
  6) — mais generoso, e simples de não ter que rebalancear todo o resto da progressão.
- **`findPlanetQuestById(questId)` novo** (`planetQuests.ts`) — busca uma quest específica em
  qualquer planeta pelo id. Usado no lugar de `planetQuests[planetId]` (que agora devolveria um
  ARRAY, não mais uma quest única) em todo lugar que precisa resolver "qual é a pergunta desta
  escolinha".
- **`planetQuestMarkers` ganha `questId`** (não mais só `planetId`) — cada marcador aponta pra UMA
  escolinha específica, com seu próprio id de gatilho de histerese (`triggered`), replicando
  exatamente o padrão já usado pelas ~30 escolinhas do planeta principal (cada uma com seu próprio
  estado de gatilho independente).
- **`buildPlanetEscolinha` recebe a `Quest` direto** (não mais só `planetId`, que exigiria um
  lookup pra achar QUAL das 6 perguntas construir) + um sufixo único de nome de malha (índice) —
  cada planeta chama a função em loop, uma vez por pergunta, usando a nova
  `PLANET_SCHOOL_DIRS[i]` (a mesma lista de 6 direções, reaproveitada pelos 6 planetas — mesmo
  espírito da direção única já reaproveitada antes).
- **`App.tsx`: `handleSelectPlanetQuest` passa a receber um `questId`** em vez de `planetId`, usando
  `findPlanetQuestById` — decouple de "qual planeta" pra "qual pergunta exata", mais simples e
  correto agora que há 6 por planeta.

## Funcionalidades planejadas

- [x] `data/planetQuests.ts`: `Record<string, Quest[]>` com 6 perguntas reais por planeta (36 no
      total) + `findPlanetQuestById`.
- [x] `World3D.tsx`: `PLANET_SCHOOL_DIRS` novo (6 direções, fórmula medida acima);
      `buildPlanetEscolinha` generalizada pra receber `Quest` + sufixo; os 6 `buildXIfNeeded()`
      chamam em loop (uma vez por pergunta) em vez de uma chamada única; `planetQuestMarkers`
      guarda a `Quest` inteira direto (não só um id) pra não precisar de busca no laço de gatilho,
      que roda a cada quadro.
- [x] `App.tsx`: `handleSelectPlanetQuest(questId)` via `findPlanetQuestById`.
- [x] Verificação: `npm run build`/`npm run test` sem erros (52/52); verificação ao vivo (dev
      server + browser automation) — viajei de foguete de verdade até Mercúrio (pilotando com
      input de teclado real, não só forçando quadros — achado da própria verificação, ver
      `CONTEXT.md`), confirmei visualmente as 6 escolinhas espalhadas ao redor do planeta sem
      colisão entre si nem com a plataforma de pouso, respondi 2 escolinhas DIFERENTES
      corretamente (perguntas diferentes confirmadas — "planeta mais próximo do Sol" e "tamanho
      comparado à Lua"), XP/moeda creditados nas duas, `completedPlanetQuestIds` registrou os 2
      ids corretos e independentes (`planet-mercurio-1`, `planet-mercurio-2`), sem gatilho cruzado
      entre escolinhas vizinhas, sem erro de console.

## Fora de escopo (explicitamente adiado)

- Cronômetro de sobrevivência em Mercúrio/Netuno, pote de moedas em Marte, mobília por planeta,
  persistência de "Minha Casa" pra assinante — outros itens do mesmo backlog discutido em chat,
  cada um vira laboratório próprio depois deste.
