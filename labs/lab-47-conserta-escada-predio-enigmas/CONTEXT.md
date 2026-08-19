# Contexto — Laboratório 47 — Conserta escada do Prédio dos Enigmas + transparência de piso/nuvem

Preenchido em: 2026-08-18

## O que foi feito

1. **Bug real #1 — paredes bloqueavam o poço da escada inteiro**. O usuário testou o prédio do
   lab-46 e não conseguiu subir. Investigação ao vivo: um raycast pra frente a partir da posição
   do jogador (parado no meio da subida) bateu em `quizBackWall-0`/`quizFrontWall-*` a poucos
   centímetros — as paredes de trás/frente de CADA andar cobriam `QT_WIDTH` inteiro (incluindo o
   poço da escada, x∈[-1,7,-0,7]), então nenhum lance conseguia alcançar nenhuma das duas pontas
   pra completar a subida. Isso também explicava, ao contrário, a queixa original ("mesmo lado"):
   o jogador nem conseguia ENTRAR no poço direito.
   Corrigido: parede de trás/frente de cada andar cobre só `QT_FLOOR_WIDTH` (a largura do piso,
   excluindo o poço), com o segmento de porta do térreo também ajustado pra não invadir o poço.
   Isso deixa o poço da escada aberto nas duas pontas (z=±`QT_HALF_D`) em TODO andar — a "abertura
   no piso pro boneco poder entrar no andar pela escada" que o usuário descreveu.
2. **Bug real #2 — degraus discretos prendiam a cápsula física**. Depois do conserto acima, um
   raycast pra frente a partir da posição parada do jogador (no meio de uma subida) bateu
   diretamente no PRÓPRIO degrau seguinte (`quizStep-0-6`), a centímetros de distância — a
   cápsula ficava fisicamente presa. Causa: um colisor BOX por degrau empilhado não é confiável
   pra um character controller de cápsula sem step-offset dedicado (cada risco de 0,2 ainda é
   pequeno o bastante pra às vezes funcionar, mas não de forma confiável ao longo de 9 degraus em
   sequência) — é exatamente por isso que a Torre do Tesouro (já existente antes deste
   laboratório) usa uma RAMPA lisa, não degraus, apesar de visualmente parecer OK numa inspeção
   rápida. Corrigido reaproveitando a mesma técnica da torre: os degraus viram só decoração
   visual (`collide: false` — ainda dão a aparência de "escada" que o usuário pediu
   explicitamente), e uma rampa fina e INVISÍVEL (`quizRamp-{andar}`, mesma fórmula de ângulo
   `Math.atan2` já usada em `towerRamp`) cobre o lance inteiro pra colisão de verdade.
3. **Escada em zigue-zague** — resposta direta a "as escadas ficaram do mesmo lado": a versão
   anterior sempre subia z=-`QT_HALF_D`→+`QT_HALF_D` em todo lance, então trocar de lance exigia
   atravessar o andar inteiro de volta. Agora lances pares sobem nesse sentido, ímpares no
   sentido contrário — o topo de um lance fica perto do início do próximo (mesmo canto), como uma
   escada de prédio real.
4. **Transparência de piso** — pedido do usuário: "o piso dos andares tem que ficar um pouco
   transparente pra não atrapalhar a visão da câmera em 3ª pessoa". Reaproveita o mesmo cálculo
   de distância tangencial já usado nas paredes (ver lab-46), com um array `quizTowerFloors`
   separado e opacidade mínima mais alta (`QT_FLOOR_MIN_ALPHA = 0,55`, contra `QT_MIN_ALPHA =
   0,12` das paredes) — ainda reconhecível como chão, só não tapa tanto a câmera quanto uma
   parede opaca tapava.
5. **Transparência de nuvem perto da câmera** — pedido do usuário: "o mesmo vale pras nuvens
   quando cruzam a câmera". Diferente do prédio (que mede a distância do JOGADOR), aqui mede a
   distância da CÂMERA até cada grupo de nuvem (`cloud.node.position`, já recalculada por quadro)
   — faz sentido medir a câmera aqui porque o problema é literalmente "a nuvem tapa o que a
   câmera vê", não relacionado à posição do jogador. `cloudGroups` passou a guardar o array
   `puffs` completo (antes só guardava o nó raiz) pra poder ajustar a `visibility` de todos os
   tufos do grupo, não só o primeiro.

## Decisões técnicas tomadas

- **Rampa invisível por baixo de degraus só-visuais, não degraus com colisão própria** — decisão
  central deste laboratório, motivada por um bug real confirmado ao vivo (cápsula presa). Reusar
  a técnica já validada da Torre do Tesouro (em vez de tentar ajustar/depurar a colisão dos
  degraus, ex. reduzir ainda mais a altura do risco) foi mais rápido e mais confiável — a rampa da
  torre já tinha meses de uso comprovado sem esse tipo de bug.
- **Testar de verdade antes de reportar, incluindo quando o teste dá resultado ambíguo** — o
  usuário pediu explicitamente "você tem que testar isso antes" depois do lab-46 ser entregue sem
  detectar o bug de bloqueio. Neste laboratório, o processo de teste incluiu: (a) simulação de
  caminhada via evento de teclado real (`dispatchEvent(new KeyboardEvent('keydown', {key:'w'}))`)
  — descobriu-se que isso é pouco confiável pra rastrear uma subida completa em zigue-zague
  porque o movimento é relativo à câmera (que segue o jogador com lerp, então a direção de "w"
  muda dependendo de onde a câmera já estava apontando) — não um bug do jogo, uma limitação do
  método de automação; (b) teleporte + assentamento por gravidade em pontos ao longo de cada
  lance, usando o gatilho dos marcadores de quiz como confirmação independente de que o jogador
  chegou no ANDAR certo (se o teleporte pro "meio do lance 2" dispara o quiz do "3º andar", isso
  confirma a rampa 1→2 está na altura certa) — esse método deu evidência mais confiável que tentar
  interpretar caminhada por teclado sozinha.
- **Piso com opacidade mínima mais alta que a parede** (0,55 vs 0,12) — pedido explícito do
  usuário ("um pouco transparente", não "quase transparente" como pediu pras paredes) — o piso
  ainda precisa ser reconhecível como superfície de chão, diferente da parede que pode sumir quase
  由 completo já que não afeta a legibilidade do "onde pisar".

## Pendências / dívidas conhecidas

- Nenhuma nova. O padrão "rampa invisível + degraus decorativos" agora é o jeito comprovado de
  fazer escadas neste projeto — reaproveitar em prédios futuros em vez de tentar degraus com
  colisão própria de novo.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma das planejadas para este laboratório.

## O que o próximo laboratório deve desenvolver

1. Nenhum pedido novo pendente no momento em que este laboratório foi encerrado.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`. Usuário pediu explicitamente pra mesclar em `main` e
  apagar a branch — não é uma ação que esta sessão pode executar. Comando pra ele rodar:
  ```
  git checkout main
  git merge worktree-abstract-wobbling-owl
  git branch -d worktree-abstract-wobbling-owl   # só depois do merge
  ```
- Como rodar/verificar: `cd app && npm install && npm run dev`.
