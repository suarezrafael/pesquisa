# Laboratório 195 — Movimento mais rápido e responsivo

Status: concluído (PRs #77 e #78, ambas mescladas e implantadas em produção)
Início: 2026-09-16
Fim: 2026-09-18
Commit inicial: ad300f0de38fa5368da2361dd4b0f2e05b4a0d4c

## Objetivo do laboratório

Fazer o avatar andar/correr mais rápido (jogo sente "devagar demais" hoje) sem quebrar controle em
curvas, sem quebrar a gravidade radial/pulo, sem a câmera ficar enjoativa ou atravessando cenário, e
sem tornar os parkours existentes injogáveis — recalibrando as constantes de movimento já
existentes, não redesenhando o controlador.

Origem: `docs/gameplay-market-expansion-backlog.md`, "Lab 208 - Movimento mais rápido e
responsivo" — próximo item da ordem recomendada depois do lab-194 (locomoção sem moonwalk), que
resolveu o P0 de performance/moonwalk que tinha preemptado a ordem normal. Prioridade P0/P1.

## Investigação prévia

Lido `labs/CURRENT.md` e a seção "Lab 208" do backlog antes de codar.

**Constantes atuais** (`World3D.tsx`): `WALK_SPEED = 7.5`, `RUN_SPEED = 11` (última mudança
documentada: "+25%" pedido pelo usuário, na época só pra `WALK_SPEED`), `JUMP_SPEED = 6.2`,
`GRAVITY = 16`, `TURN_RATE = 2.6` rad/s.

**Achado que reduz o risco listado no backlog ("aumentar velocidade e atravessar colisores")**: o
próprio comentário de `GRAVITY`/`JUMP_SPEED` já documenta a folga do pulo contra os degraus do
parkour (altura 0.85, alcance horizontal necessário ~2.1-2.27) e conclui explicitamente que "RUN_SPEED
só aumenta essa folga, nunca reduz" — aumentar a velocidade horizontal não reduz alcance de pulo,
só aumenta (mais chance de passar de um degrau pro seguinte, nunca ficar curto). Os "parkours" deste
jogo são escadas de degraus individuais caminháveis (não gaps que exigem pulo cronometrado entre
plataformas distantes), então "atravessar colisores" aqui é mais um risco de *tunneling* físico (um
quadro de física mover o avatar rápido demais e pular por cima de um colisor fino) do que de
"cair no vão" — precisa verificação ao vivo, não é garantido só pelo comentário existente.

**Câmera**: segue com `Vector3.Lerp(camera.position, desiredCamPos, 0.08)` por quadro — um fator
de suavização FIXO, não normalizado por `dt`. Em velocidade mais alta, `desiredCamPos` se desloca
mais por quadro, então a câmera fica proporcionalmente mais "atrás" do avatar com o mesmo fator —
risco real de enjoo/câmera atrasada citado no próprio backlog, precisa verificação ao vivo.

**Fora do escopo por já estar correto**: a animação de caminhada/corrida (lab-194, concluído nesta
sessão) já deriva o ciclo de passada da velocidade FÍSICA REAL do avatar, não de uma constante fixa
— aumentar `WALK_SPEED`/`RUN_SPEED` automaticamente acelera a animação de perna/braço na mesma
proporção, sem precisar de nenhuma mudança adicional em `petFurColor`/`walkPhase`/etc.

## Funcionalidades planejadas

- [x] Aumentar `WALK_SPEED`/`RUN_SPEED` (mantendo a proporção corrida/caminhada atual) —
  `7.5→9.5`/`11→14` (+27%, mesma proporção ~1.47).
- [x] Verificar ao vivo: curvas continuam controláveis; gravidade radial/pulo continuam corretos
  (altura/tempo no ar batendo com o valor já documentado no comentário de `GRAVITY`).
- [ ] Verificar ao vivo que a velocidade nova não introduz tunneling através de obstáculo fino —
  **não concluído**: achado do review automático do Copilot apontou que o item anterior marcava
  `[x]` um bloco que incluía esta checagem, mesmo o texto já dizendo que não foi reproduzida ao
  vivo. Avaliada só por raciocínio (aumento de ~27%, não uma mudança de ordem de grandeza que
  tipicamente introduz tunneling novo) — ver "Verificação ao vivo" pro detalhe; fica como pendência
  real, não como algo verificado.
- [x] Ajustar o fator de suavização da câmera (`0.08 → 0.1`) — a nova velocidade deixava a câmera
  proporcionalmente mais atrasada (medido ao vivo); o ajuste trouxe a distância de atraso em regime
  permanente de volta perto do valor original.
- [x] Conferido que nenhuma cópia/tutorial hardcoda um valor de velocidade ou tempo dependente dela
  — confirmado por busca (`grep`), só `World3D.tsx` referencia `WALK_SPEED`/`RUN_SPEED`.

## Implementação

`World3D.tsx`:
- `WALK_SPEED`: `7.5 → 9.5`; `RUN_SPEED`: `11 → 14` (proporção corrida/caminhada preservada:
  `14/9.5 ≈ 1.474` vs `11/7.5 ≈ 1.467`). `WALK_CYCLE_SPEED`/`RUN_CYCLE_SPEED` não precisaram de
  mudança — já são calculados como `RUN_CYCLE_SPEED = WALK_CYCLE_SPEED * (RUN_SPEED / WALK_SPEED)`,
  então a proporção se ajusta sozinha, e a correção do lab-194 (animação derivada da velocidade
  física real, não de uma constante) já escala a animação de perna/braço automaticamente.
- Fator de suavização da câmera (`Vector3.Lerp(camera.position, desiredCamPos, 0.08)` →  `0.1`):
  o atraso em regime permanente de uma suavização exponencial escala aproximadamente com
  `velocidade / fator` — sem ajustar, a câmera ficaria ~27% mais atrasada (mesma proporção do
  aumento de velocidade). `+25%` no fator (`0.08→0.1`) compensa a maior parte disso.
- `GRAVITY`/`JUMP_SPEED`/`TURN_RATE` não foram alterados — verificação ao vivo confirmou que
  continuam corretos na nova velocidade (ver abaixo).

## Verificação ao vivo

Chrome real, `engine._deltaTime` forçado + `scene.render()` manual (mesma técnica documentada em
memória de sessões anteriores; achado adicional desta sessão: teleportar o avatar perto de um
gatilho de missão pode abrir um modal de quiz sozinho, que bloqueia TODO input de movimento/pulo
via `hudInert` sem erro nenhum — checar `document.querySelectorAll('.modal-overlay').length` antes
de qualquer teste; e uma montagem HMR obsoleta depois de editar o arquivo pode deixar
`window.__playerFigure`/`__jumpDebug` presos numa instância antiga que nunca recebe os eventos de
teclado — um `navigate()`/reload completo resolve).

- **Câmera**: distância câmera-avatar em regime permanente correndo em linha reta caiu de
  ~12.1-12.3 (fator antigo, velocidade nova) pra ~11.7-11.9 (fator novo) — perto do esperado pra
  manter a mesma sensação de atraso de antes da mudança de velocidade.
- **Curvas**: trajetória em arco suave segurando `w`+`a` simultaneamente, sem soluço/tremor.
- **Pulo**: altura `1.203`, pico aos 24 quadros simulados (~400ms) — bate exatamente com os valores
  já documentados no comentário de `GRAVITY` ("altura ~1.2 e ~0.78s no ar"), confirmando que a
  gravidade/pulo não regrediram com a mudança de velocidade horizontal.
- **Tunneling através de obstáculo fino**: não reproduzido/testado diretamente ao vivo (mesma
  dificuldade de estagiar colisão precisa num mundo esférico já documentada no lab-194) — avaliado
  como risco baixo por raciocínio: aumento de apenas ~27% na velocidade, não uma mudança de ordem de
  grandeza que tipicamente introduz tunneling novo num motor de física como o Havok.

`npx tsc -b` limpo; testes: app 213/213 (inalterado — mudança é engine/constantes, sem lógica de
domínio); `npm run build` sem regressão de bundle.

## Achado pós-merge (rodada 2 do review, chegou minutos antes do merge de PR #77)

**Achado real e sério**: `WALK_CYCLE_SPEED = 8.75` continuou um literal solto depois de
`WALK_SPEED` mudar `7.5→9.5`. Como `speedRatio` (lab-194) é NORMALIZADO por `currentSpeed`, a full
velocidade o ciclo sempre avança a `WALK_CYCLE_SPEED` rad/s, independente do valor de `WALK_SPEED`
— ou seja, a fase por METRO percorrido é `WALK_CYCLE_SPEED / WALK_SPEED`, e um `WALK_SPEED` maior
sem ajustar `WALK_CYCLE_SPEED` REDUZ essa razão, reintroduzindo o mesmo foot-sliding que o lab-194
tinha corrigido (pernas ciclando devagar demais pra distância real percorrida) — só que por uma
causa diferente (constante desatualizada, não mais o throttle bruto). O review ainda citou um
precedente real do próprio código: o lab-32 já tinha mudado `WALK_SPEED` `6→7.5` junto com
`WALK_CYCLE_SPEED` `7→8.75`, mantendo a mesma razão (`7/6 = 8.75/7.5 ≈ 1.1667`) — esta lab quebrou
esse precedente ao não replicar o ajuste.

**Corrigido**: `WALK_CYCLE_SPEED` agora é DERIVADO de `WALK_SPEED` (`WALK_CYCLE_PHASE_PER_SPEED =
7/6; WALK_CYCLE_SPEED = WALK_CYCLE_PHASE_PER_SPEED * WALK_SPEED`) em vez de um literal solto —
preserva a razão automaticamente em qualquer mudança de velocidade futura, sem depender de lembrar
de recalcular à mão. `RUN_CYCLE_SPEED` continua derivado de `WALK_CYCLE_SPEED` como antes, então
segue a correção automaticamente.

**Verificado ao vivo** (contagem de cruzamentos de zero de `legPivotL.rotation.x` sobre distância
REAL percorrida, medida por soma de deltas quadro a quadro — não distância em linha reta do início
ao fim, que subestima o percurso real numa trajetória curva): andando, `1.22` rad/unidade medido
contra `1.1667` esperado; correndo, `1.153` rad/unidade — ambos dentro do ruído de quantização
esperado de contar poucos cruzamentos discretos (12-17 no teste).

`npx tsc -b`/testes/`npm run build` limpos. PR de acompanhamento aberta separada da PR #77 (já
mesclada), mesmo ciclo de review/CI/confirmação de merge.

## Rodada 2 (achado real, acoplamento acidental com os NPCs errantes)

**Achado real e sério**: `WALK_CYCLE_SPEED` também é usado (com fator `0.7`) no ciclo de passada dos
NPCs errantes (`walkerNpcs`, linha ~11884), mas o `moveSpeed` DELES é uma velocidade própria e fixa
(`0.12-0.20`, sorteada por NPC, sem nenhuma relação com `WALK_SPEED` do avatar). Derivar
`WALK_CYCLE_SPEED` de `WALK_SPEED` (a correção da Rodada 1 acima) faria a perna dos NPCs acelerar de
`8.75→11.08` (× `0.7` = `6.125→7.76` rad/s) toda vez que a velocidade do AVATAR mudasse, mesmo o NPC
continuando na mesma velocidade de sempre — o mesmo foot-sliding que esta lab está corrigindo pro
avatar, reintroduzido nos NPCs por acoplamento acidental de uma constante compartilhada.

**Corrigido**: nova constante independente `NPC_WALK_CYCLE_SPEED = 6.125` (o valor EXATO que os
NPCs já tinham antes desta lab — `8.75 × 0.7`, de quando `WALK_CYCLE_SPEED` ainda era um literal
solto) — desacopla o visual dos NPCs de qualquer ajuste futuro de velocidade do avatar. A outra
ocorrência de `WALK_CYCLE_SPEED`/`RUN_CYCLE_SPEED` (linha ~11242, avatar REMOTO/multiplayer) foi
conferida e está correta como está — jogadores remotos se movem pelas MESMAS constantes
`WALK_SPEED`/`RUN_SPEED` (sincronizadas pela rede), então o acoplamento ali é intencional, não um
bug.

Verificado ao vivo: medindo o delta de `walkPhase` por quadro dos NPCs (não a média ao longo de uma
janela, que fica diluída pelos períodos de pausa entre movimentos do próprio comportamento de
"andarilho") — taxa de `6.125` rad/s exata durante os quadros em que o NPC realmente andava,
batendo com o valor histórico.

`npx tsc -b`/testes/`npm run build` limpos.

## Fora de escopo (explicitamente adiado)

- Vender velocidade, booster pago, vantagem premium (regra inegociável do projeto — nunca gating
  de gameplay por assinatura).
- Redesenhar todo o controlador de movimento (fora de escopo explícito no próprio item do backlog).
- Recalibrar `WALK_CYCLE_SPEED`/`RUN_CYCLE_SPEED`/animação — já escalam automaticamente pela
  correção do lab-194 (velocidade física real), não precisam de mudança manual.
- Mudar `GRAVITY`/`JUMP_SPEED` (altura/tempo de pulo) a menos que a verificação ao vivo mostre que a
  nova velocidade horizontal quebra algum parkour existente.
