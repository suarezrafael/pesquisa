# Contexto — Laboratório 59 — Foguete pilotável + Marte

Preenchido em: 2026-08-20
Commit inicial → final: 16087c7ca9e25b354a7038b85145b9dbf3236ab0..HEAD

## O que foi feito

1. **Pilotagem do foguete** (`World3D.tsx`): substituído o teleporte instantâneo do lab-58 por um
   ciclo embarcar/pilotar/pousar. `boardRocket()` prende o boneco (parenting) a uma instância
   dedicada e reutilizável do foguete (`flyingRocket`, construída uma vez via `buildRocket()` e
   mantida desabilitada até o embarque — os dois foguetes fixos nas plataformas continuam parados
   como marcos visuais) e aplica a mesma pose "sentado" já usada no carro (pernas/joelhos/
   braços/cotovelos). No laço de física por quadro, um novo bloco (`if (drivingRocket &&
   flyingRocket)`) lê o mesmo `y` combinado (joystick + teclado) que já move o carro, converte em
   `rocketThrottle = clamp(-y, -1, 1)`, avança `drivingRocket.progress` (0→1) e reorienta a nave
   e a câmera a cada quadro.
2. **Trajeto real pelo espaço** (`sampleFlightArc`): substitui `travelToOtherPlanet` (teleporte
   direto do lab-58). Arco de Bézier quadrático entre a posição absoluta da plataforma de partida
   e a de chegada, com um ponto de controle elevado (`ROCKET_ARC_HEIGHT = 45`) na direção média
   entre `ROCKET_LAUNCH_DIR` e `SECOND_PLANET_LANDING_UP` — cria uma curva visível "subindo e
   descendo" em vez de uma reta pelo centro dos planetas. `ROCKET_FLIGHT_SPEED = 1/9` por segundo
   de aceleração máxima ⇒ ~9s de viagem em linha reta de aceleração constante.
3. **Marte** (`buildSecondPlanetIfNeeded`): chão trocado pra marrom (`Color3(0.56, 0.35, 0.22)`,
   roughness alta); a lista de props passou a usar só os índices de rocha (`rockIndices = [6..11]`
   dos mesmos `propFiles` já carregados), nenhuma árvore; a cada 4º slot da distribuição, em vez de
   rocha, entra uma nova decoração (`buildCaveEntrance` — dois montes de rocha ovalados + um
   cilindro escuro fazendo a "boca" da caverna, só primitivas, sem asset externo, mesmo padrão do
   resto do jogo).
4. **Sistema de gravidade multi-planeta do lab-58 reaproveitado sem mudança de forma** —
   `currentWorldCenter`/`currentGroundBaseFn` já existiam pra abstrair "qual planeta é o chão
   agora"; só precisaram ser trocados no momento do pouso (`landRocket()`), não durante o voo (o
   avatar fica parented ao foguete, fora do laço de gravidade normal, enquanto `drivingRocket`
   estiver ativo — mesmo padrão já usado pelo carro).

## Decisões técnicas tomadas

- **`drivingRocket.progress` inicia em `0.001`, não `0`** — bug real encontrado ao vivo: a
  condição de pouso por quadro é `progress >= 1 || progress <= 0`; como `progress` é sempre
  clampado pra nunca ficar negativo, iniciar em exatamente `0` fazia o primeiro quadro já disparar
  `landRocket()` antes de qualquer input ser processado (embarque desfeito instantaneamente).
  Confirmado ao vivo checando `window.__playerFigure.root.parent` (ficava `null` logo após
  embarcar, devia ser `"rocketRoot"`) e o estado `isEnabled()` do `flyingRocket`.
- **`ROCKET_ENTER_DISTANCE` aumentada de `2.6` pra `4`** — segundo bug real: mesmo com o pouso
  calculado corretamente (verificado com um hook de debug temporário comparando o `landingUp`
  calculado com o valor esperado à mão — bateram exatamente), a posição final de repouso do avatar
  ficava mais longe do foguete de volta do que o esperado, porque a física (gravidade residual,
  assentamento no chão) continua rodando por alguns quadros depois do teleporte inicial e o avatar
  "escorrega" um pouco antes do jogador poder interagir de novo — mais perceptível no planetinha
  pequeno (raio 6) do que no principal (raio 13), já que a mesma distância angular de escorregão
  representa uma fração maior da superfície. Aumentar a margem foi mais simples e robusto do que
  tentar zerar velocidade residual num momento exato.
- **Foguete de voo é uma instância separada, não o foguete da plataforma** — os dois foguetes
  fixos (`mainRocket`, `secondPlanetReturnRocket`) continuam sempre visíveis nas plataformas como
  marcos (não fazia sentido "sumir" o prédio/plataforma quando alguém embarca); uma terceira
  instância (`flyingRocket`, construída uma vez, escondida até o primeiro embarque) é o que
  realmente se move — evita ter que mover/animar o objeto que é filho de uma plataforma estática
  ou duplicar geometria por viagem.
- **Sem controle de pitch/yaw livre** — só avanço/recuo ao longo de um trajeto fixo (like o carro
  não sai da pista), consistente com o pedido literal do usuário ("ir pra trás e pra frente com as
  setas") e mais simples de garantir que a nave sempre chega no destino certo.

## Correção pós-verificação (mesmo dia, feedback do usuário em produção)

Depois do primeiro deploy deste laboratório, o usuário testou em produção e reportou dois problemas
reais (que a verificação ao vivo no dev server não tinha pego, porque o teleporte de debug começa
sempre na mesma posição/ângulo): "o foguete deve decolar na vertical, não de lado, e o planetinha
não deve estar muito longe na viagem, como se fosse uma distância de um planeta e meio."

- **Decolagem de lado, não vertical** — bug real de orientação: o quadro-a-quadro que gira o
  foguete durante o voo (`Matrix.FromXYZAxesToRef(shipRight, shipUp, shipFwd, ...)`) travava o
  nariz do foguete (eixo Y local, o mesmo que `alignmentQuaternion` alinha à superfície quando ele
  está parado na plataforma) no "pra cima" FIXO do mundo, e a direção de voo ficava no eixo Z —
  então a nave sempre voava "de lado" (nariz apontando pro céu do mundo, casco deslizando na
  direção do voo) em vez de apontar pra onde estava indo. Corrigido trocando os eixos: o nariz
  (Y local) agora acompanha a tangente da curva de voo a cada quadro.
- **Curva sem tangente garantida na decolagem/pouso** — a curva antiga (Bézier quadrática, um
  único ponto "meio" elevado numa direção genérica) não garantia que a tangente no EXATO instante
  da decolagem apontasse pra cima da plataforma — só "mais ou menos". Trocada por uma Bézier
  CÚBICA com dois pontos de controle, cada um deslocado da própria plataforma na direção "pra
  cima" local dela (`ROCKET_LAUNCH_DIR` na partida do planeta principal, `SECOND_PLANET_LANDING_UP`
  na do planetinha) — isso garante matematicamente (não só visualmente) que a tangente em t=0 e
  t=1 é exatamente a direção vertical de cada plataforma.
- **Planetinha longe demais (400 unidades)** — reduzido pra uma distância de centro-a-centro de
  58 (13 + 39 + 6 ⇒ ~1,5 diâmetro do planeta principal de vão livre entre as duas superfícies,
  "uma distância de um planeta e meio" como pedido). `ROCKET_ARC_HEIGHT` (a distância que os
  pontos de controle da curva se afastam de cada plataforma) também reduzida de 45 pra 14 —
  calibrada pra 400 unidades de distância, ficaria desproporcionalmente gigante pra uma viagem de
  ~58 unidades.
- Verificado ao vivo de novo depois da correção (teleporte de debug + `__handleInteractPress` +
  tecla real): ida e volta completas, chão de Marte confirmado marrom via inspeção direta do
  material (`secondPlanetGround`, `Color3(0.56, 0.35, 0.22)`), distância nova de 58 unidades
  confirmada pela posição real do foguete de volta. A decolagem vertical em si não deu pra
  observar quadro a quadro (o mesmo throttle de aba em segundo plano documentado em memória fez o
  voo inteiro completar num único quadro forçado de novo), mas a garantia é matemática — a
  tangente da cúbica em t=0 é exatamente `(c1-p0)`, e `c1 = p0 + fromUp * ROCKET_ARC_HEIGHT`, ou
  seja, sempre `fromUp` normalizado por construção, não por coincidência.

## Pendências / dívidas conhecidas

- **Cor original do glTF nas rochas reaproveitadas** — algumas mantêm um tom ligeiramente
  esverdeado/azulado do modelo original em vez de marrom-avermelhado "de Marte" — cosmético menor,
  observado ao vivo, não documentado como bug (as rochas em si fazem sentido geologicamente, só a
  cor destoa um pouco do restante do cenário).
- **Overshoot de `progress` em quadros forçados manualmente** — durante o teste ao vivo desta
  sessão (aba de automação em segundo plano, mesmo padrão documentado desde o lab-58), quadros
  forçados via screenshot tiveram `dt` muito grandes entre si (chegando a "0 FPS"/"1 FPS" no HUD de
  debug), fazendo a viagem inteira (~9s pretendida) completar num único quadro forçado. Isso é um
  artefato do ambiente de teste automatizado (aba não realmente em primeiro plano), não um bug de
  gameplay — em uso normal, com quadros reais a 30-60fps, a viagem dura os ~9s pretendidos.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — tudo que foi pedido nesta rodada foi entregue e verificado ao vivo (embarque, voo
pilotado ida e volta, pouso em Marte com chão marrom/só rochas/cavernas, pouso de volta no planeta
principal).

## O que o próximo laboratório deve desenvolver

1. Usuário testar no celular/tablet real: sensação de pilotagem do foguete (o botão de toque "E"
   já cobre embarque/desembarque; avanço/recuo usa o mesmo joystick/direcional já existente do
   carro, não precisa de UI nova) e a aparência de Marte.
2. Se sobrar tempo: recolorir os modelos de rocha reaproveitados especificamente pro bioma de
   Marte (ver "Pendências" acima).
3. Itens antigos ainda pendentes do lab-58: thin instancing de verdade se a qualidade adaptativa
   não for suficiente no Redmi Pad 2; decidir sobre desligar o Fly.io (v1, sem uso desde o lab-54).

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`, a partir de `main`. PRs #2-#5 já foram mesclados pelo
  usuário — este laboratório abre mais um PR novo (ver link no resumo final da sessão).
- Jogo ao vivo (republicado com este laboratório): https://app-two-flax-92.vercel.app
- Como rodar/verificar localmente: `cd app && npm install && npm run dev`.
- Como testar o foguete sem andar até lá: no console do navegador (`npm run dev`, não o build de
  produção — o helper só existe em DEV), `window.__debugTeleport(-0.3797213687147455,
  -0.913545457642601, 0.14576137678401327)` teleporta bem em cima da estação de lançamento; depois
  `window.__scene.__handleInteractPress()` embarca, e segurar seta-pra-cima pilota a nave.
- Como redeployar o jogo: `cd app && npx vercel --prod --yes`.
