# Contexto — Laboratório 121 — Navegação por teclado e zoom de fonte (acessibilidade SHOULD)

Preenchido em: 2026-08-29
Commit inicial → final: 8e5d9c2f7b2b01c7ac4f09846837d2c50218cfdb..HEAD

## O que foi feito

Cobriu os 2 itens `[SHOULD]` de `docs/prompts/02-design-profissional.md` §3 deixados de fora do
lab-120 (que cobriu só os `[MUST]`: contraste e alvo de toque).

**Zoom de fonte**: investigado e confirmado JÁ CONFORME (ver "Investigado antes de planejar" em
`FEATURES.md`) — CSS já 100% `rem`/`em`/`clamp()`, modais já usam `max-height: vh` +
`overflow-y: auto` em vez de altura fixa. Nenhuma mudança de código nessa frente.

**Navegação por teclado**:
- `app/src/state/useModalA11y.ts` (novo): hook reutilizável — Esc fecha o painel (listener de
  `keydown` no `window`, funciona mesmo se o foco escapou do painel), foco entra no painel ao
  montar (`ref.current.focus()`, a menos que algo dentro já tenha foco sozinho — ver decisão
  abaixo), foco volta pro elemento anteriormente focado (`document.activeElement` guardado antes
  de mover) ao desmontar.
- Aplicado nos 12 painéis do jogo: `QuestModal.tsx`, `MarsRewardToast.tsx`, `RewardToast.tsx`,
  `QuestListOverlay.tsx`, `AvatarShop.tsx`, `PairingScreen.tsx`, `PlanetPickerPanel.tsx`,
  `MyHousePanel.tsx`, `AchievementsPanel.tsx`, `ChatPanel.tsx`, `RankingPanel.tsx`,
  `WeaponBagPanel.tsx` — cada um ganhou `ref={modalRef}` + `tabIndex={-1}` no elemento raiz.
- `ChatPanel.tsx`/`RankingPanel.tsx`/`WeaponBagPanel.tsx` ganharam `role="region"` +
  `aria-label` ("Chat"/"Ranking"/"Mochila") — paridade com os outros 9 painéis, que já tinham
  `role="dialog" aria-modal="true"` desde algum laboratório anterior.
- `World3D.tsx`: novo `hudInert = suspendTriggers || chatOpen || rankingOpen || bagOpen ||
  planetPickerOpen`, passado como prop `inert` pro `HudHeader` (9 botões do HUD) e aplicado
  também direto no `<canvas className="world3d-canvas">`.
- `HudHeader.tsx`: nova prop opcional `inert?: boolean`, aplicada no `<div className="hud-overlay"
  inert={inert}>`.

## Decisões técnicas tomadas

- **Um hook central em vez de 12 implementações** — mesmo racional de reuso já estabelecido no
  projeto (ex. `unlockGeneric` pra chapéu/óculos/etc.).
- **`inert` no HUD e no canvas em vez de um focus-trap manual por painel** — como só duas coisas
  ficam sempre montadas por trás de QUALQUER painel (`HudHeader` e o `<canvas>`), bloquear as duas
  com `inert` resolve o vazamento de foco pra 100% dos 12 painéis com uma mudança central, sem
  reimplementar ciclo de Tab em cada um.
- **Achado durante a verificação ao vivo, fora do que a investigação original previu**: o
  `<canvas>` do Babylon.js já vem focável por padrão (pra capturar teclado do jogo — WASD/E) sem
  nenhuma linha deste projeto pedir isso explicitamente. A primeira versão da correção só deixava
  `HudHeader` `inert`; testando ao vivo (Tab repetido com um modal aberto), o foco escapava do
  modal DIRETO pro `<canvas>` em vez de ficar preso — corrigido aplicando `inert` também no canvas,
  usando o mesmo booleano `hudInert`. Sem esse teste ao vivo (só teoria/leitura de código) essa
  lacuna teria passado despercebida — reforça o valor de testar de verdade em vez de confiar só na
  leitura estática do código-fonte.
- **`useModalA11y` não rouba foco de um `autoFocus` já existente**: `PairingScreen.tsx` já tinha
  `autoFocus` no campo de código — se o hook sempre movesse o foco pro elemento raiz do painel
  (`tabIndex={-1}`), isso brigaria com o `autoFocus` do campo (roubando o foco de volta pro painel
  logo depois do campo já ter sido focado). Corrigido checando `rootRef.current.contains(document.
  activeElement)` antes de mover o foco — só move se nada dentro do painel já pegou o foco sozinho.
- **`role="region"` (não `role="dialog"`) em `ChatPanel`/`RankingPanel`/`WeaponBagPanel`** — esses
  3 não bloqueiam o jogo (o jogador continua se movendo com o chat aberto, por exemplo), diferente
  dos 9 modais verdadeiros; `role="dialog"` seria semanticamente errado pra algo não-modal.
- **`MarsRewardToast`/`RewardToast` usam `onContinue` como `onClose`** — não têm prop `onClose`
  própria (só têm um botão "Continuar explorando"), mas `onContinue` já cumpre exatamente esse
  papel — Esc chama a mesma função que o botão.

## Pendências / dívidas conhecidas

- Nenhuma dívida nova introduzida por este laboratório.
- A restauração de foco ao fechar um painel (`previouslyFocused?.focus()`) depende de o elemento
  que abriu o painel já estar focado no momento da abertura — cliques de mouse focam botões no
  Chrome normalmente, mas isso não foi confirmado como universal em todo navegador/dispositivo; se
  algum usuário reportar que o foco "se perde" ao fechar um painel num navegador específico, esse é
  o primeiro lugar a olhar.

## Funcionalidades planejadas que NÃO foram concluídas

Todas as funcionalidades planejadas em `FEATURES.md` foram concluídas (incluindo o `inert` do
`<canvas>`, achado durante a própria verificação deste laboratório, não uma pendência migrada).

## O que o próximo laboratório deve desenvolver

Sem uma prioridade única e óbvia neste momento — perguntar ao usuário antes de escolher, como de
costume. Candidatos ainda no backlog (nenhum novo introduzido por este laboratório): (1) o bug de
morros/platôs invisíveis do lab-95, ainda sem resposta do usuário sobre aparelho/GPU afetado; (2)
code-splitting de `studentFigure.ts` (chunk de 3,68MB, apontado no lab-117 como acoplamento interno
do próprio Babylon.js, investigação exploratória sem resultado garantido).

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`.
- `npm run test` (em `app/`): 47/47 passando (sem teste novo — mudança é de acessibilidade de UI,
  sem lógica de domínio nova testável em isolamento).
- `npm run build` (em `app/`): typecheck + build de produção sem erros.
- Verificação ao vivo (dev server local, porta 5187, + browser automation, perfil de teste
  "Teste Carteira" já existente, descartável): confirmado via `document.activeElement`/atributos
  DOM diretos (não só screenshot) que (1) abrir `QuestListOverlay` move o foco pro painel e marca
  `HudHeader`/`<canvas>` como `inert`; (2) Tab repetido dentro do modal aberto NÃO escapa mais pro
  HUD nem pro canvas (achado e corrigido durante esta própria verificação, ver acima); (3) Esc
  fecha `QuestListOverlay`, `ChatPanel` e `AvatarShop`, devolvendo `inert` a `false`/ausente nos
  dois; (4) `ChatPanel` abre com `role="region" aria-label="Chat"` confirmados via DOM; (5) sem
  erro de console durante toda a sequência; (6) HUD, chuva dinâmica, física do avatar e demais
  elementos visuais renderizando normalmente após as mudanças (sem regressão visual aparente).
- Como verificar de novo: `cd app && npm run dev`, abrir qualquer painel (loja, missões, chat,
  etc.) e pressionar Esc pra fechar; com um painel aberto, pressionar Tab repetidamente e confirmar
  que o foco nunca sai do painel (inspecionar `document.activeElement` ou usar as devtools de
  acessibilidade do navegador).
