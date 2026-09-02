# Contexto — Laboratório 115 — Escolinhas nos planetas do Sistema Solar + nível mínimo por distância

Preenchido em: 2026-08-29
Commit inicial → final: 39144d83f8d16aec5aa568cf409ab6d188b84381..HEAD

## O que foi feito
Pedido do usuário: "crie escolinhas com perguntas tbm nos planetas novos para ampliar a elevação
dos níveis, e quanto mais longe o planeta mais alto deve ser o nível do usuário." Os 6 planetas
novos da frente Sistema Solar (Mercúrio, Vênus, Júpiter, Saturno, Urano, Netuno — labs 110-114)
ganharam:

1. **Uma escolinha de astronomia por planeta**, com pergunta REAL sobre o próprio planeta (não
   lógica/matemática/leitura genérica) — `app/src/data/planetQuests.ts` (novo), um `Quest` por
   planeta com `xpReward`/`coinReward` de verdade (15 a 40 XP, escalando com a distância).
2. **Nível mínimo pra viajar**, escalando com a distância real ao Sol: Mercúrio=2, Vênus=3,
   Júpiter=5, Saturno=7, Urano=9, Netuno=11 (`requiredLevel` em `DESTINATION_PLANETS`,
   `World3D.tsx`). Marte e o planeta principal ficam SEM requisito (decisão explicada abaixo).

Arquivos:
- **`app/src/types.ts`**: `Progress.completedPlanetQuestIds: string[]` (novo campo, isolado de
  `completedQuestIds`).
- **`app/src/state/storage.ts`**: `emptyProgress.completedPlanetQuestIds: []`.
- **`app/src/data/planetQuests.ts`** (novo): `Record<string, Quest>`, chave = id do planeta,
  pergunta de astronomia real por planeta (ex.: Mercúrio pergunta qual é o planeta mais próximo do
  Sol; Vênus pergunta por que é o mais quente apesar de não ser o mais perto; Saturno pergunta do
  que são feitos os anéis).
- **`app/src/state/progression.ts`**: `applyPlanetQuestCompletion(progress, quest, event?)` — MESMO
  formato de `applyQuestCompletion` (idempotente via `completedPlanetQuestIds`, aplica o
  multiplicador do evento semanal), mas NUNCA escreve em `completedQuestIds`/`badges`.
- **`app/src/state/useProgress.ts`**: `completePlanetQuest(quest)`, mesmo formato de
  `completeQuest`.
- **`app/src/world3d/World3D.tsx`**:
  - `DestinationPlanet.requiredLevel?: number` + valores nos 6 planetas novos (Marte/principal
    sem campo, tratados como `undefined` → nível 1, sem gate).
  - `buildPlanetEscolinha(planetId, planetRoot, radius, localUp)` (novo, compartilhado pelos 6
    `buildXIfNeeded()`): totem (poste + placa colorida por tipo de quest, símbolo "?") + professor
    parado ao lado (`buildStudentFigure`, já existente) — posição `localUp.scale(radius)` direto
    (esferas perfeitas, sem `terrainGroundRadial`/`settleMeshOnTerrain`).
  - `planetQuestMarkers` (array populado por `buildPlanetEscolinha`) + novo bloco no laço de
    gatilhos por quadro (mesmo padrão/histerese de `quizMarkers`/carteira/Minha Casa), pulando
    planetas já completados via `completedPlanetQuestIds`.
  - `onSelectPlanetQuest` (nova prop) threading completo (ref, destructure, prop na interface).
- **`app/src/world3d/PlanetPickerPanel.tsx`**: nova prop `currentLevel`; cada planeta abaixo do
  `requiredLevel` mostra `🔒 Nível X` (reaproveita `.avatar-shop-tag.subscription-lock`, já
  existente em `AvatarShop.tsx`) em vez do botão "Viajar".
- **`app/src/App.tsx`**: `activePlanetQuest` (estado) + `handleSelectPlanetQuest`/
  `handleCompletePlanetQuest` (reaproveita `QuestModal`/`RewardToast` já existentes,
  sem componente novo).
- **`app/src/state/progression.test.ts`**: 3 testes novos pra `applyPlanetQuestCompletion`
  (recompensa com multiplicador de evento, idempotência, isolamento de
  `completedQuestIds`/`badges`). Suite: 44→47.

## Decisões técnicas tomadas
- **Banco de perguntas separado (`planetQuests.ts`) e `completedPlanetQuestIds` próprio** — não
  misturado com `quests.ts`/`completedQuestIds`. Investigação prévia mostrou que
  `badgesEarnedAt`/`isQuestUnlocked` são POSICIONAIS e contam contra `quests.length` (30, fixo);
  misturar as 6 perguntas de planeta ali concederia "Metade do Caminho"/"Mestre das Missões" cedo
  demais pra quem nunca terminou as 30 missões de verdade. Mesmo espírito de isolamento do
  `surpriseQuizzes.ts` (Quiz Surpresa do Prédio dos Enigmas), mas DIFERENTE numa coisa central: o
  quiz surpresa dá `xpReward: 0` de propósito (só moeda avulsa); aqui o pedido do usuário é
  EXPLICITAMENTE "ampliar a elevação dos níveis", então `applyPlanetQuestCompletion` credita XP de
  verdade — por isso não pôde reaproveitar o wrapper do quiz surpresa (`collectCoin` em loop),
  precisou da própria função de progressão.
- **Marte e o planeta principal ficam SEM nível mínimo** — os dois já são alcançáveis sem
  restrição nenhuma desde antes desta frente (Marte desde o lab-60). Adicionar um requisito agora
  mudaria comportamento já em produção pra jogadores existentes. Só os 6 planetas desta MESMA
  frente (lançados juntos, nunca tiveram requisito nenhum até este laboratório) recebem
  `requiredLevel`.
- **Nível mínimo escalona com a ordem REAL de distância ao Sol** (Mercúrio=2 < Vênus=3 <
  Júpiter=5 < Saturno=7 < Urano=9 < Netuno=11) — não é um degrau linear arbitrário: dá pra alcançar
  Mercúrio cedo (2 quests do planeta principal já bastam, ~40 XP) e cada parada seguinte pede mais
  progresso genuíno, inclusive contando as próprias escolinhas de planeta (15-40 XP cada) como
  parte do caminho — cria o laço de "faça a escolinha mais perto, suba de nível, libere a próxima"
  que o pedido do usuário descreve.
- **Escolinha simplificada (totem + professor), não a estrutura completa com paredes/telhado/
  fundação do planeta principal** — os 6 planetas novos são esferas PERFEITAS
  (`PhysicsShapeType.SPHERE`, sem relevo próprio), então `localUp.scale(radius)` já cai exatamente
  na superfície sem risco nenhum de "escolinha enterrada/flutuando" (o bug real do lab-95, que só
  existe por causa do relevo IRREGULAR do planeta principal). Reimplementar
  `terrainGroundRadial`/`settleMeshOnTerrain` aqui seria trabalho sem propósito nenhum — uma única
  pergunta por planeta não justifica a estrutura cara.
- **Uma escolinha por planeta, tema astronomia real** — ideia já cogitada (não pedida) no
  CONTEXT.md do lab-114 como possível continuidade; encaixa bem no contexto ("você acabou de
  pousar lá") e mantém a visita rápida, consistente com "moedas escondidas, sem combate" (lab-110).
- **Reaproveita `.avatar-shop-tag.subscription-lock`** pra mostrar o cadeado de nível no seletor,
  em vez de criar uma classe CSS nova — mesmo espaço visual do botão "Viajar", já usado por
  `AvatarShop.tsx` pros itens exclusivos de assinante (zero CSS novo).

## Pendências / dívidas conhecidas
- Nenhuma nova introduzida por este laboratório.
- **Verificação ao vivo cobriu Mercúrio; os outros 5 planetas usam a MESMA `buildPlanetEscolinha`
  genérica** (só muda planetId/root/radius/localUp), risco de regressão considerado baixo — mesmo
  raciocínio já aplicado a `buildPlanetIfNeeded`/`returnRockets` desde o lab-110 (arquitetura
  genérica, testada uma vez, reaproveitada sem mudança pros planetas seguintes).
- O perfil de dev local usado na verificação ao vivo (`EspertoFoguete81`, criado em 2026-08-20 —
  bem antes desta sessão) teve seu progresso avançado de verdade (2 missões do planeta principal
  respondidas + a escolinha de Mercúrio) pra conseguir nível 2 de forma legítima, já que uma
  tentativa de setar `xp` direto via `localStorage` foi BLOQUEADA pelo classificador de modo
  automático (tratado como o mesmo tipo de risco identificado no lab-90 — adulterar save local).
  Estado final do perfil de teste: XP 70 (nível 2), 38 moedas, 2 missões do planeta principal
  concluídas, escolinha de Mercúrio concluída — não foi possível restaurar ao estado original
  (XP 0, 2 moedas) porque a mesma restrição bloqueia escrita direta de progresso via
  `localStorage`. Impacto: save local de dev, sem dado de produção/banco envolvido.

## Funcionalidades planejadas que NÃO foram concluídas
- Nenhuma das planejadas para este laboratório.

## O que o próximo laboratório deve desenvolver
- Itens de backlog genuinamente em aberto, todos precisando de ação/decisão do usuário (sem
  mudança desde o lab-114): bug de morros invisíveis (lab-95), secrets
  `VERCEL_TOKEN`/`CLOUDFLARE_API_TOKEN` + merge do PR `#8` (lab-104), deploy real em produção
  (bloqueado por restrição de CLI — Cloudflare Pages paralelo é a alternativa em uso), corte de DNS
  pro Cloudflare Pages virar produção de verdade (lab-109).
- Nenhuma pendência de produto nova surgiu deste laboratório — a frente "escolinhas de astronomia +
  nível mínimo" está completa conforme pedido pelo usuário.

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`
- Como rodar/verificar o que foi construído neste laboratório:
  - `cd app && npm run test` — 47 testes (3 novos), sem erro.
  - `cd app && npm run build` — typecheck + build de produção, sem erros.
  - `cd app && npm run dev`, `window.__debugTeleport(-0.3797213687147455, -0.913545457642601,
    0.14576137678401327)` (dev-only), "E" abre o seletor — planetas abaixo do nível atual mostram
    "🔒 Nível X" em vez de "Viajar". Ao chegar num planeta novo, o totem com "?" perto do foguete de
    volta abre a escolinha daquele planeta ao se aproximar.
