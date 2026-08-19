# Laboratório 18 — Polimento: física do pulo, animação de andar, cor dos morros, sons

Status: concluído
Início: 2026-08-17
Fim: 2026-08-17
Commit inicial: 82ee7cf1d2ea36a91bffea4979a5c19b3f92bce3

## Objetivo do laboratório
Três relatos diretos do usuário jogando a build desta sessão (`worktree-abstract-wobbling-owl`):

1. "a gravidade do pulo não está realista, parece que estou na lua" — pulo com física real
   (GRAVITY=9.81) ficava com ~1,1s no ar e ~1,5 de altura, grande demais pro tamanho do
   personagem/mundo, lendo como baixa gravidade.
2. "o boneco não dobra os joelhos pra andar" — a animação de joelho só dobrava em METADE do
   ciclo de passada (fase de "levantar a perna"), ficando 100% reta na outra metade (fase de
   apoio); tecnicamente correto biomecanicamente, mas lia como "quase sempre reto" de longe.
3. Screenshot mostrando um platô/morro sem cor de morro nenhuma ("tem grama mas está invisível")
   — pedido: "pode fazer um morro como aquele com marrom e cor de verde mais escura que a grama
   do planeta".
4. "o boneco deve fazer barulho de passo ao andar" — o som já disparava (confirmado
   instrumentando `AudioContext`), mas baixo/curto demais pra se notar.
5. "os pássaros devem ter um som de cantar baixinho quando estão perto" — não existia.

## Funcionalidades planejadas
- [x] Ajustar `GRAVITY`/`JUMP_SPEED` pra um pulo mais "no chão", preservando folga confortável
      sobre os degraus do parkour (lab-11, altura 0.85) e alcance horizontal suficiente entre
      plataformas (2.27).
- [x] Trocar a fórmula de dobra de joelho (jogador e NPCs) por uma que nunca fica 100% reta
      durante a caminhada — dobra contínua entre um mínimo e um máximo, não clipada em zero
      durante metade do ciclo.
- [x] Cor de morro por altura (não só por inclinação) no vértice do planeta — platôs ganham
      marrom (rampa) e verde escuro (topo achatado) mesmo quando a rampa não é íngreme o
      bastante pra disparar a mistura de pedra já existente.
- [x] Som de passo mais audível (ganho maior, filtro mais grave).
- [x] Canto de pássaro baixinho quando o jogador está perto (novo som sintetizado + gatilho por
      distância na IA de vagar dos pássaros já existente).
- [x] Verificação: `npm run build` passa; testar tudo rodando o dev server (pulo com tempo no
      ar/altura reduzidos mas parkour ainda alcançável, joelho dobrando visivelmente durante toda
      a caminhada, platô com cor de morro visível numa captura de tela, canto de pássaro
      disparando perto de um pássaro).

## Fora de escopo (explicitamente adiado)
- Qualquer outro pedido de conteúdo/backend — este lab é só os três ajustes relatados.
