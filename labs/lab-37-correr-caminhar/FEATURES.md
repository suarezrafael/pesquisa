# Laboratório 37 — Opção de correr/caminhar

Status: concluído
Início: 2026-08-17
Fim: 2026-08-17
Commit inicial: 0ea8ff659a4a2ed0a6c514321d50167b2cc2874b

## Objetivo do laboratório
Pedido do usuário: "adicione a opção de correr e caminhar" — até agora o personagem só tinha uma
velocidade de deslocamento (`MAX_SPEED`, acelerada no lab-32 de 6 pra 7,5 depois do relato "o
andar tá lento").

## Funcionalidades planejadas
- [x] `WALK_SPEED` (7,5 — o valor já acelerado do lab-32, virou o "andar" padrão) e `RUN_SPEED`
      (11 — corrida, ~47% mais rápida) — segurar Shift alterna entre os dois em tempo real.
- [x] Animação de caminhada (`WALK_CYCLE_SPEED`/`RUN_CYCLE_SPEED`) e som de passo escalam junto
      (o som de passo já dispara por cruzamento de fase do ciclo de perna, então correr mais
      rápido já dispara passos mais frequentes automaticamente, sem precisar de lógica extra).
- [x] Verificação: `npm run build` passa; simulado evento de teclado real (`KeyboardEvent`, não
      teleporte) segurando W e depois W+Shift — velocidade do corpo físico medida ao vivo: 7,50
      andando, 11,00 correndo, ~0 depois de soltar as duas teclas. Ver `CONTEXT.md`.

## Fora de escopo (explicitamente adiado)
- Correr pelo joystick de toque (mobile) — não tem um botão/gesto equivalente ao Shift ainda; o
  joystick já dá velocidade variável (proporcional a quanto o analógico é empurrado), mas nunca
  passa de `WALK_SPEED` — ver "Pendências" em `CONTEXT.md`.
