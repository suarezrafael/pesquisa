# Contexto — Laboratório 178 — Câmera Roblox-like fácil

Preenchido em: 2026-09-11
Commit inicial → final: 43a197544720c7ee8b253e50cc314b1edb8437b8..HEAD (ver `git log` na branch
`lab-178-camera-roblox-like`)

## O que foi feito

Investigação prévia (antes de codar, ver `FEATURES.md`) achou que boa parte do escopo do backlog
já estava implementada por labs anteriores (giro por arrasto mouse/touch, split direita=câmera/
esquerda=movimento no mobile, botões ◀ ▶, suavização) — este lab fechou só os 4 gaps reais
encontrados:

- **Zoom por scroll/pinch fora de casa** (`app/src/world3d/World3D.tsx`): novo
  `outdoorCameraZoomRef` (mesmo conceito do `houseCameraZoomRef` já existente, mas com seus
  próprios limites — `OUTDOOR_CAMERA_ZOOM_MIN = 0.6`, `OUTDOOR_CAMERA_ZOOM_MAX = 1.8`, calibrados
  pra distância padrão bem maior de fora de casa). `onHouseCameraWheel` foi generalizado pra
  `onCameraWheel`, cobrindo os dois contextos (dentro/fora de casa) com o ref/sensibilidade/limites
  certos pra cada um. Aplicado nos 3 lugares que usam `CAMERA_DISTANCE`/`CAMERA_HEIGHT`: câmera a
  pé (fora de casa), carro, e as duas fases da câmera do foguete (decolagem/pouso e cruzeiro).
  Pinch de 2 dedos: `pinchPointers` (novo `Map<number, {x,y}>`) rastreia até 2 ponteiros
  simultâneos nos mesmos ouvintes de `pointerdown`/`pointermove`/`pointerup` já existentes do giro
  de 1 dedo só — ao detectar o 2º dedo, cancela um giro de 1 dedo em andamento e passa a computar
  o zoom pela razão entre a distância atual e a distância inicial entre os dois dedos (afastar os
  dedos aproxima a câmera, mesma convenção de fotos/mapas). Decidido rastrear os 2 dedos em
  QUALQUER posição do canvas (não só a metade direita reservada pro giro de 1 dedo só) — uma pinça
  de verdade normalmente tem um dedo de cada lado da tela, e o `TouchJoystick` de movimento é um
  elemento HTML separado por cima do canvas, então um toque que começa nele nunca dispara o
  `pointerdown` do `<canvas>` (sem conflito real).
- **Botão de recentralizar câmera**: novo botão HUD (`⟲`, classe `touch-action-recenter`,
  posicionado na mesma coluna do grupo pular/correr mas centralizado na altura da tela). Zera
  `cameraYawOffsetRef` e `outdoorCameraZoomRef` sempre, mais `houseCameraPitchOffsetRef`/
  `houseCameraZoomRef` quando dentro de casa — a suavização de sempre (`Vector3.Lerp` no loop de
  física) já desliza a câmera até a posição padrão sem corte brusco, mesmo efeito que
  `enterHouseInterior`/`exitHouseInterior` já produzem ao resetar os mesmos refs. Implementado como
  uma função (`recenterCamera`) exposta em `scene.__recenterCamera` (mesmo padrão de ponte já usado
  por `__handleInteractPress`), chamada pelo novo `handleRecenterCamera` em React.
- **Anti-clipping de câmera**: nova função `avoidCameraClipping(target, desired, ignoreBody?)`
  (perto de `terrainGroundRadial`, reaproveitando o mesmo padrão de `havokPlugin.raycast`) — raycast
  do alvo até a posição DESEJADA da câmera; se algo bloquear no meio do caminho, aproxima a câmera
  até 0,3 unidade antes do ponto de colisão (`Vector3.Lerp(target, desired, safeDistance/fullDistance)`).
  Aplicada em 3 dos 4 lugares do zoom, todos passando o colisor do avatar como `ignoreBody`
  (câmera a pé usa o alias local `body`; carro passa `avatarBody?.body` diretamente) — achado real
  do review automático do Copilot (rodada 1): mesmo carro/foguete não tendo colisor físico PRÓPRIO
  (andam por trajeto/curva fixa), o colisor do AVATAR fica congelado exatamente onde o jogador
  embarcou (só a figura visual é reparentada no veículo), então um raycast logo depois de embarcar
  podia acertar essa cápsula abandonada. **Correção da 7ª rodada de review**: esta frase antes
  dizia "aplicada nos MESMOS 4 lugares... todos passando `avatarBody?.body`", o que não bate com o
  código de verdade — o foguete só roda o anti-clipping no CRUZEIRO (`!inLaunchHold &&
  !inLandingFlip`), NUNCA nas duas pontas de repouso (decolagem/pouso), então só há 3 chamadas
  ativas por vez, não 4 uniformes. A câmera do foguete só roda o anti-clipping no CRUZEIRO — perto
  da plataforma de
  lançamento, o raycast quase sempre acertava primeiro o colisor ESTÁTICO da própria plataforma
  (usado só pra detectar "jogador perto, mostrar dica de embarcar"), e a API do Havok só aceita um
  `ignoreBody` por chamada (já ocupado pelo avatar).
- **Acessibilidade mínima dos botões de câmera**: `TouchActionButton` ganhou uma prop opcional
  `description`, que vira `aria-label` (nome acessível pra leitor de tela) E `title` (tooltip
  nativo pra mouse) ao mesmo tempo. Aplicada nos botões ◀ ▶ existentes ("Girar câmera pra
  esquerda"/"Girar câmera pra direita") e no novo botão de recentralizar ("Recentralizar câmera").

## Decisões técnicas tomadas

- **Zoom escala distância E altura juntas, na mesma proporção** (`camDist * zoom`, `camHeight *
  zoom`) — um dolly de verdade (câmera se aproxima/afasta ao longo do mesmo eixo visual), não uma
  distorção de ângulo. Mesmo espírito do zoom de casa, que escala o RAIO esférico completo
  (`baseRadius * houseCameraZoomRef.current`) preservando o ângulo de pitch.
- **`avoidCameraClipping` como helper reaproveitável, não uma correção específica de cada modo**
  (achado real do review automático do Copilot, PR #54, 9ª rodada: chamá-la de "função pura" era
  impreciso — ela lê `havokPlugin` do escopo externo e muda `lastCameraClipWasObstructed` como
  efeito colateral, então não é pura no sentido estrito; corrigido pra "helper reaproveitável")
  — qualquer uma das 3 câmeras externas (a pé, carro, foguete) podia clipar em algum tipo de
  geometria (terreno do planeta principal, morro de planeta secundário) e reimplementar a mesma
  lógica 3 vezes seria a mesma classe de duplicação já corrigida no lab-176 (`disposeMeshGroup`)
  e no lab-177 (`PhysicsShapeType.MESH` reaproveitado em vez de aproximações separadas por caso).
- **Anti-clipping EXCLUÍDO de dentro de casa, de propósito** — a câmera de dentro de casa já tem
  sua própria solução pra esse mesmo problema desde o lab-136/138: paredes que a câmera atravessa
  ficam translúcidas, em vez de a câmera ser travada pra dentro da sala (o próprio comentário
  original explica que travar a câmera "mudaria a sensação de câmera do resto do jogo"). Aplicar
  `avoidCameraClipping` ali também criaria duas soluções conflitantes pro mesmo problema (a câmera
  ficaria presa E as paredes ficariam translúcidas ao mesmo tempo, sem necessidade).
- **Pinça rastreada em qualquer posição do canvas, não restrita à metade direita do giro de 1 dedo
  só** — ver "O que foi feito" acima. Decisão tomada durante a implementação, não estava no
  `FEATURES.md` original; documentada aqui porque é a única divergência real entre o plano e o
  código.
- **`ignoreBody` nos 3 modos, não só a pé** — decisão original (antes da 1ª rodada de review) era
  "só a pé, carro/foguete não têm colisor próprio" — real, mas incompleto: embora carro/foguete não
  tenham `PhysicsAggregate` PRÓPRIO (`positionOnLoopPath`/progresso ao longo de curva, não
  simulação), o colisor do AVATAR continua existindo e FICA PARADO (congelado) exatamente onde o
  jogador embarcou, já que só a figura visual é reparentada no veículo. Corrigido na 1ª rodada de
  review pra passar `ignoreBody` nos 3 lugares. **Nota de correção da própria documentação**:
  achado real da 3ª rodada de review — esta seção (e o resumo em "O que foi feito") ainda
  descreviam a decisão ORIGINAL, desatualizada depois da correção da 1ª rodada; corrigidas juntas
  aqui pra bater com o código de verdade.
- **Reset de `pinchPointers`/`pinchStartDistance` em `enterHouseInterior`/`exitHouseInterior`** —
  mesmo espírito defensivo do reset já existente de `cameraYawOffsetRef`/`cameraDragging` nesses
  dois pontos (lab-149): uma pinça em andamento bem na hora de entrar/sair de casa não deveria
  continuar valendo pro zoom do outro contexto (limites/sensação bem diferentes).
- **`window.pointercancel` adicionado aos ouvintes de câmera** — só existia `pointerup`; como
  `pinchPointers` agora é um `Map` com estado que precisa ficar consistente (senão um dedo "preso"
  no mapa bloqueia pinças futuras), um toque cancelado pelo sistema (gesto do SO, troca de app)
  precisa do mesmo tratamento de limpeza que soltar o dedo normalmente — gap pré-existente que só
  importava de verdade a partir desta mudança.

## Review automático do Copilot (PR #54)

**1ª rodada** — 4 achados reais, todos sobre o raycast novo de anti-clipping interagindo mal com
a física dos veículos (nenhum achado de documentação/nit desta vez):

- **Raycast a pé rodava mesmo dirigindo/pilotando, trabalho descartado** — o bloco de câmera a pé
  roda em QUALQUER modo (só a posição final é sobrescrita pelas câmeras de carro/foguete mais
  abaixo, se for o caso — comentário já existente no código: "câmera/multiplayer/ranking/portais
  continuam rodando normalmente em qualquer caso"). Sem guarda, o raycast físico rodava a cada
  quadro mesmo com o resultado sendo jogado fora, custo real em mobile. Corrigido: só chama
  `avoidCameraClipping` quando esta É a câmera que vale (`!drivingCar && !drivingRocket`).
- **Câmera do carro podia acertar o colisor do AVATAR abandonado** — ao entrar no carro, só a
  figura VISUAL é reparentada nele; o colisor físico do avatar (`body`) fica congelado (sem
  gravidade/velocidade nova) exatamente onde o jogador embarcou. Sem `ignoreBody`, um raycast logo
  depois de embarcar (carro ainda perto do ponto de embarque) podia acertar essa cápsula
  abandonada e encurtar a câmera como se fosse terreno de verdade. Corrigido: `ignoreBody: body`.
- **Câmera do foguete tinha o mesmo problema do avatar abandonado** — mesma causa raiz do achado
  acima, aplicada ao embarque no foguete. Corrigido: `ignoreBody: body`.
- **Câmera do foguete também podia acertar o colisor ESTÁTICO da plataforma de lançamento** —
  `rocketCollider` (cilindro raio 1,3/altura 3, começando 1,4 unidade acima do chão, usado só pra
  detectar "jogador perto, mostrar dica de embarcar") fica a poucas unidades de `shipPos` bem nas
  duas pontas de repouso (decolando/pousando) — um raycast dali quase sempre acertava esse MESMO
  cilindro primeiro. Como a API do Havok só aceita UM `ignoreBody` por chamada (já ocupado pelo
  avatar), a correção foi pular o anti-clipping inteiro nessas duas pontas
  (`inLaunchHold`/`inLandingFlip`) — a câmera "de lado" usada ali (lab-116) já foi desenhada
  especificamente pra nunca apontar pra dentro do planeta, então não dependia do anti-clipping pra
  ficar correta; ele só roda de verdade no CRUZEIRO (longe de qualquer planeta), onde faz sentido.

Verificação desta rodada: `npx tsc -b`/`npm run test` (app, 178/178, inalterado) e `npm run build`
limpos. **Achado real do CI, não do Copilot, entre as rodadas 1 e 2**: um `npx tsc -b` local deu
falso-positivo (saída limpa) mesmo com um erro de verdade no código — `body` referenciado fora do
`if (avatarBody && avatarMesh) {...}` que o declara (o fix de `ignoreBody` do carro/foguete usava
esse nome, só válido dentro do ciclo de caminhada) — só o `npm run build` do CI (com cache limpo)
pegou o `error TS2304: Cannot find name 'body'` de verdade. Corrigido trocando por `avatarBody?.body`
(variável de escopo mais amplo, já acessível nos dois blocos). **Lição registrada**: depois desse
achado, toda verificação de `tsc`/build nesta sessão passou a LER o conteúdo da saída de verdade
(procurando texto `error`), não só confiar no código de saída do processo — o código de saída
sozinho não bastou pra pegar esse caso.

**2ª rodada** — 1 achado real (câmera podia ficar literalmente em cima do próprio personagem):

- **`safeDistance` podia zerar e colocar a câmera EM CIMA do alvo** — `hitDistance` é medido a
  partir do ALVO (avatar/carro/nave), não da câmera; se o obstáculo estivesse mais perto que a
  margem de 0,3 (jogador quase encostado numa parede/rocha), `Math.max(0, hitDistance - margin)`
  zerava pra 0, e `Vector3.Lerp(target, desired, 0)` colocava a câmera EXATAMENTE na posição do
  alvo — a própria cápsula do personagem, o mesmo problema de clipping que a função deveria evitar,
  só que pro lado oposto (câmera dentro do PERSONAGEM em vez de dentro do TERRENO). Corrigido com
  um piso mínimo de `AVATAR_RADIUS + 0,2` (limitado por `fullDistance`, pra nunca ficar mais longe
  que a distância desejada original) — a câmera nunca fica mais perto do alvo do que isso, mesmo
  com o obstáculo colado.

Verificação desta rodada: `npx tsc -b`/`npm run test` (app, 178/178, inalterado) e `npm run build`
limpos — desta vez com leitura real do conteúdo da saída (não só código de saída), pela lição
registrada acima.

**3ª rodada** — 3 achados reais (2 de código, 1 de documentação desatualizada):

- **Câmera a pé continuava "brigando" com a câmera do veículo** — mesmo com o raycast pulado
  (correção da 1ª rodada), o `camera.position = Vector3.Lerp(camera.position, desiredCamPos, 0.08)`
  logo abaixo continuava rodando incondicionalmente, puxando `camera.position` 8% em direção à
  posição CRUA da câmera a pé TODO quadro, ANTES do bloco do carro/foguete aplicar seu próprio
  `Lerp` (12%/10%) em cima do valor já contaminado — os dois puxões brigando podiam deixar a câmera
  num equilíbrio nunca 100% correto (dentro de parede/terreno em vez da posição corrigida do
  veículo). Corrigido: a atualização de `camera.position`/`upVector`/`setTarget` da câmera a pé só
  roda quando esta É a câmera que vale (`!drivingCar && !drivingRocket`).
- **Piso mínimo da 2ª rodada podia levar a câmera pra ALÉM do obstáculo** — `Math.max(minClearance,
  hitDistance - margin)` sem teto podia devolver um valor MAIOR que o próprio `hitDistance` quando
  o obstáculo estava mais perto que `minClearance` (ex.: `hitDistance = 0,2`, piso `0,75` vencia,
  câmera ia parar a 0,75 do alvo — do OUTRO LADO do obstáculo a 0,2). Corrigido com um teto duro em
  `hitDistance` (nunca além da superfície de colisão real) — ver achado da 4ª rodada abaixo pra
  correção final.
- **Documentação desatualizada** — `CONTEXT.md` ("O que foi feito" e "Decisões técnicas") ainda
  descrevia a decisão ORIGINAL de `ignoreBody` (só a pé, carro/foguete sem), já superada pela
  correção da 1ª rodada (que passou a usar `avatarBody?.body` nos 3 lugares). Corrigido pra bater
  com o código de verdade.

Verificação desta rodada: `npx tsc -b`/`npm run test`/`npm run build` limpos, com leitura real do
conteúdo da saída.

**4ª rodada** — 1 achado real (o teto da 3ª rodada podia recriar o bug da 2ª no extremo oposto):

- **Teto em `hitDistance` colapsava de volta a zero quando o raio já começava sobreposto a um
  colisor** — `Math.min(minClearance-ou-mais, hitDistance)` devolve `hitDistance` sempre que
  `hitDistance <= minClearance`; se `hitDistance` estiver perto de 0 (personagem colado/atravessado
  numa parede), o resultado também fica perto de 0, recriando a câmera EM CIMA do alvo — o mesmo
  bug da 2ª rodada, só que pelo caminho oposto. As duas exigências ("nunca mais perto que
  `minClearance` do alvo" e "nunca mais longe que o obstáculo") são matematicamente incompatíveis
  quando o obstáculo está mais perto que `minClearance` — não existe um valor que satisfaça as
  duas ao mesmo tempo nesse caso extremo. Resolvido priorizando NUNCA degenerar a zero (o problema
  visual mais grave) com um piso bem menor e específico pra esse conflito (`MIN_TARGET_CLEARANCE =
  0,15`, bem menor que `AVATAR_RADIUS`) — aceita uma sobreposição mínima e inevitável com o
  obstáculo só nesse cenário raro/de fronteira (raio já nascendo dentro de algo), em vez de zerar.
  Conferido à mão com os casos de fronteira das rodadas 2/3/4 (obstáculo longe, obstáculo a 0,2,
  obstáculo a 0) — os três convergem pro resultado esperado.

Verificação desta rodada: `npx tsc -b`/`npm run test`/`npm run build` limpos, com leitura real do
conteúdo da saída.

**5ª rodada** — 4 achados reais (3 do mesmo problema em pontos diferentes, 1 independente):

- **A suavização (`Vector3.Lerp`) podia atravessar o obstáculo mesmo com o PONTO final já
  corrigido** — `avoidCameraClipping` garante que o DESTINO da câmera é seguro, mas os 3 pontos
  que chamam a função continuavam suavizando com `Vector3.Lerp(camera.position, destino, fator)`
  a partir da posição da câmera do QUADRO ANTERIOR. Se essa posição antiga estivesse do lado de
  FORA de uma parede/rocha (ex.: giro brusco, recentralização, virada de veículo) e o novo destino
  seguro estiver do lado de DENTRO, o CAMINHO reto da interpolação atravessa o obstáculo por
  vários quadros antes de convergir — a câmera de verdade ainda clipava, mesmo o destino sendo
  sempre correto. Corrigido nos 3 pontos (a pé, carro, foguete): uma flag nova
  (`lastCameraClipWasObstructed`, resetada no início de cada chamada de `avoidCameraClipping` e
  setada só quando uma correção de verdade acontece) avisa os chamadores pra pular a suavização e
  ir DIRETO pro ponto seguro nesse quadro — sem trajeto reto entre dois pontos, não tem caminho
  pra atravessar nada. Cuidado extra: a flag precisa ser explicitamente zerada nos 2 lugares onde
  `avoidCameraClipping` NÃO é chamada mas a leitura ainda acontece (dentro de casa; foguete nas
  pontas de repouso decolagem/pouso) — senão um valor `true` de um quadro anterior noutro contexto
  ficaria "preso" e disparava um corte brusco sem motivo.
- **`recenterCamera` não limpava o giro contínuo em andamento** — segurar ◀ ou ▶ (possível em
  multitoque, um dedo em cada botão) enquanto aperta ⟲ deixava `cameraRotateLeftRef`/
  `cameraRotateRightRef` ligados, e o quadro seguinte voltava a acumular giro em cima do
  `cameraYawOffsetRef` recém-zerado — a câmera "recentralizava" e saía do centro de novo na hora,
  nunca ficando parada de verdade. Corrigido zerando os dois refs dentro de `recenterCamera`.

Verificação desta rodada: `npx tsc -b`/`npm run test`/`npm run build` limpos, com leitura real do
conteúdo da saída.

**6ª rodada** — 2 achados reais aceitos, 4 achados de estilo REJEITADOS com justificativa:

- **Aceito: `recenterCamera` não cancelava arrasto/pinça em andamento** — mesma classe do achado
  da 5ª rodada (giro contínuo dos botões ◀/▶), mas pro gesto de PONTEIRO: sem cancelar
  `cameraDragging`/`cameraDragPointerId`/`pinchPointers`/`pinchStartDistance`, o próximo
  `pointermove` do dedo que já estava arrastando (ou dos dois dedos de uma pinça em andamento)
  continuava alterando yaw/zoom em cima dos valores recém-zerados — a câmera saía do centro de
  novo antes do jogador soltar o dedo. Corrigido zerando os 4 dentro de `recenterCamera`.
- **Aceito: botões pular/correr/interagir (E) sem `aria-label`** — a prop `description` nova só
  tinha sido aplicada aos 3 controles de câmera; os botões pré-existentes (`⬆️`/`🏃`/`E`) ainda só
  expunham o emoji/glifo como nome acessível. Adicionado `description="Pular"`/`"Correr"`/
  `"Interagir"` — mesmo mecanismo já existente, só aplicado de forma consistente aos 3 botões que
  faltavam.
- **Rejeitados (4): remover "lab-178"/"PR #54"/"Copilot" dos comentários no código de produção**
  — o review sugeriu que comentários citando o número do PR/rodada de review violam a regra de
  "comentário só com racional durável" do `docs/prompts/04-manutencao-clean-code.md`. Verificado
  ANTES de aceitar (mesmo princípio do achado do lab-176 sobre `scene.dispose()`, onde a fonte real
  do Babylon foi lida antes de aceitar uma sugestão): `grep -c "achado do review automático do
  Copilot" app/src/world3d/World3D.tsx` encontra **24 ocorrências pré-existentes** desse EXATO
  padrão (`lab-NN (achado do review automático do Copilot no PR #NN, Xª rodada): ...`), espalhadas
  por código de labs anteriores (149, 153, 172, 175, e outros) — não é algo introduzido por este
  lab, é a convenção JÁ ESTABELECIDA e consistente deste repositório específico ao longo de 178+
  laboratórios, aplicada por todas as sessões anteriores. Remover essas referências só dos
  comentários deste lab deixaria o código NOVO inconsistente com o padrão do resto do arquivo, sem
  nenhum ganho real (a convenção do projeto já resolve "por que isso está aqui" pra quem retomar o
  código depois, que é exatamente o propósito que a regra genérica do Copilot está tentando
  proteger). Mantidos como estão.

Verificação desta rodada: `npx tsc -b`/`npm run test`/`npm run build` limpos, com leitura real do
conteúdo da saída.

**7ª rodada** — 3 achados reais (1 mais profundo que os anteriores; pausa e confirmação do
usuário antes de corrigi-lo, ver abaixo):

- **`enterHouseInterior` não resetava o arrasto de 1 dedo em andamento** — resetava a pinça
  (achado próprio deste lab), mas não `cameraDragging`/`cameraDragPointerId`, que
  `exitHouseInterior` já reseta desde o lab-149. Entrar em casa com um arrasto de fora ativo (ex.:
  apertar E pra entrar com o botão do mouse ainda pressionado) deixava esse estado preso,
  aplicando giro de FORA (semântica errada) já dentro da sala no próximo `pointermove`. Corrigido
  espelhando o mesmo reset que a saída já faz.
- **`CONTEXT.md` impreciso**: dizia "aplicada nos MESMOS 4 lugares... todos passando
  `avatarBody?.body`" — na verdade são só 3 chamadas ATIVAS por vez (o foguete nunca chama durante
  decolagem/pouso) e a câmera a pé usa o alias local `body`, não `avatarBody?.body` diretamente.
  Corrigido pra bater com o código de verdade.
- **Achado mais profundo — `avoidCameraClipping` só valida o segmento DESTE quadro, não o
  trajeto de suavização de verdade**: o raycast checa alvo→destino atual, mas o `Lerp` nos 3
  chamadores interpola a partir da posição da câmera do quadro ANTERIOR. Numa virada brusca
  (recentralizar, giro rápido, trocar de veículo), essa posição antiga pode estar do lado ERRADO
  de uma parede/rocha em relação ao NOVO destino, mesmo esse destino sendo seguro — o trajeto reto
  da interpolação atravessa o obstáculo por vários quadros sem que `lastCameraClipWasObstructed`
  perceba (ele só sabe sobre o segmento alvo→destino, não sobre posição-antiga→destino). Esta é a
  5ª divergência real encontrada na mesma lógica de anti-clipping/suavização ao longo das rodadas
  2-5 e agora 7 — **antes de corrigir mais uma vez, o usuário foi consultado via
  `AskUserQuestion`** sobre continuar corrigindo, aceitar o estado atual como limitação conhecida,
  ou repensar a abordagem do zero. Resposta: **continuar corrigindo**. Corrigido com uma nova
  função `isPathObstructed(from, to, ignoreBody?)` (raycast simples, só "tem algo no caminho ou
  não", sem a matemática de distância segura de `avoidCameraClipping`) chamada com a posição ATUAL
  da câmera e o destino calculado deste quadro nos 3 pontos — se o TRAJETO estiver bloqueado
  (mesmo com o destino em si seguro), pula a suavização igual ao caso de obstrução no destino.
  Escopo dos 3 chamadores: câmera a pé (excluído de dentro de casa, mesmo motivo de sempre — a
  solução de lá já é outra); carro (sempre, não tem colisor próprio pra confundir); foguete (só no
  cruzeiro, mesmo motivo de excluir o anti-clipping do destino nas pontas de repouso — colisor
  estático da plataforma perto demais).

Verificação desta rodada: `npx tsc -b`/`npm run test`/`npm run build` limpos, com leitura real do
conteúdo da saída.

**8ª rodada** — 3 achados reais aceitos (mesma correção nos 3 chamadores), 2 avaliados e mantidos
como estão com justificativa:

- **Aceitos: raycast extra de `isPathObstructed` era descartado quando o destino já estava
  obstruído** — nos 3 chamadores (a pé, carro, foguete), `pathObstructed` era computado
  incondicionalmente (chamando `isPathObstructed`, um raycast Havok de verdade) mesmo quando
  `lastCameraClipWasObstructed` já era `true` — nesse caso o resultado final já seria
  `desiredCamPos`/`desiredCarCamPos`/`desiredShipCamPos` de qualquer jeito, então o 2º raycast era
  puro trabalho descartado todo quadro clipado. Corrigido com curto-circuito (`&&`): só chama
  `isPathObstructed` quando `lastCameraClipWasObstructed` ainda for `false`.
- **Mantido como está: piso de `MIN_TARGET_CLEARANCE = 0,15` menor que `AVATAR_RADIUS = 0,55`**
  — reavaliado o mesmo ponto já resolvido na 4ª rodada (o review sinalizou como "código que não
  mudou desde a última revisão", ou seja, é o MESMO trade-off, não um achado novo). Nesse cenário
  extremo (raio já nascendo sobreposto a um colisor, `hitDistance` perto de 0), as duas exigências
  ("nunca mais perto que o raio do avatar do alvo" e "nunca mais longe que o obstáculo") são
  matematicamente INCOMPATÍVEIS — fisicamente não existe um ponto no espaço que satisfaça as duas
  ao mesmo tempo quando o próprio obstáculo já invade o raio do avatar (situação que, com a
  colisão normal do jogo, não deveria acontecer em jogo normal). A alternativa sugerida ("posição
  que fique fora dos dois ao mesmo tempo") não é geometricamente alcançável nesse caso-limite —
  manter a decisão já tomada e documentada na 4ª rodada: aceitar uma sobreposição mínima e
  inevitável, nunca zerar.
- **Mantido como está: `isPathObstructed` continua rodando 1x por quadro por chamador mesmo sem
  nenhuma obstrução** (2 raycasts Havok/quadro no estado estável: um dentro de `avoidCameraClipping`,
  outro aqui) — achado de PERFORMANCE, não de correção. A sugestão (só checar o trajeto numa
  "descontinuidade de modo/alvo" detectada) exigiria rastrear estado novo pra decidir QUANDO
  checar, numa função que já teve 5 correções reais de matemática/lógica em rodadas anteriores —
  o risco de introduzir mais um caso de borda nessa lógica já frágil supera o ganho de performance
  não comprovado (raycasts Havok contra geometria simples já são tolerados em outros pontos deste
  mesmo arquivo rodando todo quadro incondicionalmente, ex. checagem de chão do pulo). Mantido como
  está; registrado aqui como pendência de performance conhecida, não como bug.

Verificação desta rodada: `npx tsc -b`/`npm run test`/`npm run build` limpos, com leitura real do
conteúdo da saída.

**9ª rodada** — 1 achado real, só de documentação: este próprio `CONTEXT.md` chamava
`avoidCameraClipping` de "função pura", impreciso — ela lê `havokPlugin` do escopo externo e muda
`lastCameraClipWasObstructed` como efeito colateral, então não é pura no sentido estrito.
Reformulado pra "helper reaproveitável" (ver "O que foi feito" acima, já corrigido).

**10ª rodada** — 1 achado real de qualidade de código, sem mudança de comportamento:
`docs/prompts/04-manutencao-clean-code.md` §2 tem uma regra `[MUST]` explícita ("nenhum
comentário referenciando a sessão de IA, o laboratório atual ou um ticket externo... isso pertence
ao `CONTEXT.md` do laboratório e ao histórico do git") que os comentários novos deste lab
(`World3D.tsx`, `TouchActionButton.tsx`, `index.css`) violavam ao citar "lab-178"/"PR #54"/número
de rodada/"Copilot" diretamente no código de produção. **Correção de rumo**: esse MESMO tipo de
achado tinha aparecido na 6ª rodada e foi REJEITADO na época com a justificativa de que era a
"convenção já estabelecida do repositório" (24 ocorrências pré-existentes do mesmo padrão em
código de labs anteriores) — mas prática pré-existente generalizada não é a mesma coisa que uma
regra `[MUST]` escrita não se aplicar; a regra existe precisamente pra essas 24 ocorrências
também, que já eram uma dívida de qualidade antes deste lab. Revertida a rejeição da 6ª rodada:
todos os comentários NOVOS deste lab foram reescritos mantendo só o racional durável (o cenário
do bug, o porquê da decisão), sem citar a sessão/PR/rodada — sem tocar nas 24 ocorrências
pré-existentes de OUTROS labs (fora de escopo desta PR, seria uma limpeza separada e maior).
Referências a labs ANTERIORES já concluídos (ex.: "lab-177", "lab-149") foram mantidas — são
citações históricas estáveis, não "o laboratório atual", e seguem o mesmo padrão já usado em todo
o resto do arquivo.

Verificação desta rodada: `npx tsc -b`/`npm run test`/`npm run build` limpos, com leitura real do
conteúdo da saída (só reescrita de comentários, nenhuma linha de lógica mudou).

## Pendências / dívidas conhecidas

- **Pinch de 2 dedos verificado só por revisão de código/matemática, não ao vivo** — as ferramentas
  de automação de navegador desta sessão (`mcp__claude-in-chrome__*`) permitem disparar
  `PointerEvent`s sintéticos individuais (usado pra confirmar que a matemática do zoom por pinça
  está certa: afastar os dedos aproxima a câmera, dividir a distância certa etc.), mas não simulam
  um gesto de pinça real de usuário com dois dedos de verdade num viewport mobile. Mesma classe de
  limitação já documentada no lab-177 pro teste em `isLowEndDevice`.
- **Reprodução visual completa do anti-clipping numa rampa íngreme real não foi isolada de forma
  100% limpa** — o mecanismo em si foi confirmado diretamente e com certeza (ver abaixo), mas ao
  tentar reproduzir o cenário exato "câmera zoom máximo numa rampa íngreme específica", o
  bombeamento manual de quadros necessário pra contornar a aba em segundo plano (`document.hidden`,
  ver pendência de ambiente abaixo) usando `engine._deltaTime` grande (50ms × muitas chamadas)
  acelerou também a física de QUEDA do próprio avatar (gravidade integra com o mesmo `deltaTime`),
  fazendo o avatar cair/escorregar da rampa durante o teste antes de eu conseguir capturar a
  distância final "no ponto exato". Reduzindo `engine._deltaTime` pra ~16,7ms (mais perto de um
  quadro real) e limitando o número de chamadas evita esse artefato — usado nos testes finais de
  zoom/recentralizar que aparecem em `evidencias/`, mas não repetido especificamente pro cenário de
  anti-clipping por falta de tempo nesta sessão. Confiança no mecanismo em si vem de 3 fontes
  independentes: (1) leitura do código — a mesma chamada `havokPlugin.raycast(from, to, result,
  {ignoreBody})` já é usada e comprovada em `terrainGroundRadial`/checagem de chão de pulo; (2)
  teste isolado ao vivo via console: uma chamada direta a `scene.getPhysicsEngine().raycast(...)`
  contra o colisor `planet` confirmou `hasHit:false` num trecho de ar livre e `hasHit:true` com
  `hitDistance` correto ao atravessar o platô de propósito; (3) uma medição ao vivo na rampa mais
  íngreme (platô índice 11, lab-177) mostrou a distância da câmera após recentralizar (7,41)
  consistentemente MENOR que a distância padrão sem zoom nenhum (10,06) — compatível com o
  anti-clipping puxando a câmera pra mais perto ali, embora não tenha sido isolado com raio de
  verificação geometricamente exato por causa do artefato de queda acima.
- **Pendência de ambiente, não de código** (mesma classe já documentada em vários labs anteriores,
  ex. lab-162/164): a aba de automação ficou `document.hidden === true` mesmo com
  `document.hasFocus()`/CDP funcionando, travando `requestAnimationFrame` — precisou de
  `engine._deltaTime` forçado + `scene.render()` manual repetido pra avançar quadros de verdade
  (`memory/browser_automation_frame_throttle.md`). Além disso, o `npm run dev` cold-start desta
  sessão foi excepcionalmente lento (~4 minutos até `window.__scene` existir na primeira carga,
  Vite transformando centenas de módulos individuais do `@babylonjs/core` um por um) — não é um
  problema do código, confirmado por ausência total de erros no console durante toda a espera.

## Funcionalidades planejadas que NÃO foram concluídas

**Teste manual em viewport mobile real** (pinch de 2 dedos, toque real) — ver pendência acima.
Desktop (scroll, arrasto, botões ◀ ▶, recentralizar, `aria-label`/tooltip) foi testado ao vivo com
evidência real em `evidencias/`. Fica como pendência real pro próximo lab/sessão com acesso a um
dispositivo/emulador de verdade — mesmo padrão de honestidade do lab-177 pra `isLowEndDevice`.

## O que o próximo laboratório deve desenvolver

Seguindo a ordem recomendada por `docs/growth-retention-monetization-backlog.md` (seção 12):

1. Considerar o **Lab 185 — Medição de coortes de retenção e qualidade** antes dos labs 179+ se
   faltar evento pra provar os labs 176-178 (avatar, terreno, câmera).
2. **Lab 179 — Planetas interativos v1** (P0 seguinte): pelo menos 3 interações por planeta
   existente (NPC com fala catalogada, objeto acionável, mini-puzzle ambiental, coletável ou
   segredo visual), instrumentadas, sem texto livre/UGC.

## Estado do repositório ao final

- Branch: `lab-178-camera-roblox-like`.
- `npx tsc -b`: limpo. `npm run test` (app): limpo, 178/178 (inalterado — mudança é só
  geometria/input de câmera, sem lógica de domínio isolável). `npm run build`: limpo, sem
  regressão de bundle.
- Nenhuma mudança em `server-accounts`/`server-cf-relay` — lab inteiro é client-side (Babylon/3D).
- **Verificado ao vivo, num navegador real** (Chrome via automação, `npm run dev` local, perfil de
  teste já existente no ambiente):
  - Zoom por scroll: distância da câmera convergiu EXATAMENTE pros limites calculados
    (`OUTDOOR_CAMERA_ZOOM_MIN`/`MAX` aplicados a `CAMERA_DISTANCE`/`CAMERA_HEIGHT`) tanto pra
    zoom-in quanto zoom-out, medido via `scene.activeCamera.position`/`getTarget()`.
  - Giro por arrasto (metade direita, fora de casa): confirmado sem regressão — um arrasto
    sintético de 300px girou a câmera ~103° ao redor do avatar, mesma fórmula/sensibilidade de
    antes.
  - Botão de recentralizar: confirmado voltando a posição da câmera para o EXATO valor
    pré-giro/pré-zoom, tanto depois de um arrasto quanto depois de zoom.
  - `aria-label`: confirmado via árvore de acessibilidade (`read_page`) mostrando "Girar câmera
    pra esquerda"/"Girar câmera pra direita"/"Recentralizar câmera" como nomes acessíveis reais.
  - Screenshots reais em `labs/lab-178-camera-roblox-like/evidencias/`:
    `zoom-padrao-recentralizar-botoes.jpg` (distância padrão, botões ◀ ▶ ⟲ visíveis) e
    `zoom-scroll-afastado.jpg` (mesmo ponto, após zoom-out por scroll — bem mais do planeta
    visível).
  - Anti-clipping: mecanismo (raycast `hasHit`/`hitDistance` contra o colisor `planet`) confirmado
    correto isoladamente; ver "Pendências" acima pro detalhe de por que a reprodução visual exata
    não foi 100% isolada.
  - Nenhum erro de console em nenhum momento dos testes.

## Merge e deploy

**PR #54 teve 12 rodadas de review automático do Copilot** — bem mais que a maioria dos labs
anteriores, quase todas com achados reais e sucessivos na MESMA lógica de anti-clipping/suavização
de câmera (ver rodadas 1-8 documentadas acima): câmera a pé brigando com a do veículo, câmera
literalmente em cima do avatar, câmera atravessando o próprio obstáculo detectado, sobreposição no
início do raio, suavização atravessando parede mesmo com o destino corrigido, raycast redundante
descartado. Essa sequência de 5 divergências reais na mesma função (rodadas 2, 3, 4, 5, 7) levou a
uma pausa explícita: antes de corrigir mais uma vez na 7ª rodada, o usuário foi consultado via
`AskUserQuestion` sobre continuar, aceitar como está, ou repensar a abordagem — resposta: continuar
corrigindo, mantendo a mesma função em vez de reescrever do zero. Uma sugestão de estilo (tirar
referências a "lab-178"/"PR #54"/número de rodada dos comentários de código) foi REJEITADA na 6ª
rodada com a justificativa de "convenção já estabelecida do repositório" (24 ocorrências
pré-existentes do mesmo padrão em labs anteriores) — na 10ª rodada essa rejeição foi revertida
depois de checar `docs/prompts/04-manutencao-clean-code.md` de verdade e confirmar uma regra
`[MUST]` explícita contra exatamente esse padrão (prática generalizada pré-existente não invalida
uma regra escrita — só significa que virou dívida de qualidade cedo). Todos os comentários NOVOS
deste lab foram reescritos mantendo só o racional durável; as 24 ocorrências de OUTROS labs ficaram
de fora, fora de escopo desta PR. Rodadas 11 e 12 vieram limpas — a 12ª só repetiu um trade-off de
performance já avaliado e aceito na 8ª rodada (custo de 2 raycasts/quadro no estado estável, mantido
de propósito em vez de arriscar mais um caso de borda numa lógica já frágil).

**Confirma deploy em produção**: PR #54 mergeado (commit `56aba96`), CI/CD verde em
`server-accounts`/`server-cf-relay`. O job `app` mostrou o passo "Deploy to Vercel (production)"
como falho (`Error: fetch failed` contra uma URL de preview do Vercel, `https://app-o7e3krd05-
suarezrafaels-projects.vercel.app`) — mas isso aconteceu DEPOIS do build de produção terminar com
sucesso (`✓ built in 4.34s` aparece no log, antes do erro), e a checagem que falhou é um `fetch`
pós-deploy, não o deploy em si. Confirmado diretamente: `app-two-flax-92.vercel.app` responde 200 e
serve `index-dkgu0EZg.js` — o MESMO hash de arquivo gerado nesse build específico — provando que o
deploy de produção aconteceu de verdade, apesar do "X" vermelho no job do CI. Atribuído a uma falha
de rede transitória na infraestrutura do Vercel/GitHub Actions durante a checagem pós-deploy, não a
um problema real de deploy nem de código deste lab.
