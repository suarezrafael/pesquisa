# Contexto — Laboratório 37 — Opção de correr/caminhar

Preenchido em: 2026-08-17

## O que foi feito

1. **`WALK_SPEED`/`RUN_SPEED`** (`src/world3d/World3D.tsx`, perto de `GRAVITY`/`JUMP_SPEED`) —
   renomeado de `MAX_SPEED` (7,5, valor já acelerado desde o lab-32) pra `WALK_SPEED`, e
   acrescentado `RUN_SPEED = 11`. `WALK_CYCLE_SPEED`/`RUN_CYCLE_SPEED` seguem a mesma proporção
   (`RUN_CYCLE_SPEED = WALK_CYCLE_SPEED * (RUN_SPEED / WALK_SPEED)`), garantindo que a animação
   de perna/braço sempre bate no ritmo certo do deslocamento de verdade em qualquer um dos dois
   modos (mesmo motivo documentado no lab-32 pra escalar as duas juntas).
2. **Alternância por Shift** — no loop de movimento (`const running = !!keysDown['shift']`), a
   velocidade tangencial (`tangentVel = facing.scale(throttle * currentSpeed)`) e a velocidade do
   ciclo de caminhada (`running ? RUN_CYCLE_SPEED : WALK_CYCLE_SPEED`) usam o modo atual. `Shift`
   já era capturado por `keysDown` automaticamente (o handler de teclado não filtra por lista de
   teclas específicas antes de gravar em `keysDown[key] = true`) — não precisou de nenhuma
   mudança no listener de teclado, só passou a ser LIDO.
3. **Som de passo** — nenhuma mudança necessária: já dispara por cruzamento de fase do ciclo de
   perna (`swing`/`lastFootSign`), não por um timer fixo — correndo mais rápido já dispara passos
   mais frequentes automaticamente, de graça.

## Decisões técnicas tomadas

- **`WALK_SPEED` = valor já acelerado (7,5), não o original (6)** — o pedido do lab-32 ("o andar
  tá lento, acelere") já resolveu o "andar" padrão; "correr" devia ser NOTAVELMENTE mais rápido
  que esse andar já acelerado, não um "andar normal" redefinido pra baixo. `RUN_SPEED = 11`
  (~47% mais rápido que `WALK_SPEED`) dá uma diferença perceptível sem ficar absurdo.
- **Só teclado (Shift) nesta rodada, não o joystick de toque** — o joystick de toque
  (`TouchJoystick.tsx`) já reporta uma magnitude contínua (0 a 1, proporcional a quanto o
  analógico é empurrado), que o jogo usa pra escalar `throttle` — ou seja, mobile JÁ tem uma
  forma de "andar mais devagar/mais rápido" dentro da faixa de `WALK_SPEED`, só nunca alcança
  `RUN_SPEED` (não existe gesto/botão equivalente ao Shift). Resolver isso exigiria desenhar um
  elemento de UI novo (botão de correr) não pedido explicitamente — fica como pendência.

## Verificação feita (evidência, não só visual)

- `npm run build` passa (typecheck + build de produção, exit code 0).
- **Teste com evento de teclado de verdade**, não teleporte: `window.dispatchEvent(new
  KeyboardEvent('keydown', { key: 'w' }))` seguido de leitura da velocidade linear real do corpo
  físico (`avatarCollider.physicsBody.getLinearVelocity().length()`) depois de 300ms — 7,50
  (bate exatamente com `WALK_SPEED`). Em seguida, `keydown` de `Shift` (mantendo `w` pressionado)
  — velocidade sobe pra 11,00 (bate exatamente com `RUN_SPEED`). `keyup` das duas — velocidade
  cai pra ~0 (0,27, atrito natural freando o resíduo). Prova direta de que o toggle funciona via
  o mesmo caminho de INPUT REAL que o jogador usaria (evento de teclado do navegador), não uma
  leitura de estado interno ou uma posição forçada.

## Pendências / dívidas conhecidas

- Sem opção de correr pelo joystick de toque (mobile) — só teclado por enquanto. Se o usuário
  jogar principalmente em celular/tablet, vale revisitar (ex.: um botão de "correr" fixo na tela,
  ou tocar duas vezes no joystick, ou qualquer outro gesto — a decidir com o usuário).

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma das planejadas para este laboratório.

## O que o próximo laboratório deve desenvolver

1. Se o usuário jogar em touch/mobile e sentir falta de correr lá também — desenhar um
   equivalente ao Shift pro joystick de toque.
2. Nenhum outro pedido novo pendente no momento — como já registrado no lab-36, uma sessão de
   PLAYTESTING REAL (jogando de verdade, não só raycast/build) de tudo construído nos labs 31-37
   continua sendo a recomendação mais forte antes de mais mudanças grandes.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl` (worktree isolado, ainda não mesclada em `main` —
  usuário pediu merge, mas esta sessão não pode mesclar em main). Pra mesclar manualmente:
  ```
  git checkout main
  git merge worktree-abstract-wobbling-owl
  ```
- Como rodar/verificar: `cd app && npm install && npm run dev`.
