# Laboratório 93 — carteira de estudos (boneco senta) + catálogo de conquistas

Status: concluído
Início: 2026-08-25
Fim: 2026-08-25
Commit inicial: 71ad5341d53b8a130f0cd38bc19a5ff319607a8b

## Objetivo do laboratório
Item 3 do pedido maior do usuário (registrado em `labs/CURRENT.md` desde o lab-91): "eh
interessante ter a possibilidade de adiquirir um pequeno centro de estudo, uma carteira de estudo
em que o boneco pode sentar, acessar seu catalog de conquistas."

## Decisão de escopo (por que NÃO é "Minha Casa")
`docs/plano-comercial-backend.md` já tem uma feature maior planejada, "Minha Casa" (terreno
próprio, mobília avulsa comprável, sets temáticos de assinante) — explicitamente marcada como
"viraria seu próprio laboratório dado o tamanho", ainda não iniciada. O pedido do usuário aqui é
menor: UM móvel específico com uma função específica (sentar + ver conquistas), não um sistema de
compra/posicionamento de mobília. Construir esse sistema inteiro só pra colocar uma carteira seria
inflar um pedido pequeno num projeto de arquitetura nova. Este laboratório trata a carteira como
um objeto FIXO e compartilhado no mundo (mesmo padrão das escolinhas/Prédio dos Enigmas — sempre
lá, sem compra), não uma peça de mobília adquirível/posicionável. Se "Minha Casa" for construída
no futuro, a carteira pode virar um item desse sistema; por enquanto, "adquirir" é lido como "ter
acesso à função", não como uma transação de moeda.

## Padrões já existentes reaproveitados (investigado antes de escrever código)
- **Objeto fixo no mundo com gatilho de proximidade**: mesmo padrão das escolinhas
  (`quests.forEach` em `World3D.tsx` ~4451-4559: `TransformNode` + `terrainGroundRadial`/
  `settleMeshOnTerrain` pra não flutuar) e do quiz surpresa do Prédio dos Enigmas (raio de gatilho
  mais apertado, ~6280-6288) — a carteira usa o mesmo raio apertado do quiz (contato de verdade,
  não só chegar perto).
- **Pose "sentado"**: já existe uma pose congelada (não animada) usada ao embarcar no carro
  (`legPivotL/R.rotation.x = -1.3`, `kneePivotL/R.rotation.x = 1.3`, ~2429-2436) — volta sozinha ao
  normal no próximo passo andando, porque o ciclo de caminhada recalcula essas rotações a cada
  quadro. Mesma técnica, valores adaptados pra "sentado numa carteira" em vez de "dirigindo".
- **Painel de conquistas**: mesma estrutura de `QuestListOverlay.tsx` (`{progress, onClose}`,
  `.modal-overlay`/`.modal`) e reaproveita as classes CSS `.quest-list`/`.quest-list-item`/
  `.quest-list-index`/`.quest-list-title`/`.quest-list-type`/`.quest-list-status` JÁ EXISTENTES
  sem precisar de CSS novo — o formato (ícone + nome + descrição + status) encaixa exatamente.
- **Badges**: `progress.badges: string[]` já existe (`state/progression.ts`,
  `badgesEarnedAt`) com 3 conquistas fixas — hoje só aparecem como ícone no HUD, na lista do
  portal dos responsáveis, e num toast passageiro quando ganhas. Nunca houve uma TELA dedicada
  pra ver todas (ganhas e não ganhas) — esse é o gap real que a "carteira" resolve.

## Funcionalidades planejadas
- [x] **`state/progression.ts`**: `BADGE_FIRST_QUEST`/`BADGE_HALFWAY`/`BADGE_ALL_DONE` exportadas.
- [x] **`data/achievements.ts`** (novo): `ACHIEVEMENT_CATALOG` com os 3 badges existentes, ícone +
  descrição (a de "Metade do Caminho" calcula `Math.ceil(quests.length/2)` dinamicamente).
- [x] **`world3d/AchievementsPanel.tsx`** (novo): mesma estrutura de `QuestListOverlay.tsx`,
  reaproveita `.quest-list`/`.quest-list-item` sem CSS novo — mostra os 3 itens com estado ganho/
  não ganho.
- [x] **`world3d/World3D.tsx`**: geometria da carteira (mesa+livro+2 pernas + banquinho+2 pernas),
  posicionada perto do spawn (`deskUp = (0.35, 1, 0.12).normalize()`), assentada com
  `settleMeshOnTerrain`. Gatilho de proximidade (`DESK_TRIGGER_DISTANCE = 1.2`) chama
  `onOpenAchievements` e congela a pose sentada.
- [x] **`App.tsx`**: `showAchievements` state, prop `onOpenAchievements`, `AchievementsPanel`
  renderizado condicionalmente, incluído em `suspendTriggers`.
- [x] **Bug real encontrado e corrigido durante o teste ao vivo**: a primeira versão gateava o
  bloco INTEIRO de física/movimento (`if (!drivingCar && !drivingRocket && !sittingAtDesk)`), não
  só a pose — isso também desligava a leitura de input (WASD) e a gravidade enquanto sentado,
  deixando o jogador PRESO na carteira pra sempre (nem `RESET_DISTANCE` conseguia disparar, porque
  a posição do avatar parava de atualizar). Corrigido: o gate `!sittingAtDesk` ficou só na
  recalculagem da pose de caminhada (2 linhas), física/input/posição continuam sempre ativos — ver
  CONTEXT.md pro relato completo de como isso foi descoberto.
- [x] **Testado ao vivo**: confirmado via `window.__playerFigure`/`window.__scene` (inspeção direta
  da cena, não só screenshot) que o painel abre sozinho ao aproximar, mostra os 3 badges com
  estado correto (testado com 1 de 3 ganhos), aplica a pose sentada (`legPivotL.rotation.x =
  -1.1`), e que `sittingAtDesk` volta a `false` corretamente ao se afastar (`RESET_DISTANCE`
  funcionando) — depois do bug acima corrigido.
- [x] **Deploy em produção** via `npx vercel --prod --yes` (7ª tentativa, mesmo padrão
  intermitente de "fetch failed" já visto antes, mais persistente que o normal desta vez).

## Fora de escopo (explicitamente adiado)
- **"Minha Casa"** completa (terreno próprio, compra/posicionamento de mobília, sets de
  assinante) — sistema grande, próprio laboratório futuro, conforme já documentado em
  `docs/plano-comercial-backend.md`.
- **Animação de sentar de verdade** (transição suave) — pose congelada, mesma técnica já usada
  pro carro; uma animação de transição é polimento visual, não o pedido central.
- Item 4 do pedido maior do usuário (brinde do chefe de Marte) — continua no próprio laboratório.
