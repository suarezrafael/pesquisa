# Contexto — Laboratório 46 — Prédio dos Enigmas (4 andares, escada, quiz surpresa por andar)

Preenchido em: 2026-08-18

## O que foi feito

1. **Novo prédio, 4 andares, escada de degraus** (`app/src/world3d/World3D.tsx`, bloco
   `quizTowerBase`/`QT_*`, logo depois da Torre do Tesouro) — térreo + 3 andares, cada um com 4
   paredes (só o térreo tem vão de porta), piso próprio (o do térreo cobre a largura toda; do 2º
   andar em diante deixa o poço da escada sempre aberto), ligados por 3 lances de escada (9
   degraus cada, subindo 0,2 por degrau — bem menor que o raio da cápsula física do avatar, 0,32,
   pra ela subir sozinha empurrada pelo solver de física, mesmo princípio já validado na rampa da
   torre, só que aqui com degraus discretos em vez de uma rampa lisa, porque o usuário pediu
   "escada" especificamente).
2. **Quiz surpresa por andar** — `app/src/data/surpriseQuizzes.ts` (4 perguntas novas,
   `surprise-01`..`04`) + wiring em `App.tsx`: novo estado `activeSurpriseQuiz`, novo handler
   `onSelectSurpriseQuiz`/`handleSelectSurpriseQuiz`, e `handleSurpriseQuizCorrect` que dá só
   moedas na hora (via `collectCoin`, chamado `coinReward` vezes) — deliberadamente NÃO passa por
   `completeQuest`, então não conta pra `completedQuestIds`/badges nem aparece na
   `QuestListOverlay` (que lista as 21 missões oficiais das escolas). Reaproveita o `QuestModal`
   existente sem nenhuma mudança nele — só precisa de um objeto `Quest`-shaped e dois callbacks.
   Cada andar tem um marcador esférico dourado brilhante com um "?" (`TextBlock` linkado, mesmo
   padrão dos rótulos das escolas) que dispara o quiz por proximidade (mesmo padrão de
   `TRIGGER_DISTANCE`/`RESET_DISTANCE`/`triggered` já usado nos portais das escolas).
3. **Paredes quase transparentes perto do jogador** — cada parede do prédio (não o telhado/piso/
   escada) tem sua `visibility` interpolada por quadro em direção a um alvo calculado pela
   distância do jogador. **Bug real encontrado e corrigido ao vivo nesta sessão**: a primeira
   versão media a distância da CÂMERA até a base do prédio — mas a câmera em terceira pessoa fica
   atrás/acima do jogador (offset de `CAMERA_DISTANCE`/`CAMERA_HEIGHT`), então mesmo com o
   jogador encostado na parede, a câmera podia estar a 8-12 unidades de distância, nunca cruzando
   o limiar de fade (paredes ficavam opacas pra sempre). Trocado pra medir a distância do
   JOGADOR, e além disso trocada a distância 3D direta pela distância TANGENCIAL (rejeita a
   componente ao longo de `QT_ANCHOR_UP`) até o eixo vertical do prédio — necessário porque o
   prédio tem 7,2 unidades de altura (4 andares); medir a distância 3D direta até a base fazia o
   fade nunca disparar pra quem estivesse nos andares de cima (longe da base em linha reta, mesmo
   estando "dentro" do prédio).

## Decisões técnicas tomadas

- **Distância TANGENCIAL (não 3D direta) pro fade das paredes** — ver bug acima. A fórmula
  projeta o vetor jogador→base no eixo `QT_ANCHOR_UP` e descarta essa componente
  (`toPlayer.subtract(QT_ANCHOR_UP.scale(radial))`), sobrando só a distância "horizontal" (no
  plano tangente à esfera do planeta) — funciona igual em qualquer andar, não só no térreo.
- **Fade calculado dentro do loop de física por quadro já existente** (perto do gatilho dos quiz
  markers), não num `scene.onBeforeRenderObservable` separado — precisa de `pos` (posição do
  jogador), que já é uma variável local desse loop grande; um observer independente não teria
  acesso a ela sem duplicar o cálculo.
- **Degraus discretos empilhados, cada um mais alto que o anterior descendo até o piso do próprio
  andar** (não uma rampa lisa) — pedido explícito do usuário ("escada", diferente da Torre do
  Tesouro que já usa rampa). Risco avaliado antes de implementar: a cápsula física do avatar tem
  raio 0,32; degraus de 0,2 de altura (bem menor) devem deixar a parte arredondada da cápsula
  "subir" o degrau só com o solver de física, sem precisar de lógica de step-offset dedicada —
  confirmado funcionando ao vivo (jogador subiu os degraus e disparou os 4 quiz markers em
  sequência).
- **Quiz surpresa bypassa `completeQuest` de propósito** — são bônus avulsos ("pequeno quiz
  surpresa"), não puxam pro sistema de badges/`completedQuestIds` que é reservado pras 21 missões
  oficiais das escolas. Só reaproveita `collectCoin` (mesma função usada por moedas espalhadas
  pelo mapa).
- **Reposicionamento do prédio**: usuário reportou "não vai colocar o prédio em cima da estrada,
  pode colocar ao lado da estrada" depois de ver a posição inicial (`phi` ~30°, só 1,43 unidade
  da linha de centro da rua — sobrepondo o asfalto, meia-largura 0,85). Corrigido mantendo o
  mesmo `theta` (mesma "longitude", perto de onde já estava, do lado da Torre do Tesouro) e
  aumentando `phi` pra 38° (mais longe do polo/da faixa da rua) — medido ao vivo antes de aplicar
  no código: ~3,16 unidades de folga até a rua, confirmado depois do build também.
- **Nuvens e rochas do deserto**: pedidos de polimento visual recebidos no meio do laboratório,
  aplicados como ajustes pontuais de constantes (`CLOUD_COUNT`/diâmetro dos tufos,
  `DESERT_PROP_COUNT`/piso de `radiusFrac`) — não mudam a arquitetura, só os parâmetros.

## Pendências / dívidas conhecidas

- Nenhuma nova. Todas as funcionalidades pedidas foram implementadas e verificadas ao vivo.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma das planejadas para este laboratório.

## O que o próximo laboratório deve desenvolver

1. Nenhum pedido novo pendente no momento em que este laboratório foi encerrado.
2. Se o usuário quiser, o padrão de fundação funda / raycast de chão real / escada de degraus
   discretos já está validado e pode ser reaproveitado pra prédios futuros sem repetir a
   investigação.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`. Usuário pediu explicitamente pra mesclar em `main` e
  apagar a branch — não é uma ação que esta sessão pode executar (mesclar em `main` é reservado
  ao usuário, mesmo sob pedido explícito). Comando pra ele rodar:
  ```
  git checkout main
  git merge worktree-abstract-wobbling-owl
  git branch -d worktree-abstract-wobbling-owl   # só depois do merge
  ```
- Como rodar/verificar: `cd app && npm install && npm run dev`.
