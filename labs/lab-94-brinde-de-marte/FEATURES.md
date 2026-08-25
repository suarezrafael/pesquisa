# Laboratório 94 — brinde exclusivo ao limpar Marte

Status: em andamento
Início: 2026-08-25
Fim: -
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
- [ ] **`data/hats.ts`**: novo item `capacete_heroi_marte` (nome/emoji/cor tema-Marte), `cost: 0`,
  `marsRewardOnly: true` (campo novo em `HatOption`).
- [ ] **`state/progression.ts`**: `unlockHat` passa a recusar `marsRewardOnly` igual já recusa
  `subscriptionOnly` (nunca liberável pelo botão de compra normal). Nova função
  `unlockMarsReward(progress)` — idempotente (não faz nada se já tiver), adiciona o id direto em
  `unlockedHatIds` sem checar moeda, retorna se realmente concedeu algo novo (pra UI só mostrar
  aviso na primeira vez de verdade).
- [ ] **`state/useProgress.ts`**: `unlockMarsReward()` wrapper.
- [ ] **`world3d/World3D.tsx`**: detecta "todos os 6 inimigos de Marte mortos" logo depois de
  nocautear o último (checagem local, sem novo estado em `progress`), com uma flag de "já limpou
  NESTA visita" (reseta junto com os inimigos a cada nova chegada em Marte, mesmo ponto do
  lab-64) pra não chamar o unlock a cada quadro. Chama `onUnlockMarsRewardRef.current()` uma vez.
- [ ] **`App.tsx`**: `onUnlockMarsReward` conectado a `unlockMarsReward()`; se realmente concedeu
  algo novo, mostra um aviso (novo componente pequeno, reaproveitando as classes CSS já existentes
  de `RewardToast`/`.reward-modal` — sem CSS novo).
- [ ] **`world3d/AvatarShop.tsx`**: aba "Chapéus" ganha um terceiro estado de bloqueio (além de
  "trancado por moeda" e "trancado por assinatura") — reaproveita a tag visual já existente
  (`.avatar-shop-tag.subscription-lock`) com um texto diferente ("🪐 Vença Marte" em vez de
  "🔒 Assinantes"), nunca mostra botão de compra pra este item.
- [ ] **Teste unitário**: `unlockHat` recusa `capacete_heroi_marte` mesmo com moedas suficientes
  (mesmo padrão dos testes de `subscriptionOnly` já existentes).
- [ ] **Testar ao vivo**: derrotar os 6 inimigos de Marte, confirmar que o brinde é concedido só
  depois do último, que reaparece corretamente "usável" na lojinha, e que voltar a Marte e limpar
  de novo não repete o aviso nem quebra nada (idempotência).
- [ ] **Deploy em produção** (só frontend).

## Fora de escopo (explicitamente adiado)
- **Chefe de Marte de verdade** (inimigo único/especial, maior, com sua própria luta) — o pedido
  original não pedia isso; se o usuário quiser essa direção depois, é um laboratório à parte
  (precisaria de geometria/IA de combate nova, bem maior que reaproveitar o padrão já existente).
- **Brinde físico enviado pelo correio** — descartado desde o lab-91 (o jogo não coleta endereço/
  PII de criança).
