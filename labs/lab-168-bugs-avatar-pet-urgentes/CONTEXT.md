# Contexto — Laboratório 168 — bugs urgentes de avatar/pet + pet acompanha pelo lado

Preenchido em: 2026-09-09
Commit inicial → final: 75049310cb69636c818063cbb9d71c3068234e64..(PR aberto, ver seção final)

## O que foi feito

Reporte urgente do usuário com print anexado ("bug de pecas sumindo ao selecionar chapeu na
lojinha, e tem espetos na cara do avatar, e o pet esta escondido embaixo da terra... e fazer
deploy, os pets tem que acompanhar como as animacoes de pets que ja tem no planeta como os
coelhos e devem acompanhar pelo lado ao se mover"), 3 bugs + 1 mudança de comportamento:

- **Boné da lojinha (`studentFigure.ts`, `applyHat`, `hat.shape === 'cap'`)** — a borda
  (`CreateCylinder`, disco cheio de raio 0,17) era maior que o raio da cabeça (0,16) e ficava bem
  dentro da faixa vertical dela (y=1,28, cabeça de 0,99 a 1,31). Confirmado ao vivo com
  `getBoundingInfo().boundingBox` no `window.__avatarPreviewScene`: disco e cabeça realmente se
  sobrepõem. Trocado por uma caixa achatada só na FRENTE (uma viseira de verdade, sem disco
  nenhum por baixo da cabeça) + uma calota (`CreateSphere` com `slice`) por cima.
- **"Espetos" no rosto (`studentFigure.ts`, `applyBonecoFeatures`, `special === 'mane'`, só
  Leão/Fênix)** — o anel de espetos ficava numa profundidade rasa (Z entre -0,03 e +0,07, perto de
  onde ficam olhos/focinho). Reposicionado pra sempre ficar num Z negativo fixo (atrás do plano do
  rosto), mantendo a mesma distribuição em anel.
- **Pet enterrado em rampas de platô (`World3D.tsx`, loop de física do pet)** — a altura do pet
  usava só `terrainHeight(dir)` (fórmula analítica), que diverge da malha real perto das rampas
  dos platôs (mesma causa raiz documentada nos labs 95/124/134/135/151, resolvida ali de forma
  ESTÁTICA ao construir; o pet se move todo quadro, então precisa da correção em tempo real).
  Trocado por `terrainGroundRadial` (raycast físico real, Havok) sempre que o pet está no planeta
  principal e fora de casa — mantém `currentGroundBaseFn` (já exato) em planeta-destino/dentro de
  casa.
- **Pet acompanha pelo lado, com pulo, virando na direção do movimento** — antes só perseguia o
  `localUp` exato do jogador (sempre atrás, parado, sem animação). Reaproveitado o mesmo padrão
  já usado pelos bichinhos que vagam pelo planeta (`Critter`): alvo agora é um ponto ao LADO do
  jogador (`Vector3.Cross(localUp, facing)`), pulo (`Math.sin(hopPhase)`) e orientação por matriz
  (right/up/forward) — acompanha virando pra qualquer direção, não só andando reto atrás.

- **Bug reportado no meio da sessão: "vulcão de Vênus" com "Mover" liberado mas invisível na
  casa** (`World3D.tsx`) — as 6 recompensas de planeta (lab-130, `data/furniture.ts`) nunca
  tinham entrada em `FURNITURE_VISUAL_KIND`, o mapa que `refreshHouseFurnitureVisuals` usa pra
  decidir a geometria 3D de cada item (`if (!visual) return`, pulando a peça em SILÊNCIO — sem
  erro, sem log). `MyHousePanel`/`unlockPlanetFurnitureReward` sempre trataram o item como
  possuído de verdade (mostrando "✓ Tem"/"Mover"), então o bug afetava as 6 recompensas inteiras
  desde o lab-130, não só Vênus — o usuário só notou a de Vênus porque foi a que acabou de
  desbloquear. Adicionadas 6 geometrias novas em `buildFurniturePiece` + `FURNITURE_VISUAL_KIND`
  + `FURNITURE_COLLISION_RADIUS` (`houseCollision.ts`), temáticas ao que já existe em cada planeta
  (mesmo raciocínio do comentário original do lab-130): crateras (Mercúrio), vulcão com lava
  emissiva (Vênus), mancha achatada (Júpiter), mini-planeta com anel inclinado (Saturno), cristal
  de gelo (Urano), redemoinho com mancha escura excêntrica (Netuno).

## Decisões técnicas tomadas

- **Raycast só no planeta principal outdoors** — nos outros contextos (planeta-destino, dentro de
  casa) `currentGroundBaseFn` já é exato (raio fixo/sala plana, sem relevo formulado pra
  divergir); rodar o raycast (mais caro) ali seria custo sem benefício.
- **`Vector3.LerpToRef`/`normalize()` em vez de `Vector3.Lerp`** — mesmo achado do Copilot já
  registrado no lab-155 pro código original do pet: `Lerp` aloca um `Vector3` novo por quadro
  (60x/s enquanto visível); `LerpToRef` escreve direto em `petUp`, sem alocar.
- **`petForward`/`petHopPhase` como variáveis soltas, não dentro de um objeto** — existe só UM pet
  por sessão (diferente de `Critter`, que tem várias instâncias num array), então não precisa da
  mesma estrutura de objeto-por-instância.

## Pendências / dívidas conhecidas

Nenhuma nova. PR #42 teve 1 achado real do Copilot corrigido antes do merge: `tmpQuat.clone()` no
loop do pet alocava um `Quaternion` novo a cada quadro (60x/s enquanto visível) — mesma classe do
achado do lab-155 pra `Vector3.Lerp`. Trocado por um `Quaternion` persistente (`petQuat`) escrito
direto via `FromRotationMatrixToRef`, atribuído a `rotationQuaternion` uma única vez (na criação
do pet, `rebuildPet`), sem realocar nem reatribuir a cada quadro.

## Funcionalidades planejadas que NÃO foram concluídas

**Ciclo de vida do pet (crescer, envelhecer, morrer)** — pedido pelo usuário no mesmo turno do
reporte de bug, mas explicitamente NÃO iniciado aqui: comunicado ao usuário que seria tratado como
laboratório próprio, com uma conversa de design dedicada antes de qualquer código (mesmo cuidado
já registrado no repo pra nunca punir a criança — sequência de login nunca zera, pet nunca fica
doente por negligência — "morte" precisa da mesma cautela, decidida com o usuário, não assumida).

## O que o próximo laboratório deve desenvolver

Design + implementação do ciclo de vida do pet (crescer/envelhecer/morrer), com decisão explícita
do usuário sobre: o que "morrer" significa pra uma criança de ~10 anos jogando (permadeath real?
"dormir pra sempre"? sempre reversível?), se existe algum jeito de evitar/reverter, e como
comunicar isso sem gerar ansiedade — mesma categoria de decisão sensível já tratada via
`AskUserQuestion` pra outros itens do backlog social (ex.: lab-158, busca por nickname).

## Estado do repositório ao final

- Branch: a definir no momento do commit (mesmo padrão dos labs 163-167 — branch de PR a partir de
  `main`, sem worktree nesta sessão).
- `npx tsc -b`: limpo. `npm run test` (app): 139/139, sem teste novo (mudança de geometria 3D e
  loop de física, sem lógica de domínio pura nova isolável — mesmo padrão de labs de geometria
  anteriores, ex. lab-146). `npm run build`: limpo, sem regressão de bundle.
- **Verificado ao vivo via Chrome real (automação)**:
  - Boné: `getBoundingInfo` confirmou a sobreposição ANTES da correção; screenshot com zoom
    confirmou o rosto visível de vários ângulos de câmera DEPOIS.
  - Espetos: confirmados cruzando o rosto de frente ANTES; screenshot de frente (sem espetos) e de
    trás (juba visível) DEPOIS.
  - Pet enterrado: reproduzido o cenário real — avatar teleportado (`__debugTeleport`) pro ponto
    mais íngreme de uma rampa de platô (`PLATEAU_CENTERS[0]`, ângulo na metade do raio, onde a
    derivada do smoothstep é máxima), pet adotado deixado convergir (`engine._deltaTime` forçado +
    `scene.render()` manual, mesma técnica já documentada na memória persistente pra abas sem
    foco) até a nova posição. Raycast físico real (mesmo Havok do jogo, via
    `plugin.raycast`/`setHitData` interceptado por `Proxy`) confirmou o pet a ~0,03 unidade ACIMA
    da malha real do terreno (dentro da faixa esperada de offset + pulo, `+0.02` a `+0.07`) — não
    enterrado.
  - Pet ao lado: confirmado convergindo pra ~0,76 unidade do avatar (perto do alvo configurado,
    `PET_SIDE_DISTANCE = 0,65`, mais a variação de pulo/lerp).
  - Recompensas de planeta invisíveis: reproduzido o bug relatado (concedidas as 6 no
    `localStorage` de um perfil de teste local, `refreshHouseFurnitureVisuals` gerava 0 nós antes
    da correção); depois da correção, os 6 `TransformNode` (`furniture-meteor-*`/`-volcano-*`/
    `-spot-*`/`-ring-*`/`-crystal-*`/`-whirl-*`) confirmados construídos, com malha real (200-3500+
    vértices cada, nenhum vazio), posicionados dentro da sala e habilitados (`isEnabled() ===
    true`). **Não confirmado por screenshot** — a câmera dentro de casa neste ambiente de
    automação renderizou só o céu/neblina de fundo mesmo apontada pro centro da sala (nenhuma
    parede/chão/móvel apareceu, nem os já existentes antes desta correção), o que aponta pra uma
    peculiaridade de renderização deste ambiente específico (câmera `UniversalCamera`
    reposicionada manualmente via script, fora do fluxo normal do jogo), não um problema da
    geometria em si — confiança vem da inspeção direta da malha/posição real na cena, não de uma
    captura visual.
