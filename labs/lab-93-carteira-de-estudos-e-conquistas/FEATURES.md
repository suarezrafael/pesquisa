# Laboratório 93 — carteira de estudos (boneco senta) + catálogo de conquistas

Status: em andamento
Início: 2026-08-25
Fim: -
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
- [ ] **`state/progression.ts`**: exporta `BADGE_FIRST_QUEST`/`BADGE_HALFWAY`/`BADGE_ALL_DONE`
  (já existem como `const` privadas) — fonte única de verdade pro catálogo de conquistas, não
  duplicar as strings.
- [ ] **`data/achievements.ts`** (novo): `ACHIEVEMENT_CATALOG` com os 3 badges existentes, cada um
  com ícone + descrição de como ganhar.
- [ ] **`world3d/AchievementsPanel.tsx`** (novo): mesma estrutura de `QuestListOverlay.tsx`,
  mostra os 3 itens do catálogo com estado ganho/não ganho (`progress.badges.includes(id)`).
- [ ] **`world3d/World3D.tsx`**: geometria simples da carteira (mesa + pernas + banquinho, mesmo
  vocabulário de primitivas já usado nas escolinhas), posicionada perto do spawn (não sobre ele),
  assentada no terreno com `settleMeshOnTerrain`. Gatilho de proximidade (raio apertado, estilo
  quiz) chama `onOpenAchievements`. Pose sentada aplicada enquanto o painel está aberto, revertida
  sozinha ao andar.
- [ ] **`App.tsx`**: `showAchievements` state, prop `onOpenAchievements`, `AchievementsPanel`
  renderizado condicionalmente, incluído em `suspendTriggers`.
- [ ] **Testar ao vivo**: aproximar da carteira, confirmar que o painel abre sozinho (sem precisar
  de E), que o boneco fica na pose sentada enquanto o painel está aberto, que a lista mostra os 3
  badges com o estado correto (ganho/não ganho) pro progresso atual, e que andar embora reverte a
  pose sozinho.
- [ ] **Deploy em produção** (só frontend).

## Fora de escopo (explicitamente adiado)
- **"Minha Casa"** completa (terreno próprio, compra/posicionamento de mobília, sets de
  assinante) — sistema grande, próprio laboratório futuro, conforme já documentado em
  `docs/plano-comercial-backend.md`.
- **Animação de sentar de verdade** (transição suave) — pose congelada, mesma técnica já usada
  pro carro; uma animação de transição é polimento visual, não o pedido central.
- Item 4 do pedido maior do usuário (brinde do chefe de Marte) — continua no próprio laboratório.
