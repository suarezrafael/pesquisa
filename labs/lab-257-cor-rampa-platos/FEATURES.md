# Laboratório 257 — Cor da rampa externa dos platôs (achado real, não é bug de malha)

Status: implementado
Início: 2026-10-05
Fim: 2026-10-05
Commit inicial: bf85e4f8147ec9d1c00b1dac680291211ba95ecb
Prioridade: P0 — usuário mandou um QUARTO print na mesma linha de investigação

## Objetivo do laboratório

Minutos depois do deploy do lab-256, o usuário mandou outro print: "ainda tem arvores flutuando
em morros invisiveis e o boneco ao chegar perto da armvore fica em cima desse morro invisivel".
Diferente dos labs 255/256 (rochas decorativas flutuando), desta vez a árvore apontada estava
CORRETAMENTE encostada no chão (confirmado com zoom) — a causa aqui é outra: o terreno sobe de
verdade perto dali, mas não tem NENHUMA cor própria que avise disso.

## Funcionalidades planejadas

- [x] Confirmar que a árvore apontada pelo usuário (`prop-33/tree_default`, perto da "Lojinha")
  está corretamente assentada no chão — raycast físico real: gap de -0,074 (praticamente
  perfeito). Não é um bug de posicionamento de árvore.
- [x] Mapear a altura real do terreno ao redor da árvore com raycast físico (não fórmula) em
  anéis crescentes — achado: um ponto a só ~4m da árvore já tinha 0,99-1,00m de altura real
  (platô 6, `height: 1.9`, cujo centro fica a ~6m dali).
- [x] Confirmar visualmente (teleporte + captura de tela no mesmo ponto medido): terreno
  perfeitamente plano/verde aos olhos, nenhuma pista de elevação, apesar de 1m de altura real —
  reproduzido de forma inequívoca.
- [x] Identificar por que os dois mecanismos de cor existentes davam sinal fraco/nenhum demais
  nessa faixa: `rockBlend` (baseado na inclinação da normal) mede slope ~1,0 (perfeitamente plano)
  mesmo nesse ponto elevado — o `smoothstep` da rampa do platô é por design quase sem inclinação
  longe do pico (e a malha de 48 segmentos não resolve a curvatura fina mesmo onde a fórmula tem
  inclinação real), zero contribuição de verdade; `hillBlend` (baseado em altura) já estava ATIVO
  a 0,84-0,99m (acima do limiar antigo de 0,5), mas só dava um blend fraco (~0,23-0,33) —
  insuficiente pra ser percebido contra a grama, não ausente.
- [x] Corrigir `hillBlend`: limiar baixado de 0,5 para 0,28 (logo acima do teto da ondulação de
  base do planeta, ~0,27 — qualquer altura daí pra cima só pode vir de um platô de verdade) e
  divisor reduzido de 1,5 para 0,9 (satura mais rápido, já que `rockBlend` não ajuda nessa faixa).
- [x] Confirmar ao vivo no MESMO ponto medido antes: cor do terreno renderizado ficou mensuravelmente
  mais escura/diferente da grama normal (pixel real: de uniforme ~(121,152,100) em grama comum
  pra ~(86,120,94) no ponto elevado — antes do fix, não havia essa diferença).
- [x] Conferir visualmente que platôs já testados nos labs 255/256 (platô 0, rochas grandes)
  continuam com aparência normal, sem regressão perceptível.
- [x] `npm run test` (377/377), `npm run lint` (zero avisos), `npm run build` sem regressão.
- [x] Reverter o bypass temporário de `waitForVisible()` antes do commit.

## Fora de escopo (explicitamente adiado)

- Mudar as cores em si (`hillGreenColor`/`hillBrownColor`) pra algo mais contrastante/saturado —
  risco maior de alterar o visual já aprovado dos topos de platô; a mudança de limiar/divisor já
  deu uma diferença real e medida sem mexer na paleta.
- Melhorar `rockBlend` pra reconhecer inclinação em malha de baixa resolução — mudança bem mais
  arriscada (afeta geometria/normais do planeta inteiro); o ajuste em `hillBlend` já resolve o
  caso sem precisar disso.
- Qualquer mudança de jogabilidade, recompensa ou regra de missão.
