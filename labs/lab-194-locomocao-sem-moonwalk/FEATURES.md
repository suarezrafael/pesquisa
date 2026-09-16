# Laboratório 194 — Locomoção sem moonwalk

Status: em andamento
Início: 2026-09-16
Fim: -
Commit inicial: 6d2bb02a26c97c364dc17348399c04f83f17a2d5

## Objetivo do laboratório

Corrigir o "moonwalk" real (pernas animando como se estivesse andando enquanto o avatar não se
desloca de fato) sincronizando a animação de caminhada/corrida com a velocidade FÍSICA REAL do
avatar, em vez do input bruto do jogador — sem tocar em locomoção do carro/foguete/casa nem mudar o
modelo 3D.

Origem: `docs/gameplay-market-expansion-backlog.md`, "Lab 192 - Locomoção sem moonwalk" (renumerado
pra lab-194 na sequência real do repo, já que lab-192/193 já estavam ocupados) — próximo item
recomendado depois do lab-193 (auditoria/instrumentação de performance), conforme a própria ordem do
documento urgente ("adiar a locomoção sem moonwalk pra o número seguinte"). Prioridade P0.

## Investigação prévia

Lido `README.md`, `CLAUDE.md`, `labs/CURRENT.md`, `docs/urgent-babylon-performance-lab.md` e
`docs/gameplay-market-expansion-backlog.md` (seções 2.1 e "Lab 192") antes de codar.

**Causa raiz real, achada lendo o código (não só a hipótese do backlog)**: em `World3D.tsx`, o ciclo
de caminhada do avatar LOCAL é avançado por
`walkPhase += dt * Math.abs(throttle) * cycleSpeed`, onde `throttle` é o INPUT BRUTO do jogador
(`Math.max(-1, Math.min(1, -y))`, direto do teclado/joystick/toque) — não a velocidade física
resultante. A velocidade do corpo físico também é setada diretamente a partir do mesmo `throttle`
(`body.setLinearVelocity(facing.scale(throttle * currentSpeed).add(radialVel))`, um "kinematic set"
por quadro, não uma força acumulada). Em movimento livre, sem obstáculo, os dois ficam sempre
correlacionados (throttle alto ⇒ velocidade real alta), então a caminhada parece normal. Mas quando
o corpo físico é bloqueado por uma colisão (parede, obstáculo, degrau alto demais) e a física reduz
a velocidade REAL resultante, `throttle` continua no máximo enquanto a velocidade real cai a quase
zero — as pernas continuam animando no ritmo de "andando rápido" enquanto o avatar não sai do lugar:
exatamente o "moonwalk"/foot-sliding relatado.

**Achado que confirma a direção certa da correção**: o avatar REMOTO (multiplayer, lab-55) já
resolve exatamente este problema, de um jeito diferente por não ter throttle local — mede a
DISTÂNCIA REAL percorrida no quadro (`Vector3.Distance(prevPos, newPos) / dt`) e usa ESSA velocidade
medida pra decidir se "está andando" e em que velocidade de ciclo, com o comentário do código já
dizendo isso ("igual em espírito ao que o throttle representa pro personagem local"). Ou seja, o
próprio codebase já tem o padrão certo implementado — só não foi aplicado ainda no avatar local, que
ficou preso na versão mais antiga (throttle bruto).

**Não é bug, já está correto (removido do escopo)**: "alinhar corpo com velocidade tangencial real"
(item do backlog) já é verdade por construção — o controle é "estilo carrinho" (comentário existente
no código): a orientação (`facing`) só gira por input de direção, e o movimento sempre acontece NA
direção de `facing` (`tangentVel = facing.scale(throttle * currentSpeed)`). Corpo e direção de
movimento nunca divergem; não há nada pra corrigir aí.

## Funcionalidades planejadas

- [ ] Trocar o driver do ciclo de caminhada/corrida local de `throttle` bruto pra velocidade
  tangencial FÍSICA REAL (`body.getLinearVelocity()`, já lida no início do bloco de movimento como
  `currentVel`, antes de ser sobrescrita — reflete o resultado real da física do quadro anterior,
  incluindo qualquer colisão), mesmo espírito da correção já existente pro avatar remoto (lab-55).
- [ ] Manter a calibração de `WALK_CYCLE_SPEED`/`RUN_CYCLE_SPEED`/`LEG_SWING_MAX` (não retunar) —
  a troca deve preservar a mesma fração 0-1 de "velocidade máxima" que o throttle já representava.
- [ ] Verificar ao vivo (Chrome real): andar/correr livre (deve continuar idêntico a antes); andar
  contra uma parede/obstáculo real (pernas devem desacelerar/parar, não continuar no ritmo máximo);
  curvas; subida de morro real em Marte (lab-177); pulo e aterrissagem não devem quebrar a pose.
- [ ] Checklist visual de moonwalk (critério de aceite do backlog): 0 casos óbvios em pelo menos 2
  cenários de colisão real (parede/obstáculo) no planeta principal.

## Fora de escopo (explicitamente adiado)

- Pose distinta pra pulo/queda/aterrissagem (o ciclo de caminhada hoje continua rodando no ar se o
  jogador segurar input durante um pulo — não quebra a pose, só não é uma animação dedicada; fica
  pra um lab futuro de "game feel" se o playtest pedir).
- Idle animado (olhar around, respiração) — fora do escopo do bug relatado.
- Efeitos de poeira/grama no passo (`docs/gameplay-market-expansion-backlog.md` §2.1 e §2.3) — feature
  visual nova, não faz parte do bug de moonwalk.
- Qualquer mudança em carro/foguete/casa/mobília (usam seus próprios controles, não o ciclo de
  caminhada a pé) — risco explícito listado no próprio backlog, não tocado.
- Trocar modelo 3D, mocap complexo, novo sistema de combate (explicitamente fora de escopo no
  próprio item do backlog).
- Locomoção do avatar REMOTO (multiplayer) — já está correta, não precisa de mudança.
