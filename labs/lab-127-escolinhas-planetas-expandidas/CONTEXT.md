# Contexto — Laboratório 127 — Escolinhas dos planetas expandidas (6+ perguntas cada)

Preenchido em: 2026-08-30
Commit inicial → final: 9f8ca54bb91e675aa2a5ea6a97704739a7e9657c..HEAD

## O que foi feito

Expandiu as escolinhas dos 6 planetas-destino do Sistema Solar (Mercúrio/Vênus/Júpiter/Saturno/
Urano/Netuno) de **1** pergunta cada (lab-115) pra **6** cada (36 no total, 30 novas) — igual ao
padrão de várias escolinhas do planeta principal, pedido explícito do usuário.

- `app/src/data/planetQuests.ts`: reescrito de `Record<string, Quest>` pra
  `Record<string, Quest[]>`, com 6 perguntas reais de astronomia por planeta (a pergunta original
  de cada um virou a primeira das 6). Novo `findPlanetQuestById(questId)` — busca uma quest
  específica em qualquer planeta pelo id, usado no lugar do lookup direto por planeta agora que
  cada planeta tem várias perguntas.
- `app/src/world3d/World3D.tsx`:
  - `PLANET_SCHOOL_DIRS` novo: 6 direções (fórmula golden-angle, `phi` de 35° a 145°,
    `theta = index * GOLDEN_ANGLE`) reaproveitadas pelos 6 planetas — cada planeta tem seu próprio
    `TransformNode` raiz independente, então a mesma lista de direções relativas nunca colide
    entre planetas diferentes.
  - `buildPlanetEscolinha` generalizada pra receber a `Quest` diretamente (não mais um `planetId`
    pra fazer lookup) + um sufixo único de nome; os 6 `buildXIfNeeded()` chamam em loop
    (`planetQuests.mercurio.forEach(...)`) em vez de uma chamada única.
  - `planetQuestMarkers` guarda a `Quest` inteira (não só um id) — evita qualquer busca no laço de
    gatilho de proximidade, que roda a cada quadro.
- `app/src/App.tsx`: `handleSelectPlanetQuest` passa a receber um `questId` (não mais `planetId`)
  e usa `findPlanetQuestById`.

## Decisões técnicas tomadas

- **Distribuição das 6 escolinhas por planeta medida ANTES de escolher a fórmula**, não estimada —
  mesma disciplina do lab-125/lab-117. Testei várias combinações de `phi`/`theta` num script à
  parte, usando o Mercúrio (`MERCURY_RADIUS = 4`, o menor planeta, pior caso) como referência: a
  fórmula escolhida (`phi` de 35° a 145°) dá separação angular mínima de 78° entre escolinhas —
  5,46 unidades de arco mesmo no Mercúrio, bem acima de `RESET_DISTANCE`/
  `PLANET_SCHOOL_TRIGGER_DISTANCE`, e pelo menos 35° de distância da plataforma de pouso do
  foguete. **Confirmado visualmente ao vivo**: as 6 escolinhas aparecem claramente espalhadas ao
  redor do planeta, sem nenhuma colada em outra nem na base do foguete.
- **Recompensa por pergunta mantida igual ao valor original do lab-115** (não dividida por 6) —
  mais generoso (6× mais XP/moeda por planeta agora), e evita ter que rebalancear o resto da
  progressão só por causa desta mudança de conteúdo.
- **`planetQuestMarkers` guarda a `Quest` inteira, não um id** — decisão de performance: o laço de
  gatilho de proximidade roda a cada quadro renderizado; guardar o objeto direto evita qualquer
  busca repetida (`findPlanetQuestById`/`.find()`) nesse hot path, ao custo de nenhuma
  desvantagem real (a `Quest` já existe em memória de qualquer forma).
- **Achado só na verificação ao vivo, não na leitura de código**: a viagem de foguete deste jogo
  **não é automática** — o jogador precisa pilotar de verdade (segurar W/seta pra cima, que vira
  "throttle" do foguete, `rocketThrottle = -y`). A primeira tentativa de verificação forçou
  centenas de quadros de render sem nenhum input, e o foguete simplesmente não se moveu (o
  `dt`/progresso só avança com throttle real aplicado). Corrigido despachando um `KeyboardEvent`
  de `keydown` sintético pra `'w'` antes de forçar os quadros, e `keyup` depois — sem isso, a
  verificação ao vivo teria ficado presa achando que a viagem nunca completava.

## Pendências / dívidas conhecidas

- Nenhuma dívida nova introduzida por este laboratório.
- Só Mercúrio foi verificado ao vivo (2 das 6 escolinhas, respondidas com sucesso) — os outros 5
  planetas usam exatamente o mesmo código genérico (`buildPlanetEscolinha` chamada em loop, mesma
  `PLANET_SCHOOL_DIRS`), com raio maior (mais folga ainda que o pior caso testado), então a
  confiança pros outros 5 vem de paridade de código, não de teste individual de cada um — mesmo
  padrão já aceito em labs anteriores (110-114) pra features genéricas replicadas entre planetas.

## Funcionalidades planejadas que NÃO foram concluídas

Todas as funcionalidades planejadas em `FEATURES.md` foram concluídas.

## O que o próximo laboratório deve desenvolver

Do backlog maior discutido em chat com o usuário (ainda não formalizado em labs): mobília
desbloqueada por planeta conquistado, persistência de "Minha Casa" pra assinante (arquitetural,
G6 do doc de escala), pote de moedas ao vencer os ETs em Marte, cronômetro de sobrevivência em
Mercúrio/Netuno, e outras ideias de engajamento/diversão discutidas (login diário, baús, cartão-
postal colecionável, etc.). Sem prioridade única — perguntar ao usuário antes de escolher.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`.
- `npm run test` (em `app/`): 52/52 passando (sem teste novo — conteúdo de dado + construção 3D,
  sem lógica de domínio nova; `applyPlanetQuestCompletion` já testado desde o lab-115/126, sem
  mudança de comportamento).
- `npm run build` (em `app/`): typecheck + build de produção sem erros.
- Verificação ao vivo (dev server local + browser automation): viagem de foguete real até
  Mercúrio (pilotada com input de teclado sintético, não só forçando quadros), 6 escolinhas
  confirmadas visualmente espalhadas ao redor do planeta, 2 escolinhas diferentes respondidas
  corretamente com perguntas distintas e recompensa creditada corretamente nas duas,
  `completedPlanetQuestIds` registrando os 2 ids certos, sem erro de console.
- Como verificar de novo: `cd app && npm run dev`, viajar de foguete até qualquer planeta-destino
  (segurando W/seta pra cima até a nave chegar), andar até cada uma das 6 escolinhas e responder.
