# Laboratório 116 — Corrige câmera do foguete na decolagem (ida pros planetas)

Status: em andamento
Início: 2026-08-29
Commit inicial: 8a6dfa953de2d488e75c2b196026cd96934a6075

## Objetivo do laboratório
Pedido do usuário: "a viagem do foguete pra ida pros outros planetas ta um pouco bugada a camera,
fica uma visao dentro da terra. na volta pra terra ta ok." Corrigir a câmera da decolagem (viagem
de IDA, saindo do planeta principal) sem regredir a volta (que já funciona) nem o cruzeiro/pouso.

## Investigado antes de planejar
- Câmera do foguete em voo (`World3D.tsx`, laço de física, ~linha 8196-8216): posiciona a câmera
  ATRÁS DA CAUDA da nave (`shipPos - shipNoseDir*CAMERA_DISTANCE + shipUp*CAMERA_HEIGHT`,
  `CAMERA_DISTANCE=9`) — pedido original do lab-61 ("devo enxergar os motores dele").
- Na fase de DECOLAGEM (`drivingRocket.progress <= ROCKET_LAUNCH_HOLD_END = 0.15`), a orientação da
  nave fica TRAVADA em `fromRestQuat` — nariz apontando pra LONGE do planeta de partida (reto pra
  cima, parado na plataforma, mesma orientação do foguete parado). Nessa fase, `shipNoseDir ≈
  fromUp` (a direção "pra cima" local da plataforma de partida).
- **Causa raiz encontrada**: "atrás da cauda" = `-shipNoseDir` = direção OPOSTA a `fromUp`, ou
  seja, direto PRA DENTRO do planeta de partida. `shipUp` (usado só pra altura,
  `CAMERA_HEIGHT=4.5`) é perpendicular ao nariz, ou seja, quase TANGENTE à superfície nessa fase —
  não ajuda a levantar a câmera pra fora do chão. Resultado: `câmera = p0 - fromUp*9 + tangente*4.5`
  — como o planeta principal tem raio 13, isso cai bem dentro do sólido (profundidade ~9,
  compensada só parcialmente pelo deslocamento tangencial).
- **Por que só a IDA (saindo do planeta principal) e não a VOLTA (chegando nele)**: a fase de
  decolagem é um HOLD real (o jogador controla o acelerador, pode ficar parado na plataforma por
  vários quadros com essa câmera ruim) — já a fase de pouso equivalente (`progress >=
  ROCKET_LANDING_FLIP_START = 0.75` até `1`) tem a MESMA geometria problemática ao se aproximar de
  um planeta grande, mas `landRocket()` dispara assim que `progress >= 1`, cortando a câmera normal
  quase instantaneamente — o quadro ruim, se existir, dura tempo imperceptível.
- **Por que não incomoda visivelmente decolando de/pousando em Júpiter/Saturno/Urano/Netuno**
  (raios 20/17/15/14, TODOS maiores que o planeta principal=13): esses são esferas lisas com
  material padrão (`backFaceCulling` ligado, o padrão da engine) — a câmera "dentro" delas não
  renderiza o interior (culled), só mostra o vazio/space por trás, sem parecer visualmente quebrado
  como no planeta principal. O planeta principal teve `backFaceCulling = false` deliberadamente
  ligado no lab-95 (correção do bug de morros invisíveis) — é o único corpo que MOSTRA seu próprio
  interior (terreno, escolas, NPCs) quando a câmera cai lá dentro, o que faz o bug ficar óbvio
  especificamente nele.
- Isso bate exatamente com um artefato observado (e mal-atribuído a "câmera de automação
  atrasada") durante a verificação ao vivo do lab-115: a viagem a Mercúrio mostrou de relance
  "Torre do Tesouro"/números de escola do planeta principal atrás do foguete — era este bug de
  verdade, não um artefato de screenshot.

## Decisões técnicas tomadas
- **Corrigir as DUAS pontas simétricas** (decolagem E a fase de flip do pouso), não só a decolagem
  — a causa raiz é a mesma geometria (nariz alinhado ao "pra cima" local de um planeta, câmera
  "atrás da cauda" caindo pra dentro dele); a volta pra Terra só "parece ok" hoje por sorte de
  timing (`landRocket` corta o quadro ruim rápido demais pra notar), não porque a lógica esteja
  certa — deixar só a metade arrisca o mesmo bug aparecer visivelmente ao pousar em Marte ou ao
  ficar mais tempo na fase de flip por qualquer motivo futuro (câmera mais lenta, framerate baixo).
- **Nova câmera "de lado" pras duas fases de repouso** (decolagem e flip de pouso): em vez de
  atrás-da-cauda, usa uma tangente horizontal (baseada em `facing`, projetada perpendicular ao
  "pra cima" do planeta relevante) + `CAMERA_HEIGHT` ao longo do PRÓPRIO "pra cima" do planeta
  (garantidamente pra FORA da superfície, não tangente a ela) — mesmo princípio já usado pela
  câmera do avatar andando (`avatarMesh.position - facing*CAMERA_DISTANCE + spawnUp*CAMERA_HEIGHT`),
  só que usando o "pra cima" local do planeta de partida/chegada em vez do `spawnUp` fixo do
  planeta principal.
- **Câmera "atrás da cauda" continua intacta pro CRUZEIRO** (fase do meio, longe de qualquer
  planeta) — não há relato de bug ali, e é onde "ver os motores" faz sentido de verdade (pedido
  original do lab-61).
- **`RocketFlight` ganha `fromUp`/`toUp: Vector3`** — já calculados como variáveis locais em
  `boardRocket`, só precisam ser guardados na struct pra o laço de câmera não precisar
  redescobri-los a partir do quaternion.

## Funcionalidades planejadas
- [ ] `RocketFlight`: campos `fromUp`/`toUp: Vector3` (novo).
- [ ] `boardRocket`: preenche os dois novos campos (já calculados localmente).
- [ ] Laço de física/câmera do foguete: câmera "de lado" (tangente horizontal + altura no "pra
      cima" do planeta) durante `progress <= ROCKET_LAUNCH_HOLD_END` (decolagem) E durante
      `progress >= ROCKET_LANDING_FLIP_START` (flip de pouso); câmera "atrás da cauda" mantida sem
      mudança pro trecho do meio (cruzeiro).
- [ ] Verificação ao vivo (dev server + browser automation): decolagem rumo a um planeta novo sem
      ver o interior do planeta principal; volta pra Terra continua ok; pouso num planeta novo
      também ok.

## Fora de escopo (explicitamente adiado)
- Mudar a câmera de cruzeiro (meio do voo) — sem relato de bug ali.
- Mexer em `backFaceCulling`/geometria do planeta principal — o comportamento de mostrar o
  interior é intencional (lab-95), o problema é só a câmera ir parar lá dentro sem necessidade.
