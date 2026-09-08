# Laboratório 153 — Câmera por arrasto fora de casa

Status: concluído
Início: 2026-09-07
Fim: 2026-09-07
Commit inicial: 24f3570651583190ee6bf75226d0927716cddd1d

## Objetivo do laboratório

Item "pronto pra implementar" da pesquisa de mercado feita nesta sessão (`Carta de Navegação`):
Roblox mobile e Minecraft Bedrock giram a câmera arrastando a metade direita da tela (padrão que
o público-alvo já traz de outros jogos); Missão Aprender só girava a câmera fora de casa via dois
botões (◀ ▶) de velocidade fixa. Dentro de casa o jogo já tem exatamente esse gesto de arrastar
(lab-138) — este laboratório estende a MESMA lógica pro lado de fora, sem tirar os botões.

## Investigado antes de planejar

- Dentro de casa, o arraste já alimenta `cameraYawOffsetRef`/`houseCameraPitchOffsetRef` via
  `onHouseCameraPointerDown/Move/Up`, ligados no `<canvas>`/`window` — `PointerEvent` unifica
  mouse e toque sozinho, então o mesmo ouvinte já cobre os dois sem código separado.
  `houseCameraPitchOffsetRef`/zoom são só de dentro de casa (câmera "esférica" do lab-138); fora,
  a câmera usa um offset fixo de altura — então o arraste de fora só precisa mexer no YAW, o
  mesmo eixo que os botões ◀ ▶ já usam.
- Decisão de escopo: começar o arraste de fora só se o toque inicial cair na metade DIREITA do
  canvas (decidido uma vez no `pointerdown`, não recalculado a cada `pointermove`) — a metade
  esquerda é onde o `TouchJoystick` de movimento fica desenhado por cima do canvas.

## Funcionalidades planejadas

- [x] Unificar os ouvintes de ponteiro (`onHouseCameraPointerDown/Move/Up` →
      `onCameraPointerDown/Move/Up`, cobrindo dentro E fora de casa) — dentro de casa continua
      girando+inclinando como antes; fora, só gira, e só se o arraste começar na metade direita do
      canvas (decidido uma vez no `pointerdown`, guardado em `outdoorDrag` até soltar).
- [x] Manter os botões ◀ ▶ intocados (aditivo, não substitui).
- [x] `npx tsc -b` / `npm run test` sem erros (107/107).
- [x] Verificação: testado com `PointerEvent` sintético direto no DOM (mais confiável que a
      automação de mouse do navegador — ver "Pendências"), comparando a posição real do avatar
      (`window.__playerFigure`) e da câmera (`scene.activeCamera.position`) antes/depois. Arrasto
      na metade direita: câmera mudou de posição (órbita em volta do avatar), avatar ficou parado
      (drift de ponto flutuante ~4e-5, não é movimento real). Arrasto na metade esquerda: nem
      avatar nem câmera mudaram — confirma que a área fica reservada pro joystick.

## Fora de escopo (explicitamente adiado)

- Zoom/inclinação vertical fora de casa — a câmera de fora usa offset fixo de altura, sem conceito
  de pitch; mudar isso é uma mudança de câmera bem maior, não pedida.
- Qualquer mudança nos botões ◀ ▶ em si (continuam do jeito que estão).
