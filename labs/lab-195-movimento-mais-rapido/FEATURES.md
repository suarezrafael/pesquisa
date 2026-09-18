# Laboratório 195 — Movimento mais rápido e responsivo

Status: em andamento
Início: 2026-09-16
Fim: -
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

- [ ] Aumentar `WALK_SPEED`/`RUN_SPEED` (mantendo a proporção corrida/caminhada atual) — valor exato
  calibrado ao vivo, não só decidido a priori.
- [ ] Verificar ao vivo: nenhum tunneling óbvio através de paredes/obstáculos finos na nova
  velocidade; curvas continuam controláveis (`TURN_RATE` ajustado junto se necessário); gravidade
  radial/pulo continuam corretos (altura/tempo no ar); pelo menos 1 parkour de degraus continua
  subível normalmente na nova velocidade.
- [ ] Verificar/ajustar o fator de suavização da câmera (`0.08`) se a nova velocidade deixar a
  câmera visivelmente atrasada atrás do avatar.
- [ ] Conferir que nenhuma cópia/tutorial hardcoda um valor de velocidade ou tempo dependente dela
  (busca prévia não achou nenhuma — só `World3D.tsx` referencia as constantes).

## Fora de escopo (explicitamente adiado)

- Vender velocidade, booster pago, vantagem premium (regra inegociável do projeto — nunca gating
  de gameplay por assinatura).
- Redesenhar todo o controlador de movimento (fora de escopo explícito no próprio item do backlog).
- Recalibrar `WALK_CYCLE_SPEED`/`RUN_CYCLE_SPEED`/animação — já escalam automaticamente pela
  correção do lab-194 (velocidade física real), não precisam de mudança manual.
- Mudar `GRAVITY`/`JUMP_SPEED` (altura/tempo de pulo) a menos que a verificação ao vivo mostre que a
  nova velocidade horizontal quebra algum parkour existente.
