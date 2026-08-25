# Laboratório 94 — brinde exclusivo ao limpar Marte

Status: concluído
Início: 2026-08-25
Fim: 2026-08-25
Commit inicial: a6ce02d35c7c8863aee0d7c6e60a37ceedc65fff

## Objetivo do laboratório
Item 4 (último) do pedido maior do usuário registrado desde o lab-91: "no planeta marte ao vencer
os ets e o robo voce desbloqueia um brinde."

## Achado que redefine o escopo: não existe "chefe" de Marte
Investigado antes de escrever código: Marte tem `MARS_ENEMY_COUNT = 6` inimigos regulares (3 ET +
3 robô, distribuição de ângulo áureo), sem nenhum inimigo único/especial — "ETs e o robô" no
pedido do usuário são só os DOIS TIPOS de inimigo que já existem, não um chefe à parte. O pedido
real é "derrotar todos os inimigos de Marte" (um objetivo de limpeza, não uma luta de chefe nova).
Confirmado também: os inimigos hoje já dão 1 moeda cada ao serem nocauteados (`onCollectCoinRef`,
sem XP), mas **não existe nenhum estado de "Marte limpo"** — matar o último inimigo não aciona
nada de especial hoje, e todos os inimigos VOLTAM à vida a cada nova chegada em Marte (lab-64,
pedido do usuário: "senão o planeta fica vazio"). O brinde precisa ser um desbloqueio ÚNICO (uma
vez só, pra sempre), não repetível a cada vez que o planeta é limpado de novo.

## Desenho do brinde (grounded na pesquisa de mercado do lab-91)
Pesquisa já feita: tendência forte de colecionáveis/trading-card-style no Brasil (Pokémon 30 anos,
Squishmallows) — a psicologia que funciona é EXCLUSIVIDADE/PRESTÍGIO (algo que só quem realmente
jogou consegue, não compra). Desenho: um chapéu novo no catálogo já existente (`hats.ts`),
reaproveitando um formato já existente (mesmo padrão do lab-92 com óculos — sem geometria nova),
com um novo tipo de bloqueio (nem moeda, nem assinatura): só aparece "usável" depois de limpar
Marte pela primeira vez. Nunca aparece um botão de compra pra ele (`cost: 0` sozinho já deixaria
ele comprável de graça pelo botão normal — precisa da mesma proteção que já existe pra
`subscriptionOnly`, um novo campo `marsRewardOnly` com a mesma exclusão em `unlockHat`).

## Funcionalidades planejadas
- [x] **`data/hats.ts`**: novo item `capacete_heroi_marte` ("Coroa de Herói de Marte" 🪐,
  formato `crown` já existente, cor marciana), `cost: 0`, `marsRewardOnly: true` (campo novo em
  `HatOption`). `DEFAULT_UNLOCKED_HAT_IDS` corrigido pra também excluir `marsRewardOnly` — sem
  isso, o filtro `cost === 0 && !subscriptionOnly` teria liberado o item de graça pra todo mundo
  desde o início, achado revisando o próprio filtro antes de rodar qualquer teste.
- [x] **`state/progression.ts`**: `unlockHat` recusa `marsRewardOnly` igual já recusa
  `subscriptionOnly`. Nova função `unlockMarsReward(progress): MarsRewardResult` — idempotente,
  adiciona o id direto em `unlockedHatIds` sem checar moeda, retorna `{progress, granted}`.
- [x] **`state/useProgress.ts`**: `unlockMarsReward()` wrapper, devolve o `granted` pro chamador.
- [x] **`world3d/World3D.tsx`**: flag local `marsClearedThisVisit`, resetada junto com os
  inimigos a cada nova chegada em Marte (mesmo ponto do lab-64). Checagem
  `marsEnemies.every((e) => !e.alive)` logo depois de `enemy.alive = false` no nocaute — chama
  `onUnlockMarsRewardRef.current()` uma vez por visita.
- [x] **`App.tsx`**: `onUnlockMarsReward` conectado a `unlockMarsReward()`; `MarsRewardToast`
  (novo, `app/src/components/`) mostrado só quando `granted` é `true` — reaproveita
  `.reward-modal`/`.reward-icon`/`.reward-line` de `RewardToast.tsx`, sem CSS novo.
- [x] **`world3d/AvatarShop.tsx`**: aba "Chapéus" ganha o terceiro estado de bloqueio — tag
  "🪐 Vença Marte" (reaproveita `.avatar-shop-tag.subscription-lock`), nunca mostra botão de
  compra pro item `marsRewardOnly`.
- [x] **3 testes novos** em `progression.test.ts`: `unlockHat` recusa `capacete_heroi_marte` com
  moedas suficientes; `unlockMarsReward` concede na primeira vez sem mexer em moeda; é idempotente
  (não concede de novo, devolve o MESMO objeto `progress`) se já tiver o item. Suíte total: 39.
- [x] **Testado ao vivo** contra o dev server: confirmado na lojinha que o item aparece bloqueado
  ("🪐 Vença Marte", sem botão de compra) antes de limpar Marte; um atalho de QA temporário
  (`window.__debugClearMars()`, removido antes do commit) matou os 6 inimigos de uma vez —
  confirmado que o toast "Marte limpo!" aparece, que a lojinha atualiza pra "Usar" na hora (sem
  precisar reabrir), e que chamar de novo NA MESMA visita não reabre o toast (idempotência
  dentro da visita — a idempotência ENTRE visitas, mais importante, já está coberta pelo teste
  unitário de `unlockMarsReward`, que é puramente uma função de `progress`, independente de
  quando/quantas vezes é chamada).
- [x] **Deploy em produção** via `npx vercel --prod --yes` (3ª tentativa, mesmo padrão
  intermitente de "fetch failed").

## Fora de escopo (explicitamente adiado)
- **Chefe de Marte de verdade** (inimigo único/especial, maior, com sua própria luta) — o pedido
  original não pedia isso; se o usuário quiser essa direção depois, é um laboratório à parte
  (precisaria de geometria/IA de combate nova, bem maior que reaproveitar o padrão já existente).
- **Brinde físico enviado pelo correio** — descartado desde o lab-91 (o jogo não coleta endereço/
  PII de criança).
