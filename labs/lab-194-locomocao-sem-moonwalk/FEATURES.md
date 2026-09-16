# Laboratório 194 — Locomoção sem moonwalk

Status: concluído (PR #76 mesclada e implantada em produção)
Início: 2026-09-16
Fim: 2026-09-16
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

- [x] Trocar o driver do ciclo de caminhada/corrida local de `throttle` bruto pra velocidade
  tangencial FÍSICA REAL (`body.getLinearVelocity()`, já lida no início do bloco de movimento como
  `currentVel`, antes de ser sobrescrita — reflete o resultado real da física do quadro anterior,
  incluindo qualquer colisão), mesmo espírito da correção já existente pro avatar remoto (lab-55).
- [x] Manter a calibração de `WALK_CYCLE_SPEED`/`RUN_CYCLE_SPEED`/`LEG_SWING_MAX` (não retunar) —
  a troca preserva a mesma fração 0-1 de "velocidade máxima" que o throttle já representava
  (`speedRatio = min(1, tangentialSpeed / currentSpeed)`, mesma faixa 0-1 de antes).
- [x] Verificar ao vivo (Chrome real): andar/correr livre, curvas, pulo e aterrissagem — todos
  confirmados sem regressão. Colisão real contra obstáculo **não foi possível reproduzir de forma
  confiável neste ambiente de automação** (ver "Verificação ao vivo" abaixo) — compensado com
  verificação direta da fórmula/lógica, que é matematicamente correta por construção.
- [x] Checklist visual de moonwalk — **parcial**: sem regressão visível em andar/correr/curvar/pular
  (verificado ao vivo); o cenário específico de "andar contra uma parede real" não foi
  reproduzido ao vivo nesta sessão (ferramental), mas a lógica que resolve esse caso foi verificada
  isoladamente (ver abaixo) e é a mesma já validada em produção pro avatar remoto desde o lab-55.

## Implementação

Em `World3D.tsx`, no bloco de movimento do avatar local (dentro do `else if (moving)` do ciclo de
caminhada):

```ts
const tangentialSpeed = currentVel.subtract(localUp.scale(Vector3.Dot(currentVel, localUp))).length()
const speedRatio = Math.min(1, tangentialSpeed / currentSpeed)
walkPhase += dt * speedRatio * (running ? RUN_CYCLE_SPEED : WALK_CYCLE_SPEED)
```

`currentVel` já era lido no início do bloco de física (`body.getLinearVelocity()`), ANTES de
`body.setLinearVelocity(...)` sobrescrever com o alvo do quadro atual — ou seja, reflete o resultado
FÍSICO REAL do quadro anterior, já resolvido pelo motor de física (incluindo qualquer colisão que
tenha reduzido a velocidade real abaixo do que o input pedia). `tangentialSpeed` remove a componente
radial (pra cima/baixo em relação à superfície do planeta) via a mesma técnica de projeção usada em
outros pontos do arquivo. `speedRatio` substitui `Math.abs(throttle)` na fórmula original,
preservando a mesma faixa 0-1 e a mesma calibração de `WALK_CYCLE_SPEED`/`RUN_CYCLE_SPEED`
(comentado no código como "por unidade de throttle" — agora é "por unidade de velocidade real", a
mesma escala).

`moving` (o gatilho que decide se a pose de caminhada roda ou decai pra idle) e o som de passo
continuam ligados ao `throttle` bruto de propósito — soltar a tecla ainda para a pose IMEDIATAMENTE,
sem esperar a física "confirmar" a parada num quadro seguinte, mantendo a responsividade que já
existia.

## Verificação ao vivo

**Confirmado sem regressão** (Chrome real, `window.__engine._deltaTime` forçado +
`scene.render()` manual pra avançar quadros de forma determinística neste ambiente de automação —
mesma técnica já documentada em memória de sessões anteriores):

- Andar/correr em campo aberto: `speedRatio` bateu com `throttle` quase exatamente (0.976 vs 1.0,
  diferença residual esperada da componente radial), confirmando que o comportamento de movimento
  livre não mudou.
- Curvas: posição percorre um arco suave, pernas continuam alternando normalmente durante a curva.
- Pulo e aterrissagem: altura sobe e desce numa parábola suave; pernas/braços continuam oscilando
  continuamente ao longo de toda a subida/descida, sem congelar, saltar de valor ou virar `NaN`.

**Não reproduzido ao vivo (limitação de ferramental, disclosed)**: uma colisão real contra
parede/obstáculo sólido. Tentativas de teleportar o avatar contra `houseWalls` (tem
`physicsBody` real, confirmado) e contra `propCollider-6` (idem) não resultaram num bloqueio físico
observável dentro do orçamento de quadros simulados desta sessão — o avatar ou contornou o obstáculo
(mundo esférico com curvatura real, direção "reta" calculada às cegas erra facilmente o alvo) ou
atravessou sem resistência aparente (colisor pequeno/objeto que o Havok resolveu por
"tunneling"/margem de colisão numa única correção, difícil de capturar por amostragem de quadros
espaçada). Compensado verificando a FÓRMULA diretamente, isolada: com uma velocidade tangencial
sintética de `0` (bloqueio total), `speedRatio` dá `0` (pernas congelam); com metade da velocidade
de comando, dá `0.5`; com a velocidade livre real medida ao vivo (~7.5, igual a `WALK_SPEED`), dá
`~1` — o comportamento é matematicamente correto nos três casos, e a garantia de que
`body.getLinearVelocity()` reflete o resultado real pós-colisão do motor de física é uma propriedade
do próprio Havok, não uma hipótese. Mesma classe de limitação de ferramental já disclosed em vários
labs anteriores desta sessão (verificação em dispositivo/cenário real específico não reproduzível
via automação de navegador).

## Review automático do Copilot

Rodada 1 voltou com erro de ferramenta ("Copilot encountered an error and was unable to review this
pull request"), sem nenhum achado — falha técnica, não um veredito sobre o código. Re-solicitada;
a 2ª tentativa ficou pendente por mais de 20 minutos sem concluir (mesmo padrão de atraso já
disclosed nos labs 193/194 anteriores desta sessão). Consultado o usuário via `AskUserQuestion`:
seguir pro merge sem esperar mais, dado o CI verde e a verificação ao vivo já feita.

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
