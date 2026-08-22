import { useEffect, useRef, useState } from 'react'
import {
  Color3,
  Color4,
  DefaultRenderingPipeline,
  DirectionalLight,
  DynamicTexture,
  Effect,
  Engine,
  GlowLayer,
  HavokPlugin,
  HDRCubeTexture,
  HemisphericLight,
  Matrix,
  Mesh,
  MeshBuilder,
  ParticleSystem,
  PBRMaterial,
  PhysicsAggregate,
  PhysicsMotionType,
  PhysicsRaycastResult,
  PhysicsShapeType,
  Quaternion,
  Scene,
  SceneInstrumentation,
  SceneLoader,
  ShaderMaterial,
  SSAO2RenderingPipeline,
  ShadowGenerator,
  TransformNode,
  UniversalCamera,
  Vector3,
  VertexBuffer,
  VertexData,
} from '@babylonjs/core'
import '@babylonjs/loaders/glTF'
import { AdvancedDynamicTexture, TextBlock } from '@babylonjs/gui'
import HavokPhysics from '@babylonjs/havok'
import { quests } from '../data/quests'
import { findQuickChatMessage } from '../data/chatMessages'
import { findAvatarByEmoji, type BonecoFeatures } from '../data/avatars'
import { findHatById, type HatOption } from '../data/hats'
import { questTypeColor } from './questVisuals'
import { isQuestUnlocked } from '../state/progression'
import type { Profile, Progress } from '../types'
import { HudHeader } from './HudHeader'
import { TouchJoystick } from './TouchJoystick'
import { TouchActionButton } from './TouchActionButton'
import { ChatPanel } from './ChatPanel'
import { RankingPanel } from './RankingPanel'
import { MarsHealthBar } from './MarsHealthBar'
import { WeaponBagPanel } from './WeaponBagPanel'
import {
  playBirdChirp,
  playCoinCollect,
  playFootstep,
  startAmbience,
  playThunder,
  startRain,
  stopRain,
  toggleMute as toggleAmbienceMute,
  playJaguarGrowl,
  playDogBark,
  playFalconScreech,
  playFunnyTalk,
  playFart,
  playLaserZap,
  startRocketEngine,
  stopRocketEngine,
  playEnemyHit,
  playKnockedOut,
} from './ambientAudio'
import {
  connect as connectMultiplayer,
  disconnect as disconnectMultiplayer,
  isConnected as isMultiplayerConnected,
  onChat,
  onConnectionChange,
  onRemoteLeave,
  onRemoteState,
  sendChat,
  sendState,
  type ChatMessage,
  type RankingEntry,
  type RemoteState,
} from './multiplayer'

interface World3DProps {
  profile: Profile
  progress: Progress
  onSelectQuest: (questId: string) => void
  onSelectSurpriseQuiz: (quizId: string) => void
  onOpenHelp: () => void
  onOpenQuestList: () => void
  onOpenShop: () => void
  onCollectCoin: () => void
  suspendTriggers: boolean
}

const PLANET_RADIUS = 13
const AVATAR_RADIUS = 0.55
// Gravidade/pulo (lab-18): valores de física de verdade (9.81 m/s²) deixavam o pulo com ~1.1s no
// ar e ~1.5 de altura — relatado pelo usuário como "não realista, parece que estou na lua"
// (tempo no ar/altura grandes demais pro tamanho do personagem). Jogos em geral usam gravidade
// bem mais forte que a real pra o pulo parecer "no chão", não flutuando — aqui GRAVITY subiu
// ~63% e JUMP_SPEED baixou um pouco, resultando em altura ~1.2 e ~0.78s no ar (quase metade do
// tempo de antes). Ainda dá folga confortável (0.35) sobre os degraus do parkour (altura 0.85,
// lab-11) e alcance horizontal de sobra (mesmo correndo com RUN_SPEED, bem mais rápido que na
// época deste cálculo, o tempo no ar de ~0,78s dá alcance de sobra contra os 2,27 necessários
// entre plataformas — RUN_SPEED só aumenta essa folga, nunca reduz).
const GRAVITY = 16
// Pedido do usuário: "o andar do boneco é meio lento, acelere ele um pouco" — era 6, +25% (essa
// virou a velocidade de CAMINHAR abaixo). Pedido seguinte: "adicione a opção de correr e
// caminhar" — segurar Shift agora corre (`RUN_SPEED`, mais rápido ainda que o andar já
// acelerado). `*_CYCLE_SPEED` sobe na mesma proporção da velocidade de deslocamento em cada
// modo, pra pernas/braços continuarem batendo no ritmo certo do passo (senão as pernas
// "escorregam" — giram mais devagar que o deslocamento de verdade).
const WALK_SPEED = 7.5
const RUN_SPEED = 11
const JUMP_SPEED = 6.2 // velocidade radial (pra fora do planeta) aplicada ao pular
const TURN_RATE = 2.6 // rad/s — velocidade de giro ao segurar esquerda/direita
const WALK_CYCLE_SPEED = 8.75 // rad/s de fase do ciclo de caminhada, por unidade de throttle
const RUN_CYCLE_SPEED = WALK_CYCLE_SPEED * (RUN_SPEED / WALK_SPEED)
const LEG_SWING_MAX = 0.55 // rad — amplitude máxima do balanço de perna/braço
// Relatado pelo usuário: "o boneco não dobra os joelhos pra andar". A fórmula antiga
// (`max(0, sin(...))`) fazia o joelho dobrar só na METADE do ciclo (fase de "levantar a perna")
// e ficar 100% reto (zero) na outra metade (fase de apoio) — biomecanicamente ok, mas na prática
// lia como "quase sempre reto" pra quem está olhando de longe. Agora o joelho nunca fica
// perfeitamente reto (`KNEE_BEND_MIN`) e oscila continuamente até `KNEE_BEND_MAX`, sem ficar
// travado em zero — o dobrar fica visível o tempo todo enquanto anda, não só metade do tempo.
const KNEE_BEND_MIN = 0.15 // rad — dobra mínima, nunca perna 100% reta andando
const KNEE_BEND_MAX = 1.0 // rad — quanto o joelho/cotovelo dobra no pico da fase de "levantar"
const BIRD_CHIRP_RADIUS = 3.5 // pedido do usuário: pássaros cantam baixinho quando o jogador está perto
const CAMERA_DISTANCE = 9
const CAMERA_HEIGHT = 4.5
const CAMERA_ROTATE_SPEED = 1.6 // rad/s — velocidade de giro da câmera segurando os botões ◀/▶
const TRIGGER_DISTANCE = 2.4
const RESET_DISTANCE = 3.6
// Carro dirigível (lab-25): distância pra mostrar a dica "pressione E" / poder entrar, e
// velocidade de deslocamento ao longo da rua quando o jogador está no controle (mais rápida que
// WALK_SPEED a pé — é um carro, deveria ser nitidamente mais rápido que andar).
const CAR_ENTER_DISTANCE = 2.0
const CAR_DRIVE_SPEED = 6
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

// Clima dinâmico (pedido do usuário: "chuva" — item pendente da lista do lab-09): valores de
// atmosfera em dia limpo vs. durante a chuva, interpolados por `rainAmount` (0 a 1) pra a
// transição ser suave, não um interruptor ligado/desligado.
// lab-19: densidade base subiu de 0.01 pra 0.018 — suaviza o corte abrupto de prédios distantes
// "afundando" no horizonte (curvatura do planeta pequeno, raio 13), sem deixar dia limpo enevoado.
const BASE_FOG_DENSITY = 0.018
const RAIN_FOG_DENSITY = 0.035
const BASE_ENV_INTENSITY = 0.75
const RAIN_ENV_INTENSITY = 0.4
const BASE_HEMI_INTENSITY = 0.3
const RAIN_HEMI_INTENSITY = 0.16
const BASE_SUN_INTENSITY = 1.0
const RAIN_SUN_INTENSITY = 0.5

// Raio (lab-14): clareamento rápido da cena (flash aditivo de luz), não um objeto/bolt visual
// desenhado — mais barato e já vende bem o efeito. `lightningFlash` sobe pra 1 no instante do
// raio e decai linearmente até 0 em `LIGHTNING_DECAY_TIME` segundos.
const LIGHTNING_DECAY_TIME = 0.35
const LIGHTNING_HEMI_BOOST = 1.4
const LIGHTNING_SUN_BOOST = 1.8
const LIGHTNING_ENV_BOOST = 1.2

// Rotaciona `v` ao redor de `axis` por `angle` radianos (fórmula de Rodrigues) — usado pra
// girar a direção da bola suavemente, em vez de saltar pra direção do input a cada quadro.
function rotateAroundAxis(v: Vector3, axis: Vector3, angle: number): Vector3 {
  const cosA = Math.cos(angle)
  const sinA = Math.sin(angle)
  const term1 = v.scale(cosA)
  const term2 = Vector3.Cross(axis, v).scale(sinA)
  const term3 = axis.scale(Vector3.Dot(axis, v) * (1 - cosA))
  return term1.add(term2).add(term3)
}

// Posiciona/orienta `root` num ponto de um trajeto FECHADO (`path`, ex. `streetCenter` — laço
// completo, sem ponta) a partir de uma posição fracionária (`pathIndex`, envolve pra frente e
// pra trás via `%` — nunca "acaba"). Reaproveitado pelos carros de IA e pelo carro que o jogador
// dirige (lab-25) — mesma matemática, só a fonte do `pathIndex` muda (autônomo vs. teclado).
function positionOnLoopPath(
  path: Vector3[],
  pathIndex: number,
  direction: 1 | -1,
  root: TransformNode,
  heightOffset: number,
  tmpMatrix: Matrix,
  tmpQuat: Quaternion,
): void {
  const len = path.length
  const wrapped = ((pathIndex % len) + len) % len
  const i0 = Math.floor(wrapped)
  const i1 = (i0 + 1) % len
  const frac = wrapped - i0
  const p0 = path[i0]
  const p1 = path[i1]
  const pos = Vector3.Lerp(p0, p1, frac)
  // `.clone()` antes de `.normalize()` — mesmo bug do rio/rua original (`.normalize()` muta no
  // lugar; `pos` vem de `Vector3.Lerp`, um vetor novo, então aqui não mutaria `path`, mas
  // manter o padrão evita reintroduzir o bug se este código for copiado de novo no futuro).
  const up = pos.clone().normalize()
  let fwd = p1.subtract(p0)
  fwd = fwd.subtract(up.scale(Vector3.Dot(fwd, up)))
  if (fwd.lengthSquared() < 1e-8) fwd = Vector3.Cross(up, Vector3.Right())
  fwd.normalize()
  if (direction === -1) fwd.scaleInPlace(-1)
  root.position.copyFrom(pos.add(up.scale(heightOffset)))
  const right = Vector3.Cross(up, fwd).normalize()
  Matrix.FromXYZAxesToRef(right, up, fwd, tmpMatrix)
  Quaternion.FromRotationMatrixToRef(tmpMatrix, tmpQuat)
  root.rotationQuaternion = tmpQuat.clone()
}

// Centros dos platôs/"montanhas" (direção normalizada no planeta + raio angular de influência +
// altura). Ficam dentro da mesma faixa "caminhável" onde props/portais já são colocados.
//
// Pedido do usuário (elogiando o visual): "esses objetos de montanha ficaram muito bonitos, você
// pode fazer eles maiores e outros no mapa" — as 4 originais tiveram radius/height aumentados
// (~+35%), e mais 4 foram acrescentadas espalhadas pelo mesmo ângulo áureo usado no resto do
// mapa (props/escolas), pra ficarem bem distribuídas em vez de agrupadas.
//
// Pedido seguinte: "coloque mais montanhas... no planeta" — mais 4 (índices 8-11), posições
// achadas pela mesma busca gulosa de distância angular contra TODOS os marcos do mapa (as 8
// montanhas anteriores, lagoa, piscina, deserto, os 4 parkours, lojinha, torre, as 21 escolas) —
// cada uma escolhida como o ponto de MAIOR folga restante depois de já contar as anteriores,
// então elas não se amontoam nem colidem com nada existente (folga mínima de 18,6°).
const PLATEAU_CENTERS = [
  { dir: new Vector3(0.75, 0.6, -0.2).normalize(), radius: 0.46, height: 3.2 },
  { dir: new Vector3(-0.5, 0.55, 0.62).normalize(), radius: 0.41, height: 2.6 },
  { dir: new Vector3(0.15, 0.3, -0.9).normalize(), radius: 0.38, height: 2.8 },
  { dir: new Vector3(-0.8, 0.25, -0.45).normalize(), radius: 0.35, height: 2.2 },
  { dir: new Vector3(-0.21, 0.5, 0.84).normalize(), radius: 0.32, height: 2.4 },
  { dir: new Vector3(-0.25, 0.65, -0.7).normalize(), radius: 0.3, height: 2.0 },
  { dir: new Vector3(0.55, 0.15, 0.75).normalize(), radius: 0.34, height: 2.3 },
  { dir: new Vector3(-0.7, 0.5, 0.1).normalize(), radius: 0.28, height: 1.8 },
  { dir: new Vector3(0.3957395681006683, -0.7660444431189779, 0.5065235487181534).normalize(), radius: 0.3, height: 2.0 },
  { dir: new Vector3(-0.3257732493748943, -0.6691306063588582, -0.6679341446771153).normalize(), radius: 0.28, height: 1.9 },
  { dir: new Vector3(-0.9338776729355676, -0.3255681544571564, -0.14791169255948008).normalize(), radius: 0.28, height: 2.1 },
  { dir: new Vector3(0.5093910906471965, -0.27563735581699905, -0.8151961511485887).normalize(), radius: 0.26, height: 1.8 },
]

// Centro da lagoa e da piscina — a mesma direção usada pra desenhar a água (World3D usa esses
// mesmos pontos). Precisam existir aqui, não só dentro do componente, porque `terrainHeight`
// carva uma "bacia" rebaixada nesses pontos (ver abaixo) — sem isso a ondulação natural do
// terreno furava o disco de água plano em alguns lugares (o "chão dentro d'água" que ficava
// estranho, "bugado", quando o usuário testou pela primeira vez).
const POND_CENTER_DIR = new Vector3(-0.8552, 0.0628, 0.5145).normalize()
// Reescolhido pra ficar longe de todos os platôs (o ponto original ficava perto o bastante do
// platô 3 pra sua altura de até 2.1 furar a bacia rebaixada da piscina, ~0.73 de sobra pro lado
// errado — media do céu ao chão, "o mapa" literalmente quebrado ali).
const POOL_CENTER_DIR = new Vector3(0.4156, 0.809, 0.4156).normalize()

// Bioma do deserto (lab-23, "mundos extras" — prompt.md §6 P2): região visual distinta do resto
// do planeta (grama), mesma técnica de zona por direção+raio angular já usada pra lagoa/piscina.
// Centro escolhido por varredura de candidatos contra todos os marcos existentes (platôs, lagoa,
// piscina, parkour, lojinha, rua, as 20 escolas) — ~38,9° de folga da escola mais próxima, bem
// acima do próprio raio do bioma (0.3 rad ≈ 17°).
const DESERT_CENTER_DIR = new Vector3(0.1651492309, -0.3090169944, 0.9366078308).normalize()
const DESERT_RADIUS = 0.3

// Posição fixa pra missões específicas (lab-26) — a posição das escolas normalmente é calculada
// só pelo índice na lista (ângulo áureo, ver `quests.forEach` em `World3D`), então não dava pra
// simplesmente "colocar uma escola no deserto" sem mudar a fórmula pra todo mundo (deslocaria as
// 20 escolas já existentes). `q21` (bônus pós-"Missão Final", tema de deserto) é a exceção: usa
// o próprio `DESERT_CENTER_DIR` — o centro exato do bioma nunca é ocupado pelo scatter de props
// do deserto (que só espalha cactos/rochas a partir de 25% do raio pra fora, nunca no centro),
// então a escola cabe ali sem colidir com nada.
const QUEST_FIXED_UP: Record<string, Vector3> = {
  q21: DESERT_CENTER_DIR,
}

// Estação de lançamento (lab-58, pedido do usuário: "crie um foguete e uma estação de decolagem
// espacial... aperta a tecla E e consegue voar pra um outro planetinha"). Direção escolhida por
// varredura de candidatos contra TODOS os marcos existentes (platôs, lagoa, piscina, deserto,
// torre dos enigmas, escolas, ponto de nascimento) — ~34° de folga do mais próximo (platô 8),
// mesma técnica já usada pro deserto/piscina (ver comentários acima).
const ROCKET_LAUNCH_DIR = new Vector3(-0.3797213687147455, -0.913545457642601, 0.14576137678401327).normalize()
// 2.6 → 4 (lab-59): o pouso deixa o jogador ~1.8-2.2 unidades do foguete de propósito (pra não
// nascer em cima da própria plataforma), mas gravidade normal ainda roda por alguns quadros
// depois do pouso até assentar de vez (velocidade residual da física) — testado ao vivo, a
// distância final observada passava um pouco de 2.6, deixando "Pressione E" fora de alcance sem
// nenhum motivo visível pro jogador. Mais folga cobre esse assentamento sem enfraquecer a checa-
// gem (a plataforma continua sendo o único lugar por perto onde há QUALQUER foguete).
const ROCKET_ENTER_DISTANCE = 4
// Progresso (0 a 1) por segundo com o acelerador todo pra frente — ~9s de viagem de ponta a
// ponta, rápido o bastante pra não cansar, devagar o bastante pra parecer uma viagem de verdade,
// não um pulo instantâneo.
const ROCKET_FLIGHT_SPEED = 1 / 9
// Distância que cada ponto de controle da curva (lab-59: curva cúbica, não mais um único "meio"
// elevado) se afasta da plataforma na direção "pra cima" local dela antes de curvar rumo ao
// destino — pequena o bastante pra não virar um balão gigante agora que os dois planetas ficam
// perto um do outro (era 45, calibrado pra quando o planetinha ficava a 400 unidades de distância).
const ROCKET_ARC_HEIGHT = 14
// Fronteiras das três fases de orientação do voo (lab-61, pedido do usuário: "ele deve voar
// apontando pro planeta de destino e pousar de ré") — decolagem travada até aqui, cruzeiro
// (nariz aponta pra tangente da curva) até ali, "flip" pra pouso de ré dali até o fim. Ver laço
// de voo mais abaixo.
const ROCKET_LAUNCH_HOLD_END = 0.15
const ROCKET_LANDING_FLIP_START = 0.75
// O planetinha secundário só é construído (e só existe) quando o jogador embarca na nave pela
// primeira vez — "aparece quando você embarca" (pedido do usuário), não fica sempre presente na
// cena. Pedido do usuário (lab-59): "o planetinha não deve estar muito longe na viagem, como se
// fosse uma distância de um planeta e meio" — distância do centro escolhida pra deixar ~1,5
// diâmetro do planeta principal (2*PLANET_RADIUS = 26) de vão livre entre as duas superfícies
// (13 + 6 + 39 = 58), bem menos que os 400 originais do lab-58.
const SECOND_PLANET_RADIUS = 6
const SECOND_PLANET_CENTER = new Vector3(0, 0, 58)
// Direção fixa (não precisa evitar nada — o planetinha só tem árvore/rocha decorativa, pedido do
// usuário: "por enquanto o planetinha pode ter só árvores e rochas, não precisa NPC") de onde o
// foguete de volta pousa.
const SECOND_PLANET_LANDING_UP = new Vector3(0, 1, 0)
// Estação alienígena (lab-65, pedido do usuário: "uma estação extraterrestre avançada e moderna
// parecendo um disco voador em que é possível entrar") — direção fixa, longe do ponto de pouso do
// foguete de volta (evita as duas estruturas ficarem coladas uma na outra).
const MARS_UFO_DIR = new Vector3(-0.5535, 0.3522, 0.7548).normalize()

// Combate em Marte (lab-60, pedido do usuário: "no planeta marciano tem que ter ETs e robôs que
// tenta matar o nosso boneco, nós temos que ter uma barra de vida se a barra esvaziar, você morre
// e volta pro planetinha e tem que voltar de foguete pra poder seguir em Marte"). Contagem baixa
// de propósito (metade em dispositivo fraco) — cada inimigo roda IA por quadro, e o lab-59 acabou
// de cortar contagens de props/bichos pra recuperar FPS no Redmi Pad 2; não faz sentido adicionar
// uma feature nova que reintroduza o mesmo problema.
const MARS_ENEMY_COUNT_LOW_END = 3
const MARS_ENEMY_COUNT = 6
const MARS_MAX_HEALTH = 100
const MARS_ENEMY_AGGRO_RADIUS = 6
const MARS_ENEMY_ATTACK_RADIUS = 1.3
const MARS_ENEMY_ATTACK_INTERVAL = 1.3
const MARS_ENEMY_DAMAGE = 12
const MARS_ENEMY_MOVE_SPEED = 0.55
// Alerta de perigo (lab-65, pedido do usuário: "ao estar dentro de um raio de distância deles um
// alerta de perigo ser emitido, com algum efeito em vermelho na tela") — maior que o raio de
// ataque (dá aviso ANTES de já estar sendo atingido) e menor que o raio de perseguição (não fica
// vermelho o mapa inteiro assim que um inimigo distante começa a andar em direção ao jogador).
const MARS_DANGER_RADIUS = 3

// Espada e arma a laser (lab-61, pedido do usuário: "crie uma espada que deve ser pega na terra
// para usar no planeta pra nocautear o ET e uma arma para usar no robô, dê dicas de como
// encontrar a espada e a arma senão não tem como sobreviver"). Direções escolhidas longe dos
// outros marcos conhecidos do planeta principal (foguete, lagoa, deserto, ponto de nascimento).
const SWORD_LOCATION_DIR = new Vector3(0.65, 0.55, -0.52).normalize()
const GUN_LOCATION_DIR = new Vector3(-0.25, -0.45, -0.85).normalize()
const WEAPON_PICKUP_RADIUS = 1.3
const MARS_COMBAT_RADIUS = 1.6
// Duração da animação de golpe/tiro (lab-62, pedido do usuário: "ao apertar E ele sacode o braço,
// ou atira o laser?") — curta o bastante pra não atrapalhar o jogo, longa o bastante pra dar pra
// ver o braço se mexer.
const ATTACK_ANIM_DURATION = 0.4
// "Colisão" com o jogador (lab-62, pedido do usuário: "os ET e o robô também têm que ter colisão
// ... ele não pode entrar dentro do meu corpo") — sem física de verdade nos inimigos (cara demais
// por unidade, decisão de performance já tomada no lab-60); em vez disso, empurra o inimigo de
// volta pra fora desse raio sempre que a perseguição o traria pra mais perto. O anel visual (ver
// `soundRing` em `setup()`) usa esse mesmo raio como referência.
const MARS_ENEMY_PERSONAL_SPACE = 0.9
// Duração do "solavanco" visual do inimigo ao atacar (lab-62, pedido do usuário: "mostrar uma
// animação... não só de soco") — pulso de escala rápido, já que ET/robô não têm braço articulado
// pra animar um soco de verdade.
const MARS_ENEMY_LUNGE_DURATION = 0.25

// Direção de cada escola, calculada aqui com a MESMA fórmula do loop que monta as escolas em
// `setup()` (fonte única — copiada, não importada, porque `quests.forEach` também precisa rodar
// outro código de construção de malha que não faz sentido em escopo de módulo; mas a fórmula de
// posição em si tem que ser idêntica, letra por letra).
//
// Existe pra proteger escolas de bacias de terreno que passam perto (lab-28: a bacia do rio,
// nova nesta sessão, carvou embaixo de 3 escolas — q06/q14/q17 — sem nenhum aviso, porque a
// fórmula de posição das escolas é independente de onde o rio passa e ninguém tinha verificado
// as duas coisas juntas antes. Bug real relatado pelo usuário: "a casinha 14 está debaixo da
// terra"). Qualquer bacia nova que varra uma faixa ampla de theta (como o rio, que cobre ~216°)
// precisa checar contra isto antes de cavar.
const SCHOOL_DIRS: Vector3[] = quests.map((quest, index) => {
  const fixed = QUEST_FIXED_UP[quest.id]
  if (fixed) return fixed
  const t = quests.length > 1 ? index / (quests.length - 1) : 0
  const phi = Math.PI * 0.22 + t * Math.PI * 0.4
  const theta = index * GOLDEN_ANGLE * 1.7
  return new Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta))
})
// Raio de proteção: maior que o "meio-tamanho" de um prédio de escola (paredes 1,6×1,4, metade
// da diagonal ≈ 1,05 unidade ≈ 0,08 rad) com folga extra — suficiente pra manter a escola inteira
// (não só o centro) fora de qualquer bacia que passe perto.
const SCHOOL_PROTECTION_RADIUS = 0.12

function nearAnySchool(dir: { x: number; y: number; z: number }): boolean {
  for (const schoolDir of SCHOOL_DIRS) {
    const dot = dir.x * schoolDir.x + dir.y * schoolDir.y + dir.z * schoolDir.z
    if (dot > Math.cos(SCHOOL_PROTECTION_RADIUS)) return true
  }
  return false
}

function applyBasin(height: number, dir: Vector3, centerDir: Vector3, radius: number, depth: number): number {
  const dot = Math.max(-1, Math.min(1, Vector3.Dot(dir, centerDir)))
  const angle = Math.acos(dot)
  if (angle >= radius) return height
  const t = 1 - angle / radius
  const smooth = t * t * (3 - 2 * t)
  return height - smooth * depth
}

// Altura do terreno acima do raio-base do planeta, num ponto (direção normalizada) qualquer —
// ondulação suave de fundo + platôs com topo achatado (smoothstep na borda, não penhasco reto).
// Função única reaproveitada pra deformar a malha do chão E posicionar tudo que fica em cima
// dele (props, escolas, rio, grama, o próprio personagem) — evita objeto flutuando ou enterrado.
function terrainHeight(dir: Vector3): number {
  let height =
    Math.sin(dir.x * 3.1 + dir.z * 2.3) * 0.15 + Math.cos(dir.y * 4.7 + dir.x * 1.9) * 0.12

  for (const plateau of PLATEAU_CENTERS) {
    const dot = Math.max(-1, Math.min(1, Vector3.Dot(dir, plateau.dir)))
    const angle = Math.acos(dot)
    if (angle < plateau.radius) {
      const t = 1 - angle / plateau.radius
      const smooth = t * t * (3 - 2 * t) // smoothstep — topo achatado, rampa suave na borda
      height = Math.max(height, smooth * plateau.height)
    }
  }

  // Bacia da lagoa/piscina: rebaixa incondicionalmente (não é um "máximo" tipo platô — é sempre
  // mais baixo que a vizinhança ali, senão o disco de água plano acaba mais baixo que algum
  // solavanco do ruído de base bem no meio da lagoa, furando o chão pra fora d'água).
  //
  // Nenhuma bacia cava perto de uma escola (lab-28: bug real relatado pelo usuário, "a casinha
  // 14 está debaixo da terra"; ver `nearAnySchool`).
  if (!nearAnySchool(dir)) {
    height = applyBasin(height, dir, POND_CENTER_DIR, 0.45, 0.65)
    height = applyBasin(height, dir, POOL_CENTER_DIR, 0.32, 0.55)
  }

  return height
}

// Cor da camisa vem do catálogo de avatares (src/data/avatars.ts) — fonte única de verdade,
// compartilhada com a lojinha (AvatarShop.tsx). O fallback cobre só o caso de um emoji não
// catalogado chegar aqui (não deveria acontecer, mas evita crash).
function avatarColorFromEmoji(emoji: string): Color3 {
  const avatar = findAvatarByEmoji(emoji)
  if (!avatar) return new Color3(0.96, 0.51, 0.68)
  return new Color3(...avatar.colorRgb)
}

const FALLBACK_BONECO_FEATURES: BonecoFeatures = {
  earStyle: 'none',
  tailStyle: 'none',
  special: 'none',
  accentColorRgb: [0.96, 0.51, 0.68],
}

function bonecoFeaturesFromEmoji(emoji: string): BonecoFeatures {
  return findAvatarByEmoji(emoji)?.features ?? FALLBACK_BONECO_FEATURES
}

// Menor rotação que leva o "para cima" padrão (0,1,0) até `up` — usada pra apoiar
// props/portais deitados sobre a curvatura da esfera, não flutuando na orientação do mundo.
function alignmentQuaternion(up: Vector3): Quaternion {
  const defaultUp = Vector3.Up()
  const dot = Vector3.Dot(defaultUp, up)
  if (dot > 0.9999) return Quaternion.Identity()
  if (dot < -0.9999) return Quaternion.RotationAxis(new Vector3(1, 0, 0), Math.PI)
  const axis = Vector3.Cross(defaultUp, up).normalize()
  const angle = Math.acos(Math.max(-1, Math.min(1, dot)))
  return Quaternion.RotationAxis(axis, angle)
}

// Menor rotação que leva o vetor `from` até `to` — usada pra girar o foguete durante o TRECHO DE
// CRUZEIRO do voo (lab-61, pedido do usuário: "ele deve voar apontando pro planeta de destino"),
// quadro a quadro, do nariz atual pra tangente nova da curva. Rotação incremental nunca degenera
// (não existe eixo de referência fixo pra ficar paralelo a nada, diferente de reconstruir a base
// via produto vetorial contra um eixo fixo — bug já visto numa versão anterior desta mesma
// função).
function quaternionBetweenVectors(from: Vector3, to: Vector3): Quaternion {
  const dot = Vector3.Dot(from, to)
  if (dot > 0.9999) return Quaternion.Identity()
  if (dot < -0.9999) {
    let axis = Vector3.Cross(Vector3.Right(), from)
    if (axis.lengthSquared() < 1e-6) axis = Vector3.Cross(Vector3.Up(), from)
    axis.normalize()
    return Quaternion.RotationAxis(axis, Math.PI)
  }
  const axis = Vector3.Cross(from, to).normalize()
  const angle = Math.acos(Math.max(-1, Math.min(1, dot)))
  return Quaternion.RotationAxis(axis, angle)
}

interface StudentFigure {
  root: TransformNode
  shirtMat: PBRMaterial
  head: Mesh
  legPivotL: TransformNode
  legPivotR: TransformNode
  kneePivotL: TransformNode
  kneePivotR: TransformNode
  armPivotL: TransformNode
  armPivotR: TransformNode
  elbowPivotL: TransformNode
  elbowPivotR: TransformNode
  // Peças do "boneco 3D" trocável na lojinha (lab-13: orelhas/rabo/chifre/etc., não só cor da
  // camisa) — populado por `applyBonecoFeatures`, guardado aqui pra poder descartar e remontar
  // quando o jogador troca de avatar em cena (sem reconstruir a figura inteira).
  accessories: Mesh[]
  // Chapéu equipado (lab-24) — eixo de customização INDEPENDENTE de `accessories`: populado por
  // `applyHat`, sobrevive a troca de criatura (não é descartado por `applyBonecoFeatures`).
  hatMeshes: Mesh[]
}

// Carro (lab-15/lab-25) — em escopo de módulo (não dentro de `setup()`) porque o handler de
// teclado que entra/sai do carro (`onKeyDown`, dentro de `setup()`) precisa do tipo `Carro` numa
// declaração `let` que vem antes, textualmente, de onde `carros: Carro[]` é montado.
interface Carro {
  root: TransformNode
  pathIndex: number
  direction: 1 | -1
  speed: number
  // Rótulo GUI "pressione E" (lab-25) — visível só quando o jogador está perto o bastante deste
  // carro específico e não está dirigindo nenhum (mesmo padrão da bolha de fala dos NPCs: alpha
  // 0/1 alternado, não criado/destruído a cada quadro).
  hintLabel: TextBlock
}

interface RemotePlayer {
  figure: StudentFigure
  label: TextBlock
  targetPos: Vector3
  targetFacing: Vector3
  lastSeen: number
  name: string
  avatarEmoji: string
  xp: number
  coins: number
  // Animação de andar (lab-55: "eles não mexem as pernas") — sem input direto de um jogador
  // remoto, a fase do ciclo avança com base na distância percorrida a cada quadro (ver loop de
  // render), não no throttle (que só existe pro jogador local).
  walkPhase: number
  lastFootSign: number
  // Bolha de fala (lab-55: "quando eu dei olá no chat pode aparecer um balão da msg sobre a
  // cabeça") — TextBlock própria, separada do rótulo de nome (`label`), mesmo padrão visual dos
  // NPCs (`chatLabel` em `WalkerNpc`/pool people): alpha 0/1, ligada à cabeça da figura.
  chatLabel: TextBlock
  chatBubbleTimeout: number | null
  // Anel de onda sonora (lab-64, pedido do usuário: "o efeito de fumaça circular que aparece
  // quando estou em Marte devem aparecer quando estou visualizando outros usuários logados no
  // server também") — mesmo anel do próprio jogador (lab-62), mas ligado/desligado por posição:
  // sem campo novo no protocolo de rede, a posição já sincronizada (`targetPos`) já basta pra
  // saber se aquele jogador remoto está perto de Marte ou não (ver loop de render).
  ring: Mesh
  ringPhaseOffset: number
}

// Personagem estudante estilo "avatar de app" (torso, cabeça, cabelo, mochila, 2 pernas,
// 2 braços) construído só com primitivas — sem asset externo. As pernas/braços são
// TransformNodes-pivô (quadril/ombro) pra poder girar em ciclo de caminhada.
function buildStudentFigure(scene: Scene, shirtColor: Color3, shadowGenerator: ShadowGenerator): StudentFigure {
  const root = new TransformNode('studentRoot', scene)

  const skinMat = new PBRMaterial('skinMat', scene)
  skinMat.albedoColor = new Color3(0.94, 0.76, 0.6)
  skinMat.roughness = 0.6

  const shirtMat = new PBRMaterial('shirtMat', scene)
  shirtMat.albedoColor = shirtColor
  shirtMat.roughness = 0.7

  const pantsMat = new PBRMaterial('pantsMat', scene)
  pantsMat.albedoColor = new Color3(0.22, 0.28, 0.48)
  pantsMat.roughness = 0.8

  const backpackMat = new PBRMaterial('backpackMat', scene)
  backpackMat.albedoColor = Color3.Lerp(shirtColor, new Color3(0.5, 0.15, 0.1), 0.5)
  backpackMat.roughness = 0.75

  const hairMat = new PBRMaterial('hairMat', scene)
  hairMat.albedoColor = new Color3(0.24, 0.15, 0.09)
  hairMat.roughness = 0.9

  function addMesh(mesh: Mesh, material: PBRMaterial, parent: TransformNode) {
    mesh.material = material
    mesh.parent = parent
    shadowGenerator.addShadowCaster(mesh)
    return mesh
  }

  const torso = MeshBuilder.CreateCapsule('torso', { height: 0.5, radius: 0.19 }, scene)
  torso.position.y = 0.78
  addMesh(torso, shirtMat, root)

  const head = MeshBuilder.CreateSphere('head', { diameter: 0.32 }, scene)
  head.position.y = 1.15
  addMesh(head, skinMat, root)

  const hair = MeshBuilder.CreateSphere('hair', { diameter: 0.35, slice: 0.55 }, scene)
  hair.position.y = 1.24
  addMesh(hair, hairMat, root)

  // Mochila com detalhes que dão pra reconhecer de costas (única vista que a câmera em 3ª
  // pessoa mostra durante o jogo): corpo alto/estreito (proporção de mochila, não cubo), aba no
  // topo, duas bolsas laterais e as pontas das alças aparecendo por cima dos ombros.
  const backpackFlapMat = new PBRMaterial('backpackFlapMat', scene)
  backpackFlapMat.albedoColor = backpackMat.albedoColor.scale(0.75)
  backpackFlapMat.roughness = 0.8
  const strapMat = new PBRMaterial('backpackStrapMat', scene)
  strapMat.albedoColor = new Color3(0.15, 0.13, 0.12)
  strapMat.roughness = 0.85

  const backpack = MeshBuilder.CreateBox('backpack', { width: 0.28, height: 0.38, depth: 0.15 }, scene)
  backpack.position = new Vector3(0, 0.79, -0.21)
  addMesh(backpack, backpackMat, root)

  const backpackFlap = MeshBuilder.CreateBox('backpackFlap', { width: 0.3, height: 0.09, depth: 0.16 }, scene)
  backpackFlap.position = new Vector3(0, 0.79 + 0.19 + 0.03, -0.21)
  addMesh(backpackFlap, backpackFlapMat, root)

  for (const side of [-1, 1]) {
    const pouch = MeshBuilder.CreateCapsule(`backpackPouch${side}`, { height: 0.22, radius: 0.045 }, scene)
    pouch.rotation.x = Math.PI / 2
    pouch.position = new Vector3(side * 0.16, 0.72, -0.21)
    addMesh(pouch, backpackFlapMat, root)

    const strap = MeshBuilder.CreateCapsule(`backpackStrap${side}`, { height: 0.16, radius: 0.028 }, scene)
    strap.rotation.x = 0.55
    strap.position = new Vector3(side * 0.1, 0.98, -0.06)
    addMesh(strap, strapMat, root)
  }

  // Cada membro tem 2 segmentos (coxa+canela, ou braço+antebraço) com uma junta no meio
  // (joelho/cotovelo) — evita o visual "robotizado" de uma perna/braço só, rígida.
  function buildTwoSegmentLimb(
    name: string,
    side: number,
    isLeg: boolean,
  ): { upperPivot: TransformNode; lowerPivot: TransformNode } {
    const hipY = isLeg ? 0.53 : 0.92
    const upperLen = isLeg ? 0.27 : 0.22
    const lowerLen = isLeg ? 0.26 : 0.2
    const upperRadius = isLeg ? 0.085 : 0.06
    const lowerRadius = upperRadius * 0.85
    const mat = isLeg ? pantsMat : skinMat

    const upperPivot = new TransformNode(`${name}UpperPivot`, scene)
    upperPivot.position = new Vector3(side * (isLeg ? 0.1 : 0.24), hipY, 0)
    upperPivot.parent = root
    const upperMesh = MeshBuilder.CreateCapsule(`${name}Upper`, { height: upperLen, radius: upperRadius }, scene)
    upperMesh.position.y = -upperLen / 2
    addMesh(upperMesh, mat, upperPivot)

    const lowerPivot = new TransformNode(`${name}LowerPivot`, scene)
    lowerPivot.position = new Vector3(0, -upperLen, 0)
    lowerPivot.parent = upperPivot
    const lowerMesh = MeshBuilder.CreateCapsule(`${name}Lower`, { height: lowerLen, radius: lowerRadius }, scene)
    lowerMesh.position.y = -lowerLen / 2
    addMesh(lowerMesh, mat, lowerPivot)

    return { upperPivot, lowerPivot }
  }

  const leg1 = buildTwoSegmentLimb('legL', -1, true)
  const leg2 = buildTwoSegmentLimb('legR', 1, true)
  const arm1 = buildTwoSegmentLimb('armL', -1, false)
  const arm2 = buildTwoSegmentLimb('armR', 1, false)

  return {
    root,
    shirtMat,
    head,
    legPivotL: leg1.upperPivot,
    legPivotR: leg2.upperPivot,
    kneePivotL: leg1.lowerPivot,
    kneePivotR: leg2.lowerPivot,
    armPivotL: arm1.upperPivot,
    armPivotR: arm2.upperPivot,
    elbowPivotL: arm1.lowerPivot,
    elbowPivotR: arm2.lowerPivot,
    accessories: [],
    hatMeshes: [],
  }
}

// Peças 3D que dão a cada avatar do catálogo (src/data/avatars.ts) uma forma de verdade — não só
// uma cor de camisa (pedido do usuário: "bonecos 3d pra trocar não só de avatar", lab-13).
// Descarta as peças antigas (se houver — troca de avatar em cena já com a cena montada) e monta
// as novas a partir de `features`, tudo parentado em `figure.root` (mesmo padrão da mochila/
// cabelo: offset absoluto, não aninhado na cabeça) reaproveitando primitivas simples, sem asset
// externo, igual ao resto do jogo.
function applyBonecoFeatures(
  figure: StudentFigure,
  features: BonecoFeatures,
  scene: Scene,
  shadowGenerator: ShadowGenerator,
): void {
  for (const mesh of figure.accessories) mesh.dispose()
  figure.accessories = []

  const accentMat = new PBRMaterial('bonecoAccentMat', scene)
  accentMat.albedoColor = new Color3(...features.accentColorRgb)
  accentMat.roughness = 0.75

  function add(mesh: Mesh) {
    mesh.material = accentMat
    mesh.parent = figure.root
    shadowGenerator.addShadowCaster(mesh)
    figure.accessories.push(mesh)
    return mesh
  }

  const HEAD_Y = 1.15

  if (features.earStyle === 'triangle') {
    for (const side of [-1, 1]) {
      const ear = MeshBuilder.CreateCylinder(
        `earTriangle${side}`,
        { height: 0.14, diameterTop: 0, diameterBottom: 0.09, tessellation: 3 },
        scene,
      )
      ear.position = new Vector3(side * 0.13, HEAD_Y + 0.16, 0.03)
      ear.rotation.z = side * 0.35
      add(ear)
    }
  } else if (features.earStyle === 'round') {
    for (const side of [-1, 1]) {
      const ear = MeshBuilder.CreateSphere(`earRound${side}`, { diameter: 0.14 }, scene)
      ear.scaling.z = 0.6
      ear.position = new Vector3(side * 0.15, HEAD_Y + 0.14, 0.02)
      add(ear)
    }
  } else if (features.earStyle === 'tufted') {
    for (const side of [-1, 1]) {
      const ear = MeshBuilder.CreateCylinder(
        `earTufted${side}`,
        { height: 0.1, diameterTop: 0, diameterBottom: 0.05, tessellation: 3 },
        scene,
      )
      ear.position = new Vector3(side * 0.07, HEAD_Y + 0.18, 0.05)
      ear.rotation.z = side * 0.2
      add(ear)
    }
  }

  if (features.tailStyle === 'fluffy') {
    const tail = MeshBuilder.CreateCapsule('tailFluffy', { height: 0.4, radius: 0.075 }, scene)
    tail.position = new Vector3(0, 0.62, -0.24)
    tail.rotation.x = -0.9
    add(tail)
    const tip = MeshBuilder.CreateSphere('tailFluffyTip', { diameter: 0.14 }, scene)
    tip.position = new Vector3(0, 0.82, -0.42)
    add(tip)
  } else if (features.tailStyle === 'thin') {
    const tail = MeshBuilder.CreateCapsule('tailThin', { height: 0.32, radius: 0.032 }, scene)
    tail.position = new Vector3(0, 0.58, -0.22)
    tail.rotation.x = -0.6
    add(tail)
  } else if (features.tailStyle === 'tufted') {
    const tail = MeshBuilder.CreateCapsule('tailTufted', { height: 0.36, radius: 0.035 }, scene)
    tail.position = new Vector3(0, 0.6, -0.24)
    tail.rotation.x = -0.75
    add(tail)
    const tip = MeshBuilder.CreateSphere('tailTuftedTip', { diameter: 0.1 }, scene)
    tip.position = new Vector3(0, 0.78, -0.4)
    add(tip)
  }

  if (features.special === 'horn') {
    const horn = MeshBuilder.CreateCylinder('horn', { height: 0.24, diameterTop: 0, diameterBottom: 0.06, tessellation: 6 }, scene)
    horn.position = new Vector3(0, HEAD_Y + 0.22, 0.08)
    horn.rotation.x = -0.3
    add(horn)
  } else if (features.special === 'horns') {
    for (const side of [-1, 1]) {
      const horn = MeshBuilder.CreateCylinder(
        `horns${side}`,
        { height: 0.14, diameterTop: 0, diameterBottom: 0.04, tessellation: 5 },
        scene,
      )
      horn.position = new Vector3(side * 0.09, HEAD_Y + 0.18, 0.06)
      horn.rotation.z = side * 0.3
      horn.rotation.x = -0.2
      add(horn)
    }
  } else if (features.special === 'beak') {
    const beak = MeshBuilder.CreateCylinder('beak', { height: 0.09, diameterTop: 0, diameterBottom: 0.055 }, scene)
    beak.rotation.x = Math.PI / 2
    beak.position = new Vector3(0, HEAD_Y - 0.01, 0.16)
    add(beak)
  } else if (features.special === 'mane') {
    const spikeCount = 10
    for (let s = 0; s < spikeCount; s++) {
      const angle = (s / spikeCount) * Math.PI * 2
      const spike = MeshBuilder.CreateCylinder(
        `mane${s}`,
        { height: 0.13, diameterTop: 0, diameterBottom: 0.06, tessellation: 3 },
        scene,
      )
      spike.position = new Vector3(Math.cos(angle) * 0.16, HEAD_Y + Math.sin(angle) * 0.1, Math.sin(angle) * 0.05 + 0.02)
      spike.rotation.z = angle + Math.PI / 2
      add(spike)
    }
  } else if (features.special === 'eyes') {
    for (const side of [-1, 1]) {
      const eye = MeshBuilder.CreateSphere(`eyes${side}`, { diameter: 0.1 }, scene)
      eye.position = new Vector3(side * 0.08, HEAD_Y + 0.13, 0.1)
      add(eye)
    }
  } else if (features.special === 'tentacles') {
    const tentacleCount = 3
    for (let t = 0; t < tentacleCount; t++) {
      const angle = (t / tentacleCount) * Math.PI * 2
      const tentacle = MeshBuilder.CreateCapsule(`tentacles${t}`, { height: 0.22, radius: 0.028 }, scene)
      tentacle.position = new Vector3(Math.cos(angle) * 0.14, HEAD_Y - 0.05, Math.sin(angle) * 0.14)
      tentacle.rotation.x = 0.6
      add(tentacle)
    }
  }
}

// Chapéu equipado (lab-24) — eixo de customização independente de `applyBonecoFeatures`: guardado
// em `figure.hatMeshes` (não em `figure.accessories`), pra trocar de criatura não descartar o
// chapéu e vice-versa. `hat` null = remove qualquer chapéu (descarta as malhas e sai).
function applyHat(
  figure: StudentFigure,
  hat: HatOption | null,
  scene: Scene,
  shadowGenerator: ShadowGenerator,
): void {
  for (const mesh of figure.hatMeshes) mesh.dispose()
  figure.hatMeshes = []
  if (!hat) return

  const hatMat = new PBRMaterial(`hatMat-${hat.id}`, scene)
  hatMat.albedoColor = new Color3(...hat.colorRgb)
  hatMat.roughness = 0.6

  function add(mesh: Mesh) {
    mesh.material = hatMat
    mesh.parent = figure.root
    shadowGenerator.addShadowCaster(mesh)
    figure.hatMeshes.push(mesh)
    return mesh
  }

  // Acima do cabelo (hair vai até HEAD_Y+0.24ish, diâmetro 0.35 slice 0.55) — HAT_Y evita
  // z-fighting com a touca de cabelo por baixo.
  const HAT_Y = 1.34

  if (hat.shape === 'cap') {
    const brim = MeshBuilder.CreateCylinder('hatCapBrim', { height: 0.03, diameter: 0.34, tessellation: 16 }, scene)
    brim.position = new Vector3(0, HAT_Y - 0.06, 0.08)
    add(brim)
    const dome = MeshBuilder.CreateSphere('hatCapDome', { diameter: 0.34, slice: 0.55 }, scene)
    dome.position.y = HAT_Y
    add(dome)
  } else if (hat.shape === 'party') {
    const cone = MeshBuilder.CreateCylinder(
      'hatPartyCone',
      { height: 0.32, diameterTop: 0.02, diameterBottom: 0.26, tessellation: 12 },
      scene,
    )
    cone.position.y = HAT_Y + 0.14
    add(cone)
    const pom = MeshBuilder.CreateSphere('hatPartyPom', { diameter: 0.07 }, scene)
    pom.position.y = HAT_Y + 0.31
    add(pom)
  } else if (hat.shape === 'flower') {
    const petalCount = 5
    for (let p = 0; p < petalCount; p++) {
      const angle = (p / petalCount) * Math.PI * 2
      const petal = MeshBuilder.CreateSphere(`hatFlowerPetal${p}`, { diameter: 0.09 }, scene)
      petal.scaling.y = 0.5
      petal.position = new Vector3(Math.cos(angle) * 0.08, HAT_Y - 0.02, Math.sin(angle) * 0.08 + 0.1)
      add(petal)
    }
    const center = MeshBuilder.CreateSphere('hatFlowerCenter', { diameter: 0.06 }, scene)
    center.position = new Vector3(0, HAT_Y - 0.02, 0.1)
    add(center)
  } else if (hat.shape === 'bow') {
    for (const side of [-1, 1]) {
      const loop = MeshBuilder.CreateBox(`hatBowLoop${side}`, { width: 0.12, height: 0.08, depth: 0.03 }, scene)
      loop.position = new Vector3(side * 0.07, HAT_Y - 0.04, 0.1)
      loop.rotation.z = side * 0.5
      add(loop)
    }
    const knot = MeshBuilder.CreateSphere('hatBowKnot', { diameter: 0.05 }, scene)
    knot.position = new Vector3(0, HAT_Y - 0.04, 0.1)
    add(knot)
  } else if (hat.shape === 'crown') {
    const band = MeshBuilder.CreateCylinder(
      'hatCrownBand',
      { height: 0.09, diameterTop: 0.32, diameterBottom: 0.3, tessellation: 16 },
      scene,
    )
    band.position.y = HAT_Y - 0.03
    add(band)
    const spikeCount = 5
    for (let s = 0; s < spikeCount; s++) {
      const angle = (s / spikeCount) * Math.PI * 2
      const spike = MeshBuilder.CreateCylinder(
        `hatCrownSpike${s}`,
        { height: 0.1, diameterTop: 0, diameterBottom: 0.06, tessellation: 4 },
        scene,
      )
      spike.position = new Vector3(Math.cos(angle) * 0.13, HAT_Y + 0.06, Math.sin(angle) * 0.13)
      add(spike)
    }
  }
}

// Bichinhos que vagam pelo planeta (pedido do usuário: "animais no mundo, animais aleatorios")
// — feitos só de primitivas, iguais em espírito ao personagem, mas bem mais simples (sem
// articulação). A IA de cada um é: anda até um ponto aleatório na faixa caminhável, descansa um
// tempo, escolhe outro ponto — tudo em coordenadas de "up local" (direção a partir do centro do
// planeta), igual ao resto do mundo, pra já nascer alinhado à curvatura sem lógica extra.
type CritterKind = 'coelho' | 'esquilo' | 'passarinho' | 'gato' | 'cachorro' | 'onca' | 'falcao'

interface Critter {
  kind: CritterKind
  root: TransformNode
  wingL?: TransformNode
  wingR?: TransformNode
  up: Vector3
  targetUp: Vector3
  forward: Vector3
  moveSpeed: number
  hopPhase: number
  hopSpeed: number
  restTimer: number
  flightHeight: number
  // Só usado por `kind === 'passarinho'` — canto baixinho quando o jogador está perto (pedido
  // do usuário). `undefined` até o primeiro uso, sorteado na primeira checagem.
  chirpTimer?: number
  // Som de espécie (latido/rosnado/grito, cachorro/onça/falcão) — mesmo mecanismo do
  // `chirpTimer` acima, timer independente por bicho pra não disparar tudo sincronizado.
  soundTimer?: number
  // Som engraçado (pedido do usuário: "sons engraçados de conversa e pum") — qualquer bicho
  // pode disparar de vez em quando quando o jogador está perto, não só os 3 novos tipos.
  funnyTimer?: number
}

// Inimigos de Marte (lab-60, pedido do usuário: "no planeta marciano tem que ter ETs e robôs que
// tenta matar o nosso boneco"). Mesmo esquema de IA de vagar/perseguir dos bichos (`up`/
// `targetUp`/`forward`, ver `rotateAroundAxis` no laço de física) — perseguem o jogador quando
// ele entra no raio de detecção, senão vagam perto de onde nasceram (`homeUp`) como os bichos.
type MarsEnemyKind = 'et' | 'robo'

interface MarsEnemy {
  kind: MarsEnemyKind
  root: TransformNode
  up: Vector3
  targetUp: Vector3
  forward: Vector3
  homeUp: Vector3
  restTimer: number
  attackCooldown: number
  // Nocauteado com a arma certa (lab-61, pedido do usuário: "crie uma espada... e uma arma...
  // para nocautear o ET/o robô") — inimigo morto para de perseguir/atacar e some da cena, sem
  // precisar removê-lo do array (mais simples que filtrar `marsEnemies` toda hora).
  alive: boolean
  // "Solavanco" visual (pulso de escala) tocado ao atacar (lab-62) — ver `MARS_ENEMY_LUNGE_DURATION`.
  lungeTimer: number
}

function buildCoelho(scene: Scene, shadowGenerator: ShadowGenerator): TransformNode {
  const root = new TransformNode('coelhoRoot', scene)
  const furMat = new PBRMaterial('coelhoFur', scene)
  furMat.albedoColor = new Color3(0.92, 0.9, 0.85)
  furMat.roughness = 0.85

  function add(mesh: Mesh) {
    mesh.material = furMat
    mesh.parent = root
    shadowGenerator.addShadowCaster(mesh)
    return mesh
  }

  const body = MeshBuilder.CreateCapsule('coelhoBody', { height: 0.26, radius: 0.11 }, scene)
  body.rotation.x = Math.PI / 2
  body.position.y = 0.13
  add(body)

  const head = MeshBuilder.CreateSphere('coelhoHead', { diameter: 0.16 }, scene)
  head.position = new Vector3(0, 0.18, 0.14)
  add(head)

  for (const side of [-1, 1]) {
    const ear = MeshBuilder.CreateCapsule(`coelhoEar${side}`, { height: 0.16, radius: 0.028 }, scene)
    ear.position = new Vector3(side * 0.045, 0.29, 0.14)
    ear.rotation.z = side * 0.15
    add(ear)
  }

  const tail = MeshBuilder.CreateSphere('coelhoTail', { diameter: 0.09 }, scene)
  tail.position = new Vector3(0, 0.15, -0.13)
  add(tail)

  return root
}

function buildEsquilo(scene: Scene, shadowGenerator: ShadowGenerator): TransformNode {
  const root = new TransformNode('esquiloRoot', scene)
  const furMat = new PBRMaterial('esquiloFur', scene)
  furMat.albedoColor = new Color3(0.55, 0.32, 0.16)
  furMat.roughness = 0.85

  function add(mesh: Mesh) {
    mesh.material = furMat
    mesh.parent = root
    shadowGenerator.addShadowCaster(mesh)
    return mesh
  }

  const body = MeshBuilder.CreateCapsule('esquiloBody', { height: 0.2, radius: 0.09 }, scene)
  body.rotation.x = Math.PI / 2
  body.position.y = 0.1
  add(body)

  const head = MeshBuilder.CreateSphere('esquiloHead', { diameter: 0.13 }, scene)
  head.position = new Vector3(0, 0.14, 0.13)
  add(head)

  // Rabo grande arqueado por trás — o traço mais reconhecível de esquilo.
  const tail = MeshBuilder.CreateCapsule('esquiloTail', { height: 0.3, radius: 0.075 }, scene)
  tail.position = new Vector3(0, 0.24, -0.15)
  tail.rotation.x = -0.85
  add(tail)

  return root
}

// Gatos (pedido do usuário: "mais gato e alguns gatos ficam ensima de tudo") — a maioria vaga
// pelo chão igual coelho/esquilo, alguns ficam parados no topo dos platôs/telhados (ver
// `perchedCats` mais abaixo, fora da IA de vagar).
function buildGato(scene: Scene, shadowGenerator: ShadowGenerator, furColor: Color3): TransformNode {
  const root = new TransformNode('gatoRoot', scene)
  const furMat = new PBRMaterial('gatoFur', scene)
  furMat.albedoColor = furColor
  furMat.roughness = 0.8

  function add(mesh: Mesh) {
    mesh.material = furMat
    mesh.parent = root
    shadowGenerator.addShadowCaster(mesh)
    return mesh
  }

  const body = MeshBuilder.CreateCapsule('gatoBody', { height: 0.28, radius: 0.1 }, scene)
  body.rotation.x = Math.PI / 2
  body.position.y = 0.12
  add(body)

  const head = MeshBuilder.CreateSphere('gatoHead', { diameter: 0.15 }, scene)
  head.position = new Vector3(0, 0.17, 0.16)
  add(head)

  for (const side of [-1, 1]) {
    const ear = MeshBuilder.CreateCylinder(
      `gatoEar${side}`,
      { height: 0.07, diameterTop: 0, diameterBottom: 0.06, tessellation: 3 },
      scene,
    )
    ear.position = new Vector3(side * 0.055, 0.25, 0.16)
    add(ear)
  }

  // Rabo arqueado pra cima — junto com as orelhas triangulares, o traço que mais diferencia de
  // coelho/esquilo na mesma escala de bicho pequeno.
  const tail = MeshBuilder.CreateCapsule('gatoTail', { height: 0.26, radius: 0.028 }, scene)
  tail.position = new Vector3(0, 0.23, -0.16)
  tail.rotation.x = -1.15
  add(tail)

  return root
}

function buildPassarinho(
  scene: Scene,
  shadowGenerator: ShadowGenerator,
  bodyColor: Color3,
): { root: TransformNode; wingL: TransformNode; wingR: TransformNode } {
  const root = new TransformNode('passarinhoRoot', scene)
  const bodyMat = new PBRMaterial('passarinhoBodyMat', scene)
  bodyMat.albedoColor = bodyColor
  bodyMat.roughness = 0.7
  const beakMat = new PBRMaterial('passarinhoBeakMat', scene)
  beakMat.albedoColor = new Color3(0.9, 0.6, 0.15)
  beakMat.roughness = 0.5

  const body = MeshBuilder.CreateSphere('passarinhoBody', { diameterX: 0.14, diameterY: 0.13, diameterZ: 0.2 }, scene)
  body.material = bodyMat
  body.parent = root
  shadowGenerator.addShadowCaster(body)

  const beak = MeshBuilder.CreateCylinder('passarinhoBeak', { height: 0.08, diameterTop: 0, diameterBottom: 0.05 }, scene)
  beak.rotation.x = Math.PI / 2
  beak.position = new Vector3(0, 0, 0.13)
  beak.material = beakMat
  beak.parent = root

  function buildWing(side: number): TransformNode {
    const pivot = new TransformNode(`passarinhoWingPivot${side}`, scene)
    pivot.position = new Vector3(side * 0.05, 0.01, 0)
    pivot.parent = root
    const wing = MeshBuilder.CreateBox(`passarinhoWing${side}`, { width: 0.16, height: 0.015, depth: 0.09 }, scene)
    wing.position = new Vector3(side * 0.08, 0, 0)
    wing.material = bodyMat
    wing.parent = pivot
    shadowGenerator.addShadowCaster(wing)
    return pivot
  }

  return { root, wingL: buildWing(-1), wingR: buildWing(1) }
}

// Cachorro (pedido do usuário: "sons engraçados... onças, cachorro, falcão") — vaga pelo chão
// igual coelho/esquilo/gato, mesmo estilo baixo-poli de cápsulas/esferas.
function buildCachorro(scene: Scene, shadowGenerator: ShadowGenerator, furColor: Color3): TransformNode {
  const root = new TransformNode('cachorroRoot', scene)
  const furMat = new PBRMaterial('cachorroFur', scene)
  furMat.albedoColor = furColor
  furMat.roughness = 0.85

  function add(mesh: Mesh) {
    mesh.material = furMat
    mesh.parent = root
    shadowGenerator.addShadowCaster(mesh)
    return mesh
  }

  const body = MeshBuilder.CreateCapsule('cachorroBody', { height: 0.34, radius: 0.13 }, scene)
  body.rotation.x = Math.PI / 2
  body.position.y = 0.16
  add(body)

  const head = MeshBuilder.CreateSphere('cachorroHead', { diameter: 0.18 }, scene)
  head.position = new Vector3(0, 0.2, 0.2)
  add(head)

  const snout = MeshBuilder.CreateCapsule('cachorroSnout', { height: 0.12, radius: 0.055 }, scene)
  snout.rotation.x = Math.PI / 2
  snout.position = new Vector3(0, 0.16, 0.29)
  add(snout)

  for (const side of [-1, 1]) {
    const ear = MeshBuilder.CreateCapsule(`cachorroEar${side}`, { height: 0.1, radius: 0.035 }, scene)
    ear.position = new Vector3(side * 0.08, 0.27, 0.19)
    ear.rotation.z = side * 0.5
    add(ear)
  }

  const tail = MeshBuilder.CreateCapsule('cachorroTail', { height: 0.22, radius: 0.035 }, scene)
  tail.position = new Vector3(0, 0.26, -0.19)
  tail.rotation.x = -0.9
  add(tail)

  return root
}

// Onça (jaguar) — corpo maior/mais alongado que os outros bichos de terra, manchas escuras
// espalhadas (esferas achatadas pequenas sobre o pelo) pra diferenciar de um gato comum de longe.
function buildOnca(scene: Scene, shadowGenerator: ShadowGenerator): TransformNode {
  const root = new TransformNode('oncaRoot', scene)
  const furMat = new PBRMaterial('oncaFur', scene)
  furMat.albedoColor = new Color3(0.85, 0.62, 0.25)
  furMat.roughness = 0.8
  const spotMat = new PBRMaterial('oncaSpot', scene)
  spotMat.albedoColor = new Color3(0.22, 0.14, 0.05)
  spotMat.roughness = 0.85

  function add(mesh: Mesh, mat: PBRMaterial = furMat) {
    mesh.material = mat
    mesh.parent = root
    shadowGenerator.addShadowCaster(mesh)
    return mesh
  }

  const body = MeshBuilder.CreateCapsule('oncaBody', { height: 0.5, radius: 0.16 }, scene)
  body.rotation.x = Math.PI / 2
  body.position.y = 0.19
  add(body)

  const head = MeshBuilder.CreateSphere('oncaHead', { diameter: 0.22 }, scene)
  head.position = new Vector3(0, 0.23, 0.3)
  add(head)

  for (const side of [-1, 1]) {
    const ear = MeshBuilder.CreateCylinder(
      `oncaEar${side}`,
      { height: 0.06, diameterTop: 0, diameterBottom: 0.07, tessellation: 3 },
      scene,
    )
    ear.position = new Vector3(side * 0.08, 0.33, 0.3)
    add(ear)
  }

  const tail = MeshBuilder.CreateCapsule('oncaTail', { height: 0.32, radius: 0.04 }, scene)
  tail.position = new Vector3(0, 0.28, -0.3)
  tail.rotation.x = -1.0
  add(tail)

  // Manchas: pequenas esferas achatadas espalhadas pelo corpo, posições fixas mas assimétricas
  // (não uma grade regular) pra não parecer padrão repetido.
  const spotOffsets: Array<[number, number, number]> = [
    [0.1, 0.24, 0.1], [-0.11, 0.22, -0.02], [0.08, 0.26, -0.15],
    [-0.09, 0.25, 0.2], [0.12, 0.21, -0.28], [-0.1, 0.23, -0.32],
  ]
  spotOffsets.forEach(([x, y, z], i) => {
    const spot = MeshBuilder.CreateSphere(`oncaSpot${i}`, { diameterX: 0.05, diameterY: 0.03, diameterZ: 0.05 }, scene)
    spot.position = new Vector3(x, y, z)
    add(spot, spotMat)
  })

  return root
}

// Falcão — voa igual ao passarinho (mesmo mecanismo de asa/altura de voo), só maior e sem o bico
// arredondado (bico de gancho, mais predador).
function buildFalcao(
  scene: Scene,
  shadowGenerator: ShadowGenerator,
): { root: TransformNode; wingL: TransformNode; wingR: TransformNode } {
  const root = new TransformNode('falcaoRoot', scene)
  const bodyMat = new PBRMaterial('falcaoBodyMat', scene)
  bodyMat.albedoColor = new Color3(0.38, 0.3, 0.22)
  bodyMat.roughness = 0.7
  const beakMat = new PBRMaterial('falcaoBeakMat', scene)
  beakMat.albedoColor = new Color3(0.85, 0.75, 0.2)
  beakMat.roughness = 0.5

  const body = MeshBuilder.CreateSphere('falcaoBody', { diameterX: 0.22, diameterY: 0.2, diameterZ: 0.32 }, scene)
  body.material = bodyMat
  body.parent = root
  shadowGenerator.addShadowCaster(body)

  const beak = MeshBuilder.CreateCylinder('falcaoBeak', { height: 0.11, diameterTop: 0, diameterBottom: 0.06 }, scene)
  beak.rotation.x = Math.PI / 2 + 0.3
  beak.position = new Vector3(0, -0.02, 0.2)
  beak.material = beakMat
  beak.parent = root

  function buildWing(side: number): TransformNode {
    const pivot = new TransformNode(`falcaoWingPivot${side}`, scene)
    pivot.position = new Vector3(side * 0.08, 0.01, 0)
    pivot.parent = root
    const wing = MeshBuilder.CreateBox(`falcaoWing${side}`, { width: 0.28, height: 0.02, depth: 0.14 }, scene)
    wing.position = new Vector3(side * 0.14, 0, 0)
    wing.material = bodyMat
    wing.parent = pivot
    shadowGenerator.addShadowCaster(wing)
    return pivot
  }

  return { root, wingL: buildWing(-1), wingR: buildWing(1) }
}

// Bichos da lagoa (pedido do usuário: "lago com peixe e pato e tartaruga") — presos a uma área
// pequena, então a IA aqui é mais simples que a dos bichos de terra: cada um percorre um círculo
// no "plano" local da lagoa (aproximação razoável pra um raio pequeno, a curvatura do planeta é
// desprezível nessa escala), com raio/velocidade/fase próprios pra não nadarem em sincronia.
interface PondCritter {
  root: TransformNode
  angleOffset: number
  radius: number
  speed: number
  bobPhase: number
  depth: number
}

function buildPeixe(scene: Scene, colorSeed: number): Mesh {
  const mat = new PBRMaterial(`peixeMat${colorSeed}`, scene)
  mat.albedoColor = Color3.Lerp(new Color3(0.85, 0.45, 0.15), new Color3(0.9, 0.75, 0.2), colorSeed)
  mat.roughness = 0.3
  mat.metallic = 0.2
  const body = MeshBuilder.CreateSphere('peixeBody', { diameterX: 0.22, diameterY: 0.09, diameterZ: 0.11 }, scene)
  body.material = mat
  const tail = MeshBuilder.CreateCylinder('peixeTail', { height: 0.01, diameterTop: 0, diameterBottom: 0.13, tessellation: 3 }, scene)
  tail.rotation.z = Math.PI / 2
  tail.position.x = -0.14
  tail.material = mat
  tail.parent = body
  return body
}

function buildPato(scene: Scene, shadowGenerator: ShadowGenerator): TransformNode {
  const root = new TransformNode('patoRoot', scene)
  const bodyMat = new PBRMaterial('patoBodyMat', scene)
  bodyMat.albedoColor = new Color3(0.95, 0.95, 0.9)
  bodyMat.roughness = 0.7
  const beakMat = new PBRMaterial('patoBeakMat', scene)
  beakMat.albedoColor = new Color3(0.95, 0.6, 0.1)
  beakMat.roughness = 0.5

  const body = MeshBuilder.CreateSphere('patoBody', { diameterX: 0.3, diameterY: 0.2, diameterZ: 0.38 }, scene)
  body.material = bodyMat
  body.parent = root
  shadowGenerator.addShadowCaster(body)

  const head = MeshBuilder.CreateSphere('patoHead', { diameter: 0.15 }, scene)
  head.position = new Vector3(0, 0.16, 0.15)
  head.material = bodyMat
  head.parent = root

  const beak = MeshBuilder.CreateCylinder('patoBeak', { height: 0.1, diameterTop: 0.02, diameterBottom: 0.08 }, scene)
  beak.rotation.x = Math.PI / 2
  beak.position = new Vector3(0, 0.14, 0.24)
  beak.material = beakMat
  beak.parent = root

  return root
}

function buildTartaruga(scene: Scene, shadowGenerator: ShadowGenerator): TransformNode {
  const root = new TransformNode('tartarugaRoot', scene)
  const shellMat = new PBRMaterial('tartarugaShellMat', scene)
  shellMat.albedoColor = new Color3(0.28, 0.45, 0.2)
  shellMat.roughness = 0.75
  const skinMat = new PBRMaterial('tartarugaSkinMat', scene)
  skinMat.albedoColor = new Color3(0.42, 0.55, 0.32)
  skinMat.roughness = 0.7

  const shell = MeshBuilder.CreateSphere('tartarugaShell', { diameterX: 0.34, diameterY: 0.2, diameterZ: 0.28, slice: 0.55 }, scene)
  shell.material = shellMat
  shell.parent = root
  shell.position.y = 0.1
  shadowGenerator.addShadowCaster(shell)

  const head = MeshBuilder.CreateSphere('tartarugaHead', { diameter: 0.1 }, scene)
  head.material = skinMat
  head.parent = root
  head.position = new Vector3(0, 0.1, 0.17)

  return root
}

// Carrinho de brinquedo (lab-15, pedido do usuário: "ruas+carros") — só primitivas, mesmo
// espírito dos bichos/personagens do resto do jogo, sem asset externo. Anda pra frente e pra
// trás ao longo da rua (ver `streetCenter` mais abaixo), nunca sai do asfalto.
function buildCarro(scene: Scene, shadowGenerator: ShadowGenerator, bodyColor: Color3): TransformNode {
  const root = new TransformNode('carroRoot', scene)

  const bodyMat = new PBRMaterial('carroBodyMat', scene)
  bodyMat.albedoColor = bodyColor
  bodyMat.roughness = 0.4
  bodyMat.metallic = 0.3

  const wheelMat = new PBRMaterial('carroWheelMat', scene)
  wheelMat.albedoColor = new Color3(0.08, 0.08, 0.08)
  wheelMat.roughness = 0.85

  const glassMat = new PBRMaterial('carroGlassMat', scene)
  glassMat.albedoColor = new Color3(0.6, 0.75, 0.85)
  glassMat.alpha = 0.75
  glassMat.roughness = 0.1

  function add(mesh: Mesh, mat: PBRMaterial) {
    mesh.material = mat
    mesh.parent = root
    shadowGenerator.addShadowCaster(mesh)
    return mesh
  }

  const body = MeshBuilder.CreateBox('carroBody', { width: 0.5, height: 0.22, depth: 0.9 }, scene)
  body.position.y = 0.24
  add(body, bodyMat)

  const cabin = MeshBuilder.CreateBox('carroCabin', { width: 0.42, height: 0.2, depth: 0.5 }, scene)
  cabin.position = new Vector3(0, 0.44, -0.05)
  add(cabin, glassMat)

  for (const side of [-1, 1]) {
    for (const front of [-1, 1]) {
      const wheel = MeshBuilder.CreateCylinder(
        `carroWheel${side}${front}`,
        { height: 0.08, diameter: 0.22, tessellation: 12 },
        scene,
      )
      wheel.rotation.z = Math.PI / 2
      wheel.position = new Vector3(side * 0.27, 0.11, front * 0.32)
      add(wheel, wheelMat)
    }
  }

  return root
}

// Cacto do bioma de deserto (lab-23) — primitivas (sem asset externo, o Kenney Nature Kit já
// usado pros outros props não tem nada de deserto além de pedra), mesmo padrão de `buildCarro`.
// Corpo central + dois "braços" laterais, tronco entra levemente no chão pro colisor esférico
// (mesmo esquema já usado pros outros props) ter volume suficiente.
function buildCactus(scene: Scene, shadowGenerator: ShadowGenerator): TransformNode {
  const root = new TransformNode('cactusRoot', scene)

  const cactusMat = new PBRMaterial('cactusMat', scene)
  cactusMat.albedoColor = new Color3(0.22, 0.5, 0.32)
  cactusMat.roughness = 0.85

  function add(mesh: Mesh) {
    mesh.material = cactusMat
    mesh.parent = root
    shadowGenerator.addShadowCaster(mesh)
    return mesh
  }

  const trunk = MeshBuilder.CreateCylinder('cactusTrunk', { height: 1.1, diameter: 0.32, tessellation: 8 }, scene)
  trunk.position.y = 0.5
  add(trunk)

  for (const side of [-1, 1]) {
    const arm = MeshBuilder.CreateCylinder(`cactusArm${side}`, { height: 0.5, diameter: 0.2, tessellation: 8 }, scene)
    arm.position = new Vector3(side * 0.24, 0.75, 0)
    add(arm)
    const armUp = MeshBuilder.CreateCylinder(`cactusArmUp${side}`, { height: 0.35, diameter: 0.18, tessellation: 8 }, scene)
    armUp.position = new Vector3(side * 0.24, 1.05, 0)
    add(armUp)
  }

  return root
}

// Corpo do foguete (bocais dos motores + cauda afunilada + corpo + nariz + janela + barbatanas) —
// função compartilhada entre a plataforma fixa (`buildRocket`, com base/pilares) e o veículo que
// realmente voa/pousa (`buildRocketVehicle`, SEM base/pilares). Bug real reportado pelo usuário:
// "o foguete... tem que ter um formato mais de foguete... não um prato embaixo" — a nave voadora
// reaproveitava a MESMA malha inteira da plataforma fixa (disco + 4 pilares incluídos), que
// sobrava embaixo dela flutuando durante o voo e o pouso, lendo como "um prato". Separar as duas
// resolve isso; de quebra, a cauda ganhou um afunilamento ("boat-tail") e bocais de motor no
// lugar de um cilindro reto terminando de repente — pedido do usuário: "uma cauda mais
// aerodinâmica".
function addRocketBody(root: TransformNode, scene: Scene, shadowGenerator: ShadowGenerator) {
  const bodyMat = new PBRMaterial('rocketBodyMat', scene)
  bodyMat.albedoColor = new Color3(0.88, 0.88, 0.92)
  bodyMat.roughness = 0.35
  bodyMat.metallic = 0.35

  const finMat = new PBRMaterial('rocketFinMat', scene)
  finMat.albedoColor = new Color3(0.82, 0.22, 0.22)
  finMat.roughness = 0.6

  const windowMat = new PBRMaterial('rocketWindowMat', scene)
  windowMat.albedoColor = new Color3(0.25, 0.6, 0.85)
  windowMat.emissiveColor = new Color3(0.08, 0.18, 0.28)
  windowMat.roughness = 0.2

  const nozzleMat = new PBRMaterial('rocketNozzleMat', scene)
  nozzleMat.albedoColor = new Color3(0.16, 0.16, 0.19)
  nozzleMat.roughness = 0.45
  nozzleMat.metallic = 0.65

  function add(mesh: Mesh, mat: PBRMaterial) {
    mesh.material = mat
    mesh.parent = root
    shadowGenerator.addShadowCaster(mesh)
    return mesh
  }

  // Bocais dos motores — flangeados (mais largos na ponta que na base), de onde sai o fogo do
  // escapamento durante o voo (pedido do usuário: "tem que sair fogo dos motores" — ver
  // `rocketFlameSystem`/`flameAnchor` em `setup()`, ancorado bem embaixo deles).
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2
    const nozzle = MeshBuilder.CreateCylinder(
      `rocketNozzle${i}`,
      { diameterTop: 0.22, diameterBottom: 0.38, height: 0.3, tessellation: 10 },
      scene,
    )
    nozzle.position = new Vector3(Math.cos(angle) * 0.3, 0.15, Math.sin(angle) * 0.3)
    add(nozzle, nozzleMat)
  }

  // Cauda afunilada ("boat-tail") — mais estreita na base que no corpo, silhueta aerodinâmica de
  // verdade em vez de um cilindro reto terminando de repente numa plataforma.
  const tail = MeshBuilder.CreateCylinder(
    'rocketTail',
    { diameterTop: 0.85, diameterBottom: 0.5, height: 0.55, tessellation: 16 },
    scene,
  )
  tail.position.y = 0.575
  add(tail, bodyMat)

  // Corpo + nariz cônico + janela.
  const body = MeshBuilder.CreateCylinder('rocketBody', { diameter: 0.85, height: 1.85, tessellation: 16 }, scene)
  body.position.y = 1.775
  add(body, bodyMat)
  const nose = MeshBuilder.CreateCylinder('rocketNose', { diameterTop: 0, diameterBottom: 0.85, height: 1.0, tessellation: 16 }, scene)
  nose.position.y = 3.2
  add(nose, bodyMat)
  const windowMesh = MeshBuilder.CreateSphere('rocketWindow', { diameter: 0.4 }, scene)
  windowMesh.position = new Vector3(0, 2.1, 0.4)
  windowMesh.scaling.z = 0.4
  add(windowMesh, windowMat)

  // Barbatanas — 3, em tripé, encostadas na cauda afunilada com um leve ângulo pra trás (mais
  // "aerodinâmico" que retas na vertical).
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2
    const fin = MeshBuilder.CreateCylinder(`rocketFin${i}`, { diameterTop: 0, diameterBottom: 0.06, height: 1.0, tessellation: 3 }, scene)
    fin.scaling = new Vector3(1.3, 1, 0.12)
    fin.rotation.x = Math.PI / 2 + 0.3
    fin.rotation.y = angle
    fin.position = new Vector3(Math.cos(angle) * 0.48, 0.5, Math.sin(angle) * 0.48)
    add(fin, finMat)
  }
}

// Foguete + plataforma de lançamento (lab-58, pedido do usuário: "crie um foguete e uma estação
// de decolagem espacial... como se fosse um prédio") — só primitivas, sem asset externo, mesmo
// padrão do resto do jogo (carro, cacto, bichos). Reaproveitado duas vezes: uma vez no planeta
// principal (ponto de partida) e uma vez no planetinha secundário (ponto de volta) — mesma malha,
// lugares diferentes. Só pra exibição PARADA — o veículo que voa/pousa é `buildRocketVehicle`.
function buildRocket(scene: Scene, shadowGenerator: ShadowGenerator): TransformNode {
  const root = new TransformNode('rocketRoot', scene)

  const padMat = new PBRMaterial('rocketPadMat', scene)
  padMat.albedoColor = new Color3(0.32, 0.34, 0.4)
  padMat.roughness = 0.75
  padMat.metallic = 0.15

  function add(mesh: Mesh, mat: PBRMaterial) {
    mesh.material = mat
    mesh.parent = root
    shadowGenerator.addShadowCaster(mesh)
    return mesh
  }

  // Plataforma — "como se fosse um prédio" (pedido do usuário): base ampla + 4 pilares curtos,
  // pra ler como uma pequena estrutura construída, não só o chão pintado diferente.
  const pad = MeshBuilder.CreateCylinder('rocketPad', { diameter: 3.2, height: 0.22, tessellation: 20 }, scene)
  pad.position.y = 0.11
  add(pad, padMat)
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4
    const pillar = MeshBuilder.CreateCylinder(`rocketPillar${i}`, { diameter: 0.22, height: 0.5, tessellation: 8 }, scene)
    pillar.position = new Vector3(Math.cos(angle) * 1.3, -0.14, Math.sin(angle) * 1.3)
    add(pillar, padMat)
  }

  addRocketBody(root, scene, shadowGenerator)
  return root
}

// Veículo que realmente voa e pousa (lab-59) — mesmo corpo de `buildRocket`, mas SEM a
// base/pilares da plataforma fixa (ver comentário em `addRocketBody`: essa era a causa do "prato
// embaixo" reportado pelo usuário — a nave voadora reaproveitava a plataforma inteira).
function buildRocketVehicle(scene: Scene, shadowGenerator: ShadowGenerator): TransformNode {
  const root = new TransformNode('rocketVehicleRoot', scene)
  addRocketBody(root, scene, shadowGenerator)
  return root
}

// Entrada de caverna em Marte (lab-59, pedido do usuário: "o outro planeta é Marte... o que tem
// lá são cavernas") — dois montes de rocha (silhueta irregular, não uma bola perfeita) com uma
// "boca" escura encostada na face de um deles. Sem `shadowGenerator`/shadow caster de propósito,
// igual ao resto da decoração de Marte (ver comentário em `buildSecondPlanetIfNeeded`) — só
// primitivas, sem asset externo, mesmo padrão do resto do jogo.
function buildCaveEntrance(scene: Scene): TransformNode {
  const root = new TransformNode('caveRoot', scene)

  const rockMat = new PBRMaterial('caveRockMat', scene)
  rockMat.albedoColor = new Color3(0.4, 0.26, 0.18)
  rockMat.roughness = 0.95

  const mound = MeshBuilder.CreateSphere('caveMound', { diameter: 2.4, slice: 0.62, segments: 10 }, scene)
  mound.scaling = new Vector3(1.3, 0.85, 1.1)
  mound.material = rockMat
  mound.parent = root

  const mound2 = MeshBuilder.CreateSphere('caveMound2', { diameter: 1.3, slice: 0.6, segments: 8 }, scene)
  mound2.position = new Vector3(0.85, -0.15, 0.25)
  mound2.material = rockMat
  mound2.parent = root

  const mouthMat = new PBRMaterial('caveMouthMat', scene)
  mouthMat.albedoColor = new Color3(0.02, 0.015, 0.015)
  mouthMat.roughness = 1
  const mouth = MeshBuilder.CreateCylinder(
    'caveMouth',
    { diameterTop: 0.45, diameterBottom: 0.85, height: 0.3, tessellation: 12 },
    scene,
  )
  mouth.rotation.x = Math.PI / 2
  mouth.position = new Vector3(-0.15, 0.1, 1.0)
  mouth.material = mouthMat
  mouth.parent = root

  return root
}

// Morro de Marte (lab-65, pedido do usuário: "ele deve ter alguns rochedos pequenos, morros...")
// — mesma técnica da entrada de caverna (dome via `CreateSphere` com `slice`, não uma bola
// inteira), só maior e sem a "boca": um monte principal + um secundário menor pra silhueta menos
// perfeitamente circular.
function buildMarsHill(scene: Scene): TransformNode {
  const root = new TransformNode('marsHillRoot', scene)

  const hillMat = new PBRMaterial('marsHillMat', scene)
  hillMat.albedoColor = new Color3(0.46, 0.28, 0.19)
  hillMat.roughness = 0.96

  const main = MeshBuilder.CreateSphere('marsHillMain', { diameter: 3.4, slice: 0.55, segments: 12 }, scene)
  main.scaling = new Vector3(1.15, 0.8, 1.05)
  main.material = hillMat
  main.parent = root

  const shoulder = MeshBuilder.CreateSphere('marsHillShoulder', { diameter: 1.8, slice: 0.6, segments: 10 }, scene)
  shoulder.position = new Vector3(1.1, -0.35, 0.6)
  shoulder.scaling = new Vector3(1, 0.85, 1)
  shoulder.material = hillMat
  shoulder.parent = root

  return root
}

const UFO_RADIUS = 3.2
const UFO_WALL_HEIGHT = 1.7
const UFO_SEGMENTS = 14
// Segmentos consecutivos pulados no anel de paredes = a porta (largura ≈ 2 segmentos ≈ 2.9m, bem
// folgada — evita qualquer aperto de câmera/personagem entrando).
const UFO_DOOR_SEGMENTS = 2

// Estação alienígena / disco voador (lab-65, pedido do usuário: "uma estação extraterrestre
// avançada e moderna parecendo um disco voador em que é possível entrar e ver um painel de nave
// espacial"). Estrutura: anel de segmentos de parede (um trecho pulado = porta, mesma técnica de
// "malha em volta de um círculo" já usada nos degraus da escada em espiral do Prédio dos
// Enigmas) + casco/domo achatado por cima (visual, sem colisão — a parede já barra a passagem) +
// bolha de cockpit translúcida no topo + anel luminoso de acabamento. Dentro, um console/painel
// decorativo (base + tela emissiva + botões coloridos).
// `parent`/`anchorUp` já resolvidos ANTES de construir as paredes — física estática (`PhysicsAggregate`
// nas paredes abaixo) lê a transformação de mundo no momento em que é criada; construir os filhos
// primeiro e só posicionar/parentar `root` depois (como um `TransformNode` solto, na origem da
// cena) grudaria os colisores das paredes lá na origem, não em Marte. Mesmo motivo pelo qual o
// Prédio dos Enigmas posiciona `quizTowerBase` antes de montar qualquer parede/piso.
function buildUfoStation(
  scene: Scene,
  shadowGenerator: ShadowGenerator,
  parent: TransformNode,
  anchorUp: Vector3,
  radius: number,
): TransformNode {
  const root = new TransformNode('ufoRoot', scene)
  root.parent = parent
  root.position = anchorUp.scale(radius)
  root.rotationQuaternion = alignmentQuaternion(anchorUp)

  const hullMat = new PBRMaterial('ufoHullMat', scene)
  hullMat.albedoColor = new Color3(0.78, 0.8, 0.85)
  hullMat.metallic = 0.85
  hullMat.roughness = 0.25

  const trimMat = new PBRMaterial('ufoTrimMat', scene)
  trimMat.albedoColor = new Color3(0.1, 0.9, 0.85)
  trimMat.emissiveColor = new Color3(0.1, 0.8, 0.75)
  trimMat.roughness = 0.4

  const glassMat = new PBRMaterial('ufoGlassMat', scene)
  glassMat.albedoColor = new Color3(0.5, 0.85, 0.9)
  glassMat.emissiveColor = new Color3(0.15, 0.3, 0.35)
  glassMat.alpha = 0.55
  glassMat.roughness = 0.1

  // Anel de paredes — caixas tangentes a um círculo, uma delas (a "porta") pulada.
  const segAngle = (Math.PI * 2) / UFO_SEGMENTS
  const segWidth = 2 * UFO_RADIUS * Math.sin(segAngle / 2) * 1.05 // levemente maior, sem frestas
  for (let i = 0; i < UFO_SEGMENTS; i++) {
    if (i < UFO_DOOR_SEGMENTS) continue
    const angle = i * segAngle
    const wall = MeshBuilder.CreateBox(
      `ufoWall-${i}`,
      { width: segWidth, height: UFO_WALL_HEIGHT, depth: 0.18 },
      scene,
    )
    wall.position = new Vector3(Math.sin(angle) * UFO_RADIUS, UFO_WALL_HEIGHT / 2, Math.cos(angle) * UFO_RADIUS)
    wall.rotation.y = angle
    wall.material = hullMat
    wall.parent = root
    wall.receiveShadows = true
    shadowGenerator.addShadowCaster(wall)
    new PhysicsAggregate(wall, PhysicsShapeType.BOX, { mass: 0, friction: 0.7 }, scene)
  }

  // Anel luminoso no topo da parede — acabamento "avançado" clássico de disco voador.
  const trimRing = MeshBuilder.CreateTorus('ufoTrimRing', { diameter: UFO_RADIUS * 2, thickness: 0.08, tessellation: 24 }, scene)
  trimRing.position.y = UFO_WALL_HEIGHT
  trimRing.material = trimMat
  trimRing.parent = root

  // Piso interno decorativo — sem colisor próprio, a esfera de Marte já sustenta o jogador aqui;
  // só marca visualmente "você está dentro" com um material diferente do solo externo.
  const floorMat = new PBRMaterial('ufoFloorMat', scene)
  floorMat.albedoColor = new Color3(0.25, 0.27, 0.32)
  floorMat.metallic = 0.3
  floorMat.roughness = 0.5
  const floor = MeshBuilder.CreateCylinder(
    'ufoFloor',
    { diameter: UFO_RADIUS * 2 - 0.2, height: 0.05, tessellation: UFO_SEGMENTS },
    scene,
  )
  floor.position.y = 0.03
  floor.material = floorMat
  floor.parent = root
  floor.receiveShadows = true

  // Casco (domo achatado, look de "disco") + bolha de cockpit translúcida no topo — só visual,
  // a parede abaixo já é o único obstáculo de verdade.
  const hull = MeshBuilder.CreateSphere('ufoHull', { diameter: UFO_RADIUS * 2.3, slice: 0.32, segments: 16 }, scene)
  hull.scaling.y = 0.6
  hull.position.y = UFO_WALL_HEIGHT
  hull.material = hullMat
  hull.parent = root
  hull.receiveShadows = true
  shadowGenerator.addShadowCaster(hull)

  const dome = MeshBuilder.CreateSphere('ufoDome', { diameter: UFO_RADIUS * 0.9, slice: 0.55, segments: 14 }, scene)
  dome.position.y = UFO_WALL_HEIGHT + 0.5
  dome.material = glassMat
  dome.parent = root

  // Console/painel de nave espacial (lab-65) — base angulada tipo dashboard, tela emissiva e
  // botõezinhos coloridos, só decoração (sem interação nova, pedido do usuário foi só "ver").
  const panelMat = new PBRMaterial('ufoPanelMat', scene)
  panelMat.albedoColor = new Color3(0.15, 0.16, 0.2)
  panelMat.metallic = 0.4
  panelMat.roughness = 0.4
  const panelZ = -UFO_RADIUS * 0.55
  const panelBase = MeshBuilder.CreateBox('ufoPanelBase', { width: 1.6, height: 0.9, depth: 0.5 }, scene)
  panelBase.position = new Vector3(0, 0.45, panelZ)
  panelBase.rotation.x = -0.3
  panelBase.material = panelMat
  panelBase.parent = root
  panelBase.receiveShadows = true
  shadowGenerator.addShadowCaster(panelBase)

  const screenMat = new PBRMaterial('ufoScreenMat', scene)
  screenMat.albedoColor = new Color3(0.05, 0.4, 0.5)
  screenMat.emissiveColor = new Color3(0.1, 0.65, 0.8)
  screenMat.roughness = 0.3
  const screen = MeshBuilder.CreateBox('ufoScreen', { width: 1.3, height: 0.5, depth: 0.05 }, scene)
  screen.position = new Vector3(0, 0.85, panelZ + 0.15)
  screen.rotation.x = -0.3
  screen.material = screenMat
  screen.parent = root

  const buttonColors = [new Color3(0.9, 0.2, 0.2), new Color3(0.2, 0.8, 0.3), new Color3(0.9, 0.8, 0.1), new Color3(0.3, 0.5, 0.9)]
  for (let i = 0; i < buttonColors.length; i++) {
    const btnMat = new PBRMaterial(`ufoButtonMat-${i}`, scene)
    btnMat.albedoColor = buttonColors[i]
    btnMat.emissiveColor = buttonColors[i].scale(0.5)
    const btn = MeshBuilder.CreateSphere(`ufoButton-${i}`, { diameter: 0.12 }, scene)
    btn.position = new Vector3(-0.5 + i * 0.34, 0.5, panelZ + 0.22)
    btn.rotation.x = -0.3
    btn.material = btnMat
    btn.parent = root
  }

  return root
}

// ET marciano (lab-60, pedido do usuário: "no planeta marciano tem que ter ETs e robôs que tenta
// matar o nosso boneco") — cabeça grande ovalada + olhos amendoados escuros + corpo/membros
// finos, só primitivas, mesmo padrão do resto do jogo (cacto, foguete, bichos).
function buildAlien(scene: Scene, shadowGenerator: ShadowGenerator): TransformNode {
  const root = new TransformNode('alienRoot', scene)

  const skinMat = new PBRMaterial('alienSkinMat', scene)
  skinMat.albedoColor = new Color3(0.55, 0.85, 0.45)
  skinMat.roughness = 0.55

  const eyeMat = new PBRMaterial('alienEyeMat', scene)
  eyeMat.albedoColor = new Color3(0.02, 0.02, 0.02)
  eyeMat.emissiveColor = new Color3(0.04, 0.14, 0.05)

  function add(mesh: Mesh, mat: PBRMaterial) {
    mesh.material = mat
    mesh.parent = root
    shadowGenerator.addShadowCaster(mesh)
    return mesh
  }

  const head = MeshBuilder.CreateSphere(
    'alienHead',
    { diameterX: 0.5, diameterY: 0.42, diameterZ: 0.46, segments: 10 },
    scene,
  )
  head.position.y = 0.85
  add(head, skinMat)

  for (const side of [-1, 1]) {
    const eye = MeshBuilder.CreateSphere(
      `alienEye${side}`,
      { diameterX: 0.15, diameterY: 0.08, diameterZ: 0.08, segments: 6 },
      scene,
    )
    eye.position = new Vector3(side * 0.14, 0.87, 0.36)
    eye.rotation.y = side * -0.3
    add(eye, eyeMat)
  }

  const body = MeshBuilder.CreateCylinder(
    'alienBody',
    { diameterTop: 0.28, diameterBottom: 0.2, height: 0.55, tessellation: 10 },
    scene,
  )
  body.position.y = 0.42
  add(body, skinMat)

  for (const side of [-1, 1]) {
    const arm = MeshBuilder.CreateCylinder(`alienArm${side}`, { diameter: 0.07, height: 0.45, tessellation: 6 }, scene)
    arm.position = new Vector3(side * 0.19, 0.5, 0)
    arm.rotation.z = side * 0.5
    add(arm, skinMat)
    const leg = MeshBuilder.CreateCylinder(`alienLeg${side}`, { diameter: 0.08, height: 0.3, tessellation: 6 }, scene)
    leg.position = new Vector3(side * 0.09, 0.15, 0)
    add(leg, skinMat)
  }

  return root
}

// Robô marciano (lab-60) — corpo/cabeça em caixa metálica, olho vermelho emissivo, antena, braços
// e pernas retangulares. Mesmo padrão de primitivas do ET acima.
function buildRobo(scene: Scene, shadowGenerator: ShadowGenerator): TransformNode {
  const root = new TransformNode('roboRoot', scene)

  const metalMat = new PBRMaterial('roboMetalMat', scene)
  metalMat.albedoColor = new Color3(0.55, 0.58, 0.62)
  metalMat.roughness = 0.4
  metalMat.metallic = 0.7

  const eyeMat = new PBRMaterial('roboEyeMat', scene)
  eyeMat.albedoColor = new Color3(0.5, 0.05, 0.05)
  eyeMat.emissiveColor = new Color3(0.9, 0.1, 0.1)

  function add(mesh: Mesh, mat: PBRMaterial) {
    mesh.material = mat
    mesh.parent = root
    shadowGenerator.addShadowCaster(mesh)
    return mesh
  }

  const body = MeshBuilder.CreateBox('roboBody', { width: 0.42, height: 0.55, depth: 0.28 }, scene)
  body.position.y = 0.55
  add(body, metalMat)

  const head = MeshBuilder.CreateBox('roboHead', { width: 0.26, height: 0.22, depth: 0.24 }, scene)
  head.position.y = 0.94
  add(head, metalMat)

  const eye = MeshBuilder.CreateSphere('roboEye', { diameter: 0.08 }, scene)
  eye.position = new Vector3(0, 0.95, 0.14)
  add(eye, eyeMat)

  const antenna = MeshBuilder.CreateCylinder('roboAntenna', { diameter: 0.03, height: 0.2, tessellation: 6 }, scene)
  antenna.position.y = 1.15
  add(antenna, metalMat)

  for (const side of [-1, 1]) {
    const arm = MeshBuilder.CreateBox(`roboArm${side}`, { width: 0.1, height: 0.4, depth: 0.1 }, scene)
    arm.position = new Vector3(side * 0.28, 0.5, 0)
    add(arm, metalMat)
    const leg = MeshBuilder.CreateBox(`roboLeg${side}`, { width: 0.12, height: 0.3, depth: 0.12 }, scene)
    leg.position = new Vector3(side * 0.12, 0.15, 0)
    add(leg, metalMat)
  }

  return root
}

// Espada e arma a laser (lab-61, pedido do usuário: "crie uma espada que deve ser pega na terra
// para usar no planeta pra nocautear o ET e uma arma para usar no robô") — pegáveis no planeta
// principal, só primitivas, mesmo padrão do resto do jogo. Sem elas, o jogador não tem como se
// defender em Marte (motivo do próprio pedido: "ao pousar em Marte já morri, não tem como dar
// golpe").
function buildSword(scene: Scene, shadowGenerator: ShadowGenerator): TransformNode {
  const root = new TransformNode('swordRoot', scene)

  const bladeMat = new PBRMaterial('swordBladeMat', scene)
  bladeMat.albedoColor = new Color3(0.82, 0.84, 0.88)
  bladeMat.roughness = 0.25
  bladeMat.metallic = 0.85

  const hiltMat = new PBRMaterial('swordHiltMat', scene)
  hiltMat.albedoColor = new Color3(0.62, 0.46, 0.16)
  hiltMat.roughness = 0.5
  hiltMat.metallic = 0.6

  function add(mesh: Mesh, mat: PBRMaterial) {
    mesh.material = mat
    mesh.parent = root
    shadowGenerator.addShadowCaster(mesh)
    return mesh
  }

  // Lâmina — cilindro de 4 lados (tessellation baixa dá um perfil losangular, mais "lâmina" que
  // um cilindro redondo) afunilando até a ponta.
  const blade = MeshBuilder.CreateCylinder(
    'swordBlade',
    { diameterTop: 0, diameterBottom: 0.1, height: 0.85, tessellation: 4 },
    scene,
  )
  blade.position.y = 0.78
  add(blade, bladeMat)

  const guard = MeshBuilder.CreateBox('swordGuard', { width: 0.32, height: 0.05, depth: 0.08 }, scene)
  guard.position.y = 0.34
  add(guard, hiltMat)

  const hilt = MeshBuilder.CreateCylinder('swordHilt', { diameter: 0.07, height: 0.28, tessellation: 8 }, scene)
  hilt.position.y = 0.2
  add(hilt, hiltMat)

  const pommel = MeshBuilder.CreateSphere('swordPommel', { diameter: 0.1 }, scene)
  pommel.position.y = 0.05
  add(pommel, hiltMat)

  return root
}

function buildLaserGun(scene: Scene, shadowGenerator: ShadowGenerator): TransformNode {
  const root = new TransformNode('gunRoot', scene)

  const metalMat = new PBRMaterial('gunMetalMat', scene)
  metalMat.albedoColor = new Color3(0.28, 0.3, 0.34)
  metalMat.roughness = 0.4
  metalMat.metallic = 0.7

  const glowMat = new PBRMaterial('gunGlowMat', scene)
  glowMat.albedoColor = new Color3(0.2, 0.8, 0.9)
  glowMat.emissiveColor = new Color3(0.2, 0.8, 0.9)

  function add(mesh: Mesh, mat: PBRMaterial) {
    mesh.material = mat
    mesh.parent = root
    shadowGenerator.addShadowCaster(mesh)
    return mesh
  }

  const body = MeshBuilder.CreateBox('gunBody', { width: 0.14, height: 0.16, depth: 0.4 }, scene)
  body.position.y = 0.32
  add(body, metalMat)

  const barrel = MeshBuilder.CreateCylinder('gunBarrel', { diameter: 0.07, height: 0.35, tessellation: 10 }, scene)
  barrel.rotation.x = Math.PI / 2
  barrel.position = new Vector3(0, 0.32, 0.36)
  add(barrel, metalMat)

  const tip = MeshBuilder.CreateSphere('gunTip', { diameter: 0.08 }, scene)
  tip.position = new Vector3(0, 0.32, 0.54)
  add(tip, glowMat)

  const grip = MeshBuilder.CreateBox('gunGrip', { width: 0.1, height: 0.28, depth: 0.12 }, scene)
  grip.rotation.x = -0.35
  grip.position = new Vector3(0, 0.15, 0.1)
  add(grip, metalMat)

  return root
}

export function World3D({
  profile,
  progress,
  onSelectQuest,
  onSelectSurpriseQuiz,
  onOpenHelp,
  onOpenQuestList,
  onOpenShop,
  onCollectCoin,
  suspendTriggers,
}: World3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const joystickRef = useRef({ x: 0, y: 0 })
  // Botões de toque (pedido do usuário: "o android não tem teclado" — sem eles, pular/correr só
  // funcionava via teclado, inacessível em celular/tablet). Mesmo padrão do `joystickRef`: a UI
  // React escreve, o loop de física por quadro (dentro de `setup()`) lê. `touchJumpRef` é
  // consumido uma vez só (pulo é um evento, não um estado contínuo — mesmo padrão de
  // `jumpRequested` já usado pra tecla espaço); `touchRunRef` fica `true` enquanto o dedo
  // segura o botão, igual ao Shift.
  const touchJumpRef = useRef(false)
  const touchRunRef = useRef(false)
  // Controle de câmera por toque (lab-55, pedido do usuário: "pra tablet a mudança de posição da
  // câmera pode ser... por touch screen" — sem mouse, não dava pra orbitar a câmera olhando ao
  // redor). Mesmo padrão de `touchRunRef` (contínuo enquanto segura); o ângulo em si
  // (`cameraYawOffsetRef`) é lido/escrito só dentro do loop de física, nunca pelo React — não
  // precisa de `useState` (não afeta render de nenhum componente).
  const cameraRotateLeftRef = useRef(false)
  const cameraRotateRightRef = useRef(false)
  const cameraYawOffsetRef = useRef(0)
  const profileRef = useRef(profile)
  const progressRef = useRef(progress)
  const suspendRef = useRef(suspendTriggers)
  const onSelectQuestRef = useRef(onSelectQuest)
  const onSelectSurpriseQuizRef = useRef(onSelectSurpriseQuiz)
  const onCollectCoinRef = useRef(onCollectCoin)
  const onOpenShopRef = useRef(onOpenShop)
  const sceneRef = useRef<Scene | null>(null)
  const debugRef = useRef<HTMLDivElement>(null)
  const [muted, setMuted] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [mpConnected, setMpConnected] = useState(false)
  const [rankingOpen, setRankingOpen] = useState(false)
  const [rankingEntries, setRankingEntries] = useState<RankingEntry[]>([])
  // Vida em Marte (lab-60) — `marsHealthRef` é a fonte de verdade (lida/escrita direto pelo laço
  // de física, sem esperar re-render); `marsHealthDisplay` só espelha esse valor pra desenhar a
  // barra. `onMarsCombatZone` controla se a barra aparece (só faz sentido em Marte, ver
  // `landRocket`/`respawnFromMarsDeath`). `marsDeathMessage` é o aviso transitório mostrado ao
  // "nocautear" (limpo sozinho depois de alguns segundos).
  const marsHealthRef = useRef(MARS_MAX_HEALTH)
  const [marsHealthDisplay, setMarsHealthDisplay] = useState(MARS_MAX_HEALTH)
  const [onMarsCombatZone, setOnMarsCombatZone] = useState(false)
  const [marsDeathMessage, setMarsDeathMessage] = useState<string | null>(null)
  // Contagem de marcianos vivos (lab-65, pedido do usuário: "ao chegar em Marte teve ter uma
  // informação de quantos marcianos tem no planeta") — espelha `marsEnemies.filter(alive).length`
  // (calculado no laço de física, que já percorre esse array todo quadro pra IA) só quando o
  // valor muda, evitando re-render a cada quadro por um número que só muda ao nocautear alguém.
  const [marsEnemyCount, setMarsEnemyCount] = useState(0)
  // Alerta de perigo (lab-65, pedido do usuário: "estar dentro de um raio de distância deles um
  // alerta de perigo ser emitido, com algum efeito em vermelho na tela") — manipulado direto no
  // DOM pelo laço de física (mesmo padrão de `debugRef`), não por `useState`: a intensidade
  // precisa variar suavemente quadro a quadro com a distância do inimigo mais próximo, e recriar
  // esse valor via React 60x/s geraria re-render sem necessidade nenhuma.
  const dangerOverlayRef = useRef<HTMLDivElement>(null)
  // Espada/arma (lab-61) — mesmo padrão do `marsHealthRef`: fonte de verdade em ref (lida direto
  // pelo laço de física/`handleInteractPress`, sem esperar re-render), `weaponMessage` só pro
  // aviso transitório de "achou o item"/"embarcando sem os dois".
  const hasSwordRef = useRef(false)
  const hasGunRef = useRef(false)
  const [weaponMessage, setWeaponMessage] = useState<string | null>(null)
  // Mochila (lab-63, pedido do usuário: "se eu peguei ambas o boneco deve ter uma bolsa virtual
  // em que voce ve o item e pode selecionar navegando no painel e clicando") — `hasSword`/`hasGun`
  // espelham os refs acima só pra decidir o que desenhar no painel (o combate continua lendo os
  // refs direto, sem esperar re-render). Selecionar um item no painel é só informativo — a regra
  // de combate (espada nocauteia ET, arma nocauteia robô) é automática por tipo de inimigo desde
  // o lab-61 e não muda por causa da seleção.
  const [hasSword, setHasSword] = useState(false)
  const [hasGun, setHasGun] = useState(false)
  const [bagOpen, setBagOpen] = useState(false)
  const [selectedWeapon, setSelectedWeapon] = useState<'sword' | 'gun' | null>(null)
  const chatOpenRef = useRef(false)
  chatOpenRef.current = chatOpen

  profileRef.current = profile
  progressRef.current = progress
  suspendRef.current = suspendTriggers
  onSelectQuestRef.current = onSelectQuest
  onSelectSurpriseQuizRef.current = onSelectSurpriseQuiz
  onCollectCoinRef.current = onCollectCoin
  onOpenShopRef.current = onOpenShop

  useEffect(() => {
    ;(sceneRef.current as any)?.__refreshPortals?.()
  }, [progress])

  useEffect(() => {
    ;(sceneRef.current as any)?.__setAvatarShirtColor?.(profile.avatarEmoji)
  }, [profile.avatarEmoji])

  useEffect(() => {
    ;(sceneRef.current as any)?.__setPlayerHat?.(profile.equippedHatId)
  }, [profile.equippedHatId])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let disposed = false

    // Redmi Pad 2 e tablets/celulares similares têm GPU muito mais fraca que desktop — sem essa
    // detecção o jogo roda em resolução nativa com MSAA+FXAA+SSAO+sombras em ~1900 meshes, o que
    // não é jogável em GPU mobile de entrada. Em vez de tentar medir a GPU (APIs pouco confiáveis
    // e inconsistentes entre navegadores), usa o mesmo sinal que já decide mostrar os controles de
    // toque: é um aparelho móvel/tablet.
    const isLowEndDevice = /Android|iPad|iPhone|iPod|Tablet|Mobi/i.test(navigator.userAgent)
    // Legendas flutuantes (Babylon.GUI, número da escolinha/dica de interação/etc.) — o lab-57 já
    // corrigiu o bug de RESOLUÇÃO da textura de GUI (borrada, upscaled), mas o TAMANHO da fonte em
    // si continuava fixo em pixels reais de dispositivo — grande demais numa tela física pequena
    // mesmo renderizado nítido.
    //
    // Reduzir baseado em `isLowEndDevice` (GPU fraca) em vez do tamanho físico da tela era o bug
    // errado pra resolver aqui (lab-67, relatado ao vivo pelo usuário testando no Redmi Pad 2:
    // "os texto de legendas dos objetos ficaram muito pequeno quase não dá pra ler" assim que o
    // user-agent parou de ser mascarado pelo modo "Site para computador" do Chrome e o jogo
    // passou a reconhecer o tablet como aparelho fraco de verdade). GPU fraca e tela física
    // pequena são dois problemas DIFERENTES que só coincidem em celular — um tablet grande (ex.:
    // Redmi Pad 2, ~11") tem a MESMA GPU fraca de um celular, mas a tela é grande o bastante pra
    // não precisar de fonte reduzida nenhuma.
    //
    // lab-68 (usuário testou de novo e relatou "as legendas... ficou com tamanho muito pequenos
    // pros dispositivos pequenos ajustar"): a primeira versão usava `window.innerWidth/innerHeight`
    // pra decidir — mas esses valores são pixels CSS, afetados por escala de DPI/orientação/zoom
    // de um jeito que não dá pra prever sem o aparelho real na mão (um tablet em pé pode reportar
    // uma largura CSS "de celular" dependendo da densidade de pixels configurada). Trocado pelo
    // sinal padrão que o próprio Android já usa pra diferenciar celular de tablet: o token
    // "Mobile" no user-agent (tablets Android normalmente NÃO o incluem; celulares Android
    // sempre incluem). Cuidado real ao testar essa troca: "Mobile" sozinho NÃO basta pra iOS — o
    // Safari inclui "Mobile/15E148" (número de build do WebKit, não um sinal de "é celular") em
    // QUALQUER aparelho iOS, iPad incluso, então checar só `/Mobile/` classificaria iPad como tela
    // pequena por engano. Por isso o "Mobile" só conta quando combinado com "Android"; iPhone/iPod
    // são sempre tela pequena por nome mesmo (iPad nunca cai nesse primeiro teste).
    // lab-70 — a teoria original (celular = tela física pequena = precisa de fonte MENOR) não se
    // confirmou na prática: testando ao vivo no Poco C75 depois do lab-69, o usuário reportou "não
    // dá pra ver as legendas dos personagens" mesmo já sem a redução do lab-67/68, e pediu
    // direto: "aumentar a escala das legendas também ajuda". Duas voltas tentando ENCOLHER a
    // fonte pra celular (labs 67, 68) sem sucesso — a fonte da engine (Babylon.GUI, já renderizada
    // em resolução cheia de dispositivo desde o lab-57, independente de `hardwareScalingLevel`)
    // aparentemente já não é grande o bastante pra esse tamanho de tela/distância de uso, então
    // agora AUMENTA em vez de reduzir. `isSmallScreen` continua o mesmo sinal (user-agent, ver
    // comentário acima), só o efeito em `mobileFontSize` inverteu de direção.
    const isSmallScreen =
      /iPhone|iPod/i.test(navigator.userAgent) || (/Android/i.test(navigator.userAgent) && /Mobile/i.test(navigator.userAgent))
    // lab-72 — 1.2x (lab-70) não bastou: usuário mandou um screenshot real do Poco C75 mostrando
    // nomes/legendas dos personagens ainda ilegíveis, com FPS já bom (25) e sobra pra gastar mais
    // com texto maior. Subiu pra 1.6x.
    function mobileFontSize(px: number): number {
      return isSmallScreen ? Math.round(px * 1.6) : px
    }

    const engine = new Engine(canvas, !isLowEndDevice, { preserveDrawingBuffer: true, stencil: true })
    // Valor inicial moderado — nem o melhor nem o pior caso — só até a medição real de FPS (ver
    // `autoTuneResolution` mais abaixo, fora de `setup()`) ajustar pro valor certo pra ESTE
    // aparelho especificamente. Chutar um número fixo (1.5, depois 1.75, depois 1.5 de novo) sem
    // conseguir testar no aparelho real vinha errando pra mais ou pra menos dependendo do
    // dispositivo (lab-56 pesado demais borrado num Poco C75, lab-53 nem sempre leve o bastante
    // num Redmi Pad 2) — medir de verdade resolve os dois lados do mesmo problema de uma vez.
    // 1.3 → 1.15 (lab-59, usuário reportou de novo "a qualidade do 3D está muito baixa" no Poco
    // C75, mesmo com a medição de FPS já ligada desde o lab-58) — o teto do ajuste automático
    // logo abaixo também baixou; começar mais perto de nítido custa pouco (só ~6s até a primeira
    // medição real ajustar pro valor certo desse aparelho).
    if (isLowEndDevice) engine.setHardwareScalingLevel(1.15)
    const scene = new Scene(engine)
    sceneRef.current = scene
    if (import.meta.env.DEV) {
      ;(window as any).__scene = scene
      ;(window as any).__engine = engine
    }
    scene.clearColor = new Color4(0.65, 0.82, 0.93, 1)
    scene.fogMode = Scene.FOGMODE_EXP2
    scene.fogDensity = BASE_FOG_DENSITY
    scene.fogColor = new Color3(0.65, 0.82, 0.93)

    // Câmera totalmente controlada por código (sem input próprio) — reposicionada a cada
    // quadro pra acompanhar a bola e a curvatura local do planeta.
    const camera = new UniversalCamera('camera', new Vector3(0, PLANET_RADIUS + CAMERA_HEIGHT, -CAMERA_DISTANCE), scene)
    camera.minZ = 0.1

    const pipeline = new DefaultRenderingPipeline('quality', true, scene, [camera])
    pipeline.samples = isLowEndDevice ? 1 : 4
    // FXAA ligado também no mobile (lab-59, usuário: "a qualidade do 3D está muito baixa no
    // telefone") — MSAA (`samples`) continua desligado (caro, custa por amostra), mas FXAA é um
    // único passe de pós-processamento barato que suaviza serrilhado sem custo por amostra;
    // ajuda a disfarçar um pouco o efeito de `hardwareScalingLevel` reduzido.
    pipeline.fxaaEnabled = true
    pipeline.imageProcessing.toneMappingEnabled = true
    pipeline.imageProcessing.toneMappingType = 1 // ACES
    pipeline.imageProcessing.exposure = 0.9
    pipeline.bloomEnabled = false // o GlowLayer já cobre o brilho emissivo dos portais, mais barato

    // SSAO2 é um dos passes mais caros pra GPU mobile (ratio 0.5 + blur, por quadro) — pulado
    // inteiro em dispositivos fracos.
    if (!isLowEndDevice) {
      const ssao = new SSAO2RenderingPipeline('ssao', scene, {
        ssaoRatio: 0.5,
        blurRatio: 0.5,
      }, [camera])
      ssao.radius = 2
      ssao.totalStrength = 0.8
      ssao.expensiveBlur = false
      ssao.samples = 8
    }

    const hemiLight = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene)
    hemiLight.intensity = 0.3
    hemiLight.groundColor = new Color3(0.4, 0.35, 0.3)

    const sunLight = new DirectionalLight('sun', new Vector3(-0.6, -1.2, -0.4), scene)
    sunLight.intensity = 1.0
    sunLight.position = new Vector3(20, 30, 20)

    const shadowGenerator = new ShadowGenerator(isLowEndDevice ? 512 : 1024, sunLight)
    shadowGenerator.useBlurExponentialShadowMap = !isLowEndDevice
    shadowGenerator.blurKernel = 32
    // Sombra dinâmica é barata por caster individual, mas o jogo tem ~1900 meshes e quase todo
    // builder (props, pedras, bichos, moedas, degraus) chama addShadowCaster — em GPU fraca isso
    // some ainda mais rápido que o próprio SSAO. Em vez de caçar e editar cada um dos ~40 pontos
    // de chamada, desativa a captura de sombra inteira (o gerador continua existindo, só não
    // recebe casters — sem casters o passe de shadow map roda sobre nada, custo desprezível).
    if (isLowEndDevice) shadowGenerator.addShadowCaster = () => shadowGenerator

    // GlowLayer roda um passe extra de blur sobre o material emissivo todo quadro — mais um post-
    // process caro pulado em dispositivo fraco (lab-56, "ainda está um pouco pesado pro tablet"),
    // igual já foi feito com SSAO2/sombras/MSAA. Só afeta o brilho dos portais das escolas.
    if (!isLowEndDevice) {
      const glow = new GlowLayer('glow', scene)
      glow.intensity = 0.7
    }

    let havokPlugin: HavokPlugin | null = null
    let avatarBody: PhysicsAggregate | null = null
    let avatarMesh: Mesh | null = null
    let facing = new Vector3(0, 0, 1)
    let walkPhase = 0
    let lastFootSign = 0
    const tmpMatrix = new Matrix()
    const tmpQuat = new Quaternion()
    const triggered = new Set<string>()
    const portalMeshes: { quest: (typeof quests)[number]; roof: Mesh; base: TransformNode; surfacePos: Vector3 }[] = []
    const remotePlayers = new Map<string, RemotePlayer>()
    let netSendTimer = 0
    let keysDown: Record<string, boolean> = {}
    let jumpRequested = false
    // Laser do parkour (lab-38, pedido do usuário: "se pisar no laser fazer animação de
    // morrendo e caindo até o planeta novamente") — enquanto `laserStunTimer > 0`, o controle
    // normal do jogador (andar/pular) fica suspenso e o personagem visual gira sem parar
    // (cambalhota), deixando só a gravidade real (já aplicada todo quadro independente disto)
    // levá-lo de volta pro chão de verdade. `laserStunSeed` varia o eixo de giro por acerto
    // (não é sempre a mesma cambalhota, parece mais orgânico).
    let laserStunTimer = 0
    let laserStunSeed = 0
    // Carro que o jogador está dirigindo agora (lab-25) — null = a pé. Trocado só pelo handler
    // de teclado da tecla `e` (ver `onKeyDown`), lido pelo loop de física/câmera do avatar (pra
    // se congelar) e pelo loop dos carros (pra saber qual pular da IA e mover por input).
    let drivingCar: Carro | null = null
    // Reaproveitado a cada quadro pra checar "grounded" via raycast físico real (ver comentário
    // onde é usado) — evita alocar um objeto novo por quadro.
    const groundRayResult = new PhysicsRaycastResult()

    // Viagem pro planetinha secundário (lab-58) — TODO o resto do jogo (gravidade radial, altura
    // do chão, o boneco visual "grudado" na superfície) assume implicitamente que "o planeta" tem
    // centro na origem (0,0,0) — ver o bloco de física do avatar mais abaixo. Em vez de reescrever
    // esse sistema inteiro pra saber lidar com múltiplos planetas ao mesmo tempo, generaliza só o
    // suficiente: essas duas variáveis substituem as constantes fixas "origem" e "PLANET_RADIUS +
    // terrainHeight(localUp)" nesse bloco — trocadas ao embarcar/desembarcar, tudo o resto do
    // sistema de física continua igual, sem saber que existe um segundo planeta.
    let currentWorldCenter = Vector3.Zero()
    let currentGroundBaseFn: (localUp: Vector3) => number = (localUp) => PLANET_RADIUS + terrainHeight(localUp)
    let onSecondPlanet = false
    let secondPlanetBuilt = false
    let mainRocket: { root: TransformNode; hintLabel: TextBlock } | null = null
    let secondPlanetReturnRocket: { root: TransformNode; hintLabel: TextBlock } | null = null
    // Espada/arma (lab-61) — construídas uma vez em `setup()`, lidas pelo laço de física (giro de
    // exibição + detecção de "pegou o item") e por `handleInteractPress` (combate em Marte).
    let swordPickup: { root: TransformNode; label: TextBlock } | null = null
    let gunPickup: { root: TransformNode; label: TextBlock } | null = null
    // Versões "equipadas" (lab-62, pedido do usuário: "como eu sei que peguei o item, tem
    // animação que eu estou segurando o item?") — cópias pequenas presas na mão do boneco
    // (`elbowPivotR`/`elbowPivotL`), escondidas até o item ser coletado. `attackAnimTimer`/
    // `attackAnimKind` tocam uma animação curta de braço (espada) ou "atira" (arma) ao nocautear
    // um inimigo, sobrescrevendo o ciclo de caminhada por um instante — ver laço de física.
    let equippedSword: TransformNode | null = null
    let equippedGun: TransformNode | null = null
    let attackAnimTimer = 0
    let attackAnimKind: 'sword' | 'gun' | null = null
    // Contagem de marcianos vivos exibida no HUD (lab-65) — só chama `setMarsEnemyCount` quando o
    // valor muda (ver laço de IA de Marte), não a cada quadro.
    let lastMarsEnemyCount = -1
    // Anel de onda sonora (lab-62, pedido do usuário: "um anel de onda sonora em volta do boneco
    // e ele não pode entrar dentro no meu corpo") — reforço visual do raio de "colisão"
    // (`MARS_ENEMY_PERSONAL_SPACE`), pulsando continuamente. Só visível em Marte (só lá tem
    // inimigo pra indicar limite nenhum).
    let soundRing: Mesh | null = null
    // Piloto do foguete (lab-59, pedido do usuário: "o lance da viagem do foguete é o boneco
    // entrar no foguete, deve ter como controlar como tem no carro... ir pra trás e pra frente
    // com as setas... e viajar pelo espaço entre os dois planetas") — os dois foguetes das
    // plataformas (`mainRocket`/`secondPlanetReturnRocket`) ficam sempre parados, servindo só de
    // ponto de embarque/desembarque; `flyingRocket` é o veículo visual usado durante o trecho
    // voando (construído uma vez em `setup()`, escondido até embarcar). `progress` vai de 0
    // (ponto de partida) a 1 (ponto de chegada) ao longo de uma curva fixa entre as duas
    // plataformas — mesmo espírito do `pathIndex` do carro, só que a "pista" é uma curva pelo
    // espaço em vez de uma rua na superfície.
    interface RocketFlight {
      progress: number
      p0: Vector3
      c1: Vector3
      c2: Vector3
      p1: Vector3
      toSecondPlanet: boolean
      // Rotação de "repouso" da nave em cada ponta (a mesma que `alignmentQuaternion` dá ao
      // foguete parado numa plataforma — nariz apontando pra longe do planeta). Usada nas DUAS
      // pontas do voo: decolagem trava nela (`fromRestQuat`), pouso converge pra ela
      // (`toRestQuat`) — motores (cauda) na frente descendo, como um pouso de foguete de verdade.
      fromRestQuat: Quaternion
      toRestQuat: Quaternion
      // Capturada na hora que o voo entra na fase de pouso (ver `holdFlipHoldCurve`/laço de voo
      // mais abaixo) — de onde o "flip" pra orientação de pouso começa a interpolar. `null` até
      // lá; type real é `Quaternion`, mas começa vazia porque só existe a partir desse instante.
      flipStartQuat: Quaternion | null
    }
    let drivingRocket: RocketFlight | null = null
    let flyingRocket: TransformNode | null = null
    let rocketFlameSystem: ParticleSystem | null = null
    // Inimigos de Marte (lab-60) — populado dentro de `buildSecondPlanetIfNeeded`, lido/mutado
    // pelo laço de IA/combate por quadro (só roda quando `onSecondPlanet` é verdadeiro).
    const marsEnemies: MarsEnemy[] = []
    if (import.meta.env.DEV) {
      ;(window as any).__jumpDebug = () => ({ jumpRequested, spaceDown: !!keysDown[' '], keysDown: { ...keysDown } })
    }

    async function setup() {
      // Input de teclado — registrado antes de qualquer `await` (física WASM, textura HDRI, 18
      // modelos glTF de props) pra funcionar desde o primeiro quadro, não só depois que o mundo
      // termina de carregar. Bug real encontrado nesta sessão: como esse listener era a ÚLTIMA
      // coisa registrada em `setup()` (depois de todo o carregamento de assets), apertar espaço
      // (ou qualquer tecla) enquanto o mundo ainda estava carregando não fazia nada — nem erro,
      // nem pulo — porque `window.addEventListener('keydown', ...)` simplesmente ainda não tinha
      // rodado. Confirmado isolando a causa: um clique + tecla real via automação, poucos
      // segundos após a página carregar, chegava a `document.body` normalmente (capturado por um
      // listener de diagnóstico), mas o `keysDown` do próprio jogo continuava vazio — a única
      // explicação é o listener do jogo ainda não existir naquele momento. Ignora teclas enquanto
      // o foco está num campo de texto (ex.: chat), pra digitar "s"/"w"/"a"/"d" não mexer o
      // personagem.
      // Distância até uma superfície esférica qualquer (planeta principal ou o secundário, ambos
      // com raio próprio) na direção de pouso, com um pequeno deslocamento tangencial — mesma
      // técnica já usada na saída do carro logo abaixo (`exitSpot`), generalizada pra não colocar
      // o jogador em cima da própria plataforma do foguete.
      function offsetLandingUp(up: Vector3, planetRadius: number, offsetDistance: number): Vector3 {
        const tangentSeed = Math.abs(up.y) < 0.99 ? Vector3.Up() : Vector3.Right()
        const tangent = Vector3.Cross(up, tangentSeed).normalize()
        return up.add(tangent.scale(offsetDistance / planetRadius)).normalize()
      }

      function teleportAvatarTo(center: Vector3, landingUp: Vector3, groundFn: (u: Vector3) => number) {
        if (!avatarMesh || !avatarBody) return
        // Teleporte físico seguro (mesmo padrão usado em todo o resto do jogo pra mover o avatar
        // direto — ver saída do carro logo abaixo — `disablePreStep = false` + `scene.render()`
        // sincronizam o corpo físico de verdade com a posição escrita aqui).
        avatarBody.body.disablePreStep = false
        avatarMesh.position.copyFrom(center.add(landingUp.scale(groundFn(landingUp) + AVATAR_RADIUS + 0.05)))
        scene.render()
        avatarBody.body.setLinearVelocity(Vector3.Zero())
        avatarBody.body.setAngularVelocity(Vector3.Zero())
        avatarBody.body.disablePreStep = true
        facing = Vector3.Cross(landingUp, Vector3.Right())
        if (facing.lengthSquared() < 1e-6) facing = Vector3.Cross(landingUp, Vector3.Forward())
        facing.normalize()
      }

      // Ponto/tangente numa curva de Bézier cúbica — usada pra voar o foguete pelo espaço
      // (lab-59). Cúbica em vez de quadrática (que era só um "meio" elevado) porque só ela
      // garante a tangente EXATA em cada ponta: com `c1`/`c2` colocados na direção "pra cima"
      // local de cada plataforma, a nave sai e chega sempre na vertical (pedido do usuário: "o
      // foguete deve decolar na vertical, não de lado"), em vez de sair numa direção genérica
      // rumo ao meio do caminho.
      function sampleFlightArc(p0: Vector3, c1: Vector3, c2: Vector3, p1: Vector3, t: number) {
        const u = 1 - t
        const uu = u * u
        const tt = t * t
        const position = p0
          .scale(uu * u)
          .add(c1.scale(3 * uu * t))
          .add(c2.scale(3 * u * tt))
          .add(p1.scale(tt * t))
        const tangent = c1
          .subtract(p0)
          .scale(3 * uu)
          .add(c2.subtract(c1).scale(6 * u * t))
          .add(p1.subtract(c2).scale(3 * tt))
        return { position, tangent: tangent.normalize() }
      }

      // Curva "segura-vira-segura": 0 até `holdStart`, sobe suave (smoothstep) até `holdEnd`,
      // depois 1 até o fim — usada pra girar o foguete (lab-59, ver laço de voo mais abaixo). Bug
      // real reportado pelo usuário ("o foguete está saindo meio de lado da Terra, tem que sair
      // pra cima e depois pousar de ré"): interpolar a rotação linearmente com `progress` (0 a 1)
      // fazia a nave começar a virar rumo à orientação de CHEGADA desde o primeiro instante do
      // voo — ainda bem perto da plataforma, mal saindo do chão, já visivelmente "de lado". Esta
      // curva mantém a rotação TRAVADA na orientação de decolagem por uma fração inicial do voo
      // (decola reto, sem nenhuma guinada) e travada na orientação de pouso pela fração final
      // (chega já "de pé", pronta pra descer de ré) — só gira de verdade no trecho do meio, longe
      // de qualquer um dos dois planetas, onde não há "chão" pra parecer errado.
      function holdFlipHoldCurve(t: number, holdStart: number, holdEnd: number): number {
        if (t <= holdStart) return 0
        if (t >= holdEnd) return 1
        const x = (t - holdStart) / (holdEnd - holdStart)
        return x * x * (3 - 2 * x)
      }

      // Embarcar no foguete (lab-59, pedido do usuário: "o lance da viagem do foguete é o boneco
      // entrar no foguete, deve ter como controlar como tem no carro... e viajar pelo espaço
      // entre os dois planetas") — parenteia o boneco no foguete voador (igual ao carro), define
      // a curva fixa entre a plataforma de partida e a de chegada, e entra em modo de pilotagem.
      // O planetinha secundário já é construído aqui (não só ao chegar) — precisa existir pro
      // foguete de chegada (`toRocket`) ter uma posição real pra mirar.
      function boardRocket() {
        if (!avatarMesh || !avatarBody || !flyingRocket) return
        if (!onSecondPlanet) buildSecondPlanetIfNeeded()
        const toSecondPlanet = !onSecondPlanet
        const fromRocket = onSecondPlanet ? secondPlanetReturnRocket : mainRocket
        const toRocket = onSecondPlanet ? mainRocket : secondPlanetReturnRocket
        if (!fromRocket || !toRocket) return

        const p0 = fromRocket.root.getAbsolutePosition().clone()
        const p1 = toRocket.root.getAbsolutePosition().clone()
        // "Pra cima" local de cada plataforma (a direção que o próprio foguete parado aponta,
        // ver `alignmentQuaternion(ROCKET_LAUNCH_DIR)`/`alignmentQuaternion(SECOND_PLANET_LANDING_UP)`
        // usados ao construir as plataformas) — os pontos de controle da cúbica saem exatamente
        // nessa direção, garantindo decolagem/pouso na vertical em vez de um ângulo genérico.
        const fromUp = onSecondPlanet ? SECOND_PLANET_LANDING_UP : ROCKET_LAUNCH_DIR
        const toUp = toSecondPlanet ? SECOND_PLANET_LANDING_UP : ROCKET_LAUNCH_DIR
        const c1 = p0.add(fromUp.scale(ROCKET_ARC_HEIGHT))
        const c2 = p1.add(toUp.scale(ROCKET_ARC_HEIGHT))

        // `progress` começa num epsilon positivo, não exatamente 0 — bug real encontrado ao
        // vivo: com `progress` clampado em [0,1] (nunca fica negativo) e a checagem de pouso
        // sendo `<= 0`, começar exatamente em 0 disparava o pouso de "voltou pro início" no
        // PRÓPRIO primeiro quadro do voo, desfazendo o embarque na hora, antes de qualquer input.
        const fromRestQuat = alignmentQuaternion(fromUp)
        const toRestQuat = alignmentQuaternion(toUp)
        drivingRocket = { progress: 0.001, p0, c1, c2, p1, toSecondPlanet, fromRestQuat, toRestQuat, flipStartQuat: null }
        flyingRocket.setEnabled(true)
        flyingRocket.position.copyFrom(p0)
        // Começa com a MESMA rotação da plataforma parada (`alignmentQuaternion(fromUp)`, igual
        // à usada pra apoiar o foguete fixo) — decolagem sem "pulo" visual de orientação entre
        // "sentado na base" e "primeiro quadro voando".
        flyingRocket.rotationQuaternion = fromRestQuat.clone()
        startRocketEngine()
        if (rocketFlameSystem) rocketFlameSystem.emitRate = 80
        // Aviso ao decolar rumo a Marte sem os dois itens de combate (lab-61, pedido do usuário:
        // "dê dicas de como encontrar a espada e a arma senão não tem como sobreviver") — só na
        // ida (`toSecondPlanet`), não faz sentido avisar na volta pro planeta principal.
        if (toSecondPlanet && (!hasSwordRef.current || !hasGunRef.current)) {
          setWeaponMessage(
            'Cuidado: você ainda não achou a Espada e/ou a Arma a Laser na Terra — sem elas, não dá pra nocautear o ET e o robô em Marte!',
          )
          window.setTimeout(() => setWeaponMessage(null), 5000)
        }

        if (avatarBody) {
          avatarBody.body.setLinearVelocity(Vector3.Zero())
          avatarBody.body.setAngularVelocity(Vector3.Zero())
        }
        // Boneco visível dentro do foguete, perto da janela — mesma pose sentada já usada no
        // carro (lab-27/28), reaproveitada aqui.
        studentFigure.root.parent = flyingRocket
        studentFigure.root.position = new Vector3(0, 1.55, 0.1)
        studentFigure.root.rotationQuaternion = Quaternion.Identity()
        studentFigure.legPivotL.rotation.x = -1.3
        studentFigure.legPivotR.rotation.x = -1.3
        studentFigure.kneePivotL.rotation.x = 1.3
        studentFigure.kneePivotR.rotation.x = 1.3
        studentFigure.armPivotL.rotation.x = -0.3
        studentFigure.armPivotR.rotation.x = -0.3
        studentFigure.elbowPivotL.rotation.x = 0.6
        studentFigure.elbowPivotR.rotation.x = 0.6
        fromRocket.hintLabel.alpha = 0
      }

      // Pousa ao alcançar qualquer uma das duas pontas do voo (lab-59) — mesma lógica de
      // teleporte/troca de planeta do lab-58, só que disparada pelo fim da viagem pilotada em vez
      // de instantaneamente ao apertar E.
      function landRocket() {
        if (!drivingRocket || !flyingRocket) return
        // `progress` 1 = chegou no destino (`toSecondPlanet` diz qual é); `progress` 0 = voltou
        // pro ponto de partida (desistiu no meio do caminho, empurrando o acelerador pra trás até
        // o início de novo) — nesse caso o pouso é no planeta de ORIGEM, o oposto do destino.
        const arrivedAtDestination = drivingRocket.progress >= 1
        const arrivedAtSecondPlanet = arrivedAtDestination ? drivingRocket.toSecondPlanet : !drivingRocket.toSecondPlanet
        flyingRocket.setEnabled(false)
        studentFigure.root.parent = null
        drivingRocket = null
        stopRocketEngine()
        if (rocketFlameSystem) rocketFlameSystem.emitRate = 0

        if (arrivedAtSecondPlanet) {
          onSecondPlanet = true
          currentWorldCenter = SECOND_PLANET_CENTER
          currentGroundBaseFn = () => SECOND_PLANET_RADIUS
          teleportAvatarTo(
            SECOND_PLANET_CENTER,
            offsetLandingUp(SECOND_PLANET_LANDING_UP, SECOND_PLANET_RADIUS, 1.8),
            currentGroundBaseFn,
          )
          // Vida cheia a cada nova ida a Marte (lab-60) — cada expedição começa do zero, não
          // carrega dano de uma visita anterior.
          marsHealthRef.current = MARS_MAX_HEALTH
          setMarsHealthDisplay(MARS_MAX_HEALTH)
          setOnMarsCombatZone(true)
          // Novos marcianos a cada chegada em Marte (lab-64, pedido do usuário: "se voltar pra
          // marte, tem que ter novos marcianos pra matar, senão o planeta fica vazio") — sem
          // isso, inimigos já nocauteados numa visita anterior ficavam mortos pra sempre (o
          // array é reaproveitado, nunca recriado), deixando o planeta esvaziado depois da
          // primeira exploração. Reaparecem no próprio ponto de nascimento (`homeUp`), com o
          // mesmo estado inicial de repouso — cobre tanto "voltar depois de nocauteado" quanto
          // "voltar de novo por escolha própria depois de já ter limpado o planeta".
          for (const enemy of marsEnemies) {
            enemy.alive = true
            enemy.up = enemy.homeUp.clone()
            enemy.targetUp = enemy.homeUp.clone()
            enemy.forward = Vector3.Cross(enemy.homeUp, Vector3.Right()).normalize()
            enemy.restTimer = Math.random() * 2
            enemy.attackCooldown = 0
            enemy.lungeTimer = 0
            enemy.root.position = enemy.homeUp.scale(SECOND_PLANET_RADIUS)
            enemy.root.rotationQuaternion = alignmentQuaternion(enemy.homeUp)
            enemy.root.setEnabled(true)
          }
        } else {
          onSecondPlanet = false
          currentWorldCenter = Vector3.Zero()
          currentGroundBaseFn = (localUp) => PLANET_RADIUS + terrainHeight(localUp)
          teleportAvatarTo(
            Vector3.Zero(),
            offsetLandingUp(ROCKET_LAUNCH_DIR, PLANET_RADIUS, 2.2),
            currentGroundBaseFn,
          )
          setOnMarsCombatZone(false)
        }
      }

      // Choque elétrico do robô (lab-62, pedido do usuário: "animação de ataque, o robô tem que
      // ser choque elétrico") — segmentos finos em ziguezague (offset aleatório em cada ponto
      // intermediário) do robô até o jogador, amarelo-branco emissivo, somem sozinhos.
      function spawnRoboShock(fromPos: Vector3, toPos: Vector3) {
        const segmentCount = 3
        const points: Vector3[] = [fromPos]
        for (let i = 1; i < segmentCount; i++) {
          const base = Vector3.Lerp(fromPos, toPos, i / segmentCount)
          points.push(base.add(new Vector3((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3)))
        }
        points.push(toPos)
        const shockMat = new PBRMaterial('roboShockMat', scene)
        shockMat.albedoColor = new Color3(1, 1, 0.6)
        shockMat.emissiveColor = new Color3(1, 1, 0.5)
        const segs: Mesh[] = []
        for (let i = 0; i < points.length - 1; i++) {
          const delta = points[i + 1].subtract(points[i])
          const length = delta.length()
          if (length < 0.01) continue
          const dir = delta.clone().normalize()
          const seg = MeshBuilder.CreateCylinder(`roboShockSeg${i}`, { diameter: 0.035, height: length, tessellation: 5 }, scene)
          seg.position.copyFrom(Vector3.Lerp(points[i], points[i + 1], 0.5))
          const up = Vector3.Up()
          if (Math.abs(Vector3.Dot(dir, up)) > 0.999) {
            seg.rotationQuaternion = Quaternion.Identity()
          } else {
            const axis = Vector3.Cross(up, dir).normalize()
            const angle = Math.acos(Math.max(-1, Math.min(1, Vector3.Dot(up, dir))))
            seg.rotationQuaternion = Quaternion.RotationAxis(axis, angle)
          }
          seg.material = shockMat
          segs.push(seg)
        }
        window.setTimeout(() => segs.forEach((s) => s.dispose()), 220)
      }

      // Fumaça verde do ET (lab-62, pedido do usuário: "o ET com fumaça verde") — punhado de
      // esferas espalhadas ao redor do ponto de ataque, verde translúcido, somem sozinhas.
      function spawnEtSmoke(atPos: Vector3) {
        const smokeMat = new PBRMaterial('etSmokeMat', scene)
        smokeMat.albedoColor = new Color3(0.3, 0.75, 0.35)
        smokeMat.emissiveColor = new Color3(0.15, 0.4, 0.15)
        smokeMat.alpha = 0.6
        const puffs: Mesh[] = []
        for (let i = 0; i < 5; i++) {
          const puff = MeshBuilder.CreateSphere(`etSmokePuff${i}`, { diameter: 0.22 + Math.random() * 0.14, segments: 6 }, scene)
          puff.position = atPos.add(new Vector3((Math.random() - 0.5) * 0.35, Math.random() * 0.35, (Math.random() - 0.5) * 0.35))
          puff.material = smokeMat
          puffs.push(puff)
        }
        window.setTimeout(() => puffs.forEach((p) => p.dispose()), 450)
      }

      // Dano de inimigo de Marte (lab-60, pedido do usuário: "nós temos que ter uma barra de
      // vida"). `marsHealthRef` é a fonte de verdade (lida/escrita direto aqui, sem esperar
      // re-render) — `ignore hits enquanto já chegou a zero` evita disparar `respawnFromMarsDeath`
      // várias vezes se dois inimigos acertarem no mesmo quadro. Recebe o inimigo atacante
      // (lab-62) pra disparar o efeito certo (choque/fumaça) e o "solavanco" visual dele.
      function applyMarsDamage(amount: number, attacker: MarsEnemy) {
        if (marsHealthRef.current <= 0) return
        marsHealthRef.current = Math.max(0, marsHealthRef.current - amount)
        setMarsHealthDisplay(marsHealthRef.current)
        playEnemyHit()
        attacker.lungeTimer = MARS_ENEMY_LUNGE_DURATION
        if (avatarMesh) {
          const attackerWorldPos = SECOND_PLANET_CENTER.add(attacker.up.scale(SECOND_PLANET_RADIUS))
          if (attacker.kind === 'robo') spawnRoboShock(attackerWorldPos, avatarMesh.position.clone())
          else spawnEtSmoke(avatarMesh.position.clone())
        }
        if (marsHealthRef.current <= 0) respawnFromMarsDeath()
      }

      // Vida zerada em Marte (lab-60, pedido do usuário: "se a barra esvaziar, você morre e volta
      // pro planetinha e tem que voltar de foguete pra poder seguir em Marte") — mesmo teleporte
      // de "pouso no planeta principal" já usado por `landRocket`, disparado sem precisar do
      // foguete. Como o único jeito de VOLTAR a Marte continua sendo embarcar no foguete de novo
      // (`boardRocket`/`handleInteractPress`), "precisa voltar de foguete" já sai satisfeito de
      // graça — não precisa de nenhum bloqueio adicional.
      function respawnFromMarsDeath() {
        onSecondPlanet = false
        currentWorldCenter = Vector3.Zero()
        currentGroundBaseFn = (localUp) => PLANET_RADIUS + terrainHeight(localUp)
        teleportAvatarTo(Vector3.Zero(), offsetLandingUp(ROCKET_LAUNCH_DIR, PLANET_RADIUS, 2.2), currentGroundBaseFn)
        marsHealthRef.current = MARS_MAX_HEALTH
        setMarsHealthDisplay(MARS_MAX_HEALTH)
        setOnMarsCombatZone(false)
        playKnockedOut()
        setMarsDeathMessage('Nocauteado! Volte de foguete pra continuar explorando Marte.')
        window.setTimeout(() => setMarsDeathMessage(null), 4000)
      }

      // Feixe de laser (lab-62, pedido do usuário: "ao apertar E... atira o laser?") — cilindro
      // temporário do jogador até o robô, some sozinho depois de ~180ms. `.clone()` antes de
      // `.normalize()` é de propósito — `Vector3.normalize()` muta o vetor no lugar (bug real já
      // encontrado nesta sessão, ver `avatarLocalPos` no laço de IA de Marte), então normalizar
      // `delta` direto corromperia ele se algo mais fosse lido dele depois.
      function fireLaserBeam(fromPos: Vector3, toPos: Vector3) {
        const delta = toPos.subtract(fromPos)
        const length = delta.length()
        if (length < 0.01) return
        const dir = delta.clone().normalize()
        const beam = MeshBuilder.CreateCylinder('laserBeam', { diameter: 0.05, height: length, tessellation: 6 }, scene)
        beam.position.copyFrom(Vector3.Lerp(fromPos, toPos, 0.5))
        const up = Vector3.Up()
        if (Math.abs(Vector3.Dot(dir, up)) > 0.999) {
          beam.rotationQuaternion = Quaternion.Identity()
        } else {
          const axis = Vector3.Cross(up, dir).normalize()
          const angle = Math.acos(Math.max(-1, Math.min(1, Vector3.Dot(up, dir))))
          beam.rotationQuaternion = Quaternion.RotationAxis(axis, angle)
        }
        const beamMat = new PBRMaterial('laserBeamMat', scene)
        beamMat.albedoColor = new Color3(0.2, 0.8, 0.9)
        beamMat.emissiveColor = new Color3(0.3, 0.9, 1)
        beam.material = beamMat
        window.setTimeout(() => beam.dispose(), 180)
      }

      // Ação genérica da tecla E — entrar/sair do carro OU embarcar/desembarcar do foguete,
      // dependendo do que está por perto (nunca os dois ao mesmo tempo, o carro só existe no
      // planeta principal). Extraída numa função nomeada (não só inline em `onKeyDown`) pra poder
      // ser chamada também pelo botão de toque (lab-58, pedido do usuário: "se você estiver no
      // celular precisa de um botão transparente de função de ação da tecla E" — o carro, desde o
      // lab-25, só dava pra entrar via teclado; agora os dois usam o mesmo caminho).
      function handleInteractPress() {
        // Meio do voo (lab-59) não tem "sair" — o único jeito de voltar é pilotar de volta até o
        // progresso chegar em 0 (mesmo espírito de não poder sair do carro no meio da estrada).
        if (drivingRocket) return
        if (drivingCar) {
          const exitUp = drivingCar.root.position.clone().normalize()
          const exitFwd = Vector3.TransformNormal(Vector3.Forward(), drivingCar.root.getWorldMatrix()).normalize()
          const exitRight = Vector3.Cross(exitUp, exitFwd).normalize()
          const exitSpot = exitUp.scale(PLANET_RADIUS).add(exitRight.scale(1.3))
          const exitSpotUp = exitSpot.clone().normalize()
          if (avatarMesh && avatarBody) {
            // Teleporte físico seguro (mesmo padrão usado em todo o resto do jogo pra mover o
            // avatar direto, ex. respawn) — `disablePreStep = false` + `scene.render()` fazem
            // o corpo físico sincronizar de verdade com a posição escrita aqui; sem isso, o
            // corpo físico (que roda em `disablePreStep = true` durante o jogo normal) ignora
            // completamente a escrita direta em `avatarMesh.position` e volta pra onde estava
            // no próximo passo de física — bug real encontrado testando esta função: o jogador
            // saía do carro mas continuava "preso" na posição de quando entrou.
            avatarBody.body.disablePreStep = false
            avatarMesh.position.copyFrom(
              exitSpotUp.scale(PLANET_RADIUS + terrainHeight(exitSpotUp) + AVATAR_RADIUS + 0.05),
            )
            scene.render()
            avatarBody.body.setLinearVelocity(Vector3.Zero())
            avatarBody.body.setAngularVelocity(Vector3.Zero())
            avatarBody.body.disablePreStep = true
          }
          facing = exitFwd.subtract(exitSpotUp.scale(Vector3.Dot(exitFwd, exitSpotUp)))
          if (facing.lengthSquared() < 1e-6) facing = Vector3.Cross(exitSpotUp, Vector3.Right())
          facing.normalize()
          // Desparenta do carro (lab-27) — volta a ser posicionada pelo loop de física normal
          // do avatar a pé (que retoma no próximo quadro, já que `drivingCar` vira null aqui).
          studentFigure.root.parent = null
          drivingCar = null
          return
        }
        if (suspendRef.current || chatOpenRef.current || !avatarMesh) return
        let nearestCar: Carro | null = null
        let nearestDist = CAR_ENTER_DISTANCE
        for (const car of carros) {
          const d = Vector3.Distance(avatarMesh.position, car.root.position)
          if (d < nearestDist) {
            nearestCar = car
            nearestDist = d
          }
        }
        if (nearestCar) {
          drivingCar = nearestCar
          if (avatarBody) {
            avatarBody.body.setLinearVelocity(Vector3.Zero())
            avatarBody.body.setAngularVelocity(Vector3.Zero())
          }
          // Boneco visível em cima do carro (lab-27, pedido do usuário: "o boneco deve
          // ficar em cima do carro ao apertar E" — antes ficava escondido) — parentado no
          // carro com offset local fixo (sentado por cima da cabine); herda posição/rotação
          // do carro automaticamente a cada quadro (`positionOnLoopPath` já atualiza
          // `drivingCar.root`), sem precisar sincronizar manualmente.
          studentFigure.root.parent = nearestCar.root
          studentFigure.root.position = new Vector3(0, 0.56, -0.05)
          studentFigure.root.rotationQuaternion = Quaternion.Identity()
          // Pose sentada (lab-28, pedido do usuário: "o boneco deve ir sentado em cima do
          // carro" — antes ficava na pose parada padrão) — aplicada uma vez ao entrar, não
          // animada: coxa levantada pra frente, joelho dobrado de volta, braços apoiados
          // como se estivesse no volante. Congelada enquanto dirige (o ciclo de caminhada só
          // roda com `!drivingCar`), volta ao normal sozinha no próximo passo andando a pé
          // (o loop de caminhada recalcula essas mesmas rotações a cada quadro).
          studentFigure.legPivotL.rotation.x = -1.3
          studentFigure.legPivotR.rotation.x = -1.3
          studentFigure.kneePivotL.rotation.x = 1.3
          studentFigure.kneePivotR.rotation.x = 1.3
          studentFigure.armPivotL.rotation.x = -0.3
          studentFigure.armPivotR.rotation.x = -0.3
          studentFigure.elbowPivotL.rotation.x = 0.6
          studentFigure.elbowPivotR.rotation.x = 0.6
          for (const car of carros) car.hintLabel.alpha = 0
          return
        }
        // Combate em Marte (lab-61, pedido do usuário: "crie uma espada... e uma arma... para
        // nocautear o ET/o robô") — checado ANTES do embarque no foguete: perto de um inimigo
        // vivo com a arma certa equipada, apertar E nocauteia em vez de embarcar. Sem a arma
        // certa, não faz nada (o jogador precisa achar o item primeiro — ver aviso ao embarcar
        // sem os dois, em `boardRocket`).
        if (onSecondPlanet) {
          const avatarLocalPos = avatarMesh.position.subtract(SECOND_PLANET_CENTER)
          for (const enemy of marsEnemies) {
            if (!enemy.alive) continue
            const enemyLocalPos = enemy.up.scale(SECOND_PLANET_RADIUS)
            if (Vector3.Distance(enemyLocalPos, avatarLocalPos) >= MARS_COMBAT_RADIUS) continue
            const canDefeat =
              (enemy.kind === 'et' && hasSwordRef.current) || (enemy.kind === 'robo' && hasGunRef.current)
            if (canDefeat) {
              // Animação de golpe/tiro (lab-62, pedido do usuário: "ao apertar E ele sacode o
              // braço, ou atira o laser?") — sobrescreve o ciclo de caminhada por um instante
              // (ver `attackAnimTimer`/`attackAnimKind` no laço de física).
              attackAnimTimer = ATTACK_ANIM_DURATION
              attackAnimKind = enemy.kind === 'et' ? 'sword' : 'gun'
              if (enemy.kind === 'robo') {
                fireLaserBeam(avatarMesh.position.clone(), SECOND_PLANET_CENTER.add(enemyLocalPos))
              }
              enemy.alive = false
              enemy.root.setEnabled(false)
              playEnemyHit()
              onCollectCoinRef.current()
            }
            return
          }
        }
        const rocket = onSecondPlanet ? secondPlanetReturnRocket : mainRocket
        if (rocket) {
          // `getAbsolutePosition()`, não `.position` — o foguete de volta é filho de
          // `secondPlanetRoot` (posição local, não em coordenadas de mundo); `.position` sozinho
          // aqui comparava contra a posição local (perto de 0,6,0) em vez da posição real no
          // mundo (perto de SECOND_PLANET_CENTER), fazendo essa distância dar sempre um valor
          // gigante e a checagem nunca passar — bug real encontrado testando a viagem de volta
          // ao vivo (embarcar funcionava, voltar não fazia nada).
          const d = Vector3.Distance(avatarMesh.position, rocket.root.getAbsolutePosition())
          if (d < ROCKET_ENTER_DISTANCE) {
            boardRocket()
            rocket.hintLabel.alpha = 0
          }
        }
      }
      ;(scene as any).__handleInteractPress = handleInteractPress

      const onKeyDown = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement | null
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
        const key = e.key.toLowerCase()
        // Latch no próprio evento (não no polling do loop de render) — ver comentário onde
        // `jumpRequested` é consumido, no loop de render. `!keysDown[key]` evita re-latch por
        // key-repeat do SO enquanto o jogador segura a tecla.
        if (key === ' ' && !keysDown[key]) jumpRequested = true
        // Entrar/sair do carro (lab-25) ou embarcar/desembarcar do foguete (lab-58) — `e`.
        // `!keysDown[key]` evita repetir várias vezes num só toque por causa de key-repeat do SO.
        if (key === 'e' && !keysDown[key]) handleInteractPress()
        keysDown[key] = true
      }
      const onKeyUp = (e: KeyboardEvent) => (keysDown[e.key.toLowerCase()] = false)
      window.addEventListener('keydown', onKeyDown)
      window.addEventListener('keyup', onKeyUp)
      ;(scene as any).__removeKeyListeners = () => {
        window.removeEventListener('keydown', onKeyDown)
        window.removeEventListener('keyup', onKeyUp)
      }

      // Áudio ambiente sintetizado (vento + trilha suave) — só inicia aqui porque o jogador já
      // interagiu com telas anteriores (título/onboarding/tutorial), então o navegador libera
      // áudio sem bloqueio de autoplay.
      startAmbience()

      // IBL real: HDRI CC0 (Poly Haven, kiara_4_mid-morning) — reflexo de ambiente de verdade
      // nos materiais PBR, não só luz hemisférica/direcional aproximada.
      const hdrTexture = new HDRCubeTexture('/assets/hdri/kiara_4_mid-morning_1k.hdr', scene, 256)
      scene.environmentTexture = hdrTexture
      scene.environmentIntensity = 0.75
      scene.createDefaultSkybox(hdrTexture, true, 500)

      const havokInstance = await HavokPhysics()
      if (disposed) return
      // Sem gravidade global — o planeta é redondo, então cada corpo cai na direção do
      // CENTRO do planeta, não uniformemente pra baixo (ver aplicação da força abaixo).
      havokPlugin = new HavokPlugin(false, havokInstance)
      scene.enablePhysics(Vector3.Zero(), havokPlugin)

      // A fórmula contínua de `terrainHeight` não bate exatamente com a malha RENDERIZADA do
      // planeta (malha grossa, 48 segmentos) — erro medido em labs anteriores (rua, rio) de até
      // ~0,1-0,5 unidade, maior perto de bordas íngremes (como a borda de um platô/montanha).
      // `terrainGroundRadial` faz um raycast físico real (contra a MESMA malha que o jogador
      // colide) em vez de confiar só na fórmula — usado por qualquer coisa que precise se
      // posicionar exatamente no chão de verdade (escolas, torre, rochas de montanha).
      // Declarada aqui, logo depois do `havokPlugin` existir, pra poder ser chamada de QUALQUER
      // lugar mais adiante em `setup()` sem risco do bug do lab-42 (chamar antes de uma `const`
      // auxiliar ter rodado sua própria linha de declaração — "zona morta temporal" do JS).
      //
      // Bug real encontrado no lab-43 (relatado pelo usuário: "as rochas e algumas casa estão
      // flutuando... como se a superfície tivesse uma montanha invisível"): a versão anterior
      // (duas cópias quase idênticas, `schoolGroundRadial`/`mountainRockGroundRadial`) usava
      // `ignoreBody` (que só guarda UM corpo) pra tentar pular colisores que não fossem o
      // planeta — mas se o raycast alternasse entre EXATAMENTE DOIS colisores não-planeta (ex.:
      // a parede de uma escola perto de uma rocha de montanha), cada tentativa ignorava só o
      // ÚLTIMO acerto, deixando o raio "ricochetear" pra frente e pra trás entre os mesmos dois
      // colisores pra sempre, nunca alcançando o planeta — mesmo com várias tentativas.
      // Confirmado ao vivo: um raycast numa escola específica (`school-q06`, perto de uma rocha
      // de montanha nova) alternou `walls-q06`/`mountainRockCollider-4-0` em todas as 20
      // tentativas testadas, sem nunca acertar o planeta — a função caía de volta pra fórmula
      // (que perto de uma montanha pode estar bem errada), causando o "flutuando no ar" relatado.
      // Corrigido: em vez de tentar "ignorar" corpos (limitado a um só pela própria API do
      // Havok/Babylon), cada tentativa AVANÇA o ponto de partida do raio pra logo depois do
      // último acerto não-planeta, na mesma direção — geometricamente nunca pode acertar o MESMO
      // colisor de novo (já passou dele), garantindo progresso real em direção ao planeta a cada
      // tentativa, não importa quantos ou quais colisores estejam no caminho.
      const terrainRaycastResult = new PhysicsRaycastResult()
      function terrainGroundRadial(dir: Vector3, formulaHeight: number): number {
        if (!havokPlugin) return PLANET_RADIUS + formulaHeight
        const to = dir.scale(PLANET_RADIUS - 2)
        const rayDir = dir.clone().normalize()
        let from = dir.scale(PLANET_RADIUS + 6)
        for (let attempt = 0; attempt < 12; attempt++) {
          terrainRaycastResult.reset()
          havokPlugin.raycast(from, to, terrainRaycastResult)
          if (!terrainRaycastResult.hasHit) break
          if (terrainRaycastResult.body?.transformNode?.name === 'planet') {
            return terrainRaycastResult.hitPointWorld.length()
          }
          from = terrainRaycastResult.hitPointWorld.subtract(rayDir.scale(0.01))
        }
        return PLANET_RADIUS + formulaHeight
      }

      function settleMeshOnTerrain(root: TransformNode, up: Vector3): void {
        root.computeWorldMatrix(true)
        const samples: Vector3[] = []
        const seed = Math.abs(up.y) < 0.9 ? Vector3.Up() : Vector3.Right()
        const tangentA = Vector3.Cross(up, seed).normalize()
        const tangentB = Vector3.Cross(up, tangentA).normalize()

        for (const mesh of root.getChildMeshes()) {
          const positions = mesh.getVerticesData(VertexBuffer.PositionKind)
          if (!positions) continue
          mesh.computeWorldMatrix(true)
          const worldMatrix = mesh.getWorldMatrix()
          const vertices: { position: Vector3; x: number; z: number; radial: number }[] = []
          for (let i = 0; i < positions.length; i += 3) {
            const position = Vector3.TransformCoordinates(
              new Vector3(positions[i], positions[i + 1], positions[i + 2]),
              worldMatrix,
            )
            vertices.push({
              position,
              x: Vector3.Dot(position, tangentA),
              z: Vector3.Dot(position, tangentB),
              radial: Vector3.Dot(position, up),
            })
          }
          if (vertices.length === 0) continue

          const minX = Math.min(...vertices.map((vertex) => vertex.x))
          const maxX = Math.max(...vertices.map((vertex) => vertex.x))
          const minZ = Math.min(...vertices.map((vertex) => vertex.z))
          const maxZ = Math.max(...vertices.map((vertex) => vertex.z))
          const buckets = new Map<number, (typeof vertices)[number]>()

          for (const vertex of vertices) {
            const xBucket = Math.min(2, Math.floor(((vertex.x - minX) / Math.max(0.0001, maxX - minX)) * 3))
            const zBucket = Math.min(2, Math.floor(((vertex.z - minZ) / Math.max(0.0001, maxZ - minZ)) * 3))
            const key = zBucket * 3 + xBucket
            const current = buckets.get(key)
            if (!current || vertex.radial < current.radial) buckets.set(key, vertex)
          }
          for (const sample of buckets.values()) samples.push(sample.position)
        }

        if (samples.length === 0) return
        let largestGap = 0

        for (const sample of samples) {
          const direction = sample.clone().normalize()
          const groundRadial = terrainGroundRadial(direction, terrainHeight(direction))
          largestGap = Math.max(largestGap, sample.length() - groundRadial)
        }

        if (largestGap > 0) {
          root.position.subtractInPlace(up.scale(largestGap + 0.12))
          root.computeWorldMatrix(true)
        }
      }

      // Camada de UI 2D sobreposta ao mundo 3D (rótulos flutuantes: nome das escolas, bolhas de
      // fala dos NPCs, "pressione E" dos carros lab-25, etc.) — criada cedo (antes de qualquer
      // malha que precise de rótulo) porque vários trechos abaixo (rua/carros, escolas, lagoa,
      // piscina, NPCs) já usam `guiTexture.addControl(...)` conforme vão sendo montados.
      const guiTexture = AdvancedDynamicTexture.CreateFullscreenUI('portalLabels', true, scene)
      // Legendas flutuantes com fonte grande demais e borradas (lab-57, relatado no Poco C75): o
      // ADT do Babylon.GUI, por padrão, usa a MESMA resolução interna da cena 3D
      // (`engine.getRenderWidth/Height()`) — que `hardwareScalingLevel` reduz de propósito em
      // dispositivo fraco pra ganhar FPS. Texto 2D não precisa da mesma resolução reduzida do
      // mundo 3D sombreado (é bem mais barato de desenhar), então a resolução do GUI é forçada
      // pro tamanho real do canvas em pixels de dispositivo, independente de quanto a cena 3D
      // está escalada — reaplicado a cada resize (`onResize` mais abaixo), já que o ADT
      // resincroniza sozinho com a resolução (escalada) da engine a cada `engine.resize()`.
      function syncGuiResolution() {
        if (!canvas) return
        const dpr = window.devicePixelRatio || 1
        guiTexture.scaleTo(Math.round(canvas.clientWidth * dpr), Math.round(canvas.clientHeight * dpr))
      }
      syncGuiResolution()
      // `setup()` roda numa closure própria (é `async`) — `onResize` fica no escopo do efeito
      // principal, lá fora, então precisa dessa ponte pra re-sincronizar depois de cada resize
      // (mesmo padrão de `__setAvatarShirtColor`/`__showLocalChatBubble` já usado neste arquivo).
      ;(scene as any).__syncGuiResolution = syncGuiResolution

      // Planeta — deformado com relevo real (ondulação + platôs), não uma esfera lisa.
      // Colisor físico usa a malha deformada (MESH), não mais SPHERE, pra bater com o visual.
      const planet = MeshBuilder.CreateSphere('planet', { diameter: PLANET_RADIUS * 2, segments: 48 }, scene)
      const planetPositions = planet.getVerticesData(VertexBuffer.PositionKind)!
      for (let i = 0; i < planetPositions.length; i += 3) {
        const dir = new Vector3(planetPositions[i], planetPositions[i + 1], planetPositions[i + 2]).normalize()
        const newRadius = PLANET_RADIUS + terrainHeight(dir)
        planetPositions[i] = dir.x * newRadius
        planetPositions[i + 1] = dir.y * newRadius
        planetPositions[i + 2] = dir.z * newRadius
      }
      planet.updateVerticesData(VertexBuffer.PositionKind, planetPositions)
      const planetNormals: number[] = []
      VertexData.ComputeNormals(planetPositions, planet.getIndices()!, planetNormals)
      planet.updateVerticesData(VertexBuffer.NormalKind, planetNormals)

      // Cor por vértice pra quebrar o verde liso ("morros sem textura") sem precisar de um
      // arquivo de textura: nas partes íngremes (rampa dos platôs) mistura um tom de
      // terra/pedra; no resto, uma variação sutil entre verde e verde-seco via ruído barato —
      // o mesmo tipo de seno/cosseno já usado em `terrainHeight`, não uma textura de verdade.
      const grassColor = new Color3(0.42, 0.68, 0.4)
      const dryGrassColor = new Color3(0.58, 0.64, 0.34)
      const rockColor = new Color3(0.45, 0.4, 0.34)
      // Morros/platôs (relatado pelo usuário com screenshot: "tem grama mas está invisível" —
      // um platô alto mas de rampa suave não tinha cor própria nenhuma, só a mesma grama do
      // resto do planeta, então ficava "invisível" como relevo apesar da altura de verdade).
      // Misturado por ALTURA (não só inclinação como o `rockBlend` acima, que só pega rampa
      // íngreme) — cobre o topo achatado dos platôs também, não só a borda em rampa.
      const hillGreenColor = new Color3(0.2, 0.38, 0.2) // verde bem mais escuro que a grama normal
      const hillBrownColor = new Color3(0.42, 0.3, 0.17) // marrom terra
      // Bioma do deserto (lab-23) — tom de areia, aplicado por cima de tudo o resto (grama/pedra/
      // morro) dentro do raio do bioma, com transição suave na borda (mesmo smoothstep de
      // `applyBasin`) em vez de um corte reto entre grama e areia.
      const sandColor = new Color3(0.86, 0.74, 0.48)
      // Margem de terra da lagoa/piscina (lab-28, pedido do usuário: "a piscina não parece um
      // buraco") — a bacia (`applyBasin`, em `terrainHeight`) já existia geometricamente, só não
      // tinha cor distinta pra ficar visível: virava a mesma grama de sempre, então lia como
      // "chão plano com um disco de água em cima" em vez de uma depressão de verdade.
      const bankColor = new Color3(0.36, 0.26, 0.16) // marrom terra úmida, mais escuro que hillBrownColor
      const planetColors: number[] = []
      for (let i = 0; i < planetPositions.length; i += 3) {
        const px = planetPositions[i]
        const py = planetPositions[i + 1]
        const pz = planetPositions[i + 2]
        const nx = planetNormals[i]
        const ny = planetNormals[i + 1]
        const nz = planetNormals[i + 2]
        const posLen = Math.sqrt(px * px + py * py + pz * pz) || 1
        const slope = (nx * px + ny * py + nz * pz) / posLen // 1 = plano, menor = íngreme
        const rockBlend = Math.max(0, Math.min(1, (0.94 - slope) / 0.3))
        const noise = Math.sin(px * 2.3 + pz * 1.7) * 0.5 + Math.cos(py * 3.1 + px * 1.1) * 0.5
        const dryBlend = Math.max(0, Math.min(1, noise * 0.5 + 0.5)) * 0.4

        let r = grassColor.r + (dryGrassColor.r - grassColor.r) * dryBlend
        let g = grassColor.g + (dryGrassColor.g - grassColor.g) * dryBlend
        let b = grassColor.b + (dryGrassColor.b - grassColor.b) * dryBlend
        r += (rockColor.r - r) * rockBlend
        g += (rockColor.g - g) * rockBlend
        b += (rockColor.b - b) * rockBlend

        // Acima de 0.5 de altura (a ondulação de base do planeta não passa de ~0.27, então só
        // platôs de verdade entram aqui) até 2.0 é o platô mais alto — rampa vira marrom, topo
        // achatado vira verde escuro, com `rockBlend` decidindo a mistura entre os dois.
        const height = posLen - PLANET_RADIUS
        const hillBlend = Math.max(0, Math.min(1, (height - 0.5) / 1.5))
        const hillMixR = hillGreenColor.r + (hillBrownColor.r - hillGreenColor.r) * rockBlend
        const hillMixG = hillGreenColor.g + (hillBrownColor.g - hillGreenColor.g) * rockBlend
        const hillMixB = hillGreenColor.b + (hillBrownColor.b - hillGreenColor.b) * rockBlend
        r += (hillMixR - r) * hillBlend
        g += (hillMixG - g) * hillBlend
        b += (hillMixB - b) * hillBlend

        const desertDot = Math.max(
          -1,
          Math.min(1, (px * DESERT_CENTER_DIR.x + py * DESERT_CENTER_DIR.y + pz * DESERT_CENTER_DIR.z) / posLen),
        )
        const desertAngle = Math.acos(desertDot)
        if (desertAngle < DESERT_RADIUS) {
          const dt = 1 - desertAngle / DESERT_RADIUS
          const desertBlend = dt * dt * (3 - 2 * dt)
          r += (sandColor.r - r) * desertBlend
          g += (sandColor.g - g) * desertBlend
          b += (sandColor.b - b) * desertBlend
        }

        // Margem de terra ao redor da bacia da lagoa/piscina — mesmo smoothstep de `applyBasin`,
        // só que pra cor, não pra altura (a altura já está certa, só faltava aparecer). Sem cor
        // de margem perto de escola nenhuma (mesma proteção de `nearAnySchool` usada na altura,
        // lab-28) — senão a escola ficaria com chão normal mas cor de barro ao redor,
        // inconsistente.
        const dirVec = { x: px / posLen, y: py / posLen, z: pz / posLen }
        if (!nearAnySchool(dirVec)) {
          for (const [centerDir, radius] of [
            [POND_CENTER_DIR, 0.45],
            [POOL_CENTER_DIR, 0.32],
          ] as const) {
            const dot = Math.max(-1, Math.min(1, dirVec.x * centerDir.x + dirVec.y * centerDir.y + dirVec.z * centerDir.z))
            const angle = Math.acos(dot)
            if (angle < radius) {
              const bt = 1 - angle / radius
              const bankBlend = bt * bt * (3 - 2 * bt)
              r += (bankColor.r - r) * bankBlend
              g += (bankColor.g - g) * bankBlend
              b += (bankColor.b - b) * bankBlend
            }
          }
        }

        planetColors.push(r, g, b, 1)
      }
      planet.setVerticesData(VertexBuffer.ColorKind, planetColors)

      const planetMat = new PBRMaterial('planetMat', scene)
      // Branco — a cor de verdade vem da cor por vértice acima; se o albedo também tivesse cor,
      // as duas se multiplicariam e escureceriam tudo.
      planetMat.albedoColor = Color3.White()
      planetMat.roughness = 0.97
      planetMat.metallic = 0
      planet.material = planetMat
      planet.receiveShadows = true
      new PhysicsAggregate(planet, PhysicsShapeType.MESH, { mass: 0, friction: 0.7 }, scene)

      // Props decorativos: modelos glTF reais (Kenney Nature Kit, CC0) — carregados uma vez
      // cada e clonados nos pontos de cena. Licença em public/assets/nature-kit/License.txt.
      const ASSET_BASE = '/assets/nature-kit/'
      async function loadPropTemplate(file: string) {
        const result = await SceneLoader.ImportMeshAsync(null, ASSET_BASE, file, scene)
        const root = result.meshes[0]
        root.setEnabled(false)
        for (const m of result.meshes) m.receiveShadows = true
        return root
      }

      const propFiles = [
        'tree_default.glb', 'tree_oak.glb', 'tree_pineRoundA.glb', 'tree_pineRoundB.glb',
        'tree_fat.glb', 'tree_thin.glb', 'rock_largeA.glb', 'rock_largeC.glb',
        'rock_smallA.glb', 'rock_smallC.glb', 'rock_tallA.glb', 'stone_smallA.glb',
        'flower_purpleA.glb', 'flower_redA.glb', 'flower_yellowA.glb',
        'mushroom_red.glb', 'mushroom_tan.glb', 'log.glb',
      ]
      const propTemplates = await Promise.all(propFiles.map(loadPropTemplate))
      if (disposed) return

      // Pedido do usuário: "coloque mais... flores no planeta, e mais árvores" — em vez de só
      // aumentar `PROP_COUNT` (que manteria a mesma proporção de 1/3 árvore, 1/3 pedra, 1/6 flor,
      // 1/9 cogumelo/tronco, revezando por `i % propTemplates.length`), o índice sorteado agora
      // vem de uma lista com árvore/flor repetidas — sem mudar `propFiles`/`DESERT_ROCK_INDICES`
      // (que dependem dos índices originais continuarem os mesmos).
      const TREE_INDICES = [0, 1, 2, 3, 4, 5]
      const FLOWER_INDICES = [12, 13, 14]
      const OTHER_INDICES = [6, 7, 8, 9, 10, 11, 15, 16, 17]
      const PROP_WEIGHTED_INDICES = [
        ...TREE_INDICES, ...TREE_INDICES,
        ...FLOWER_INDICES, ...FLOWER_INDICES,
        ...OTHER_INDICES,
      ]

      // Cortada de novo no lab-59 (34 → 24, usuário: "os gráficos do tablet Redmi Pad 2 ainda
      // estão com muito lag") — cada prop a menos é um mesh a menos (sem instancing nenhum nesses
      // loops, ver comentário histórico do lab-55 abaixo), então reduzir a quantidade em cenário
      // puramente decorativo é o jeito mais simples e seguro de cortar draw calls sem arriscar um
      // refactor de instancing sem poder testar no aparelho real.
      const PROP_COUNT = isLowEndDevice ? 24 : 65
      for (let i = 0; i < PROP_COUNT; i++) {
        const t = i / PROP_COUNT
        // Cobre de perto do polo (onde a bola nasce) até um pouco além do equador —
        // deixa uma pequena calota livre no polo sul só por simplicidade de câmera.
        const phi = Math.PI * 0.14 + t * Math.PI * 0.6
        const theta = i * GOLDEN_ANGLE * 3.1
        const localUp = new Vector3(
          Math.sin(phi) * Math.cos(theta),
          Math.cos(phi),
          Math.sin(phi) * Math.sin(theta),
        )
        // Raycast físico real (`terrainGroundRadial`), não só a fórmula (pedido do usuário:
        // "as rochas e algumas casa estão flutuando" — o scatter geral de props nunca tinha
        // recebido esta correção, só escolas/torre/rochas de montanha dedicadas; com montanhas
        // maiores e mais numerosas, MUITO mais provável de um prop comum cair perto de uma
        // borda íngreme onde a fórmula erra bastante da malha renderizada de verdade).
        const pos = localUp.scale(terrainGroundRadial(localUp, terrainHeight(localUp)))
        const scale = 1.3 + ((i * 7) % 5) * 0.18
        const spin = (i * GOLDEN_ANGLE * 5) % (Math.PI * 2)

        // Dentro do bioma de deserto (lab-23), troca árvore/flor/cogumelo por rocha ou cacto —
        // nada de verde ali, senão o "deserto" ficaria só com o chão pintado diferente.
        const inDesert =
          Math.acos(Math.max(-1, Math.min(1, Vector3.Dot(localUp, DESERT_CENTER_DIR)))) < DESERT_RADIUS
        const DESERT_ROCK_INDICES = [6, 7, 8, 9, 10, 11] // rock_*/stone_smallA em propFiles
        let instance: TransformNode | null
        let isHandBuiltCactus = false
        if (inDesert && i % 3 === 0) {
          instance = buildCactus(scene, shadowGenerator)
          instance.scaling.setAll(scale)
          isHandBuiltCactus = true
        } else if (inDesert) {
          const rockTemplate = propTemplates[DESERT_ROCK_INDICES[i % DESERT_ROCK_INDICES.length]]
          instance = rockTemplate.clone(`prop-${i}`, null)
        } else {
          const templateIndex = PROP_WEIGHTED_INDICES[i % PROP_WEIGHTED_INDICES.length]
          const template = propTemplates[templateIndex]
          instance = template.clone(`prop-${i}`, null)
        }
        if (!instance) continue
        instance.setEnabled(true)
        instance.position = pos
        instance.rotationQuaternion = alignmentQuaternion(localUp).multiply(
          Quaternion.RotationAxis(Vector3.Up(), spin),
        )
        if (!isHandBuiltCactus) {
          instance.scaling.setAll(scale)
          instance.getChildMeshes().forEach((m) => shadowGenerator.addShadowCaster(m))
        }
        // Prop decorativa: posição/rotação/escala não mudam mais depois daqui — congela a matriz
        // de mundo (custo de recálculo por quadro vira zero) em vez de recalcular à toa todo
        // quadro pros ~65 props + filhos do glTF, um ganho de CPU sem risco visual nenhum (lab-55,
        // parte do pedido de otimização de FPS pro Redmi Pad 2).
        instance.freezeWorldMatrix()
        instance.getChildMeshes().forEach((m) => m.freezeWorldMatrix())

        // Collider simplificado (esfera) e invisível — nunca a malha visual do glTF.
        // Esfera evita ter que alinhar rotação do colisor à curvatura do planeta.
        //
        // Bug real corrigido nesta sessão ("montanha invisível", relatado pelo usuário com
        // screenshot do personagem flutuando no ar): o offset/diâmetro antigos (0.4×diâmetro de
        // deslocamento, diâmetro = 1.1×escala) deixavam até ~2 unidades de esfera pra fora do
        // chão nas props maiores (escala até 2.02×) — uma cúpula invisível grande o bastante pra
        // o jogador ficar em pé em cima dela, apoiado pelo colisor, em vez de esbarrar na lateral
        // e ser bloqueado. Isso sempre existiu, mas só ficou visível depois do bugfix do pulo (lab
        // anterior) passar a fazer o personagem visual seguir a altura real do colisor físico —
        // antes disso, o personagem ficava sempre grudado visualmente no chão, escondendo o
        // problema.
        //
        // Só encolher o colisor não bastou (testado: ainda sobrava ~1.2 de saliência acima do
        // chão nas props maiores, ainda dava pra ficar "em pé no ar"). Em vez de um offset
        // proporcional ao diâmetro, agora o quanto sobra pra fora do chão é uma constante fixa
        // pequena (`PROP_COLLIDER_PROTRUSION`), com o centro da esfera embutido abaixo da
        // superfície o quanto for preciso pra compensar o raio de cada prop — o colisor continua
        // grande o bastante (em volume 3D) pra bloquear o personagem esbarrando na lateral do
        // tronco/corpo da prop, mas não sobra saliência alta o bastante pra virar uma plataforma.
        // Confirmado testando (teleporte + assentamento físico): personagem solto de cima da
        // maior prop do mapa agora cai até a distância normal de chão (mesma de andar em terreno
        // aberto), não fica mais flutuando parado no ar.
        const PROP_COLLIDER_PROTRUSION = 0.15
        const colliderDiameter = 0.7 * scale
        const colliderRadius = colliderDiameter / 2
        const collider = MeshBuilder.CreateSphere(`propCollider-${i}`, { diameter: colliderDiameter }, scene)
        collider.position = pos.add(localUp.scale(PROP_COLLIDER_PROTRUSION - colliderRadius))
        collider.isVisible = false
        new PhysicsAggregate(collider, PhysicsShapeType.SPHERE, { mass: 0 }, scene)
      }

      // Scatter dedicado do bioma de deserto (lab-23) — a distribuição geral de props acima
      // (PROP_COUNT=42 espalhados pela faixa habitável inteira) só derruba ~1 prop dentro de um
      // raio angular pequeno como o do deserto (0.3 rad), deixando o bioma quase vazio (só o
      // chão pintado diferente). Reaproveita o mesmo padrão de "andar até um alvo perto" da IA de
      // vagar dos bichos/NPCs (offset em tangentA/tangentB ao redor de um centro) pra espalhar
      // cactos/rochas só dentro do raio do deserto.
      {
        const desertSeed = Math.abs(DESERT_CENTER_DIR.y) < 0.9 ? Vector3.Up() : Vector3.Right()
        const desertTangentA = Vector3.Cross(DESERT_CENTER_DIR, desertSeed).normalize()
        const desertTangentB = Vector3.Cross(DESERT_CENTER_DIR, desertTangentA).normalize()
        // Pedido do usuário: "diminua a quantidade de rochas do deserto, estão em muito número e
        // uma perto da outra" — de 12 pra 7 (menos itens no total) e `radiusFrac` com piso maior
        // (0,25 → 0,35) pra afastar um pouco mais do centro, reduzindo a chance de dois caírem
        // perto um do outro.
        const DESERT_PROP_COUNT = isLowEndDevice ? 4 : 7
        for (let i = 0; i < DESERT_PROP_COUNT; i++) {
          const angle = (i / DESERT_PROP_COUNT) * Math.PI * 2 + i * 0.73
          const radiusFrac = 0.35 + ((i * 5) % 7) / 7
          const wanderRadius = DESERT_RADIUS * Math.min(0.92, radiusFrac)
          const offset = desertTangentA
            .scale(Math.cos(angle) * wanderRadius)
            .add(desertTangentB.scale(Math.sin(angle) * wanderRadius))
          const localUp = DESERT_CENTER_DIR.add(offset).normalize()
          const pos = localUp.scale(terrainGroundRadial(localUp, terrainHeight(localUp)))
          const scale = 1.0 + ((i * 7) % 5) * 0.15
          const spin = (i * GOLDEN_ANGLE * 5) % (Math.PI * 2)

          let instance: TransformNode | null
          const isCactus = i % 2 === 0
          if (isCactus) {
            instance = buildCactus(scene, shadowGenerator)
          } else {
            const rockTemplate = propTemplates[[6, 7, 8, 9, 10, 11][i % 6]]
            instance = rockTemplate.clone(`desertProp-${i}`, null)
          }
          if (!instance) continue
          instance.setEnabled(true)
          instance.position = pos
          instance.rotationQuaternion = alignmentQuaternion(localUp).multiply(
            Quaternion.RotationAxis(Vector3.Up(), spin),
          )
          instance.scaling.setAll(scale)
          // `buildCactus` já registra seus próprios shadow casters internamente (ver função) —
          // registrar de novo aqui duplicaria a malha na lista de sombra do Havok/Babylon.
          if (!isCactus) instance.getChildMeshes().forEach((m) => shadowGenerator.addShadowCaster(m))
          instance.freezeWorldMatrix()
          instance.getChildMeshes().forEach((m) => m.freezeWorldMatrix())

          const colliderDiameter = 0.7 * scale
          const colliderRadius = colliderDiameter / 2
          const collider = MeshBuilder.CreateSphere(`desertPropCollider-${i}`, { diameter: colliderDiameter }, scene)
          collider.position = pos.add(localUp.scale(0.15 - colliderRadius))
          collider.isVisible = false
          new PhysicsAggregate(collider, PhysicsShapeType.SPHERE, { mass: 0 }, scene)
        }
      }

      // Rochas nas montanhas (lab-42, pedido do usuário: "as montanhas estão invisíveis... elas
      // devem ficar como as rochas ao lado dos cactos") — a montanha em si é só relevo do próprio
      // planeta (cor por vértice, sem malha própria), o que aparentemente não estava lendo como
      // "montanha" visualmente. Em vez de depender só do relevo+cor, cada uma das 12 ganha um
      // grupo de rochas de verdade (mesmos modelos glTF já usados nas rochas do deserto — provado
      // que renderizam certo), bem maiores, espalhadas perto do topo — garante uma presença
      // visual sólida e inconfundível, não importa o que aconteça com a sutileza da cor do
      // relevo. Posição de cada rocha usa `terrainGroundRadial` (raycast físico real, declarada
      // logo depois do `havokPlugin` existir — ver comentário lá pro histórico do bug de
      // ping-pong entre dois colisores que motivou virar uma função compartilhada única).
      const MOUNTAIN_ROCK_TEMPLATE_INDICES = [6, 7, 10] // rock_largeA / rock_largeC / rock_tallA
      PLATEAU_CENTERS.forEach((plateau, pi) => {
        const seed = Math.abs(plateau.dir.y) < 0.9 ? Vector3.Up() : Vector3.Right()
        const tangentA = Vector3.Cross(plateau.dir, seed).normalize()
        const tangentB = Vector3.Cross(plateau.dir, tangentA).normalize()
        const ROCKS_PER_MOUNTAIN = isLowEndDevice ? 2 : 4
        for (let ri = 0; ri < ROCKS_PER_MOUNTAIN; ri++) {
          const angle = (ri / ROCKS_PER_MOUNTAIN) * Math.PI * 2 + pi * 0.9
          const radiusFrac = 0.15 + ((ri * 5 + pi * 3) % 7) / 7 / 1.6 // 0.15-0.58 do raio do platô
          const wanderRadius = plateau.radius * radiusFrac
          const offset = tangentA.scale(Math.cos(angle) * wanderRadius).add(tangentB.scale(Math.sin(angle) * wanderRadius))
          const localUp = plateau.dir.add(offset).normalize()
          const groundRadial = terrainGroundRadial(localUp, terrainHeight(localUp))
          const pos = localUp.scale(groundRadial)
          const scale = 2.6 + ((ri * 7 + pi * 5) % 5) * 0.3 // bem maior que props/rochas normais
          const spin = (ri * GOLDEN_ANGLE * 5 + pi) % (Math.PI * 2)

          const templateIndex = MOUNTAIN_ROCK_TEMPLATE_INDICES[(ri + pi) % MOUNTAIN_ROCK_TEMPLATE_INDICES.length]
          const instance = propTemplates[templateIndex].clone(`mountainRock-${pi}-${ri}`, null)
          if (!instance) continue
          instance.setEnabled(true)
          instance.position = pos
          instance.rotationQuaternion = alignmentQuaternion(localUp).multiply(Quaternion.RotationAxis(Vector3.Up(), spin))
          instance.scaling.setAll(scale)
          settleMeshOnTerrain(instance, localUp)
          // O terreno já é sólido. Um colisor esférico separado ultrapassava a silhueta
          // irregular da rocha e criava rampas invisíveis ao redor dela.
          instance.getChildMeshes().forEach((mesh) => shadowGenerator.addShadowCaster(mesh))
          instance.freezeWorldMatrix()
          instance.getChildMeshes().forEach((mesh) => mesh.freezeWorldMatrix())
        }
      })

      // Moedinhas colecionáveis espalhadas pelo terreno — bônus de exploração à parte das
      // missões (resposta ao pedido de "mais coisa pra interagir"). Sem física própria, só
      // detecção de proximidade (igual às escolas), giram e balançam pra chamar atenção.
      const coinMat = new PBRMaterial('coinMat', scene)
      coinMat.albedoColor = new Color3(0.95, 0.78, 0.2)
      coinMat.emissiveColor = new Color3(0.5, 0.38, 0.05)
      coinMat.roughness = 0.25
      coinMat.metallic = 0.6

      const COIN_COUNT = 14
      // Pivô fixo (alinhado à curvatura do planeta) + malha filha sem rotationQuaternion —
      // separado assim porque um mesh com rotationQuaternion ignora .rotation Euler, e a moeda
      // precisa girar livremente (Euler) enquanto fica "de pé" na superfície (quaternion fixo).
      const coins: { pivot: TransformNode; mesh: Mesh; worldPos: Vector3; collected: boolean }[] = []
      for (let i = 0; i < COIN_COUNT; i++) {
        const phi = Math.PI * 0.18 + ((i * 0.61803398875) % 1) * Math.PI * 0.6
        const theta = i * GOLDEN_ANGLE * 4.3 + 1.1
        const coinUp = new Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta))
        const coinPos = coinUp.scale(PLANET_RADIUS + terrainHeight(coinUp) + 0.5)

        const coinPivot = new TransformNode(`coinPivot-${i}`, scene)
        coinPivot.position = coinPos
        coinPivot.rotationQuaternion = alignmentQuaternion(coinUp)

        const coinMesh = MeshBuilder.CreateCylinder(`coin-${i}`, { height: 0.08, diameter: 0.55 }, scene)
        coinMesh.parent = coinPivot
        coinMesh.material = coinMat
        shadowGenerator.addShadowCaster(coinMesh)
        coins.push({ pivot: coinPivot, mesh: coinMesh, worldPos: coinPos, collected: false })
      }

      // Parkour (lab-11) — sequência de plataformas subindo em ziguezague, só dá pra atravessar
      // pulando. Local escolhido por busca (varredura de candidatos medindo distância angular
      // contra platôs/lagoa/piscina/escolas, mesmo método usado no lab-09 pra achar o lugar da
      // piscina) — ~58° de folga do vizinho mais próximo. Degraus num referencial tangente local
      // fixo (não acompanham a curvatura como o resto do mundo) porque o percurso é pequeno,
      // igual à aproximação já usada em lagoa/piscina. Espaçamento calculado a partir da física
      // real do pulo: JUMP_SPEED=5.5 e GRAVITY=9.81 dão altura máxima de pulo de
      // JUMP_SPEED²/(2·GRAVITY) ≈ 1.54 — cada degrau sobe só 0.85 (bastante folga) — e tempo no
      // ar de ≈1.12s, então mesmo o alcance horizontal do ziguezague (~2.1 por degrau) é
      // confortável contra o quanto dá pra andar nesse tempo (WALK_SPEED/RUN_SPEED só aumentam
      // essa folga, nunca reduzem).
      const PARKOUR_ANCHOR_UP = new Vector3(0.7760390996088926, -0.6156614753256583, 0.13683663134575172).normalize()
      const parkourAnchorPos = PARKOUR_ANCHOR_UP.scale(PLANET_RADIUS + terrainHeight(PARKOUR_ANCHOR_UP))
      const parkourForward = Vector3.Cross(PARKOUR_ANCHOR_UP, Vector3.Right()).normalize()
      const parkourRight = Vector3.Cross(PARKOUR_ANCHOR_UP, parkourForward).normalize()
      const PARKOUR_STEPS = 7
      const PARKOUR_FORWARD_STEP = 1.1
      const PARKOUR_LATERAL_AMPLITUDE = 0.9
      const PARKOUR_HEIGHT_STEP = 0.85

      const parkourPlatformMat = new PBRMaterial('parkourPlatformMat', scene)
      parkourPlatformMat.albedoColor = new Color3(0.72, 0.48, 0.28)
      parkourPlatformMat.roughness = 0.75

      let parkourTopPos = parkourAnchorPos
      for (let i = 0; i < PARKOUR_STEPS; i++) {
        const lateral = (i % 2 === 0 ? 1 : -1) * PARKOUR_LATERAL_AMPLITUDE
        const platPos = parkourAnchorPos
          .add(parkourForward.scale(1.0 + i * PARKOUR_FORWARD_STEP))
          .add(parkourRight.scale(lateral))
          .add(PARKOUR_ANCHOR_UP.scale(0.5 + i * PARKOUR_HEIGHT_STEP))
        parkourTopPos = platPos

        const platform = MeshBuilder.CreateBox(`parkourPlatform-${i}`, { width: 1.3, height: 0.3, depth: 1.3 }, scene)
        platform.position.copyFrom(platPos)
        platform.rotationQuaternion = alignmentQuaternion(PARKOUR_ANCHOR_UP)
        platform.material = parkourPlatformMat
        platform.receiveShadows = true
        shadowGenerator.addShadowCaster(platform)
        new PhysicsAggregate(platform, PhysicsShapeType.BOX, { mass: 0, friction: 0.7 }, scene)
      }

      // Recompensa no topo do percurso — reaproveita o mesmo mecanismo de moeda (visual, giro,
      // detecção de proximidade, coleta) em vez de inventar um sistema novo: um item a mais no
      // mesmo array `coins`, sem lógica extra em lugar nenhum.
      {
        const topCoinPos = parkourTopPos.add(PARKOUR_ANCHOR_UP.scale(0.4))
        const topCoinPivot = new TransformNode('coinPivot-parkourTop', scene)
        topCoinPivot.position = topCoinPos
        topCoinPivot.rotationQuaternion = alignmentQuaternion(PARKOUR_ANCHOR_UP)
        const topCoinMesh = MeshBuilder.CreateCylinder('coin-parkourTop', { height: 0.08, diameter: 0.55 }, scene)
        topCoinMesh.parent = topCoinPivot
        topCoinMesh.material = coinMat
        shadowGenerator.addShadowCaster(topCoinMesh)
        coins.push({ pivot: topCoinPivot, mesh: topCoinMesh, worldPos: topCoinPos, collected: false })
      }

      // Segundo desafio de parkour (pedido do usuário: "o parkour de degraus ficou legal, coloque
      // um desafio maior de blocos mais alto e bem lá em cima ganha mais moedas") — mesma técnica
      // do primeiro (referencial tangente local fixo, física de pulo idêntica), só que com o
      // dobro de degraus (mais alto/mais longo) e várias moedas agrupadas no topo em vez de uma
      // só, pra realmente valer mais quando completado. Local achado por varredura de candidatos
      // (mesmo método de busca por distância angular usado pro primeiro parkour/piscina/lojinha)
      // contra TODOS os marcos do mapa — as 8 montanhas, lagoa, piscina, deserto, o parkour
      // original e a lojinha — margem de folga de ~44° do vizinho mais próximo.
      const PARKOUR2_ANCHOR_UP = new Vector3(0.26684324711116825, -0.754709580222772, -0.5993397458796933).normalize()
      const parkour2AnchorPos = PARKOUR2_ANCHOR_UP.scale(PLANET_RADIUS + terrainHeight(PARKOUR2_ANCHOR_UP))
      const parkour2Forward = Vector3.Cross(PARKOUR2_ANCHOR_UP, Vector3.Right()).normalize()
      const parkour2Right = Vector3.Cross(PARKOUR2_ANCHOR_UP, parkour2Forward).normalize()
      const PARKOUR2_STEPS = 14

      const parkour2PlatformMat = new PBRMaterial('parkour2PlatformMat', scene)
      parkour2PlatformMat.albedoColor = new Color3(0.55, 0.3, 0.65) // roxo — visualmente distinto do primeiro parkour (marrom)
      parkour2PlatformMat.roughness = 0.7

      let parkour2TopPos = parkour2AnchorPos
      for (let i = 0; i < PARKOUR2_STEPS; i++) {
        const lateral = (i % 2 === 0 ? 1 : -1) * PARKOUR_LATERAL_AMPLITUDE
        const platPos = parkour2AnchorPos
          .add(parkour2Forward.scale(1.0 + i * PARKOUR_FORWARD_STEP))
          .add(parkour2Right.scale(lateral))
          .add(PARKOUR2_ANCHOR_UP.scale(0.5 + i * PARKOUR_HEIGHT_STEP))
        parkour2TopPos = platPos

        const platform2 = MeshBuilder.CreateBox(`parkour2Platform-${i}`, { width: 1.3, height: 0.3, depth: 1.3 }, scene)
        platform2.position.copyFrom(platPos)
        platform2.rotationQuaternion = alignmentQuaternion(PARKOUR2_ANCHOR_UP)
        platform2.material = parkour2PlatformMat
        platform2.receiveShadows = true
        shadowGenerator.addShadowCaster(platform2)
        new PhysicsAggregate(platform2, PhysicsShapeType.BOX, { mass: 0, friction: 0.7 }, scene)
      }

      // Recompensa maior no topo — um leque de 5 moedas em vez de 1, pra render o desafio maior
      // (14 degraus contra 7 do primeiro) valer proporcionalmente mais quando completado.
      {
        const TOP_COIN_COUNT = 5
        for (let c = 0; c < TOP_COIN_COUNT; c++) {
          const spreadAngle = (c - (TOP_COIN_COUNT - 1) / 2) * 0.5
          const spreadDir = rotateAroundAxis(parkour2Forward, PARKOUR2_ANCHOR_UP, spreadAngle)
          const topCoinPos = parkour2TopPos.add(PARKOUR2_ANCHOR_UP.scale(0.4)).add(spreadDir.scale(0.5))
          const topCoinPivot = new TransformNode(`coinPivot-parkour2Top-${c}`, scene)
          topCoinPivot.position = topCoinPos
          topCoinPivot.rotationQuaternion = alignmentQuaternion(PARKOUR2_ANCHOR_UP)
          const topCoinMesh = MeshBuilder.CreateCylinder(`coin-parkour2Top-${c}`, { height: 0.08, diameter: 0.55 }, scene)
          topCoinMesh.parent = topCoinPivot
          topCoinMesh.material = coinMat
          shadowGenerator.addShadowCaster(topCoinMesh)
          coins.push({ pivot: topCoinPivot, mesh: topCoinMesh, worldPos: topCoinPos, collected: false })
        }
      }

      // Terceiro desafio de parkour (lab-36, pedido do usuário: "mais parkour", escolhido junto
      // com o mini-game de bichos do lab-35) — os dois primeiros são ziguezagues retos num plano
      // tangente fixo; este é uma ESPIRAL, subindo em círculos cada vez mais estreitos (como uma
      // torre em caracol) em vez de zigue-zague — variação de verdade, não só mais um percurso
      // igual mais comprido. Local achado pela mesma busca de distância angular dos outros
      // desafios (~29,3° de folga do vizinho mais próximo, o primeiro parkour).
      //
      // Espaçamento verificado à parte (script Node, fora do app) antes de escrever este código:
      // a maior distância 3D entre dois degraus consecutivos da espiral é 1,59 (raio inicial 1,8
      // encolhendo até 0,6 ao longo de 12 degraus, 1,5 volta completa) — bem dentro do alcance já
      // comprovado dos outros dois parkours (~2,1-2,36), e fica ainda mais fácil perto do topo (o
      // raio encolhe, cada pulo fica mais curto). Sobe bem mais alto que os outros dois (12
      // degraus × 0,85 ≈ 9,35 unidades) — o próprio conceito de espiral (gira em vez de avançar
      // reto) permite ganhar muito mais altura no mesmo número de degraus sem esticar o percurso
      // por uma faixa enorme do mapa.
      const PARKOUR3_ANCHOR_UP = new Vector3(0.8443669823171058, -0.29237170472273666, -0.4489578882815462).normalize()
      const parkour3AnchorPos = PARKOUR3_ANCHOR_UP.scale(PLANET_RADIUS + terrainHeight(PARKOUR3_ANCHOR_UP))
      const parkour3Forward = Vector3.Cross(PARKOUR3_ANCHOR_UP, Vector3.Right()).normalize()
      const parkour3Right = Vector3.Cross(PARKOUR3_ANCHOR_UP, parkour3Forward).normalize()
      const PARKOUR3_STEPS = 12
      const PARKOUR3_REVOLUTIONS = 1.5
      const PARKOUR3_ANGLE_STEP = (Math.PI * 2 * PARKOUR3_REVOLUTIONS) / PARKOUR3_STEPS
      const PARKOUR3_RADIUS_START = 1.8
      const PARKOUR3_RADIUS_END = 0.6
      const PARKOUR3_HEIGHT_STEP = 0.85 // mesmo valor já comprovado dos outros dois parkours

      const parkour3PlatformMat = new PBRMaterial('parkour3PlatformMat', scene)
      parkour3PlatformMat.albedoColor = new Color3(0.2, 0.55, 0.5) // verde-azulado — distinto do marrom/roxo dos outros dois
      parkour3PlatformMat.roughness = 0.7

      let parkour3TopPos = parkour3AnchorPos
      for (let i = 0; i < PARKOUR3_STEPS; i++) {
        const angle = i * PARKOUR3_ANGLE_STEP
        const t = i / (PARKOUR3_STEPS - 1)
        const radius = PARKOUR3_RADIUS_START + (PARKOUR3_RADIUS_END - PARKOUR3_RADIUS_START) * t
        const platPos = parkour3AnchorPos
          .add(parkour3Right.scale(Math.cos(angle) * radius))
          .add(parkour3Forward.scale(Math.sin(angle) * radius))
          .add(PARKOUR3_ANCHOR_UP.scale(0.5 + i * PARKOUR3_HEIGHT_STEP))
        parkour3TopPos = platPos

        const platform3 = MeshBuilder.CreateBox(`parkour3Platform-${i}`, { width: 1.3, height: 0.3, depth: 1.3 }, scene)
        platform3.position.copyFrom(platPos)
        platform3.rotationQuaternion = alignmentQuaternion(PARKOUR3_ANCHOR_UP)
        platform3.material = parkour3PlatformMat
        platform3.receiveShadows = true
        shadowGenerator.addShadowCaster(platform3)
        new PhysicsAggregate(platform3, PhysicsShapeType.BOX, { mass: 0, friction: 0.7 }, scene)
      }

      // Recompensa no topo — o desafio mais alto dos três, então o leque de moedas é o maior (6).
      {
        const TOP_COIN_COUNT = 6
        for (let c = 0; c < TOP_COIN_COUNT; c++) {
          const spreadAngle = (c / TOP_COIN_COUNT) * Math.PI * 2
          const spreadDir = rotateAroundAxis(parkour3Forward, PARKOUR3_ANCHOR_UP, spreadAngle)
          const topCoinPos = parkour3TopPos.add(PARKOUR3_ANCHOR_UP.scale(0.4)).add(spreadDir.scale(0.4))
          const topCoinPivot = new TransformNode(`coinPivot-parkour3Top-${c}`, scene)
          topCoinPivot.position = topCoinPos
          topCoinPivot.rotationQuaternion = alignmentQuaternion(PARKOUR3_ANCHOR_UP)
          const topCoinMesh = MeshBuilder.CreateCylinder(`coin-parkour3Top-${c}`, { height: 0.08, diameter: 0.55 }, scene)
          topCoinMesh.parent = topCoinPivot
          topCoinMesh.material = coinMat
          shadowGenerator.addShadowCaster(topCoinMesh)
          coins.push({ pivot: topCoinPivot, mesh: topCoinMesh, worldPos: topCoinPos, collected: false })
        }
      }

      // Quarto desafio de parkour (lab-38, pedido do usuário: "parkour que tem laser nos
      // quadradinhos, mas eles devem ser retangulares e pra passar pro retângulo mais alto tem
      // que pular antes o laser, se pisar no laser fazer animação de morrendo e caindo até o
      // planeta novamente") — plataformas retangulares (não quadradas) em linha reta (sem
      // ziguezague lateral — o laser já é o desafio principal, ziguezague junto ficaria injusto),
      // cada uma guardada por um feixe de laser na altura de aproximação: precisa pular ANTES de
      // chegar nele (ficar acima de `LASER_HEIGHT` no momento de cruzar sua posição) — andando
      // normal (sem pular) nunca passa de altura ~0, bem abaixo do feixe.
      const PARKOUR4_ANCHOR_UP = new Vector3(-0.49240387650610407, -0.7660444431189779, 0.413175911166535).normalize()
      const parkour4AnchorPos = PARKOUR4_ANCHOR_UP.scale(PLANET_RADIUS + terrainHeight(PARKOUR4_ANCHOR_UP))
      // Percurso reto (sem `right`/ziguezague — o laser já é o desafio principal).
      const parkour4Forward = Vector3.Cross(PARKOUR4_ANCHOR_UP, Vector3.Right()).normalize()
      const PARKOUR4_STEPS = 8
      const LASER_HEIGHT = 0.5 // acima disso (relativo à plataforma de onde se pulou) já limpou o feixe
      const LASER_HIT_RADIUS = 0.42 // zona de perigo estreita — só bem em cima do feixe, não a passagem toda
      const LASER_APPROACH_T = 0.6 // posição do feixe entre uma plataforma e a próxima (mais perto da próxima — "pular ANTES")

      const parkour4PlatformMat = new PBRMaterial('parkour4PlatformMat', scene)
      parkour4PlatformMat.albedoColor = new Color3(0.3, 0.32, 0.36) // cinza metálico — tema "instalação com laser", distinto dos outros 3
      parkour4PlatformMat.roughness = 0.55
      parkour4PlatformMat.metallic = 0.3

      const laserMat = new PBRMaterial('laserMat', scene)
      laserMat.albedoColor = new Color3(1, 0.08, 0.08)
      laserMat.emissiveColor = new Color3(1, 0.1, 0.1)
      laserMat.disableLighting = true
      laserMat.alpha = 0.9

      interface ParkourLaser {
        worldPos: Vector3
        mesh: Mesh
      }
      const parkour4Lasers: ParkourLaser[] = []

      let parkour4PrevForward = 0
      let parkour4PrevUp = 0
      let parkour4TopPos = parkour4AnchorPos
      for (let i = 0; i < PARKOUR4_STEPS; i++) {
        const stepForward = 1.0 + i * PARKOUR_FORWARD_STEP
        const stepUp = 0.5 + i * PARKOUR_HEIGHT_STEP
        const platPos = parkour4AnchorPos
          .add(parkour4Forward.scale(stepForward))
          .add(PARKOUR4_ANCHOR_UP.scale(stepUp))
        parkour4TopPos = platPos

        // Retangular de verdade (não quadrada): bem mais larga (eixo direita) que funda (eixo
        // frente), como uma barra que atravessa o caminho — pedido explícito do usuário.
        const platform4 = MeshBuilder.CreateBox(`parkour4Platform-${i}`, { width: 2.0, height: 0.3, depth: 0.8 }, scene)
        platform4.position.copyFrom(platPos)
        platform4.rotationQuaternion = alignmentQuaternion(PARKOUR4_ANCHOR_UP)
        platform4.material = parkour4PlatformMat
        platform4.receiveShadows = true
        shadowGenerator.addShadowCaster(platform4)
        new PhysicsAggregate(platform4, PhysicsShapeType.BOX, { mass: 0, friction: 0.7 }, scene)

        // Laser guardando a entrada desta plataforma — altura fixa acima da plataforma ANTERIOR
        // (de onde o jogador pula), posição entre as duas (`LASER_APPROACH_T`, mais perto desta).
        const laserForward = parkour4PrevForward + (stepForward - parkour4PrevForward) * LASER_APPROACH_T
        const laserUp = parkour4PrevUp + LASER_HEIGHT
        const laserWorldPos = parkour4AnchorPos
          .add(parkour4Forward.scale(laserForward))
          .add(PARKOUR4_ANCHOR_UP.scale(laserUp))

        const laserBeam = MeshBuilder.CreateBox(`laserBeam-${i}`, { width: 1.7, height: 0.06, depth: 0.06 }, scene)
        laserBeam.position.copyFrom(laserWorldPos)
        laserBeam.rotationQuaternion = alignmentQuaternion(PARKOUR4_ANCHOR_UP)
        laserBeam.material = laserMat
        parkour4Lasers.push({ worldPos: laserWorldPos, mesh: laserBeam })

        parkour4PrevForward = stepForward
        parkour4PrevUp = stepUp
      }
      if (import.meta.env.DEV) (window as any).__parkour4Lasers = parkour4Lasers

      // Recompensa no topo — 6 moedas, igual ao terceiro (o mais alto até agora); o laser já é
      // o próprio risco/desafio extra deste percurso, não precisa de mais degraus pra justificar.
      {
        const TOP_COIN_COUNT = 6
        for (let c = 0; c < TOP_COIN_COUNT; c++) {
          const spreadAngle = (c / TOP_COIN_COUNT) * Math.PI * 2
          const spreadDir = rotateAroundAxis(parkour4Forward, PARKOUR4_ANCHOR_UP, spreadAngle)
          const topCoinPos = parkour4TopPos.add(PARKOUR4_ANCHOR_UP.scale(0.4)).add(spreadDir.scale(0.4))
          const topCoinPivot = new TransformNode(`coinPivot-parkour4Top-${c}`, scene)
          topCoinPivot.position = topCoinPos
          topCoinPivot.rotationQuaternion = alignmentQuaternion(PARKOUR4_ANCHOR_UP)
          const topCoinMesh = MeshBuilder.CreateCylinder(`coin-parkour4Top-${c}`, { height: 0.08, diameter: 0.55 }, scene)
          topCoinMesh.parent = topCoinPivot
          topCoinMesh.material = coinMat
          shadowGenerator.addShadowCaster(topCoinMesh)
          coins.push({ pivot: topCoinPivot, mesh: topCoinMesh, worldPos: topCoinPos, collected: false })
        }
      }

      // Bichinhos vagando pelo planeta (pedido do usuário: "animais no mundo, animais
      // aleatorios", depois "mais gato", depois "onças, cachorro, falcão") — tipo e ponto de
      // partida sorteados, cada um com velocidade/fase própria pra não se moverem em sincronia.
      // IA de vagar (wander) roda no loop de render abaixo. Falcão voa igual passarinho (asa +
      // altura de voo); cachorro/onça vagam pelo chão igual coelho/esquilo/gato. Onça é mais rara
      // (predador grande, não devia estar em todo canto) que os outros bichos.
      // Mini-game "Amigo dos Bichos" (pedido do usuário: "mini-games com animais") — a primeira
      // vez que o jogador chega bem perto de CADA espécie (não de cada bicho — um coelho já
      // conhecido não dá recompensa de novo, mas o primeiro cachorro sim), toca o mesmo som de
      // moeda e dá uma moeda de verdade (`onCollectCoinRef`), como um "colecione as 7 espécies".
      // Não persiste entre sessões — mesma característica de TODAS as moedas do jogo (o array
      // `coins` também é reconstruído do zero a cada carregamento, `collected: false` sempre),
      // então não é uma inconsistência nova, só o mesmo comportamento já existente aplicado aqui.
      const metSpecies = new Set<CritterKind>()
      const FRIEND_RADIUS = 1.4 // bem mais perto que o raio de som (3.5) — precisa "ir até" o bicho, não só passar perto

      const critters: Critter[] = []
      // 20 → 14 (lab-59, mesmo pedido de FPS do Redmi Pad 2 acima) — cada bicho tem IA de vagar
      // rodando por quadro além do custo de malha, então corta trabalho de CPU e não só GPU.
      const CRITTER_COUNT = isLowEndDevice ? 14 : 39
      for (let i = 0; i < CRITTER_COUNT; i++) {
        const kind: CritterKind =
          i < 8 ? 'coelho'
          : i < 14 ? 'esquilo'
          : i < 20 ? 'gato'
          : i < 26 ? 'passarinho'
          : i < 31 ? 'cachorro'
          : i < 34 ? 'onca'
          : 'falcao'
        const flies = kind === 'passarinho' || kind === 'falcao'
        const phi = Math.PI * 0.14 + Math.random() * Math.PI * 0.6
        const theta = Math.random() * Math.PI * 2
        const up = new Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta))

        let root: TransformNode
        let wingL: TransformNode | undefined
        let wingR: TransformNode | undefined
        if (kind === 'coelho') {
          root = buildCoelho(scene, shadowGenerator)
        } else if (kind === 'esquilo') {
          root = buildEsquilo(scene, shadowGenerator)
        } else if (kind === 'gato') {
          const gatoColor = Color3.Lerp(new Color3(0.85, 0.55, 0.25), new Color3(0.15, 0.15, 0.15), Math.random())
          root = buildGato(scene, shadowGenerator, gatoColor)
        } else if (kind === 'cachorro') {
          const dogColor = Color3.Lerp(new Color3(0.75, 0.55, 0.3), new Color3(0.35, 0.25, 0.15), Math.random())
          root = buildCachorro(scene, shadowGenerator, dogColor)
        } else if (kind === 'onca') {
          root = buildOnca(scene, shadowGenerator)
        } else if (kind === 'passarinho') {
          const passarinhoColor = Color3.Lerp(new Color3(0.75, 0.25, 0.2), new Color3(0.3, 0.4, 0.75), Math.random())
          const built = buildPassarinho(scene, shadowGenerator, passarinhoColor)
          root = built.root
          wingL = built.wingL
          wingR = built.wingR
        } else {
          const built = buildFalcao(scene, shadowGenerator)
          root = built.root
          wingL = built.wingL
          wingR = built.wingR
        }

        critters.push({
          kind,
          root,
          wingL,
          wingR,
          up,
          targetUp: up,
          forward: Vector3.Cross(up, Vector3.Right()).normalize(),
          moveSpeed: (flies ? 0.35 : 0.18) + Math.random() * 0.12,
          hopPhase: Math.random() * Math.PI * 2,
          hopSpeed: (flies ? 12 : 8) + Math.random() * 3,
          restTimer: Math.random() * 3,
          flightHeight: flies ? 1.6 + Math.random() * 0.6 : 0,
        })
      }
      if (import.meta.env.DEV) (window as any).__critters = critters

      // Nuvens — grupos de "pufes" esféricos achatados, cada grupo derivando lentamente ao
      // redor do eixo polar do planeta (efeito de vento/clima, sem física real envolvida).
      const cloudMat = new PBRMaterial('cloudMat', scene)
      cloudMat.albedoColor = new Color3(1, 1, 1)
      cloudMat.emissiveColor = new Color3(1, 1, 1)
      cloudMat.disableLighting = true
      cloudMat.alpha = 0.88
      cloudMat.backFaceCulling = false

      // Fade quando a câmera se aproxima/atravessa um tufo (ver uso mais abaixo, no loop de
      // física por quadro) — cada tufo é pequeno (diâmetro 1,2-1,9 depois da redução de tamanho),
      // então o limiar é proporcionalmente pequeno também.
      const CLOUD_FADE_START = 3.2
      const CLOUD_FADE_END = 1.2
      const CLOUD_MIN_ALPHA = 0.2

      const cloudGroups: { node: Mesh; puffs: Mesh[]; basePos: Vector3; speed: number }[] = []
      // 5 → 4 (lab-59, mesmo pedido de FPS do Redmi Pad 2) — cada nuvem é vários "puffs"
      // (esferas), não uma malha só.
      const CLOUD_COUNT = isLowEndDevice ? 4 : 9
      for (let i = 0; i < CLOUD_COUNT; i++) {
        const phi = Math.PI * 0.15 + (i / CLOUD_COUNT) * Math.PI * 0.55
        const theta = i * GOLDEN_ANGLE * 2.2
        const cloudRadius = PLANET_RADIUS + 4.5 + (i % 3)
        const basePos = new Vector3(
          Math.sin(phi) * Math.cos(theta),
          Math.cos(phi),
          Math.sin(phi) * Math.sin(theta),
        ).scale(cloudRadius)

        const puffCount = 3 + (i % 3)
        const puffs: Mesh[] = []
        for (let p = 0; p < puffCount; p++) {
          // Pedido do usuário: "diminua o tamanho das nuvens" — diâmetro e espaçamento entre
          // tufos reduzidos na mesma proporção (~55% do original) pra manter a silhueta, só
          // menor.
          const puff = MeshBuilder.CreateSphere(`cloud-${i}-${p}`, { diameter: 1.2 + Math.random() * 0.7 }, scene)
          puff.scaling.y = 0.55
          puff.position = new Vector3((p - puffCount / 2) * 0.8, Math.random() * 0.25, Math.random() * 0.35)
          puff.material = cloudMat
          puffs.push(puff)
        }
        const node = puffs[0]
        for (let p = 1; p < puffs.length; p++) puffs[p].parent = node
        node.position = basePos
        cloudGroups.push({ node, puffs, basePos, speed: 0.03 + (i % 4) * 0.01 })
      }

      // Chuva (pedido do usuário: "chuva" — item pendente da lista do lab-09): sistema de
      // partículas simples, textura gerada por `DynamicTexture` (sem depender de nenhum arquivo
      // baixado, mesmo princípio do áudio sintetizado). O emissor é um TransformNode que o loop
      // de render reposiciona/reorienta pra acompanhar o jogador (`rainAnchor.position` = pos do
      // jogador, `rainAnchor.rotationQuaternion` = alinhado ao "up" local) — com `isLocal` ligado,
      // as partículas simulam no espaço local desse nó, então "cair pra baixo" (direção local
      // -Y) já sai automaticamente na direção certa (rumo ao centro do planeta) em qualquer
      // ponto da esfera, sem ter que recalcular a direção de cada partícula manualmente.
      const rainDropTexture = new DynamicTexture('rainDropTex', { width: 8, height: 32 }, scene, false)
      const rainDropCtx = rainDropTexture.getContext() as CanvasRenderingContext2D
      const rainDropGradient = rainDropCtx.createLinearGradient(0, 0, 0, 32)
      rainDropGradient.addColorStop(0, 'rgba(210,230,255,0)')
      rainDropGradient.addColorStop(0.5, 'rgba(210,230,255,0.9)')
      rainDropGradient.addColorStop(1, 'rgba(210,230,255,0)')
      rainDropCtx.fillStyle = rainDropGradient
      rainDropCtx.fillRect(0, 0, 8, 32)
      rainDropTexture.update()

      // Mesh vazio (sem geometria própria), não TransformNode — `ParticleSystem.emitter` só
      // aceita Vector3 ou AbstractMesh.
      const rainAnchor = new Mesh('rainAnchor', scene)
      rainAnchor.isVisible = false
      rainAnchor.rotationQuaternion = Quaternion.Identity()

      const rainSystem = new ParticleSystem('rain', isLowEndDevice ? 150 : 600, scene)
      rainSystem.particleTexture = rainDropTexture
      rainSystem.emitter = rainAnchor
      rainSystem.isLocal = true
      rainSystem.minEmitBox = new Vector3(-4, 5, -4)
      rainSystem.maxEmitBox = new Vector3(4, 6, 4)
      rainSystem.direction1 = new Vector3(-0.15, -1, -0.15)
      rainSystem.direction2 = new Vector3(0.15, -1, 0.15)
      rainSystem.minEmitPower = 9
      rainSystem.maxEmitPower = 12
      rainSystem.gravity = Vector3.Zero()
      rainSystem.updateSpeed = 0.02
      rainSystem.minLifeTime = 0.5
      rainSystem.maxLifeTime = 0.7
      rainSystem.minSize = 0.08
      rainSystem.maxSize = 0.18
      rainSystem.color1 = new Color4(0.75, 0.85, 1, 0.5)
      rainSystem.color2 = new Color4(0.75, 0.85, 1, 0.25)
      rainSystem.colorDead = new Color4(0.75, 0.85, 1, 0)
      rainSystem.blendMode = ParticleSystem.BLENDMODE_STANDARD
      rainSystem.emitRate = 0 // liga suavemente no loop de render, junto com o resto do clima
      rainSystem.start()

      // Removido (lab-32, pedido do usuário: "o rio existe mas está dentro do planeta... se não
      // conseguir fazer funcionar pode apagar") — quatro laboratórios (28-31) tentaram corrigir a
      // água enterrada/invisível (bacia perto de escola, discretização malha-vs-fórmula, raycast
      // acertando colisor errado, folga insuficiente contra z-fighting); mesmo depois de todas
      // essas correções, verificadas uma a uma com raycast físico real, o usuário ainda via a
      // água dentro do planeta em jogo. Em vez de insistir numa quinta rodada, o rio (bacia,
      // malha de água, margens, pato) foi removido — ver `labs/lab-32-.../CONTEXT.md` pro
      // histórico completo da investigação, caso o rio volte a ser pedido no futuro.
      function pointOnSphere(phi: number, theta: number, r: number): Vector3 {
        return new Vector3(
          Math.sin(phi) * Math.cos(theta),
          Math.cos(phi),
          Math.sin(phi) * Math.sin(theta),
        ).scale(r)
      }

      // Rua (lab-15, pedido do usuário: "ruas+carros") — mesma técnica do rio (ribbon rente à
      // curvatura do planeta), asfalto com linha central tracejada.
      //
      // Redesenhada no lab-25 (pedido do usuário: "a estrada deve fazer a volta no planeta") como
      // um laço FECHADO em phi constante, perto do polo norte onde o jogador nasce, theta indo de
      // 0° a 360°. Ajustada de novo no lab-27 (relato do usuário jogando: "a estrada deve fazer a
      // volta no planeta, não em círculo" — o laço original em 18° ficou pequeno/apertado demais,
      // lendo mais como uma rotatória pequena que como uma volta de verdade no planeta):
      // - `STREET_PHI` sobe de 18° pra 25° — quase dobra a circunferência (raio de um círculo de
      //   latitude é proporcional a sen(phi); sen(25°)/sen(18°) ≈ 1,37×) sem cruzar fisicamente
      //   nenhum marco. O limite real não é "nenhum marco com phi < 36°" como no lab-25 (isso só
      //   olhava o CENTRO de cada marco, não o raio dele) — a piscina (phi=36°, raio de bacia de
      //   terreno 0,32 rad ≈ 18,3°) é quem realmente limita: sua borda de bacia chega a ~17,7°.
      //   Mas a bacia é só uma rampa suave de terreno (a rua, como o resto do relevo, segue
      //   `terrainHeight` — se a rua passar na rampa, ela desce/sobe junto, sem flutuar nem
      //   afundar); o obstáculo físico de verdade é só o disco de água da piscina em si
      //   (`poolRadius = 1.1`, ≈ 4,85°), bem menor que o raio da bacia. Com `STREET_PHI = 25°`, a
      //   distância até o centro da piscina (36°) é 11° — folga de ~6° acima do disco de água
      //   mesmo no pior caso (ponto da rua exatamente no mesmo theta da piscina).
      // - Pequena ondulação orgânica em `phi` (mesmo tipo de `Math.sin` já usado no rio) — não
      //   fica mais um círculo geometricamente perfeito visto de cima.
      const STREET_PHI = Math.PI * (25 / 180)
      const STREET_WOBBLE_AMPLITUDE = Math.PI * (1.2 / 180) // ~1,2° — sutil, não come a folga da piscina
      const STREET_SEGMENTS = 96
      const streetCenter: Vector3[] = []
      for (let i = 0; i < STREET_SEGMENTS; i++) {
        // `+ 0.5` desloca a amostragem meio segmento (não muda o resultado sozinho, mas evita
        // theta exatamente 0 por precaução).
        const t = (i + 0.5) / STREET_SEGMENTS
        const theta = t * Math.PI * 2
        const wobble = Math.sin(theta * 5) * STREET_WOBBLE_AMPLITUDE
        const streetDir = pointOnSphere(STREET_PHI + wobble, theta, 1)
        // Margem de altura (lab-28, relato do usuário: "a estrada está abaixo da terra, ela não
        // aparece") — bug real confirmado por raycast físico de verdade (`havokPlugin.raycast`,
        // não só comparação com o vértice mais próximo, que não pega o suficiente): perto de
        // `theta≈0°`/`phi=25°` a malha RENDERIZADA do planeta (48 segmentos) fica até ~0,11
        // ACIMA do valor que a fórmula contínua de `terrainHeight` dá naquele ponto exato — a
        // ondulação de base tem um pico ali que a malha grossa aproxima mal entre dois vértices
        // (a curva do pico é mais "pontuda" que a malha consegue seguir com poucos segmentos).
        // Confirmado varrendo o laço inteiro com raycast: pior caso medido = 0,031 de "chão
        // acima da rua" mesmo já com margem de +0,08 — ou seja, o erro real da malha ali chega a
        // ~0,11, bem maior que qualquer margem "razoável" de poucos centésimos. `+0.2` cobre esse
        // pior caso medido com folga de sobra, sem ficar visivelmente flutuando (a rua já é
        // larga o bastante, 0,85 de meia-largura, pra uma elevação de 0,2 não chamar atenção).
        streetCenter.push(streetDir.scale(PLANET_RADIUS + terrainHeight(streetDir) + 0.2))
      }
      const streetHalfWidth = 0.85
      const streetLeftBank: Vector3[] = []
      const streetRightBank: Vector3[] = []
      for (let i = 0; i < streetCenter.length; i++) {
        const p = streetCenter[i]
        // `.clone()` antes de `.normalize()` — ver comentário no laço equivalente do rio, acima
        // (mesmo bug: `.normalize()` muta no lugar, e `p` é a referência real guardada em
        // `streetCenter[i]`, reaproveitada logo abaixo em `p.add()`/`p.subtract()`).
        const up = p.clone().normalize()
        // Índices com wraparound (`% length`, não `Math.min`/`Math.max` mais) — laço fechado não
        // tem ponta, o vizinho do último ponto é o primeiro e vice-versa.
        const next = streetCenter[(i + 1) % streetCenter.length]
        const prev = streetCenter[(i - 1 + streetCenter.length) % streetCenter.length]
        const along = next.subtract(prev).normalize()
        const side = Vector3.Cross(up, along).normalize()
        streetLeftBank.push(p.add(side.scale(streetHalfWidth)))
        streetRightBank.push(p.subtract(side.scale(streetHalfWidth)))
      }
      const street = MeshBuilder.CreateRibbon(
        'street',
        { pathArray: [streetLeftBank, streetRightBank], sideOrientation: Mesh.DOUBLESIDE, closePath: true },
        scene,
      )
      const streetMat = new PBRMaterial('streetMat', scene)
      streetMat.albedoColor = new Color3(0.22, 0.22, 0.25)
      streetMat.roughness = 0.9
      street.material = streetMat
      street.receiveShadows = true

      // Linha central tracejada — só desenha em segmentos alternados (índice par), fininha e
      // levemente acima do asfalto (evita brigar com o chão, mesmo truque do rio). `% length`
      // no vizinho fecha o último traço de volta pro primeiro ponto (STREET_SEGMENTS=72 é par,
      // então a alternância par/ímpar continua consistente na volta).
      const centerLineMat = new PBRMaterial('centerLineMat', scene)
      centerLineMat.albedoColor = new Color3(0.92, 0.8, 0.25)
      centerLineMat.emissiveColor = new Color3(0.15, 0.13, 0.03)
      centerLineMat.roughness = 0.6
      const centerLineHalfWidth = 0.05
      for (let i = 0; i < streetCenter.length; i += 2) {
        const p = streetCenter[i]
        const up = p.clone().normalize()
        const next = streetCenter[(i + 1) % streetCenter.length]
        const along = next.subtract(p).normalize()
        const side = Vector3.Cross(up, along).normalize()
        const dashLeft = [p.add(side.scale(centerLineHalfWidth)).add(up.scale(0.005)), next.add(side.scale(centerLineHalfWidth)).add(up.scale(0.005))]
        const dashRight = [p.subtract(side.scale(centerLineHalfWidth)).add(up.scale(0.005)), next.subtract(side.scale(centerLineHalfWidth)).add(up.scale(0.005))]
        const dash = MeshBuilder.CreateRibbon(
          `streetDash-${i}`,
          { pathArray: [dashLeft, dashRight], sideOrientation: Mesh.DOUBLESIDE },
          scene,
        )
        dash.material = centerLineMat
      }

      // Carrinhos dando voltas contínuas na rua (laço fechado, lab-25 — antes era ping-pong, mas
      // um laço fechado não tem ponta pra ricochetear), espalhados e com velocidades diferentes
      // pra não andarem em fileira sincronizada.
      const carros: Carro[] = []
      const CARRO_COUNT = 5
      const CARRO_COLORS = [
        new Color3(0.85, 0.2, 0.2),
        new Color3(0.2, 0.4, 0.85),
        new Color3(0.95, 0.8, 0.2),
        new Color3(0.3, 0.75, 0.35),
        new Color3(0.85, 0.85, 0.88),
      ]
      for (let i = 0; i < CARRO_COUNT; i++) {
        const carRoot = buildCarro(scene, shadowGenerator, CARRO_COLORS[i % CARRO_COLORS.length])

        const hintLabel = new TextBlock(`carHint-${i}`, 'Pressione E pra entrar')
        hintLabel.color = 'white'
        hintLabel.fontSize = mobileFontSize(18)
        hintLabel.fontWeight = 'bold'
        hintLabel.outlineWidth = 3
        hintLabel.outlineColor = 'rgba(0,0,0,0.6)'
        hintLabel.alpha = 0
        guiTexture.addControl(hintLabel)
        hintLabel.linkWithMesh(carRoot)
        hintLabel.linkOffsetY = -55

        carros.push({
          root: carRoot,
          pathIndex: (i / CARRO_COUNT) * streetCenter.length,
          direction: i % 2 === 0 ? 1 : -1,
          speed: 3 + Math.random() * 2,
          hintLabel,
        })
      }
      if (import.meta.env.DEV) {
        ;(window as any).__carros = carros
        ;(window as any).__streetCenter = streetCenter
      }

      // Estação de lançamento (lab-58, pedido do usuário: "crie um foguete e uma estação de
      // decolagem espacial... como se fosse um prédio, em que você aperta a tecla E e consegue
      // voar pra um outro planetinha"). `settleMeshOnTerrain` (mesma função usada nas rochas de
      // montanha) garante que a plataforma toda fique apoiada de verdade no relevo real, não só
      // na fórmula analítica de altura, igual ao resto dos "prédios" do jogo (escolas/lojinha).
      // `settleMeshOnTerrain` (usada nas rochas de montanha) NÃO serve aqui de propósito: ela
      // pega o ponto mais baixo de CADA malha-filha dentro do próprio contorno, pra decidir
      // "quanto baixar" — funciona bem pra um pedregulho de silhueta baixa e uniforme, mas o
      // nariz do foguete é uma malha-filha isolada, alta, que nunca encosta no chão; seu "ponto
      // mais baixo" (~3 unidades acima da base) foi lido como "está flutuando 3 unidades",
      // afundando o foguete inteiro no chão até a ponta do nariz "pousar". Bug real encontrado
      // testando ao vivo (`window.__scene.getTransformNodeByName('rocketRoot').position` batendo
      // ~3 unidades mais perto da origem do que o avatar recém-teleportado pro mesmo lugar).
      {
        const rocketRoot = buildRocket(scene, shadowGenerator)
        rocketRoot.position = ROCKET_LAUNCH_DIR.scale(terrainGroundRadial(ROCKET_LAUNCH_DIR, terrainHeight(ROCKET_LAUNCH_DIR)))
        rocketRoot.rotationQuaternion = alignmentQuaternion(ROCKET_LAUNCH_DIR)

        const rocketColliderDiameter = 2.6
        const rocketCollider = MeshBuilder.CreateCylinder(
          'rocketCollider',
          { diameter: rocketColliderDiameter, height: 3 },
          scene,
        )
        rocketCollider.position = ROCKET_LAUNCH_DIR.scale(
          terrainGroundRadial(ROCKET_LAUNCH_DIR, terrainHeight(ROCKET_LAUNCH_DIR)) + 1.4,
        )
        rocketCollider.rotationQuaternion = alignmentQuaternion(ROCKET_LAUNCH_DIR)
        rocketCollider.isVisible = false
        new PhysicsAggregate(rocketCollider, PhysicsShapeType.CYLINDER, { mass: 0 }, scene)

        const rocketHint = new TextBlock('rocketHint', 'Pressione E pra embarcar')
        rocketHint.color = 'white'
        rocketHint.fontSize = mobileFontSize(18)
        rocketHint.fontWeight = 'bold'
        rocketHint.outlineWidth = 3
        rocketHint.outlineColor = 'rgba(0,0,0,0.6)'
        rocketHint.alpha = 0
        guiTexture.addControl(rocketHint)
        rocketHint.linkWithMesh(rocketRoot)
        rocketHint.linkOffsetY = -230
        mainRocket = { root: rocketRoot, hintLabel: rocketHint }
      }

      // Espada e arma a laser (lab-61, pedido do usuário: "crie uma espada que deve ser pega na
      // terra para usar no planeta pra nocautear o ET e uma arma para usar no robô, dê dicas de
      // como encontrar"). Legendas flutuantes SEMPRE visíveis (não só de perto, diferente das
      // dicas "Pressione E") — funcionam como a própria dica de localização pedida pelo usuário,
      // visíveis de longe enquanto o jogador explora o planeta principal.
      {
        const swordRoot = buildSword(scene, shadowGenerator)
        swordRoot.position = SWORD_LOCATION_DIR.scale(
          terrainGroundRadial(SWORD_LOCATION_DIR, terrainHeight(SWORD_LOCATION_DIR)),
        )
        const swordLabel = new TextBlock('swordLabel', '🗡️ Espada')
        swordLabel.color = 'white'
        swordLabel.fontSize = mobileFontSize(18)
        swordLabel.fontWeight = 'bold'
        swordLabel.outlineWidth = 3
        swordLabel.outlineColor = 'rgba(0,0,0,0.6)'
        guiTexture.addControl(swordLabel)
        swordLabel.linkWithMesh(swordRoot)
        swordLabel.linkOffsetY = -60
        swordPickup = { root: swordRoot, label: swordLabel }
      }
      {
        const gunRoot = buildLaserGun(scene, shadowGenerator)
        gunRoot.position = GUN_LOCATION_DIR.scale(terrainGroundRadial(GUN_LOCATION_DIR, terrainHeight(GUN_LOCATION_DIR)))
        const gunLabel = new TextBlock('gunLabel', '🔫 Arma a laser')
        gunLabel.color = 'white'
        gunLabel.fontSize = mobileFontSize(18)
        gunLabel.fontWeight = 'bold'
        gunLabel.outlineWidth = 3
        gunLabel.outlineColor = 'rgba(0,0,0,0.6)'
        guiTexture.addControl(gunLabel)
        gunLabel.linkWithMesh(gunRoot)
        gunLabel.linkOffsetY = -60
        gunPickup = { root: gunRoot, label: gunLabel }
      }

      // Foguete voador (lab-59) — o veículo de verdade usado durante o trecho pilotado entre as
      // duas plataformas (ver `boardRocket`/`landRocket`). `buildRocketVehicle`, não `buildRocket`
      // — sem a base/pilares da plataforma fixa (ver comentário em `addRocketBody`). Escondido até
      // o primeiro embarque.
      flyingRocket = buildRocketVehicle(scene, shadowGenerator)
      flyingRocket.setEnabled(false)

      // Chama de escapamento (lab-59, pedido do usuário: "tem que sair fogo dos motores") —
      // partículas com textura gerada num canvas (gradiente radial amarelo→laranja→transparente,
      // mesma técnica da gota de chuva acima), saindo pra trás dos bocais dos motores (direção -Y
      // local — o oposto do nariz). `isLocal = true` faz as partículas nascerem já na orientação
      // ATUAL da nave a cada quadro, sem precisar recalcular a direção manualmente conforme ela
      // gira durante o voo. Desligada por padrão (`emitRate = 0`); liga/desliga junto com o som do
      // motor em `boardRocket`/`landRocket`.
      const flameTexture = new DynamicTexture('rocketFlameTex', { width: 32, height: 32 }, scene, false)
      const flameCtx = flameTexture.getContext() as CanvasRenderingContext2D
      const flameGradient = flameCtx.createRadialGradient(16, 16, 0, 16, 16, 16)
      flameGradient.addColorStop(0, 'rgba(255,255,220,1)')
      flameGradient.addColorStop(0.4, 'rgba(255,170,60,0.9)')
      flameGradient.addColorStop(1, 'rgba(255,80,20,0)')
      flameCtx.fillStyle = flameGradient
      flameCtx.fillRect(0, 0, 32, 32)
      flameTexture.update()

      const flameAnchor = new Mesh('rocketFlameAnchor', scene)
      flameAnchor.isVisible = false
      flameAnchor.parent = flyingRocket
      flameAnchor.position = new Vector3(0, -0.05, 0)
      flameAnchor.rotationQuaternion = Quaternion.Identity()

      rocketFlameSystem = new ParticleSystem('rocketFlame', 150, scene)
      rocketFlameSystem.particleTexture = flameTexture
      rocketFlameSystem.emitter = flameAnchor
      rocketFlameSystem.isLocal = true
      rocketFlameSystem.minEmitBox = new Vector3(-0.12, 0, -0.12)
      rocketFlameSystem.maxEmitBox = new Vector3(0.12, 0, 0.12)
      rocketFlameSystem.direction1 = new Vector3(-0.2, -1, -0.2)
      rocketFlameSystem.direction2 = new Vector3(0.2, -1, 0.2)
      rocketFlameSystem.minEmitPower = 4
      rocketFlameSystem.maxEmitPower = 7
      rocketFlameSystem.gravity = Vector3.Zero()
      rocketFlameSystem.updateSpeed = 0.02
      rocketFlameSystem.minLifeTime = 0.12
      rocketFlameSystem.maxLifeTime = 0.22
      rocketFlameSystem.minSize = 0.25
      rocketFlameSystem.maxSize = 0.55
      rocketFlameSystem.color1 = new Color4(1, 0.95, 0.6, 0.9)
      rocketFlameSystem.color2 = new Color4(1, 0.55, 0.15, 0.7)
      rocketFlameSystem.colorDead = new Color4(1, 0.3, 0.1, 0)
      rocketFlameSystem.blendMode = ParticleSystem.BLENDMODE_ADD
      rocketFlameSystem.emitRate = 0
      rocketFlameSystem.start()

      // Planetinha secundário (lab-58) — só construído quando o jogador embarca no foguete pela
      // primeira vez ("só aparece quando você embarca na nave", pedido do usuário), não fica
      // sempre presente na cena. Bem mais simples que o principal de propósito (pedido do
      // usuário: "por enquanto o planetinha pode ter só árvores e rochas, não precisa NPC") —
      // esfera lisa sem relevo/bacias/biomas, colisor físico esférico único (bem mais barato que
      // a malha deformada do planeta principal).
      function buildSecondPlanetIfNeeded() {
        if (secondPlanetBuilt) return
        secondPlanetBuilt = true

        const secondPlanetRoot = new TransformNode('secondPlanetRoot', scene)
        secondPlanetRoot.position = SECOND_PLANET_CENTER

        // Marte (lab-59, pedido do usuário: "o outro planeta é Marte... ele é meio marrom") —
        // marrom-avermelhado, sem trocar céu/luz (globais, compartilhados com o planeta
        // principal; trocar exigiria salvar/restaurar o estado inteiro ao ir e voltar — fora de
        // escopo do "por enquanto" pedido pelo usuário desde o lab-58).
        const groundMat = new PBRMaterial('secondPlanetGroundMat', scene)
        groundMat.albedoColor = new Color3(0.56, 0.35, 0.22)
        groundMat.roughness = 0.92
        const groundSphere = MeshBuilder.CreateSphere(
          'secondPlanetGround',
          { diameter: SECOND_PLANET_RADIUS * 2, segments: 28 },
          scene,
        )
        groundSphere.material = groundMat
        groundSphere.parent = secondPlanetRoot
        groundSphere.receiveShadows = true
        groundSphere.computeWorldMatrix(true)
        new PhysicsAggregate(groundSphere, PhysicsShapeType.SPHERE, { mass: 0, friction: 0.6 }, scene)

        // Só rocha, sem árvore nenhuma (pedido do usuário: "não tem árvores só rocha") —
        // reaproveita os mesmos modelos glTF de rocha já carregados pro planeta principal
        // (índices 6-10 em `propFiles`), intercalados com algumas entradas de caverna
        // (`buildCaveEntrance`, pedido do usuário: "o que tem lá são cavernas"). Sem shadow
        // caster: o ShadowGenerator já tem o alcance ajustado pro planeta principal, e este é um
        // bônus pequeno e distante — não vale o custo de sombra própria.
        //
        // `stone_smallA` (índice 11) ficou de fora aqui (lab-65, pedido do usuário: "tem umas
        // bolas gigantes em Marte que não se parecem rocha marciana, parece só bolas esquisita")
        // — esse modelo do Kenney Nature Kit é um seixo liso e arredondado por design, lendo como
        // uma bola em vez de rocha quando ampliado; os outros 5 índices são mais angulares/
        // irregulares e continuam soando "rocha" em qualquer escala. Ainda usado no planeta
        // principal (`DESERT_ROCK_INDICES`), onde faz sentido junto de rochas maiores.
        const SECOND_PLANET_PROP_COUNT = 22
        const rockIndices = [6, 7, 8, 9, 10]
        // Mesmo raciocínio do colisor-esfera invisível das props do planeta principal (ver
        // `PROP_COLLIDER_PROTRUSION` acima) — sem física de verdade na malha do glTF (cara e
        // desnecessária pra bloquear passagem), uma esfera invisível pequena o bastante pra não
        // virar plataforma, grande o bastante pra bloquear esbarrão lateral. Resolve o outro
        // pedido do usuário: "mas sem física de colisão".
        const MARS_ROCK_COLLIDER_PROTRUSION = 0.15
        for (let i = 0; i < SECOND_PLANET_PROP_COUNT; i++) {
          const phi = Math.acos(1 - 2 * ((i + 0.5) / SECOND_PLANET_PROP_COUNT))
          const theta = i * GOLDEN_ANGLE * 3.3
          const localUp = new Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta))
          // Não planta nada perto do foguete de volta nem da estação alienígena.
          if (Vector3.Dot(localUp, SECOND_PLANET_LANDING_UP) > Math.cos(0.4)) continue
          // Raio de exclusão maior que o raio angular da própria estação (UFO_RADIUS=3.2 num
          // planeta de raio 6 já ocupa ~0.56 rad sozinha) — bug real encontrado testando ao vivo:
          // com 0.5 rad, uma rocha (`rock_tallA`) nascia perto o bastante pra atravessar visualmente
          // a estrutura da estação.
          if (Vector3.Dot(localUp, MARS_UFO_DIR) > Math.cos(0.8)) continue

          let instance: TransformNode | null
          const isCave = i % 4 === 0
          if (isCave) {
            instance = buildCaveEntrance(scene)
          } else {
            const templateIndex = rockIndices[i % rockIndices.length]
            instance = propTemplates[templateIndex].clone(`secondPlanetProp-${i}`, null)
            if (instance) instance.setEnabled(true)
          }
          if (!instance) continue
          instance.parent = secondPlanetRoot
          const propPos = localUp.scale(SECOND_PLANET_RADIUS)
          const propScale = 0.9 + ((i * 7) % 5) * 0.15
          instance.position = propPos
          instance.rotationQuaternion = alignmentQuaternion(localUp)
          instance.scaling.setAll(propScale)
          instance.freezeWorldMatrix()
          instance.getChildMeshes().forEach((m) => m.freezeWorldMatrix())

          // Colisão só nas rochas — a entrada de caverna continua vazada de propósito (você anda
          // pra dentro dela, não é um obstáculo).
          if (!isCave) {
            const colliderDiameter = 0.7 * propScale
            const colliderRadius = colliderDiameter / 2
            const collider = MeshBuilder.CreateSphere(
              `secondPlanetPropCollider-${i}`,
              { diameter: colliderDiameter },
              scene,
            )
            // Parentado no `secondPlanetRoot` como a prop visual — sem isso, `.position` seria
            // interpretado em espaço de mundo (origem do jogo, não o centro de Marte), plantando
            // o colisor bem longe da rocha de verdade.
            collider.parent = secondPlanetRoot
            collider.position = propPos.add(localUp.scale(MARS_ROCK_COLLIDER_PROTRUSION - colliderRadius))
            collider.isVisible = false
            collider.computeWorldMatrix(true)
            new PhysicsAggregate(collider, PhysicsShapeType.SPHERE, { mass: 0 }, scene)
          }
        }

        // Morros (lab-65, pedido do usuário: "ele deve ter alguns rochedos pequenos, morros...")
        // — distribuição própria, bem mais esparsa que as rochas (só uns poucos, senão vira uma
        // parede de morro em vez de um relevo ocasional), com uma fase angular diferente
        // (`* 2.1` em vez de `* 3.3`) pra não empilhar em cima das rochas/cavernas acima.
        const MARS_HILL_COUNT = 4
        for (let i = 0; i < MARS_HILL_COUNT; i++) {
          const phi = Math.acos(1 - 2 * ((i + 0.5) / MARS_HILL_COUNT))
          const theta = i * GOLDEN_ANGLE * 2.1 + 0.9
          const localUp = new Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta))
          if (Vector3.Dot(localUp, SECOND_PLANET_LANDING_UP) > Math.cos(0.5)) continue
          // Mesmo raciocínio da exclusão das rochas acima, com mais folga ainda (morro é maior).
          if (Vector3.Dot(localUp, MARS_UFO_DIR) > Math.cos(0.95)) continue

          const hill = buildMarsHill(scene)
          hill.parent = secondPlanetRoot
          const hillPos = localUp.scale(SECOND_PLANET_RADIUS)
          hill.position = hillPos
          hill.rotationQuaternion = alignmentQuaternion(localUp).multiply(Quaternion.RotationAxis(Vector3.Up(), i * 1.7))
          hill.freezeWorldMatrix()
          hill.getChildMeshes().forEach((m) => m.freezeWorldMatrix())

          // Mesmo colisor-esfera invisível e embutido das rochas acima, só maior — bloqueia
          // esbarrão lateral sem virar plataforma.
          const hillColliderDiameter = 2.1
          const hillColliderRadius = hillColliderDiameter / 2
          const hillCollider = MeshBuilder.CreateSphere(
            `marsHillCollider-${i}`,
            { diameter: hillColliderDiameter },
            scene,
          )
          hillCollider.parent = secondPlanetRoot
          hillCollider.position = hillPos.add(localUp.scale(MARS_ROCK_COLLIDER_PROTRUSION - hillColliderRadius))
          hillCollider.isVisible = false
          hillCollider.computeWorldMatrix(true)
          new PhysicsAggregate(hillCollider, PhysicsShapeType.SPHERE, { mass: 0 }, scene)
        }

        // Estação alienígena / disco voador (lab-65, pedido do usuário: "uma estação
        // extraterrestre avançada e moderna parecendo um disco voador em que é possível entrar e
        // ver um painel de nave espacial").
        const ufoRoot = buildUfoStation(scene, shadowGenerator, secondPlanetRoot, MARS_UFO_DIR, SECOND_PLANET_RADIUS)
        ufoRoot.freezeWorldMatrix()
        ufoRoot.getChildMeshes().forEach((m) => m.freezeWorldMatrix())

        const ufoLabel = new TextBlock('ufoLabel', 'Estação Alienígena')
        ufoLabel.color = 'white'
        ufoLabel.fontSize = mobileFontSize(22)
        ufoLabel.fontWeight = 'bold'
        ufoLabel.outlineWidth = 4
        ufoLabel.outlineColor = 'rgba(0,0,0,0.5)'
        guiTexture.addControl(ufoLabel)
        ufoLabel.linkWithMesh(ufoRoot)
        ufoLabel.linkOffsetY = -130

        // Foguete de volta.
        const returnRocketRoot = buildRocket(scene, shadowGenerator)
        returnRocketRoot.parent = secondPlanetRoot
        returnRocketRoot.position = SECOND_PLANET_LANDING_UP.scale(SECOND_PLANET_RADIUS)
        returnRocketRoot.rotationQuaternion = alignmentQuaternion(SECOND_PLANET_LANDING_UP)
        const returnHint = new TextBlock('secondPlanetRocketHint', 'Pressione E pra voltar')
        returnHint.color = 'white'
        returnHint.fontSize = mobileFontSize(18)
        returnHint.fontWeight = 'bold'
        returnHint.outlineWidth = 3
        returnHint.outlineColor = 'rgba(0,0,0,0.6)'
        returnHint.alpha = 0
        guiTexture.addControl(returnHint)
        returnHint.linkWithMesh(returnRocketRoot)
        returnHint.linkOffsetY = -230
        secondPlanetReturnRocket = { root: returnRocketRoot, hintLabel: returnHint }

        // Inimigos (lab-60, pedido do usuário: "no planeta marciano tem que ter ETs e robôs que
        // tenta matar o nosso boneco") — distribuição própria (multiplicador de theta diferente
        // do loop de props acima) pra não nascerem em cima de rocha/caverna nenhuma; mesma
        // exclusão perto do foguete de volta (senão o jogador já nasceria sendo atacado ao
        // pousar). Metade da contagem em dispositivo fraco, mesmo espírito dos cortes de
        // performance do lab-59 — cada inimigo roda IA por quadro.
        const enemyCount = isLowEndDevice ? MARS_ENEMY_COUNT_LOW_END : MARS_ENEMY_COUNT
        for (let i = 0; i < enemyCount; i++) {
          const phi = Math.acos(1 - 2 * ((i + 0.5) / enemyCount))
          const theta = i * GOLDEN_ANGLE * 5.1 + 1.7
          const enemyUp = new Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta))
          if (Vector3.Dot(enemyUp, SECOND_PLANET_LANDING_UP) > Math.cos(0.6)) continue

          const kind: MarsEnemyKind = i % 2 === 0 ? 'et' : 'robo'
          const enemyRoot = kind === 'et' ? buildAlien(scene, shadowGenerator) : buildRobo(scene, shadowGenerator)
          enemyRoot.parent = secondPlanetRoot
          enemyRoot.position = enemyUp.scale(SECOND_PLANET_RADIUS)
          enemyRoot.rotationQuaternion = alignmentQuaternion(enemyUp)
          marsEnemies.push({
            kind,
            root: enemyRoot,
            up: enemyUp,
            targetUp: enemyUp,
            forward: Vector3.Cross(enemyUp, Vector3.Right()).normalize(),
            homeUp: enemyUp,
            restTimer: Math.random() * 2,
            attackCooldown: 0,
            alive: true,
            lungeTimer: 0,
          })
        }
      }

      // Lagoa (pedido do usuário: "lago com peixe e pato e tartaruga") — separada do rio, num
      // ponto de theta bem distante da faixa do rio (0.15-1.35) pra não sobrepor. Os bichos da
      // lagoa se movem em círculos num plano local tangente à esfera (aproximação razoável pro
      // raio pequeno da lagoa — a curvatura do planeta nessa escala é desprezível), não com a
      // mesma IA de "vagar pela esfera toda" dos bichos de terra, porque ficam confinados aqui.
      //
      // Removida em aparelho fraco (lab-66, pedido do usuário: "os FPS ficam muito pesados no
      // tablet... se ajudar renderizar menos elementos pode excluir... o lago e os peixes") —
      // `pondUp`/`pondCenterPos`/`pondForward`/`pondRight` continuam declaradas fora do `if`
      // (com um valor padrão nunca lido de verdade) porque o laço de animação mais abaixo lê
      // esses nomes; como fica vazio sem nenhum `pondCritters.push(...)` aqui, esse laço nunca
      // itera em aparelho fraco — sem precisar duplicar/condicionar o laço também.
      let pondUp = Vector3.Up()
      let pondCenterPos = Vector3.Zero()
      let pondForward = Vector3.Right()
      let pondRight = Vector3.Forward()
      const pondCritters: PondCritter[] = []
      if (!isLowEndDevice) {
        pondUp = POND_CENTER_DIR
        pondCenterPos = pondUp.scale(PLANET_RADIUS + terrainHeight(pondUp) + 0.3)
        pondForward = Vector3.Cross(pondUp, Vector3.Right()).normalize()
        pondRight = Vector3.Cross(pondUp, pondForward).normalize()
        const pondRadius = 1.6

        // Cilindro baixo, não CreateDisc — o disco nasce de pé (normal no eixo Z), então
        // `alignmentQuaternion` (que assume a face "de cima" no eixo Y) deixaria a lagoa em pé
        // feito uma parede. O cilindro já nasce deitado (eixo Y, igual à moeda), sem esse problema.
        const pond = MeshBuilder.CreateCylinder('pond', { diameter: pondRadius * 2, height: 0.04, tessellation: 32 }, scene)
        const pondMat = new PBRMaterial('pondMat', scene)
        pondMat.albedoColor = new Color3(0.1, 0.32, 0.55)
        // Reflexo de água (lab-28, pedido do usuário) — `roughness` bem baixo + `metallic` alto
        // fazem a água refletir de verdade o `environmentTexture` HDRI já carregado na cena (céu/
        // nuvens), em vez de só uma cor azul lisa sem brilho.
        pondMat.roughness = 0.04
        pondMat.metallic = 0.65
        pondMat.alpha = 0.92
        pond.material = pondMat
        pond.position.copyFrom(pondCenterPos)
        pond.rotationQuaternion = alignmentQuaternion(pondUp)
        pond.receiveShadows = true

        for (let i = 0; i < 3; i++) {
          pondCritters.push({
            root: buildPeixe(scene, i / 2),
            angleOffset: (i / 3) * Math.PI * 2,
            radius: 0.5 + i * 0.25,
            speed: 0.9 + i * 0.15,
            bobPhase: Math.random() * Math.PI * 2,
            depth: -0.06,
          })
        }
        pondCritters.push({
          root: buildPato(scene, shadowGenerator),
          angleOffset: Math.random() * Math.PI * 2,
          radius: 1.05,
          speed: 0.4,
          bobPhase: Math.random() * Math.PI * 2,
          depth: 0.03,
        })
        pondCritters.push({
          root: buildTartaruga(scene, shadowGenerator),
          angleOffset: Math.random() * Math.PI * 2,
          radius: 1.2,
          speed: 0.18,
          bobPhase: Math.random() * Math.PI * 2,
          depth: 0.01,
        })
      }

      // Grama animada por vento — shader customizado (não textura), milhares de lâminas via
      // thin instances (1 draw call). O balanço acontece em espaço local do vértice, antes da
      // matriz de mundo por instância aplicar — por isso cada lâmina já nasce alinhada à
      // curvatura do planeta sem lógica extra no shader.
      Effect.ShadersStore['grassVertexShader'] = `
        precision highp float;
        attribute vec3 position;
        attribute vec4 world0;
        attribute vec4 world1;
        attribute vec4 world2;
        attribute vec4 world3;
        uniform mat4 viewProjection;
        uniform float time;
        uniform float windStrength;
        uniform float windSpeed;
        varying float vHeight;
        void main(void) {
          mat4 world = mat4(world0, world1, world2, world3);
          vec3 pos = position;
          float phase = world3.x * 0.6 + world3.z * 0.9;
          float sway = sin(time * windSpeed + phase) * windStrength * pos.y;
          pos.x += sway;
          vHeight = pos.y;
          gl_Position = viewProjection * world * vec4(pos, 1.0);
        }
      `
      Effect.ShadersStore['grassFragmentShader'] = `
        precision highp float;
        varying float vHeight;
        uniform vec3 baseColor;
        uniform vec3 tipColor;
        void main(void) {
          vec3 color = mix(baseColor, tipColor, clamp(vHeight / 0.55, 0.0, 1.0));
          gl_FragColor = vec4(color, 1.0);
        }
      `
      const grassMaterial = new ShaderMaterial('grass', scene, 'grass', {
        attributes: ['position', 'world0', 'world1', 'world2', 'world3'],
        uniforms: ['viewProjection', 'time', 'windStrength', 'windSpeed', 'baseColor', 'tipColor'],
      })
      grassMaterial.backFaceCulling = false
      grassMaterial.setColor3('baseColor', new Color3(0.22, 0.42, 0.18))
      grassMaterial.setColor3('tipColor', new Color3(0.5, 0.75, 0.3))
      grassMaterial.setFloat('windStrength', 0.16)
      grassMaterial.setFloat('windSpeed', 1.8)

      const bladeVertexData = new VertexData()
      bladeVertexData.positions = [
        -0.06, 0, 0, 0.06, 0, 0, -0.045, 0.55, 0, 0.045, 0.55, 0,
      ]
      bladeVertexData.indices = [0, 1, 2, 1, 3, 2, 2, 1, 0, 2, 3, 1]
      const grassBlade = new Mesh('grassBlade', scene)
      bladeVertexData.applyToMesh(grassBlade)
      grassBlade.material = grassMaterial
      grassBlade.receiveShadows = false

      // Já é 1 draw call só (thin instances), mas cada instância ainda é vértices/fragmentos de
      // verdade pra GPU processar — reduzida de novo no lab-59 (1300 → 900, usuário: "os gráficos
      // do tablet Redmi Pad 2 ainda estão com muito lag").
      const GRASS_COUNT = isLowEndDevice ? 900 : 2600
      const grassMatrices = new Float32Array(GRASS_COUNT * 16)
      for (let i = 0; i < GRASS_COUNT; i++) {
        // Resorteia (poucas tentativas bastam) até cair fora do bioma do deserto (lab-23) E fora
        // do topo/rampa de qualquer platô (lab-28, relato do usuário: "a casa número 4 está em
        // cima de um morro, mas o morro é invisível, a grama está sobre ele mas o morro não
        // aparece" — a cor do morro já estava certa, lab-18; o problema real é grama uniforme
        // escondendo essa cor). Limite de altura 0,35 (um pouco abaixo de onde `hillBlend`
        // começa, 0,5) deixa uma franja fina de grama na base da rampa, sem esconder o topo
        // colorido. Total de tufos (`GRASS_COUNT`, buffer de thin instances de tamanho fixo)
        // continua o mesmo — reamostra em vez de pular a posição.
        let up = Vector3.Zero()
        for (let attempt = 0; attempt < 8; attempt++) {
          const phi = Math.PI * 0.08 + Math.random() * Math.PI * 0.7
          const theta = Math.random() * Math.PI * 2
          up = new Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta))
          const inDesert = Math.acos(Math.max(-1, Math.min(1, Vector3.Dot(up, DESERT_CENTER_DIR)))) < DESERT_RADIUS
          const onHill = terrainHeight(up) > 0.35
          if (!inDesert && !onHill) break
        }
        const bladePos = up.scale(PLANET_RADIUS + terrainHeight(up) + 0.02)
        const rot = alignmentQuaternion(up).multiply(Quaternion.RotationAxis(Vector3.Up(), Math.random() * Math.PI * 2))
        const scale = 0.7 + Math.random() * 0.7
        const m = Matrix.Compose(new Vector3(scale, scale, scale), rot, bladePos)
        m.copyToArray(grassMatrices, i * 16)
      }
      grassBlade.thinInstanceSetBuffer('matrix', grassMatrices, 16, true)

      // Colisor físico do avatar — cápsula invisível, em pé (não rola feito bola). A rotação
      // dela é travada a cada quadro (ver loop de render) pra não tombar; o personagem visual
      // (estudante) é reposicionado por cima, independente da rotação física do colisor.
      const spawnUp = new Vector3(0, 1, 0)
      avatarMesh = MeshBuilder.CreateCapsule('avatarCollider', { height: AVATAR_RADIUS * 2, radius: 0.32 }, scene)
      avatarMesh.position = spawnUp.scale(PLANET_RADIUS + terrainHeight(spawnUp) + AVATAR_RADIUS + 0.05)
      avatarMesh.isVisible = false
      avatarBody = new PhysicsAggregate(
        avatarMesh,
        PhysicsShapeType.CAPSULE,
        { mass: 1, restitution: 0.05, friction: 0.6 },
        scene,
      )

      const studentFigure = buildStudentFigure(scene, avatarColorFromEmoji(profile.avatarEmoji), shadowGenerator)
      applyBonecoFeatures(studentFigure, bonecoFeaturesFromEmoji(profile.avatarEmoji), scene, shadowGenerator)
      applyHat(studentFigure, profile.equippedHatId ? findHatById(profile.equippedHatId) ?? null : null, scene, shadowGenerator)
      studentFigure.root.position = spawnUp.scale(PLANET_RADIUS + terrainHeight(spawnUp) + 0.02)
      if (import.meta.env.DEV) (window as any).__playerFigure = studentFigure

      // Espada/arma "equipadas" (lab-62, pedido do usuário: "como eu sei que peguei o item, tem
      // animação que eu estou segurando o item?") — cópias pequenas presas na mão (parentadas no
      // cotovelo, que já é o fim do antebraço), escondidas até o item ser coletado (ver detecção
      // de coleta no laço de física, mais abaixo). Espada na mão direita, arma na esquerda — cada
      // uma no seu braço, sem competir pelo mesmo espaço.
      equippedSword = buildSword(scene, shadowGenerator)
      equippedSword.scaling.setAll(0.55)
      equippedSword.parent = studentFigure.elbowPivotR
      equippedSword.position = new Vector3(0.02, -0.22, 0.04)
      equippedSword.rotation = new Vector3(-0.3, 0, 0.25)
      equippedSword.setEnabled(false)

      equippedGun = buildLaserGun(scene, shadowGenerator)
      equippedGun.scaling.setAll(0.65)
      equippedGun.parent = studentFigure.elbowPivotL
      equippedGun.position = new Vector3(-0.02, -0.22, 0.04)
      equippedGun.rotation = new Vector3(-0.2, 0, -0.2)
      equippedGun.setEnabled(false)

      // Anel de onda sonora (lab-62, pedido do usuário: "um anel de onda sonora em volta do
      // boneco e ele não pode entrar dentro no meu corpo") — parentado em `studentFigure.root`
      // (cujo eixo Y local já É o "pra cima" do planeta, ver a montagem da rotação do boneco no
      // laço de física), deitado no chão sem rotação extra: `CreateTorus` já nasce plano no
      // plano XZ, com o Y passando pelo "buraco da rosquinha" — exatamente o eixo que já
      // corresponde a "reto pra cima" nesse nó. Só visível em Marte (`onSecondPlanet`).
      soundRing = MeshBuilder.CreateTorus('soundRing', { diameter: MARS_ENEMY_PERSONAL_SPACE * 2, thickness: 0.04, tessellation: 24 }, scene)
      soundRing.parent = studentFigure.root
      soundRing.position.y = 0.03
      const soundRingMat = new PBRMaterial('soundRingMat', scene)
      soundRingMat.albedoColor = new Color3(0.6, 0.9, 1)
      soundRingMat.emissiveColor = new Color3(0.5, 0.85, 1)
      soundRingMat.alpha = 0.5
      soundRing.material = soundRingMat
      soundRing.setEnabled(false)

      // Trocar de avatar na lojinha não reconstrói a cena inteira (custoso) — só recolore a
      // camisa e remonta as peças do boneco (orelhas/rabo/etc., lab-13) do personagem já em
      // cena. Ver useEffect que observa `profile.avatarEmoji`.
      ;(scene as any).__setAvatarShirtColor = (emoji: string) => {
        studentFigure.shirtMat.albedoColor = avatarColorFromEmoji(emoji)
        applyBonecoFeatures(studentFigure, bonecoFeaturesFromEmoji(emoji), scene, shadowGenerator)
      }

      // Trocar de chapéu na lojinha (lab-24) — eixo independente do avatar/criatura, não
      // reconstrói `accessories`. Ver useEffect que observa `profile.equippedHatId`.
      ;(scene as any).__setPlayerHat = (hatId: string | null) => {
        applyHat(studentFigure, hatId ? findHatById(hatId) ?? null : null, scene, shadowGenerator)
      }

      // Bolha de fala sobre a própria cabeça (lab-55) — o relay não devolve a própria mensagem
      // pro remetente (`broadcast` exclui o sender), então sem isso só os OUTROS jogadores veriam
      // a bolha; chamado por `handleSendChat` (fora deste efeito) via essa ponte, mesmo padrão de
      // `__setAvatarShirtColor`/`__setPlayerHat` acima.
      const localChatLabel = new TextBlock('localChat', '')
      localChatLabel.color = 'white'
      localChatLabel.fontSize = mobileFontSize(18)
      localChatLabel.outlineWidth = 3
      localChatLabel.outlineColor = 'rgba(0,0,0,0.5)'
      localChatLabel.alpha = 0
      guiTexture.addControl(localChatLabel)
      localChatLabel.linkWithMesh(studentFigure.head)
      localChatLabel.linkOffsetY = -55
      let localChatBubbleTimeout: number | null = null
      ;(scene as any).__showLocalChatBubble = (messageId: string) => {
        const quickMsg = findQuickChatMessage(messageId)
        if (!quickMsg) return
        localChatBubbleTimeout = showChatBubbleText(localChatLabel, `${quickMsg.emoji} ${quickMsg.text}`, localChatBubbleTimeout)
      }

      // Câmera já posicionada corretamente antes do primeiro quadro (evita "pulo" inicial).
      camera.position = avatarMesh.position.subtract(facing.scale(CAMERA_DISTANCE)).add(spawnUp.scale(CAMERA_HEIGHT))
      camera.upVector = spawnUp
      camera.setTarget(avatarMesh.position)

      if (import.meta.env.DEV) {
        // Teleporte de QA — só em dev, pra testar o gatilho dos portais sem depender
        // de simular teclado segurado por um tempo real. Recebe uma DIREÇÃO (normalizada
        // internamente) e sempre pousa na altura do CHÃO nessa direção — não serve pra testar
        // algo numa altura específica acima do chão (ex.: no meio do ar, perto de um laser de
        // parkour) — ver `__debugTeleportExact` pra isso.
        ;(window as any).__debugTeleport = (x: number, y: number, z: number) => {
          if (!avatarMesh || !avatarBody) return
          const localUp = new Vector3(x, y, z).normalize()
          // Padrão documentado (ver correção do bug de sair do carro): `disablePreStep = false`
          // + `scene.render()` sincronizam o corpo físico de verdade com a posição escrita
          // aqui, e `disablePreStep = true` no final devolve o corpo pro modo normal do jogo
          // (física dirige a posição). Mantido por consistência com esse padrão já estabelecido
          // — não é a correção de um bug confirmado neste hook especificamente (investigado no
          // lab-39: a causa real de resultados "congelados" testando o parkour de laser era a
          // aba do Chrome da automação não renderizar quadro nenhum quando só esperando sem
          // interagir, não este código).
          avatarBody.body.disablePreStep = false
          avatarMesh.position = localUp.scale(PLANET_RADIUS + terrainHeight(localUp) + AVATAR_RADIUS + 0.05)
          scene.render()
          avatarBody.body.setLinearVelocity(Vector3.Zero())
          avatarBody.body.setAngularVelocity(Vector3.Zero())
          avatarBody.body.disablePreStep = true
        }
        // Bug real encontrado testando o parkour de laser (lab-39): `__debugTeleport` sempre
        // recalcula a altura do CHÃO na direção dada, então não dava pra testar uma posição no
        // meio do ar (ex.: bem em cima da altura exata de um laser) — qualquer chamada com uma
        // posição elevada era silenciosamente reduzida pra altura do chão na mesma direção,
        // invalidando o teste sem erro nenhum. Esta versão recebe as coordenadas EXATAS
        // (posição de verdade, não uma direção a normalizar) e não mexe na altura.
        ;(window as any).__debugTeleportExact = (x: number, y: number, z: number) => {
          if (!avatarMesh || !avatarBody) return
          avatarBody.body.disablePreStep = false
          avatarMesh.position = new Vector3(x, y, z)
          scene.render()
          avatarBody.body.setLinearVelocity(Vector3.Zero())
          avatarBody.body.setAngularVelocity(Vector3.Zero())
          avatarBody.body.disablePreStep = true
        }
        // Ajusta a direção pra onde o personagem anda (dev-only, QA) — teleportar não muda
        // `facing` (fica sempre o que era antes), então sem isto não dá pra testar "andar até X"
        // de forma confiável depois de um teleporte pra um lugar novo do mapa.
        ;(window as any).__debugSetFacing = (x: number, y: number, z: number) => {
          facing = new Vector3(x, y, z).normalize()
        }
        // Gatilho de QA pra animação de golpe/tiro (lab-64) — o combate de verdade em Marte
        // resolve rápido demais (o jogador costuma morrer em poucos quadros) pra flagrar a
        // animação/VFX num teste automatizado por screenshot, ver "Pendências" no CONTEXT.md do
        // lab-62/lab-63. Dispara exatamente o mesmo estado (`attackAnimTimer`/`attackAnimKind`)
        // que `handleInteractPress` já usa ao nocautear um inimigo de verdade — sem efeito
        // nenhum na regra de jogo, só pra poder ver a animação isolada.
        ;(window as any).__debugTriggerAttackAnim = (kind: 'sword' | 'gun') => {
          attackAnimTimer = ATTACK_ANIM_DURATION
          attackAnimKind = kind
        }
        // Mesma ideia acima, mas pros efeitos dos INIMIGOS (choque do robô / fumaça do ET) e pro
        // feixe de laser do jogador — chama as mesmas funções que `applyMarsDamage`/
        // `handleInteractPress` já usam de verdade, só com posições de teste perto do avatar em
        // vez de depender de um combate real acontecendo (que resolve rápido demais pra flagrar
        // num teste automatizado).
        ;(window as any).__debugTriggerEnemyVfx = (kind: 'robo' | 'et') => {
          if (!avatarMesh) return
          const nearby = avatarMesh.position.add(new Vector3(1, 0, 0))
          if (kind === 'robo') spawnRoboShock(nearby, avatarMesh.position.clone())
          else spawnEtSmoke(avatarMesh.position.clone())
        }
        ;(window as any).__debugTriggerLaser = () => {
          if (!avatarMesh) return
          fireLaserBeam(avatarMesh.position.clone(), avatarMesh.position.add(new Vector3(2, 0, 0)))
        }
      }

      // Posicionamento das escolas usa `terrainGroundRadial` (raycast físico real, declarada logo
      // depois do `havokPlugin` existir, no topo de `setup()`) em vez de só a fórmula — pedido do
      // usuário (junto com montanhas maiores, ver `PLATEAU_CENTERS` acima): "em vez de botar as
      // casinhas em pontos flutuantes invisíveis, pode colocar elas em cima das montanhas".

      // Missões viram miniescolas (não anéis abstratos) — prédio baixo-poli com telhado colorido
      // por tipo/estado da missão, mais um professor parado na porta.
      const wallMatShared = new PBRMaterial('schoolWallMat', scene)
      wallMatShared.albedoColor = new Color3(0.94, 0.88, 0.75)
      wallMatShared.roughness = 0.8
      const doorMatShared = new PBRMaterial('schoolDoorMat', scene)
      doorMatShared.albedoColor = new Color3(0.42, 0.26, 0.16)
      doorMatShared.roughness = 0.7
      const foundationMatShared = new PBRMaterial('schoolFoundationMat', scene)
      foundationMatShared.albedoColor = new Color3(0.5, 0.42, 0.32)
      foundationMatShared.roughness = 0.95

      quests.forEach((quest, index) => {
        // `QUEST_FIXED_UP` (lab-26): só `q21` usa isso — as outras continuam pela fórmula de
        // ângulo áureo de sempre, posição inalterada.
        let localUp = QUEST_FIXED_UP[quest.id]
        if (!localUp) {
          const t = quests.length > 1 ? index / (quests.length - 1) : 0
          const phi = Math.PI * 0.22 + t * Math.PI * 0.4
          const theta = index * GOLDEN_ANGLE * 1.7
          localUp = new Vector3(
            Math.sin(phi) * Math.cos(theta),
            Math.cos(phi),
            Math.sin(phi) * Math.sin(theta),
          )
        }
        const groundRadial = terrainGroundRadial(localUp, terrainHeight(localUp))
        const surfacePos = localUp.scale(groundRadial)

        const base = new TransformNode(`school-${quest.id}`, scene)
        base.position = surfacePos
        base.rotationQuaternion = alignmentQuaternion(localUp)

        const walls = MeshBuilder.CreateBox(`walls-${quest.id}`, { width: 1.6, height: 1.1, depth: 1.4 }, scene)
        walls.position = new Vector3(0, 0.55, 0)
        walls.material = wallMatShared
        walls.parent = base
        walls.receiveShadows = true
        // Pedido do usuário (junto com montanhas maiores/casinhas em cima delas): "precisam ter
        // colisão" — antes o prédio era só visual, o jogador atravessava a parede andando. Mesmo
        // padrão das plataformas de parkour (`PhysicsShapeType.BOX`, `mass: 0` — estático, nunca
        // se move).
        new PhysicsAggregate(walls, PhysicsShapeType.BOX, { mass: 0, friction: 0.7 }, scene)
        shadowGenerator.addShadowCaster(walls)

        // Fundação (pedido do usuário, com screenshots: "a casa flutuando numa superfície
        // invisível" mesmo depois de `terrainGroundRadial` confirmar folga ~0 no ANCORA da
        // escola). Causa raiz real: `surfacePos`/`alignmentQuaternion` amostram o terreno em UM
        // ponto só, mas a caixa de paredes (1.6 x 1.4) é rígida — em terreno com relevo, o
        // terreno varia até ~1,4 unidade de um canto ao outro da própria escola, deixando um
        // canto flutuando (chão visível embaixo) enquanto o oposto afunda. Uma base mais funda e
        // um pouco mais larga que as paredes garante que nenhum canto fique no ar, sem precisar
        // inclinar a caixa pra seguir o relevo local.
        const foundation = MeshBuilder.CreateBox(
          `foundation-${quest.id}`,
          { width: 1.72, height: 1.6, depth: 1.52 },
          scene,
        )
        foundation.position = new Vector3(0, -0.65, 0)
        foundation.material = foundationMatShared
        foundation.parent = base
        foundation.receiveShadows = true

        const door = MeshBuilder.CreateBox(`door-${quest.id}`, { width: 0.42, height: 0.62, depth: 0.06 }, scene)
        door.position = new Vector3(0, 0.31, 0.71)
        door.material = doorMatShared
        door.parent = base

        // Telhado: carrega a cor/estado da missão (equivalente ao antigo anel).
        const roof = MeshBuilder.CreateCylinder(
          `roof-${quest.id}`,
          { height: 0.8, diameterTop: 0.05, diameterBottom: 2.1, tessellation: 4 },
          scene,
        )
        roof.position = new Vector3(0, 1.5, 0)
        roof.rotation.y = Math.PI / 4
        roof.parent = base
        shadowGenerator.addShadowCaster(roof)

        const roofMat = new PBRMaterial(`roofMat-${quest.id}`, scene)
        const color = questTypeColor[quest.type]
        roofMat.albedoColor = color
        roofMat.roughness = 0.4
        roofMat.metallic = 0.1
        roof.material = roofMat

        // Professor parado na porta — mesmo "rig" do estudante, parado (sem animação),
        // com um tom de roupa diferente pra ficar claramente outro personagem.
        const teacher = buildStudentFigure(scene, new Color3(0.55, 0.25, 0.55), shadowGenerator)
        teacher.root.scaling.setAll(0.92)
        teacher.root.position = new Vector3(0.95, 0, 0.55)
        teacher.root.parent = base

        const label = new TextBlock(`label-${quest.id}`, `${index + 1}`)
        label.color = 'white'
        label.fontSize = mobileFontSize(28)
        label.fontWeight = 'bold'
        label.outlineWidth = 4
        label.outlineColor = 'rgba(0,0,0,0.5)'
        guiTexture.addControl(label)
        label.linkWithMesh(roof)
        label.linkOffsetY = -70

        portalMeshes.push({ quest, roof, base, surfacePos })
      })

      function applyPortalVisual(entry: (typeof portalMeshes)[number]) {
        const p = progressRef.current
        const idx = quests.findIndex((q) => q.id === entry.quest.id)
        const unlocked = isQuestUnlocked(p, idx)
        const completed = p.completedQuestIds.includes(entry.quest.id)
        const roofMat = entry.roof.material as PBRMaterial
        const color = questTypeColor[entry.quest.type]

        if (completed) {
          roofMat.emissiveColor = new Color3(0.2, 0.6, 0.28)
          roofMat.albedoColor = color
        } else if (unlocked) {
          roofMat.emissiveColor = color.scale(0.5)
          roofMat.albedoColor = color
        } else {
          roofMat.emissiveColor = Color3.Black()
          roofMat.albedoColor = new Color3(0.55, 0.55, 0.58)
        }
        entry.roof.visibility = unlocked || completed ? 1 : 0.55
      }

      portalMeshes.forEach(applyPortalVisual)
      ;(scene as any).__refreshPortals = () => portalMeshes.forEach(applyPortalVisual)

      // Loja navegável (lab-16, pedido do usuário: "uma loja que dá pra entrar") — diferente das
      // escolas (paredes sólidas decorativas, o jogador nunca "entra" de verdade, só dispara a
      // missão por proximidade de fora), esta tem um vão de porta real na parede da frente: o
      // jogador caminha por dentro dele e vê o interior (balcão, prateleiras, lojista). Chegar
      // perto do balcão abre o MESMO modal de lojinha já existente (`onOpenShopRef`) — reaproveita
      // toda a lógica de compra/equipar do lab-08/lab-13, não duplica. Local escolhido por busca
      // de distância angular contra todos os outros marcos do mapa (mesmo método usado pra
      // piscina/parkour/rua) — ~37° de folga do vizinho mais próximo.
      const SHOP_ANCHOR_UP = new Vector3(0.9158133708598268, 0.24868988716485496, 0.3153398322069272).normalize()
      const shopBase = new TransformNode('shopBase', scene)
      shopBase.position = SHOP_ANCHOR_UP.scale(terrainGroundRadial(SHOP_ANCHOR_UP, terrainHeight(SHOP_ANCHOR_UP)))
      shopBase.rotationQuaternion = alignmentQuaternion(SHOP_ANCHOR_UP)

      const SHOP_WIDTH = 3.0
      const SHOP_DEPTH = 3.0
      const SHOP_WALL_HEIGHT = 1.5
      const SHOP_DOOR_WIDTH = 1.0

      const shopWallMat = new PBRMaterial('shopWallMat', scene)
      shopWallMat.albedoColor = new Color3(0.72, 0.5, 0.32)
      shopWallMat.roughness = 0.8
      const shopRoofMat = new PBRMaterial('shopRoofMat', scene)
      shopRoofMat.albedoColor = new Color3(0.55, 0.22, 0.2)
      shopRoofMat.roughness = 0.5
      shopRoofMat.metallic = 0.1

      function addShopMesh(mesh: Mesh, mat: PBRMaterial) {
        mesh.material = mat
        mesh.parent = shopBase
        mesh.receiveShadows = true
        shadowGenerator.addShadowCaster(mesh)
      }

      // Parede de trás (fecha o fundo) e laterais (fecham os lados) — sólidas, só a da frente
      // (por onde o jogador chega vindo da área caminhável) tem um vão.
      const backWall = MeshBuilder.CreateBox('shopBackWall', { width: SHOP_WIDTH, height: SHOP_WALL_HEIGHT, depth: 0.15 }, scene)
      backWall.position = new Vector3(0, SHOP_WALL_HEIGHT / 2, SHOP_DEPTH / 2)
      addShopMesh(backWall, shopWallMat)

      for (const side of [-1, 1]) {
        const sideWall = MeshBuilder.CreateBox(`shopSideWall${side}`, { width: 0.15, height: SHOP_WALL_HEIGHT, depth: SHOP_DEPTH }, scene)
        sideWall.position = new Vector3((side * SHOP_WIDTH) / 2, SHOP_WALL_HEIGHT / 2, 0)
        addShopMesh(sideWall, shopWallMat)
      }

      // Parede da frente partida em dois — o vão entre os dois pedaços é a porta de verdade.
      const shopFrontSegWidth = (SHOP_WIDTH - SHOP_DOOR_WIDTH) / 2
      for (const side of [-1, 1]) {
        const frontWall = MeshBuilder.CreateBox(
          `shopFrontWall${side}`,
          { width: shopFrontSegWidth, height: SHOP_WALL_HEIGHT, depth: 0.15 },
          scene,
        )
        frontWall.position = new Vector3(
          side * (SHOP_DOOR_WIDTH / 2 + shopFrontSegWidth / 2),
          SHOP_WALL_HEIGHT / 2,
          -SHOP_DEPTH / 2,
        )
        addShopMesh(frontWall, shopWallMat)
      }

      // Fundação (mesmo problema e mesma correção das escolas: a caixa de paredes usa só o ponto
      // de amostra `SHOP_ANCHOR_UP`, mas o terreno varia dentro dos 3x3 da própria loja — sem
      // isso um canto flutua enquanto o oposto afunda).
      const shopFoundationMat = new PBRMaterial('shopFoundationMat', scene)
      shopFoundationMat.albedoColor = new Color3(0.5, 0.42, 0.32)
      shopFoundationMat.roughness = 0.95
      const shopFoundation = MeshBuilder.CreateBox(
        'shopFoundation',
        { width: SHOP_WIDTH + 0.2, height: 1.6, depth: SHOP_DEPTH + 0.2 },
        scene,
      )
      shopFoundation.position = new Vector3(0, -0.65, 0)
      addShopMesh(shopFoundation, shopFoundationMat)

      // Telhado — mesmo truque de pirâmide de 4 lados já usado nas escolas.
      const shopRoof = MeshBuilder.CreateCylinder(
        'shopRoof',
        { height: 0.7, diameterTop: 0.05, diameterBottom: SHOP_WIDTH * 1.55, tessellation: 4 },
        scene,
      )
      shopRoof.position = new Vector3(0, SHOP_WALL_HEIGHT + 0.35, 0)
      shopRoof.rotation.y = Math.PI / 4
      addShopMesh(shopRoof, shopRoofMat)

      // Interior: balcão perto do fundo (o jogador entra pela porta e já vê o balcão à frente),
      // duas prateleiras encostadas nas paredes laterais, e o lojista atrás do balcão.
      const shopCounterMat = new PBRMaterial('shopCounterMat', scene)
      shopCounterMat.albedoColor = new Color3(0.5, 0.34, 0.2)
      shopCounterMat.roughness = 0.7
      const shopCounter = MeshBuilder.CreateBox('shopCounter', { width: 1.6, height: 0.75, depth: 0.5 }, scene)
      shopCounter.position = new Vector3(0, 0.375, SHOP_DEPTH / 2 - 0.7)
      addShopMesh(shopCounter, shopCounterMat)

      const shopShelfMat = new PBRMaterial('shopShelfMat', scene)
      shopShelfMat.albedoColor = new Color3(0.4, 0.28, 0.18)
      shopShelfMat.roughness = 0.75
      const shopItemColors = [
        new Color3(0.85, 0.3, 0.3),
        new Color3(0.3, 0.6, 0.85),
        new Color3(0.9, 0.75, 0.2),
      ]
      for (const side of [-1, 1]) {
        const shelf = MeshBuilder.CreateBox(`shopShelf${side}`, { width: 0.3, height: 1.0, depth: 1.3 }, scene)
        shelf.position = new Vector3((side * SHOP_WIDTH) / 2 - side * 0.2, 0.5, 0.1)
        addShopMesh(shelf, shopShelfMat)
        for (let it = 0; it < 3; it++) {
          const itemMat = new PBRMaterial(`shopItemMat${side}${it}`, scene)
          itemMat.albedoColor = shopItemColors[it]
          itemMat.roughness = 0.4
          const item = MeshBuilder.CreateBox(`shopItem${side}${it}`, { width: 0.18, height: 0.18, depth: 0.18 }, scene)
          item.position = new Vector3((side * SHOP_WIDTH) / 2 - side * 0.2, 0.85, -0.35 + it * 0.35)
          addShopMesh(item, itemMat)
        }
      }

      const shopkeeper = buildStudentFigure(scene, new Color3(0.85, 0.55, 0.15), shadowGenerator)
      shopkeeper.root.scaling.setAll(0.92)
      shopkeeper.root.position = new Vector3(0, 0, SHOP_DEPTH / 2 - 1.0)
      shopkeeper.root.rotationQuaternion = Quaternion.RotationAxis(Vector3.Up(), Math.PI)
      shopkeeper.root.parent = shopBase

      const shopLabel = new TextBlock('shopLabel', 'Lojinha')
      shopLabel.color = 'white'
      shopLabel.fontSize = mobileFontSize(26)
      shopLabel.fontWeight = 'bold'
      shopLabel.outlineWidth = 4
      shopLabel.outlineColor = 'rgba(0,0,0,0.5)'
      guiTexture.addControl(shopLabel)
      shopLabel.linkWithMesh(shopRoof)
      shopLabel.linkOffsetY = -70

      // Ponto de gatilho (balcão) em coordenadas de mundo — calculado uma vez (a loja não se
      // move). Importante: usa a transformação de verdade do motor (`getWorldMatrix`), não um
      // cálculo próprio de "pra frente" — `alignmentQuaternion` não garante que o eixo Z local
      // mapeie pro mesmo vetor que um `Cross(up, Right())` calculado à parte produziria, então
      // um cálculo independente podia apontar o gatilho pra um lugar diferente de onde o balcão
      // realmente está desenhado.
      shopBase.computeWorldMatrix(true)
      const shopCounterWorldPos = Vector3.TransformCoordinates(shopCounter.position, shopBase.getWorldMatrix())
      let shopTriggered = false

      // Torre do Tesouro (pedido do usuário: "prédios que a gente pode entrar e subir as
      // escadas e achar moedas, e nesse prédio tem mais desafios") — protótipo de prédio
      // navegável de verdade: chão físico, rampa subindo pro andar de cima, mais moedas lá em
      // cima que embaixo (mesmo princípio "recompensa maior no topo" do segundo parkour), e um
      // pulo pequeno até a moeda final (um toque de desafio, não só andar até o topo). Um prédio
      // só nesta primeira versão (não os 21 das escolas) — validar o padrão aqui antes de decidir
      // se vale replicar. Reaproveita a técnica de parede-com-vão-de-porta já usada na lojinha
      // (`shopFrontWall${side}`) e o raycast físico real (`terrainGroundRadial`) já comprovado
      // pra posicionar sem flutuar/afundar.
      const TOWER_ANCHOR_UP = new Vector3(-0.6323378682909753, -0.7313537016191705, -0.2554810823782512).normalize()
      const towerBase = new TransformNode('towerBase', scene)
      const towerGroundRadial = terrainGroundRadial(TOWER_ANCHOR_UP, terrainHeight(TOWER_ANCHOR_UP))
      towerBase.position = TOWER_ANCHOR_UP.scale(towerGroundRadial)
      towerBase.rotationQuaternion = alignmentQuaternion(TOWER_ANCHOR_UP)

      const TOWER_WIDTH = 3.2
      const TOWER_DEPTH = 4.4
      const TOWER_FLOOR1_HEIGHT = 1.6
      const TOWER_FLOOR2_HEIGHT = 1.5
      const TOWER_DOOR_WIDTH = 1.0
      const TOWER_HALF_W = TOWER_WIDTH / 2
      const TOWER_HALF_D = TOWER_DEPTH / 2
      // Bug real encontrado testando esta correção ao vivo: a primeira versão calculava a rampa
      // (percurso de 3,6) sem checar se cabia dentro da própria profundidade do prédio (3,2) —
      // a rampa acabava atravessando as duas paredes (fundo E frente/porta), saindo do prédio
      // pelos dois lados. Corrigido calculando TODAS as posições a partir de valores explícitos
      // (profundidade do mezanino, ponto onde a rampa encontra o mezanino), verificados aqui em
      // vez de expressões derivadas (`TOWER_DEPTH * 0.55`) que escondiam a inconsistência.
      const TOWER_MEZZ_DEPTH = 1.6 // profundidade da laje do andar de cima (mezanino)
      const TOWER_MEZZ_FRONT_Z = TOWER_HALF_D - TOWER_MEZZ_DEPTH // borda da frente do mezanino
      const TOWER_MEZZ_CENTER_Z = TOWER_HALF_D - TOWER_MEZZ_DEPTH / 2
      const TOWER_RAMP_LOW_Z = -TOWER_HALF_D + 0.3 // logo depois da porta
      const TOWER_RAMP_HIGH_Z = TOWER_MEZZ_FRONT_Z // encontra o mezanino exatamente na borda dele
      const TOWER_RAMP_RUN = TOWER_RAMP_HIGH_Z - TOWER_RAMP_LOW_Z
      const TOWER_RAMP_X = 0.8 // encostada num dos lados, sobra corredor do outro lado pra andar

      const towerWallMat = new PBRMaterial('towerWallMat', scene)
      towerWallMat.albedoColor = new Color3(0.62, 0.58, 0.68)
      towerWallMat.roughness = 0.85
      const towerRoofMat = new PBRMaterial('towerRoofMat', scene)
      towerRoofMat.albedoColor = new Color3(0.75, 0.2, 0.3)
      towerRoofMat.roughness = 0.5
      towerRoofMat.metallic = 0.1
      const towerFloorMat = new PBRMaterial('towerFloorMat', scene)
      towerFloorMat.albedoColor = new Color3(0.45, 0.35, 0.28)
      towerFloorMat.roughness = 0.8

      function addTowerMesh(mesh: Mesh, mat: PBRMaterial, collide: boolean) {
        mesh.material = mat
        mesh.parent = towerBase
        mesh.receiveShadows = true
        shadowGenerator.addShadowCaster(mesh)
        if (collide) new PhysicsAggregate(mesh, PhysicsShapeType.BOX, { mass: 0, friction: 0.7 }, scene)
      }

      // Chão do térreo — elevado um pouco (0,05) acima da superfície real do planeta, mesmo
      // motivo do `RIVER_WATER_CLEARANCE`/margem da rua em labs anteriores: uma malha rente
      // demais ao chão de baixo pode sofrer z-fighting ou ficar parcialmente enterrada por causa
      // do mesmo erro de discretização malha-vs-fórmula já documentado.
      const towerFloor1 = MeshBuilder.CreateBox('towerFloor1', { width: TOWER_WIDTH, height: 0.1, depth: TOWER_DEPTH }, scene)
      towerFloor1.position = new Vector3(0, 0.05, 0)
      addTowerMesh(towerFloor1, towerFloorMat, true)

      // Fundação (mesma correção das escolas/lojinha — o térreo usa só o ponto de amostra
      // `TOWER_ANCHOR_UP`, mas o terreno varia dentro dos 3,2x4,4 do prédio inteiro).
      const towerFoundation = MeshBuilder.CreateBox(
        'towerFoundation',
        { width: TOWER_WIDTH + 0.2, height: 1.6, depth: TOWER_DEPTH + 0.2 },
        scene,
      )
      towerFoundation.position = new Vector3(0, -0.6, 0)
      addTowerMesh(towerFoundation, towerFloorMat, false)

      // Paredes do térreo — fundo e laterais sólidas, frente partida em dois (vão = porta),
      // mesmo padrão da lojinha.
      const towerBackWall = MeshBuilder.CreateBox('towerBackWall', { width: TOWER_WIDTH, height: TOWER_FLOOR1_HEIGHT, depth: 0.15 }, scene)
      towerBackWall.position = new Vector3(0, 0.1 + TOWER_FLOOR1_HEIGHT / 2, TOWER_HALF_D)
      addTowerMesh(towerBackWall, towerWallMat, true)

      for (const side of [-1, 1]) {
        const sideWall = MeshBuilder.CreateBox(`towerSideWall${side}`, { width: 0.15, height: TOWER_FLOOR1_HEIGHT, depth: TOWER_DEPTH }, scene)
        sideWall.position = new Vector3(side * TOWER_HALF_W, 0.1 + TOWER_FLOOR1_HEIGHT / 2, 0)
        addTowerMesh(sideWall, towerWallMat, true)
      }

      const towerFrontSegWidth = (TOWER_WIDTH - TOWER_DOOR_WIDTH) / 2
      for (const side of [-1, 1]) {
        const frontWall = MeshBuilder.CreateBox(
          `towerFrontWall${side}`,
          { width: towerFrontSegWidth, height: TOWER_FLOOR1_HEIGHT, depth: 0.15 },
          scene,
        )
        frontWall.position = new Vector3(
          side * (TOWER_DOOR_WIDTH / 2 + towerFrontSegWidth / 2),
          0.1 + TOWER_FLOOR1_HEIGHT / 2,
          -TOWER_HALF_D,
        )
        addTowerMesh(frontWall, towerWallMat, true)
      }

      // Rampa até o andar de cima — começa logo depois da porta (`TOWER_RAMP_LOW_Z`) e sobe até
      // encontrar a borda da frente do mezanino (`TOWER_RAMP_HIGH_Z`), inteiramente na área
      // aberta do térreo (não passa por baixo do mezanino em nenhum ponto — sem risco de bater a
      // cabeça no teto ao subir). Inclinação ~32,6° (rampLength/run/rise abaixo) — um bloco só,
      // inclinado, colide igual qualquer outra plataforma estática (o jogador é empurrado pra
      // cima pelo próprio solver de física ao encostar, sem precisar de lógica especial de
      // "escada" — mesmo princípio de qualquer rampa em qualquer motor de física).
      const rampLength = Math.sqrt(TOWER_RAMP_RUN * TOWER_RAMP_RUN + TOWER_FLOOR1_HEIGHT * TOWER_FLOOR1_HEIGHT)
      const rampAngle = Math.atan2(TOWER_FLOOR1_HEIGHT, TOWER_RAMP_RUN)
      const towerRamp = MeshBuilder.CreateBox('towerRamp', { width: 1.1, height: 0.12, depth: rampLength }, scene)
      towerRamp.position = new Vector3(TOWER_RAMP_X, 0.1 + TOWER_FLOOR1_HEIGHT / 2, (TOWER_RAMP_LOW_Z + TOWER_RAMP_HIGH_Z) / 2)
      towerRamp.rotation.x = -rampAngle
      addTowerMesh(towerRamp, towerFloorMat, true)

      // Andar de cima (mezanino) — só a laje de trás (`TOWER_MEZZ_DEPTH`); a área da frente fica
      // aberta, é onde a rampa chega e onde dá pra ver o térreo lá embaixo.
      const towerFloor2 = MeshBuilder.CreateBox(
        'towerFloor2',
        { width: TOWER_WIDTH, height: 0.12, depth: TOWER_MEZZ_DEPTH },
        scene,
      )
      towerFloor2.position = new Vector3(0, 0.1 + TOWER_FLOOR1_HEIGHT, TOWER_MEZZ_CENTER_Z)
      addTowerMesh(towerFloor2, towerFloorMat, true)

      // Parapeito baixo na borda aberta do mezanino — só pra marcar visualmente a borda (o
      // jogador ainda consegue pular por cima ou voltar pela rampa, não é uma parede de verdade).
      const towerParapet = MeshBuilder.CreateBox('towerParapet', { width: TOWER_WIDTH, height: 0.3, depth: 0.1 }, scene)
      towerParapet.position = new Vector3(0, 0.1 + TOWER_FLOOR1_HEIGHT + 0.15, TOWER_MEZZ_FRONT_Z)
      addTowerMesh(towerParapet, towerWallMat, true)

      // Paredes do andar de cima (só atrás e laterais, acompanhando o piso menor) + telhado.
      const towerBackWall2 = MeshBuilder.CreateBox('towerBackWall2', { width: TOWER_WIDTH, height: TOWER_FLOOR2_HEIGHT, depth: 0.15 }, scene)
      towerBackWall2.position = new Vector3(0, 0.1 + TOWER_FLOOR1_HEIGHT + TOWER_FLOOR2_HEIGHT / 2, TOWER_HALF_D)
      addTowerMesh(towerBackWall2, towerWallMat, true)
      for (const side of [-1, 1]) {
        const sideWall2 = MeshBuilder.CreateBox(
          `towerSideWall2${side}`,
          { width: 0.15, height: TOWER_FLOOR2_HEIGHT, depth: TOWER_MEZZ_DEPTH },
          scene,
        )
        sideWall2.position = new Vector3(
          side * TOWER_HALF_W,
          0.1 + TOWER_FLOOR1_HEIGHT + TOWER_FLOOR2_HEIGHT / 2,
          TOWER_MEZZ_CENTER_Z,
        )
        addTowerMesh(sideWall2, towerWallMat, true)
      }

      const towerRoof = MeshBuilder.CreateCylinder(
        'towerRoof',
        { height: 0.9, diameterTop: 0.05, diameterBottom: TOWER_WIDTH * 1.5, tessellation: 4 },
        scene,
      )
      towerRoof.position = new Vector3(0, 0.1 + TOWER_FLOOR1_HEIGHT + TOWER_FLOOR2_HEIGHT + 0.45, TOWER_MEZZ_CENTER_Z)
      towerRoof.rotation.y = Math.PI / 4
      addTowerMesh(towerRoof, towerRoofMat, false)

      const towerLabel = new TextBlock('towerLabel', 'Torre do Tesouro')
      towerLabel.color = 'white'
      towerLabel.fontSize = mobileFontSize(24)
      towerLabel.fontWeight = 'bold'
      towerLabel.outlineWidth = 4
      towerLabel.outlineColor = 'rgba(0,0,0,0.5)'
      guiTexture.addControl(towerLabel)
      towerLabel.linkWithMesh(towerRoof)
      towerLabel.linkOffsetY = -70

      // Moedas: 2 fáceis no térreo, 3 no mezanino (mais valioso, igual ao segundo parkour), e uma
      // última numa plataforma pequena flutuando um pulo à frente do mezanino — "o desafio" do
      // prédio, não só subir a rampa.
      towerBase.computeWorldMatrix(true)
      function addTowerCoin(name: string, localPos: Vector3) {
        const worldPos = Vector3.TransformCoordinates(localPos, towerBase.getWorldMatrix())
        const pivot = new TransformNode(`coinPivot-${name}`, scene)
        pivot.position = worldPos
        pivot.rotationQuaternion = alignmentQuaternion(TOWER_ANCHOR_UP)
        const mesh = MeshBuilder.CreateCylinder(`coin-${name}`, { height: 0.08, diameter: 0.5 }, scene)
        mesh.parent = pivot
        mesh.material = coinMat
        shadowGenerator.addShadowCaster(mesh)
        coins.push({ pivot, mesh, worldPos, collected: false })
      }
      // Térreo: do lado oposto à rampa (x negativo), fora do caminho de quem sobe.
      addTowerCoin('towerGround0', new Vector3(-0.8, 0.4, -1.0))
      addTowerCoin('towerGround1', new Vector3(-0.8, 0.4, 0.3))
      // Mezanino: espalhadas pela laje de trás (`TOWER_MEZZ_CENTER_Z`).
      addTowerCoin('towerMezz0', new Vector3(-0.9, 0.1 + TOWER_FLOOR1_HEIGHT + 0.35, TOWER_MEZZ_CENTER_Z))
      addTowerCoin('towerMezz1', new Vector3(0, 0.1 + TOWER_FLOOR1_HEIGHT + 0.35, TOWER_MEZZ_CENTER_Z))
      addTowerCoin('towerMezz2', new Vector3(0.9, 0.1 + TOWER_FLOOR1_HEIGHT + 0.35, TOWER_MEZZ_CENTER_Z))

      // Plataforma-desafio: flutua acima da rampa (não colide com ela — a rampa termina bem
      // abaixo, ver `rampAngle`/`TOWER_RAMP_RUN`), separada da borda do mezanino por um vão
      // pequeno (0,9 — bem dentro do alcance de um pulo comum, mesma conta de espaçamento do
      // parkour), com a moeda de maior valor simbólico (a última, "o prêmio").
      const TOWER_PRIZE_Z = TOWER_MEZZ_FRONT_Z - 0.9
      const towerChallengePlatform = MeshBuilder.CreateBox(
        'towerChallengePlatform',
        { width: 1.0, height: 0.15, depth: 1.0 },
        scene,
      )
      towerChallengePlatform.position = new Vector3(0, 0.1 + TOWER_FLOOR1_HEIGHT + 0.05, TOWER_PRIZE_Z)
      addTowerMesh(towerChallengePlatform, towerFloorMat, true)
      addTowerCoin('towerPrize', new Vector3(0, 0.1 + TOWER_FLOOR1_HEIGHT + 0.35, TOWER_PRIZE_Z))

      // Prédio dos Enigmas (pedido do usuário: "prédio de 4 andares em que possa subir via
      // escada... paredes quase transparentes pra poder ver como subir... quiz surpresa em cada
      // andar"). Diferente da Torre do Tesouro (rampa lisa): aqui é uma escada de degraus de
      // verdade. Degraus baixos (0,2 cada — bem menor que o raio da cápsula física do avatar,
      // 0,32) pra a cápsula conseguir subir sozinha, empurrada pelo solver de física ao encostar
      // no degrau seguinte, mesmo princípio já validado na rampa da torre.
      // Pedido do usuário: "não vai colocar o prédio em cima da estrada, pode colocar ao lado da
      // estrada" — o vetor original (phi ~30°) ficava a só 1,43 unidade da faixa da rua
      // (`streetCenter`, meio-largura 0,85), sobrepondo o asfalto. Mesmo `theta` (mesma
      // "longitude", perto de onde estava, do lado da Torre do Tesouro), `phi` maior (38°, medido
      // ao vivo: ~3,17 unidades até a faixa da rua — folga confortável além da meia-largura da
      // rua + a metade da fachada do prédio) pra ficar ao lado, não em cima.
      const QT_ANCHOR_UP = new Vector3(0.05574, 0.78801, -0.61313).normalize()
      const quizTowerBase = new TransformNode('quizTowerBase', scene)
      const qtGroundRadial = terrainGroundRadial(QT_ANCHOR_UP, terrainHeight(QT_ANCHOR_UP))
      quizTowerBase.position = QT_ANCHOR_UP.scale(qtGroundRadial)
      // Bug real reportado pelo usuário: "não consigo entrar no prédio, não tem porta" — a porta
      // existia (fisicamente aberta, confirmado com raycast), mas `alignmentQuaternion` sozinho
      // deixava a fachada (porta, z local negativo) virada 177,6° em relação à rua — ou seja,
      // de costas pra ela. Quem chegasse andando da rua (o jeito natural de se aproximar)
      // esbarrava direto na parede de TRÁS, sólida, sem nunca ver a porta do outro lado. Giro
      // extra de 180° ao redor do próprio eixo "up" do prédio (mesmo padrão de `spin` já usado
      // em props) — mesma técnica de alinhamento, só virando a fachada pro lado certo.
      quizTowerBase.rotationQuaternion = alignmentQuaternion(QT_ANCHOR_UP).multiply(
        Quaternion.RotationAxis(Vector3.Up(), Math.PI),
      )

      // Eixo x local: [-2.0,-0.7] é o poço da escada (sempre aberto, do térreo ao topo, agora
      // largo o bastante pra caber uma escada em ESPIRAL, não só uma faixa reta); [-0.7,2.0] é o
      // piso andável de cada andar.
      const QT_WIDTH = 4.0
      const QT_DEPTH = 3.4
      const QT_HALF_W = QT_WIDTH / 2
      const QT_HALF_D = QT_DEPTH / 2
      const QT_FLOOR_HEIGHT = 1.8
      const QT_FLOOR_COUNT = 4
      const QT_DOOR_WIDTH = 1.0
      const QT_FLOOR_X_MIN = -0.7
      const QT_FLOOR_WIDTH = QT_HALF_W - QT_FLOOR_X_MIN // exclui o poço da escada
      const QT_FLOOR_CENTER_X = (QT_FLOOR_X_MIN + QT_HALF_W) / 2
      // Escada em ESPIRAL (pedido do usuário depois de ver o zigue-zague ainda parecendo "sempre
      // do mesmo lado": "tem que colocar a escada do mesmo jeito que fez o parkour em degraus
      // espiral" — degraus individuais tipo plataforma, como as do parkour, girando ao redor de
      // um eixo central). Um giro completo (360°) por andar — nunca repete o mesmo ângulo dentro
      // de uma subida, resolve "mesmo lado" de vez.
      const QT_SPIRAL_CENTER_X = (-QT_HALF_W + QT_FLOOR_X_MIN) / 2 // -1.35, centro do poço
      const QT_SPIRAL_RADIUS = 0.5
      const QT_SPIRAL_STEPS_PER_FLOOR = 12 // 30° por degrau
      const QT_SPIRAL_STEP_ANGLE = (Math.PI * 2) / QT_SPIRAL_STEPS_PER_FLOOR
      const QT_SPIRAL_STEP_RISE = QT_FLOOR_HEIGHT / QT_SPIRAL_STEPS_PER_FLOOR

      const qtWallMat = new PBRMaterial('quizTowerWallMat', scene)
      qtWallMat.albedoColor = new Color3(0.68, 0.66, 0.78)
      qtWallMat.roughness = 0.8
      const qtRoofMat = new PBRMaterial('quizTowerRoofMat', scene)
      qtRoofMat.albedoColor = new Color3(0.35, 0.55, 0.75)
      qtRoofMat.roughness = 0.45
      qtRoofMat.metallic = 0.1
      const qtFloorMat = new PBRMaterial('quizTowerFloorMat', scene)
      qtFloorMat.albedoColor = new Color3(0.5, 0.42, 0.32)
      qtFloorMat.roughness = 0.85
      const qtStepMat = new PBRMaterial('quizTowerStepMat', scene)
      qtStepMat.albedoColor = new Color3(0.58, 0.5, 0.4)
      qtStepMat.roughness = 0.85
      const qtMarkerMat = new PBRMaterial('quizTowerMarkerMat', scene)
      qtMarkerMat.albedoColor = new Color3(0.95, 0.75, 0.15)
      qtMarkerMat.emissiveColor = new Color3(0.7, 0.5, 0.05)
      qtMarkerMat.roughness = 0.4

      // Malhas que ficam com a opacidade reduzida perto do jogador (ver fade no loop de física
      // mais abaixo) — paredes ficam quase transparentes (bem menos opacas); pisos só "um pouco"
      // transparentes (pedido do usuário: "o piso dos andares tem que ficar um pouco transparente
      // pra não atrapalhar a visão da câmera em 3ª pessoa" — a câmera em terceira pessoa, com
      // offset de altura, podia ficar com o piso do andar de cima entre ela e o jogador).
      const quizTowerWalls: Mesh[] = []
      const quizTowerFloors: Mesh[] = []

      function addQtMesh(mesh: Mesh, mat: PBRMaterial, collide: boolean, kind?: 'wall' | 'floor') {
        mesh.material = mat
        mesh.parent = quizTowerBase
        mesh.receiveShadows = true
        shadowGenerator.addShadowCaster(mesh)
        if (collide) new PhysicsAggregate(mesh, PhysicsShapeType.BOX, { mass: 0, friction: 0.7 }, scene)
        if (kind === 'wall') quizTowerWalls.push(mesh)
        if (kind === 'floor') quizTowerFloors.push(mesh)
      }

      // Fundação (mesma correção do lab-45 — footprint grande o bastante pra sofrer com relevo
      // variável dentro da própria área do prédio).
      const qtFoundation = MeshBuilder.CreateBox(
        'quizTowerFoundation',
        { width: QT_WIDTH + 0.2, height: 1.8, depth: QT_DEPTH + 0.2 },
        scene,
      )
      qtFoundation.position = new Vector3(0, -0.85, 0)
      addQtMesh(qtFoundation, qtFloorMat, false)

      const quizMarkers: { id: string; worldPos: Vector3 }[] = []

      for (let floor = 0; floor < QT_FLOOR_COUNT; floor++) {
        const floorY = floor * QT_FLOOR_HEIGHT

        // Piso: térreo é a largura toda (nada embaixo pra deixar aberto); andar 2 em diante
        // deixa o poço da escada (`QT_FLOOR_X_MIN` pra trás) sempre livre, do térreo ao topo.
        if (floor === 0) {
          const slab = MeshBuilder.CreateBox('quizFloor-0', { width: QT_WIDTH, height: 0.1, depth: QT_DEPTH }, scene)
          slab.position = new Vector3(0, 0.05, 0)
          addQtMesh(slab, qtFloorMat, true, 'floor')
        } else {
          const slab = MeshBuilder.CreateBox(
            `quizFloor-${floor}`,
            { width: QT_FLOOR_WIDTH, height: 0.12, depth: QT_DEPTH },
            scene,
          )
          slab.position = new Vector3(QT_FLOOR_CENTER_X, floorY + 0.06, 0)
          addQtMesh(slab, qtFloorMat, true, 'floor')

          // Parapeito baixo na borda do poço — só sinaliza visualmente a queda, o jogador ainda
          // consegue pular por cima (mesmo padrão do `towerParapet`).
          const parapet = MeshBuilder.CreateBox(
            `quizParapet-${floor}`,
            { width: 0.1, height: 0.3, depth: QT_DEPTH },
            scene,
          )
          parapet.position = new Vector3(QT_FLOOR_X_MIN, floorY + 0.12 + 0.15, 0)
          addQtMesh(parapet, qtWallMat, true)
        }

        // Paredes do andar — BUG real encontrado ao testar (usuário: "não consigo subir nas
        // escadas"): a primeira versão fazia a parede de trás e a de frente cobrirem a LARGURA
        // TODA (`QT_WIDTH`), incluindo o poço da escada — ou seja, cada lance ficava literalmente
        // fechado numa caixa, sem conseguir chegar em nenhuma das duas pontas (z=±QT_HALF_D)
        // pra completar a subida. Corrigido: parede de trás e de frente cobrem só a largura do
        // PISO (`QT_FLOOR_WIDTH`/`QT_FLOOR_CENTER_X`), deixando o poço da escada sempre aberto
        // nas duas pontas, em todo andar — também ajuda a ver a escada de fora sem depender só
        // do fade de transparência.
        const backWall = MeshBuilder.CreateBox(
          `quizBackWall-${floor}`,
          { width: QT_FLOOR_WIDTH, height: QT_FLOOR_HEIGHT, depth: 0.15 },
          scene,
        )
        backWall.position = new Vector3(QT_FLOOR_CENTER_X, floorY + QT_FLOOR_HEIGHT / 2, QT_HALF_D)
        addQtMesh(backWall, qtWallMat, true, 'wall')

        // Parede lateral externa (x=+QT_HALF_W, lado do piso) — full depth, sem afetar o poço.
        const outerSideWall = MeshBuilder.CreateBox(
          `quizSideWall-${floor}-1`,
          { width: 0.15, height: QT_FLOOR_HEIGHT, depth: QT_DEPTH },
          scene,
        )
        outerSideWall.position = new Vector3(QT_HALF_W, floorY + QT_FLOOR_HEIGHT / 2, 0)
        addQtMesh(outerSideWall, qtWallMat, true, 'wall')

        // Parede lateral externa do poço da escada (x=-QT_HALF_W) — fecha só o lado de FORA do
        // poço; as pontas (z=±QT_HALF_D) continuam abertas pra escada passar.
        const stairOuterWall = MeshBuilder.CreateBox(
          `quizSideWall-${floor}--1`,
          { width: 0.15, height: QT_FLOOR_HEIGHT, depth: QT_DEPTH },
          scene,
        )
        stairOuterWall.position = new Vector3(-QT_HALF_W, floorY + QT_FLOOR_HEIGHT / 2, 0)
        addQtMesh(stairOuterWall, qtWallMat, true, 'wall')

        if (floor === 0) {
          // Segmento da porta do lado do piso (inalterado) + um segmento curto do lado do poço
          // (só entre a borda do poço e a porta — não cobre o poço em si).
          const frontRightWidth = (QT_HALF_W - QT_DOOR_WIDTH / 2)
          const frontRight = MeshBuilder.CreateBox(
            'quizFrontWall-0-1',
            { width: frontRightWidth, height: QT_FLOOR_HEIGHT, depth: 0.15 },
            scene,
          )
          frontRight.position = new Vector3(QT_DOOR_WIDTH / 2 + frontRightWidth / 2, floorY + QT_FLOOR_HEIGHT / 2, -QT_HALF_D)
          addQtMesh(frontRight, qtWallMat, true, 'wall')

          const frontLeftWidth = -QT_DOOR_WIDTH / 2 - QT_FLOOR_X_MIN // entre a porta e a borda do poço
          if (frontLeftWidth > 0.05) {
            const frontLeft = MeshBuilder.CreateBox(
              'quizFrontWall-0--1',
              { width: frontLeftWidth, height: QT_FLOOR_HEIGHT, depth: 0.15 },
              scene,
            )
            frontLeft.position = new Vector3(QT_FLOOR_X_MIN + frontLeftWidth / 2, floorY + QT_FLOOR_HEIGHT / 2, -QT_HALF_D)
            addQtMesh(frontLeft, qtWallMat, true, 'wall')
          }
        } else {
          const frontWall = MeshBuilder.CreateBox(
            `quizFrontWall-${floor}`,
            { width: QT_FLOOR_WIDTH, height: QT_FLOOR_HEIGHT, depth: 0.15 },
            scene,
          )
          frontWall.position = new Vector3(QT_FLOOR_CENTER_X, floorY + QT_FLOOR_HEIGHT / 2, -QT_HALF_D)
          addQtMesh(frontWall, qtWallMat, true, 'wall')
        }

        // Escada em ESPIRAL (ver constantes `QT_SPIRAL_*` acima) — degraus individuais tipo
        // plataforma (mesmo estilo do parkour: `parkourPlatform`/`parkour4Platform`, uma caixa
        // rasa por degrau), girando 360° ao redor de `QT_SPIRAL_CENTER_X` a cada andar. Nunca
        // repete o mesmo ângulo dentro de uma subida — resolve "mesmo lado" de vez (era o mesmo
        // problema do zigue-zague anterior, só que pior: lá cada LANCE inteiro ainda seguia uma
        // linha reta única).
        //
        // Colisão: mesma lição do bug real encontrado testando o zigue-zague (cápsula presa em
        // degraus com colisor BOX individual, sem step-offset dedicado) — os degraus aqui
        // também são só visual (`collide: false`). A subida de verdade é uma rampa HELICOIDAL
        // aproximada por vários segmentos retos curtos e invisíveis (`quizSpiralRamp-*`), um por
        // degrau, cada um girado (`yaw`) pra ficar tangente ao círculo naquele ponto e inclinado
        // (`pitch`) pra cobrir a subida daquele trecho — mesmo princípio da rampa reta da Torre
        // do Tesouro, só que quebrada em pedaços curtos pra acompanhar a curva.
        if (floor < QT_FLOOR_COUNT - 1) {
          const arcLength = QT_SPIRAL_RADIUS * QT_SPIRAL_STEP_ANGLE
          const segmentLength = Math.sqrt(arcLength * arcLength + QT_SPIRAL_STEP_RISE * QT_SPIRAL_STEP_RISE)
          const pitch = Math.atan2(QT_SPIRAL_STEP_RISE, arcLength)
          for (let i = 0; i < QT_SPIRAL_STEPS_PER_FLOOR; i++) {
            const angle = i * QT_SPIRAL_STEP_ANGLE
            const stepX = QT_SPIRAL_CENTER_X + QT_SPIRAL_RADIUS * Math.cos(angle)
            const stepZ = QT_SPIRAL_RADIUS * Math.sin(angle)
            const stepY = floorY + i * QT_SPIRAL_STEP_RISE

            // Degrau visual — plataforma rasa, tangente ao círculo (facing na direção de giro).
            const step = MeshBuilder.CreateBox(`quizStep-${floor}-${i}`, { width: 0.55, height: 0.12, depth: 0.42 }, scene)
            step.position = new Vector3(stepX, stepY, stepZ)
            step.rotationQuaternion = Quaternion.RotationAxis(Vector3.Up(), -angle - Math.PI / 2)
            addQtMesh(step, qtStepMat, false)

            // Segmento de rampa invisível — do degrau i até o degrau i+1, tangente + inclinado.
            const angleMid = angle + QT_SPIRAL_STEP_ANGLE / 2
            const segX = QT_SPIRAL_CENTER_X + QT_SPIRAL_RADIUS * Math.cos(angleMid)
            const segZ = QT_SPIRAL_RADIUS * Math.sin(angleMid)
            const segY = floorY + (i + 0.5) * QT_SPIRAL_STEP_RISE
            const ramp = MeshBuilder.CreateBox(
              `quizSpiralRamp-${floor}-${i}`,
              { width: 0.55, height: 0.1, depth: segmentLength },
              scene,
            )
            ramp.position = new Vector3(segX, segY, segZ)
            ramp.rotationQuaternion = Quaternion.RotationYawPitchRoll(-angleMid - Math.PI / 2, -pitch, 0)
            ramp.isVisible = false
            ramp.parent = quizTowerBase
            new PhysicsAggregate(ramp, PhysicsShapeType.BOX, { mass: 0, friction: 0.7 }, scene)
          }
        }

        // Marcador do quiz surpresa deste andar — flutua sobre o piso andável, longe do poço da
        // escada, fácil de ver assim que o jogador chega no andar.
        const markerLocalPos = new Vector3(1.0, floorY + (floor === 0 ? 0.1 : 0.12) + 0.55, 0)
        quizTowerBase.computeWorldMatrix(true)
        const markerWorldPos = Vector3.TransformCoordinates(markerLocalPos, quizTowerBase.getWorldMatrix())
        const markerMesh = MeshBuilder.CreateSphere(`quizMarker-${floor}`, { diameter: 0.56 }, scene)
        markerMesh.position = markerWorldPos
        markerMesh.material = qtMarkerMat
        shadowGenerator.addShadowCaster(markerMesh)
        const markerLabel = new TextBlock(`quizMarkerLabel-${floor}`, '?')
        markerLabel.color = 'white'
        markerLabel.fontSize = mobileFontSize(32)
        markerLabel.fontWeight = 'bold'
        markerLabel.outlineWidth = 4
        markerLabel.outlineColor = 'rgba(0,0,0,0.5)'
        guiTexture.addControl(markerLabel)
        markerLabel.linkWithMesh(markerMesh)
        markerLabel.linkOffsetY = -34
        quizMarkers.push({ id: `surprise-${String(floor + 1).padStart(2, '0')}`, worldPos: markerWorldPos })
      }

      // Telhado no topo do último andar.
      const qtRoof = MeshBuilder.CreateCylinder(
        'quizTowerRoof',
        { height: 0.8, diameterTop: 0.05, diameterBottom: QT_WIDTH * 1.5, tessellation: 4 },
        scene,
      )
      qtRoof.position = new Vector3(0, QT_FLOOR_COUNT * QT_FLOOR_HEIGHT + 0.4, 0)
      qtRoof.rotation.y = Math.PI / 4
      addQtMesh(qtRoof, qtRoofMat, false)

      const qtLabel = new TextBlock('quizTowerLabel', 'Prédio dos Enigmas')
      qtLabel.color = 'white'
      qtLabel.fontSize = mobileFontSize(24)
      qtLabel.fontWeight = 'bold'
      qtLabel.outlineWidth = 4
      qtLabel.outlineColor = 'rgba(0,0,0,0.5)'
      guiTexture.addControl(qtLabel)
      qtLabel.linkWithMesh(qtRoof)
      qtLabel.linkOffsetY = -70

      // Paredes quase transparentes perto do jogador (pedido do usuário: "a câmera fique com as
      // paredes do prédio quase transparente pra poder ver como subir as escadas"). O gatilho é
      // a distância do JOGADOR até o eixo vertical do prédio — não da câmera: a câmera em
      // terceira pessoa fica atrás/acima do jogador (offset de `CAMERA_DISTANCE`/`CAMERA_HEIGHT`),
      // então medir a distância dela até a base do prédio dava falso-negativo (jogador encostado
      // na parede, câmera ainda a vários metros por trás/em cima — nunca cruzava o limiar). Usa
      // a distância TANGENCIAL (rejeita a componente radial/`QT_ANCHOR_UP`) em vez da distância
      // 3D direta até a base — assim funciona igual em qualquer andar (2º ao 4º ficam vários
      // metros "acima" da base em linha reta, mas continuam igualmente "dentro" do prédio).
      // Atualizada dentro do loop de física por quadro (mais abaixo, perto do gatilho dos quiz
      // markers) — só as constantes ficam aqui.
      const QT_FADE_START = 5.5
      const QT_FADE_END = 2.6
      const QT_MIN_ALPHA = 0.12
      // Pisos ficam só "um pouco" transparentes (pedido do usuário), não quase invisíveis como as
      // paredes — ainda precisam ser reconhecíveis como chão.
      const QT_FLOOR_MIN_ALPHA = 0.55
      // Distância de gatilho do quiz surpresa — bem menor que `TRIGGER_DISTANCE` (2,4, usado
      // pelos portais das escolas): a esfera do marcador tem raio 0,28, a cápsula do avatar tem
      // raio 0,32 — 0,85 exige contato de verdade, não só "chegar no andar" (ver comentário no
      // gatilho, no loop de física por quadro).
      const QT_QUIZ_TRIGGER_DISTANCE = 0.85

      // Moedas escondidas (pedido do usuário: "hidden collectibles/easter eggs" — recompensam
      // explorar o mapa) — uma no pico exato de cada montanha (`PLATEAU_CENTERS`), o ponto mais
      // alto de cada uma (`plateau.height`, o mesmo valor usado por `terrainHeight` — o centro do
      // platô é o único ponto onde o smoothstep chega a `t=1`, então a altura ali é exata, sem
      // ambiguidade). Só quem realmente sobe até o topo de cada montanha encontra.
      PLATEAU_CENTERS.forEach((plateau, i) => {
        const peakPos = plateau.dir.scale(PLANET_RADIUS + plateau.height + 0.35)
        const pivot = new TransformNode(`coinPivot-peak${i}`, scene)
        pivot.position = peakPos
        pivot.rotationQuaternion = alignmentQuaternion(plateau.dir)
        const mesh = MeshBuilder.CreateCylinder(`coin-peak${i}`, { height: 0.08, diameter: 0.5 }, scene)
        mesh.parent = pivot
        mesh.material = coinMat
        shadowGenerator.addShadowCaster(mesh)
        coins.push({ pivot, mesh, worldPos: peakPos, collected: false })
      })

      // Gatos "em cima de tudo" (pedido do usuário: "alguns gatos ficam ensima de tudo") —
      // diferente dos gatos que vagam pelo chão (acima): estes ficam parados nos pontos mais
      // altos do mapa (topo dos 4 platôs + telhado de 2 escolas), só balançando/olhando ao
      // redor devagar — não entram na IA de vagar porque teriam que "descer" pra andar até um
      // alvo, o que ia contra a ideia de ficarem sempre no topo.
      interface PerchedCat {
        root: TransformNode
        up: Vector3
        phase: number
      }
      const perchedCats: PerchedCat[] = []
      const PERCHED_CAT_COLORS = [
        new Color3(0.85, 0.55, 0.25),
        new Color3(0.15, 0.15, 0.15),
        new Color3(0.55, 0.55, 0.58),
        new Color3(0.92, 0.9, 0.85),
      ]
      PLATEAU_CENTERS.forEach((plateau, i) => {
        const up = plateau.dir
        const catRoot = buildGato(scene, shadowGenerator, PERCHED_CAT_COLORS[i % PERCHED_CAT_COLORS.length])
        catRoot.position.copyFrom(up.scale(terrainGroundRadial(up, terrainHeight(up)) + 0.02))
        catRoot.rotationQuaternion = alignmentQuaternion(up)
        perchedCats.push({ root: catRoot, up, phase: Math.random() * Math.PI * 2 })
      })
      portalMeshes.slice(0, 2).forEach((entry, i) => {
        const up = entry.surfacePos.length() > 0.0001 ? entry.surfacePos.clone().normalize() : Vector3.Up()
        // Ponta do telhado (cone): local Y 1.9 acima da base da escola (roof.position.y=1.5 +
        // metade da altura 0.8) — mesma direção "up" usada pra erguer a escola do chão.
        const roofTopPos = entry.surfacePos.add(up.scale(1.9))
        const catRoot = buildGato(scene, shadowGenerator, PERCHED_CAT_COLORS[(i + 2) % PERCHED_CAT_COLORS.length])
        catRoot.position.copyFrom(roofTopPos)
        catRoot.rotationQuaternion = alignmentQuaternion(up)
        perchedCats.push({ root: catRoot, up, phase: Math.random() * Math.PI * 2 })
      })
      if (import.meta.env.DEV) (window as any).__perchedCats = perchedCats

      // Piscina com gente (pedido do usuário: "picina com gente nela") — separada da lagoa
      // (theta bem distante: lagoa fica em 2.6, rio em 0.15-1.35). Reaproveita o mesmo boneco
      // do personagem/professor (buildStudentFigure), só que parado (sem ciclo de caminhada) e
      // afundado até a altura da água, com um balancinho de "boiando" no loop de render.
      //
      // Removida em aparelho fraco (lab-66, pedido do usuário: "os FPS ficam muito pesados no
      // tablet... se ajudar renderizar menos elementos pode excluir os NPCs da piscina e a
      // própria piscina") — é a decoração mais cara do mapa (cada pessoa reaproveita o boneco
      // completo do jogador, `buildStudentFigure`, não uma malha simples feito peixe/pato/
      // tartaruga). Mesmo esquema de variáveis hoisted da lagoa acima — o laço de animação mais
      // abaixo lê `poolCenterPos`/`poolForward`/`poolRight`/`poolUp`, mas nunca itera de verdade
      // porque `poolPeople` fica vazio.
      let poolUp = Vector3.Up()
      let poolCenterPos = Vector3.Zero()
      let poolForward = Vector3.Right()
      let poolRight = Vector3.Forward()
      const POOL_SHIRT_COLORS = [
        new Color3(0.9, 0.35, 0.35),
        new Color3(0.3, 0.65, 0.85),
        new Color3(0.95, 0.75, 0.2),
        new Color3(0.5, 0.8, 0.4),
        new Color3(0.75, 0.4, 0.85),
      ]
      const POOL_CHAT_LINES = [
        'Oi!',
        'kkk',
        'Que dia bom!',
        '🌞',
        '💧',
        'Vem nadar!',
        'A água tá ótima!',
        'Bora de mergulho?',
        '🏊',
        'Adoro esse lugar!',
        'Quem topa uma corrida?',
        '😄',
      ]
      const poolPeople: {
        figure: StudentFigure
        localX: number
        localZ: number
        phase: number
        chatLabel: TextBlock
        chatTimer: number
      }[] = []
      if (!isLowEndDevice) {
        poolUp = POOL_CENTER_DIR
        poolCenterPos = poolUp.scale(PLANET_RADIUS + terrainHeight(poolUp) + 0.25)
        poolForward = Vector3.Cross(poolUp, Vector3.Right()).normalize()
        poolRight = Vector3.Cross(poolUp, poolForward).normalize()
        const poolRadius = 1.1

        const poolWaterMat = new PBRMaterial('poolWaterMat', scene)
        poolWaterMat.albedoColor = new Color3(0.2, 0.55, 0.85)
        poolWaterMat.roughness = 0.08
        poolWaterMat.metallic = 0.05
        poolWaterMat.alpha = 0.85
        // Cilindro baixo, não CreateDisc — mesmo motivo da lagoa (disco nasce em pé, cilindro já
        // nasce deitado no eixo Y e alinha certo com `alignmentQuaternion`).
        const poolWater = MeshBuilder.CreateCylinder('poolWater', { diameter: poolRadius * 2, height: 0.04, tessellation: 32 }, scene)
        poolWater.material = poolWaterMat
        poolWater.position.copyFrom(poolCenterPos)
        poolWater.rotationQuaternion = alignmentQuaternion(poolUp)

        const poolRimMat = new PBRMaterial('poolRimMat', scene)
        poolRimMat.albedoColor = new Color3(0.88, 0.86, 0.8)
        poolRimMat.roughness = 0.6
        const poolRim = MeshBuilder.CreateTorus('poolRim', { diameter: poolRadius * 2 + 0.16, thickness: 0.16, tessellation: 32 }, scene)
        poolRim.material = poolRimMat
        // A água já está bem acima do chão real (bacia rebaixada + offset), então a borda só
        // precisa de um empurrãozinho pra ficar rente à linha d'água, não afundada nela.
        poolRim.position.copyFrom(poolCenterPos.add(poolUp.scale(0.02)))
        poolRim.rotationQuaternion = alignmentQuaternion(poolUp)
        shadowGenerator.addShadowCaster(poolRim)

        const POOL_PEOPLE_COUNT = 5
        for (let i = 0; i < POOL_PEOPLE_COUNT; i++) {
          const figure = buildStudentFigure(scene, POOL_SHIRT_COLORS[i], shadowGenerator)
          const angle = (i / POOL_PEOPLE_COUNT) * Math.PI * 2
          const localX = Math.cos(angle) * poolRadius * 0.5
          const localZ = Math.sin(angle) * poolRadius * 0.5

          // Bolha de fala que pisca de vez em quando — só pra dar a impressão de estarem
          // conversando (não é chat de verdade, é decoração ambiente).
          const chatLabel = new TextBlock(`poolChat-${i}`, '')
          chatLabel.color = 'white'
          chatLabel.fontSize = mobileFontSize(20)
          chatLabel.outlineWidth = 3
          chatLabel.outlineColor = 'rgba(0,0,0,0.5)'
          chatLabel.alpha = 0
          guiTexture.addControl(chatLabel)
          chatLabel.linkWithMesh(figure.head)
          chatLabel.linkOffsetY = -55

          poolPeople.push({
            figure,
            localX,
            localZ,
            phase: Math.random() * Math.PI * 2,
            chatLabel,
            chatTimer: 2 + Math.random() * 4,
          })
        }
      }

      // Pessoas civis andando pelo planeta (pedido do usuário: "pessoas andando por ai" /
      // "algumas pessoas passeando e falando") — reaproveita o mesmo boneco do jogador
      // (buildStudentFigure) e a IA de vagar dos bichinhos (lab-09), mas com o ciclo de
      // caminhada de verdade (pernas/braços) e uma bolha de fala decorativa durante as pausas,
      // igual à da piscina — dá a impressão de parar pra bater papo antes de seguir andando.
      const NPC_SHIRT_COLORS = [
        new Color3(0.85, 0.55, 0.25),
        new Color3(0.4, 0.55, 0.9),
        new Color3(0.85, 0.8, 0.3),
        new Color3(0.55, 0.85, 0.75),
        new Color3(0.8, 0.45, 0.6),
        new Color3(0.35, 0.75, 0.45),
      ]
      const NPC_CHAT_LINES = [
        'Oi!',
        'Bonito dia, né?',
        'Vamos por ali!',
        'Já viu a missão nova?',
        'Olha essa moeda!',
        '😊',
        'Boa caminhada!',
        'Que vista linda!',
      ]
      interface WalkerNpc {
        figure: StudentFigure
        up: Vector3
        targetUp: Vector3
        forward: Vector3
        moveSpeed: number
        restTimer: number
        walkPhase: number
        chatLabel: TextBlock
        chatTimer: number
        colliderBody: PhysicsAggregate['body']
      }
      const walkerNpcs: WalkerNpc[] = []
      // 5 → 3 (lab-59, mesmo pedido de FPS do Redmi Pad 2) — cada NPC andante é o mais caro dos
      // figurantes: corpo físico animado (`PhysicsAggregate`) + rig articulado completo (várias
      // malhas), não só decoração parada.
      const WALKER_COUNT = isLowEndDevice ? 3 : 10
      // lab-19: colisor cápsula por NPC, corpo ANIMATED (não DYNAMIC nem STATIC) — eles se movem
      // via IA de vagar (posição escrita direto no transform a cada quadro), não por forças de
      // física, mas ainda precisam bloquear o jogador. ANIMATED é o modo certo pra isso: o motor
      // não aplica gravidade/forças nele (o script continua no controle), mas ele empurra outros
      // corpos (o avatar) pra fora do caminho, ao contrário de um corpo STATIC que não se move.
      for (let i = 0; i < WALKER_COUNT; i++) {
        const figure = buildStudentFigure(scene, NPC_SHIRT_COLORS[i % NPC_SHIRT_COLORS.length], shadowGenerator)
        const phi = Math.PI * 0.16 + Math.random() * Math.PI * 0.56
        const theta = Math.random() * Math.PI * 2
        const up = new Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta))

        const chatLabel = new TextBlock(`npcChat-${i}`, '')
        chatLabel.color = 'white'
        chatLabel.fontSize = mobileFontSize(18)
        chatLabel.outlineWidth = 3
        chatLabel.outlineColor = 'rgba(0,0,0,0.5)'
        chatLabel.alpha = 0
        guiTexture.addControl(chatLabel)
        chatLabel.linkWithMesh(figure.head)
        chatLabel.linkOffsetY = -55

        // Cápsula centralizada a meia-altura acima do chão (igual ao colisor do avatar,
        // AVATAR_RADIUS+0.05) — a raiz visual do NPC fica colada no chão (+0.02), mas o colisor
        // físico precisa do centro elevado pra cobrir o corpo inteiro, não só os pés.
        const npcCollider = MeshBuilder.CreateCapsule(`npcCollider-${i}`, { height: 1.0, radius: 0.3 }, scene)
        npcCollider.position.copyFrom(up.scale(PLANET_RADIUS + terrainHeight(up) + 0.55))
        npcCollider.isVisible = false
        const npcAggregate = new PhysicsAggregate(
          npcCollider,
          PhysicsShapeType.CAPSULE,
          { mass: 1, friction: 0.6 },
          scene,
        )
        npcAggregate.body.setMotionType(PhysicsMotionType.ANIMATED)

        walkerNpcs.push({
          figure,
          up,
          targetUp: up,
          forward: Vector3.Cross(up, Vector3.Right()).normalize(),
          moveSpeed: 0.12 + Math.random() * 0.08,
          restTimer: Math.random() * 3,
          walkPhase: Math.random() * Math.PI * 2,
          chatLabel,
          chatTimer: 2 + Math.random() * 5,
          colliderBody: npcAggregate.body,
        })
      }
      if (import.meta.env.DEV) (window as any).__walkerNpcs = walkerNpcs

      // Multiplayer local (mesma rede): outros jogadores conectados no mesmo servidor de
      // retransmissão (app/server/relay.cjs) aparecem como o mesmo personagem estudante, com o
      // nome flutuando acima. Cada um mantém progresso de missão individual/local.
      function ensureRemotePlayer(state: RemoteState): RemotePlayer {
        let rp = remotePlayers.get(state.id)
        if (!rp) {
          const rFigure = buildStudentFigure(scene, avatarColorFromEmoji(state.avatarEmoji), shadowGenerator)
          applyBonecoFeatures(rFigure, bonecoFeaturesFromEmoji(state.avatarEmoji), scene, shadowGenerator)
          const rLabel = new TextBlock(`remote-${state.id}`, state.name)
          rLabel.color = 'white'
          rLabel.fontSize = mobileFontSize(20)
          rLabel.fontWeight = 'bold'
          rLabel.outlineWidth = 3
          rLabel.outlineColor = 'rgba(0,0,0,0.6)'
          guiTexture.addControl(rLabel)
          // Sem isso a figura nasce na origem (centro do planeta) e "voa" lerpando até a posição
          // real no primeiro quadro — bug pré-existente, pequeno mas visível, corrigido de
          // passagem junto com a animação de andar (lab-55) pra não disparar um passo/animação
          // fantasma nesse salto inicial.
          rFigure.root.position = Vector3.FromArray(state.position)
          rLabel.linkWithMesh(rFigure.root)
          rLabel.linkOffsetY = -115
          const rChatLabel = new TextBlock(`remoteChat-${state.id}`, '')
          rChatLabel.color = 'white'
          rChatLabel.fontSize = mobileFontSize(18)
          rChatLabel.outlineWidth = 3
          rChatLabel.outlineColor = 'rgba(0,0,0,0.5)'
          rChatLabel.alpha = 0
          guiTexture.addControl(rChatLabel)
          rChatLabel.linkWithMesh(rFigure.head)
          rChatLabel.linkOffsetY = -55
          const rRing = MeshBuilder.CreateTorus(
            `remoteSoundRing-${state.id}`,
            { diameter: MARS_ENEMY_PERSONAL_SPACE * 2, thickness: 0.04, tessellation: 24 },
            scene,
          )
          rRing.parent = rFigure.root
          rRing.position.y = 0.03
          const rRingMat = new PBRMaterial(`remoteSoundRingMat-${state.id}`, scene)
          rRingMat.albedoColor = new Color3(0.6, 0.9, 1)
          rRingMat.emissiveColor = new Color3(0.5, 0.85, 1)
          rRingMat.alpha = 0.5
          rRing.material = rRingMat
          rRing.setEnabled(false)
          rp = {
            figure: rFigure,
            label: rLabel,
            targetPos: Vector3.FromArray(state.position),
            targetFacing: Vector3.FromArray(state.facing),
            lastSeen: performance.now(),
            name: state.name,
            avatarEmoji: state.avatarEmoji,
            xp: state.xp,
            coins: state.coins,
            walkPhase: Math.random() * Math.PI * 2,
            lastFootSign: 0,
            chatLabel: rChatLabel,
            chatBubbleTimeout: null,
            ring: rRing,
            ringPhaseOffset: Math.random() * 1.2,
          }
          remotePlayers.set(state.id, rp)
        }
        return rp
      }

      function removeRemotePlayer(id: string) {
        const rp = remotePlayers.get(id)
        if (!rp) return
        if (rp.chatBubbleTimeout !== null) window.clearTimeout(rp.chatBubbleTimeout)
        guiTexture.removeControl(rp.label)
        guiTexture.removeControl(rp.chatLabel)
        rp.figure.root.dispose()
        remotePlayers.delete(id)
      }

      // Mostra a bolha de fala por cima da cabeça de uma figura (jogador remoto ou o próprio,
      // via `__showLocalChatBubble` abaixo) por alguns segundos e some sozinha — mesmo padrão
      // visual dos NPCs (`chatLabel` alpha 0/1), mas disparada por evento (uma mensagem de
      // verdade) em vez de timer de conversa aleatória. Retorna o novo timeout id, pro chamador
      // guardar e conseguir cancelar se uma segunda mensagem chegar antes da primeira sumir.
      function showChatBubbleText(label: TextBlock, text: string, previousTimeout: number | null): number {
        if (previousTimeout !== null) window.clearTimeout(previousTimeout)
        label.text = text
        label.alpha = 1
        return window.setTimeout(() => {
          label.alpha = 0
        }, 3000)
      }

      const unsubState = onRemoteState((state) => {
        const rp = ensureRemotePlayer(state)
        rp.targetPos = Vector3.FromArray(state.position)
        rp.targetFacing = Vector3.FromArray(state.facing)
        rp.lastSeen = performance.now()
        rp.xp = state.xp
        rp.coins = state.coins
      })
      const unsubLeave = onRemoteLeave((id) => removeRemotePlayer(id))
      const unsubChat = onChat((msg) => {
        setChatMessages((prev) => [...prev.slice(-49), msg])
        const rp = remotePlayers.get(msg.id)
        const quickMsg = findQuickChatMessage(msg.messageId)
        if (rp && quickMsg) {
          rp.chatBubbleTimeout = showChatBubbleText(rp.chatLabel, `${quickMsg.emoji} ${quickMsg.text}`, rp.chatBubbleTimeout)
        }
      })
      const unsubConnection = onConnectionChange((connected) => setMpConnected(connected))
      connectMultiplayer()
      setMpConnected(isMultiplayerConnected())

      // Ranking (lab-20) — bug real reportado pelo usuário: "eu tentei abrir no tablet e os
      // aplicativos não se enxergaram". A causa não era o WebSocket (confirmado ao vivo: os
      // dados de posição/XP/moedas chegam certinho e em tempo real, `onRemoteState` já roda
      // fora do loop de render, direto no evento de mensagem) — era este cálculo do ranking
      // rodar dentro do loop de física por quadro (`rankingTimer += dt` acumulado no
      // `scene.onBeforeRenderObservable`), que o Chrome PAUSA quando a aba/app fica em segundo
      // plano (mesmo comportamento documentado antes nesta sessão pra leitura de física via
      // automação). Resultado: comparar dois aparelhos/abas lado a lado — o normal ao testar
      // multiplayer — faz o que está sem foco no momento parecer "não enxergar" o outro, porque
      // o painel simplesmente para de atualizar enquanto a aba não está em primeiro plano.
      // `setInterval` continua rodando em segundo plano (o Chrome no máximo limita a ~1x/s em
      // abas bem inativas — exatamente a cadência que já era o objetivo aqui), então o ranking
      // se mantém atualizado nos dois lados independente de qual está com o foco.
      function refreshRanking() {
        const entries: RankingEntry[] = [
          {
            id: 'self',
            name: profileRef.current.name,
            avatarEmoji: profileRef.current.avatarEmoji,
            xp: progressRef.current.xp,
            coins: progressRef.current.coins,
            isSelf: true,
          },
        ]
        for (const [id, rp] of remotePlayers) {
          entries.push({ id, name: rp.name, avatarEmoji: rp.avatarEmoji, xp: rp.xp, coins: rp.coins, isSelf: false })
        }
        entries.sort((a, b) => (b.xp !== a.xp ? b.xp - a.xp : b.coins - a.coins))
        setRankingEntries(entries)
      }
      refreshRanking()
      const rankingInterval = window.setInterval(refreshRanking, 1000)

      ;(scene as any).__disposeMultiplayer = () => {
        unsubState()
        unsubLeave()
        unsubChat()
        unsubConnection()
        disconnectMultiplayer()
        window.clearInterval(rankingInterval)
        for (const id of Array.from(remotePlayers.keys())) removeRemotePlayer(id)
      }

      let time = 0
      // Clima dinâmico: alterna sozinho entre seco e chuva em horários aleatórios (não é um
      // ciclo fixo previsível). `rainAmount` sobe/desce suavemente (não pula direto de 0 pra 1)
      // pra transição de luz/neblina/som/partículas parecer clima de verdade chegando, não um
      // interruptor.
      let raining = false
      let weatherTimer = 30 + Math.random() * 60
      let rainAmount = 0
      // Raio: só ocorre durante a chuva (`raining`). `lightningTimer` sorteia o intervalo até o
      // próximo; ao disparar, o som do trovão é agendado com um atraso proporcional a uma
      // "distância" sorteada (raio próximo: atraso curto e som mais forte; distante: atraso
      // maior e som mais fraco) — luz viaja mais rápido que o som, mesmo detalhe de tempestades
      // de verdade.
      let lightningTimer = 6 + Math.random() * 14
      let lightningFlash = 0
      function triggerLightning() {
        lightningFlash = 1
        const distance = 0.25 + Math.random() * 0.75
        const delayMs = distance * 1800
        const intensity = 1 - distance * 0.6
        window.setTimeout(() => playThunder(intensity), delayMs)
      }
      if (import.meta.env.DEV) {
        // Hook de teste manual (sem esperar minutos): window.__forceRain(true/false) no console.
        ;(window as any).__forceRain = (on: boolean) => {
          raining = on
          weatherTimer = on ? 20 + Math.random() * 40 : 45 + Math.random() * 90
          if (on) startRain()
          else stopRain()
        }
        // window.__forceLightning() dispara um raio na hora, sem esperar o sorteio.
        ;(window as any).__forceLightning = () => triggerLightning()
      }
      scene.onBeforeRenderObservable.add(() => {
        const dt = engine.getDeltaTime() / 1000
        time += dt

        weatherTimer -= dt
        if (weatherTimer <= 0) {
          raining = !raining
          weatherTimer = raining ? 20 + Math.random() * 40 : 45 + Math.random() * 90
          if (raining) startRain()
          else stopRain()
        }
        rainAmount += ((raining ? 1 : 0) - rainAmount) * Math.min(1, dt * 0.5)
        rainSystem.emitRate = rainAmount * (isLowEndDevice ? 130 : 500)

        // Raio: só sorteia/dispara enquanto chove de verdade (rainAmount alto, não só
        // "raining=true" no instante em que a chuva ainda está começando a aparecer).
        if (raining && rainAmount > 0.4) {
          lightningTimer -= dt
          if (lightningTimer <= 0) {
            lightningTimer = 6 + Math.random() * 14
            triggerLightning()
          }
        }
        lightningFlash = Math.max(0, lightningFlash - dt / LIGHTNING_DECAY_TIME)

        scene.fogDensity = BASE_FOG_DENSITY + (RAIN_FOG_DENSITY - BASE_FOG_DENSITY) * rainAmount
        scene.environmentIntensity =
          BASE_ENV_INTENSITY + (RAIN_ENV_INTENSITY - BASE_ENV_INTENSITY) * rainAmount + lightningFlash * LIGHTNING_ENV_BOOST
        hemiLight.intensity =
          BASE_HEMI_INTENSITY + (RAIN_HEMI_INTENSITY - BASE_HEMI_INTENSITY) * rainAmount + lightningFlash * LIGHTNING_HEMI_BOOST
        sunLight.intensity =
          BASE_SUN_INTENSITY + (RAIN_SUN_INTENSITY - BASE_SUN_INTENSITY) * rainAmount + lightningFlash * LIGHTNING_SUN_BOOST

        grassMaterial.setFloat('time', time)
        for (const cloud of cloudGroups) {
          cloud.node.position = rotateAroundAxis(cloud.basePos, Vector3.Up(), time * cloud.speed)
          // Pedido do usuário: "o mesmo vale pras nuvens quando cruzam a câmera" — a câmera em
          // terceira pessoa às vezes passa perto/dentro de um tufo de nuvem (mais provável perto
          // de montanhas altas), tampando a visão. Cada nuvem fica quase transparente quando a
          // CÂMERA (não o jogador — aqui o efeito é literalmente sobre o que a câmera enxerga)
          // está perto dela.
          const camDistToCloud = Vector3.Distance(camera.position, cloud.node.position)
          const cloudTarget = camDistToCloud >= CLOUD_FADE_START ? 1 : camDistToCloud <= CLOUD_FADE_END ? CLOUD_MIN_ALPHA : CLOUD_MIN_ALPHA + ((camDistToCloud - CLOUD_FADE_END) / (CLOUD_FADE_START - CLOUD_FADE_END)) * (1 - CLOUD_MIN_ALPHA)
          for (const puff of cloud.puffs) {
            puff.visibility += (cloudTarget - puff.visibility) * 0.2
          }
        }

        // combina teclado + joystick
        let x = joystickRef.current.x
        let y = joystickRef.current.y
        if (keysDown['arrowup'] || keysDown['w']) y -= 1
        if (keysDown['arrowdown'] || keysDown['s']) y += 1
        if (keysDown['arrowleft'] || keysDown['a']) x -= 1
        if (keysDown['arrowright'] || keysDown['d']) x += 1
        const mag = Math.hypot(x, y)
        if (mag > 1) {
          x /= mag
          y /= mag
        }

        if (avatarBody && avatarMesh) {
          const body = avatarBody.body
          const pos = avatarMesh.position
          // Relativo a `currentWorldCenter` (lab-58), não à origem fixa — a origem continua sendo
          // o centro do planeta principal na maior parte do jogo (`currentWorldCenter` fica
          // `Vector3.Zero()`), mas vira o centro do planetinha secundário enquanto o jogador
          // estiver lá (ver `travelToOtherPlanet`). Todo o resto deste bloco (gravidade, chão,
          // pulo, orientação visual) já era só relativo a `pos`/`localUp`, então generalizar só
          // este cálculo basta pra funcionar em qualquer um dos dois planetas sem duplicar lógica.
          const relPos = pos.subtract(currentWorldCenter)
          const dist = relPos.length()
          const localUp = dist > 0.0001 ? relPos.scale(1 / dist) : new Vector3(0, 1, 0)

          // Chuva acompanha o jogador — reorienta o emissor pro "up" local atual, senão a chuva
          // continuaria caindo na direção de onde o jogador nasceu conforme ele anda pela esfera.
          rainAnchor.position.copyFrom(pos)
          rainAnchor.rotationQuaternion = alignmentQuaternion(localUp)

          // Dirigindo um carro (lab-25): o corpo físico do avatar fica congelado (sem
          // gravidade/velocidade nova) e a figura visual escondida (ver handler de entrar/sair)
          // — o input de teclado vira controle do carro, não do personagem a pé, então nada
          // aqui deve mexer no avatar enquanto isso. Mesma coisa pilotando o foguete (lab-59).
          if (!drivingCar && !drivingRocket) {
          // Gravidade radial real — puxa sempre pro centro do planeta (origem),
          // aplicada como força a cada quadro, não a gravidade uniforme padrão da engine.
          body.applyForce(localUp.scale(-GRAVITY), pos)

          // Mantém "facing" tangente à superfície conforme a bola rola pela curvatura
          // (transporte paralelo simplificado: remove a componente radial e renormaliza).
          facing = facing.subtract(localUp.scale(Vector3.Dot(facing, localUp)))
          if (facing.lengthSquared() < 1e-6) facing = Vector3.Cross(localUp, Vector3.Right())
          facing.normalize()

          // Controle estilo carrinho: esquerda/direita GIRA a direção atual (taxa fixa),
          // cima/baixo acelera/freia nessa direção — nunca salta pra direção do input.
          // (a versão anterior redefinia "facing" pra bater com o input a cada quadro, o que
          // degenerava quando só esquerda/direita era pressionado, sem cima/baixo.)
          if (Math.abs(x) > 0.02) {
            facing = rotateAroundAxis(facing, localUp, x * TURN_RATE * dt)
          }

          const throttle = Math.max(-1, Math.min(1, -y))
          const currentVel = body.getLinearVelocity()
          let radialSpeed = Vector3.Dot(currentVel, localUp)

          // Pulo (espaço): dispara a partir de `jumpRequested`, setado no próprio evento de
          // keydown (não por polling do estado da tecla aqui) — um toque rápido no espaço pode
          // descer E subir de novo entre dois quadros renderizados (60fps só dá ~16ms por
          // quadro; qualquer soluço/engasgo do navegador alarga essa janela), e nesse caso o
          // polling antigo (`spaceDown && !spaceWasDown`) nunca via a tecla "descer" — o pulo
          // simplesmente não acontecia, de forma intermitente e sem erro nenhum. Consumido (e
          // zerado) a cada quadro, então nunca fica um pulo "pendente" esperando o jogador
          // aterrissar.
          const groundDist = currentGroundBaseFn(localUp) + AVATAR_RADIUS + 0.05

          // Bug real relatado pelo usuário: "o parkour só funciona o primeiro pulo, depois que
          // estou em cima do degrau o pulo não funciona". Causa: `grounded` comparava só contra
          // a fórmula analítica do terreno do planeta (`groundDist`, baseada em `terrainHeight`),
          // que não sabe nada sobre as plataformas de parkour (lab-11) nem qualquer outra
          // superfície fora do planeta — parado em cima de uma plataforma, `dist` é bem maior que
          // `groundDist`, então `grounded` ficava falso pra sempre lá em cima, bloqueando qualquer
          // pulo seguinte. Corrigido com um raycast físico real (curto, pra baixo, a partir do
          // colisor do jogador) — funciona igual em cima do terreno do planeta, de uma plataforma
          // de parkour, ou de qualquer outra superfície física futura, sem precisar de um caso
          // especial por tipo de superfície.
          let grounded = false
          if (havokPlugin) {
            const rayFrom = pos
            const rayTo = pos.subtract(localUp.scale(AVATAR_RADIUS + 0.9))
            havokPlugin.raycast(rayFrom, rayTo, groundRayResult, { ignoreBody: body })
            if (groundRayResult.hasHit) {
              grounded = groundRayResult.hitDistance <= AVATAR_RADIUS + 0.13
            }
          }
          if (touchJumpRef.current) {
            touchJumpRef.current = false
            jumpRequested = true
          }
          if (jumpRequested) {
            jumpRequested = false
            if (grounded && laserStunTimer <= 0) radialSpeed = JUMP_SPEED
          }

          // Laser do parkour (lab-38, pedido do usuário: "se pisar no laser fazer animação de
          // morrendo e caindo até o planeta novamente") — checa só quando não já caindo (evita
          // redisparar o empurrão toda vez que o corpo ainda atravessa a zona de perigo durante
          // a própria queda). Decompõe a distância até o feixe em componente radial (altura
          // relativa ao feixe) e lateral (o quão perto da "linha" do feixe, nos outros dois
          // eixos) — só conta como acerto perto o bastante lateralmente E baixo o bastante
          // (não pulou alto o suficiente pra passar por cima).
          //
          // Bug real encontrado testando isto ao vivo (lab-39): a checagem original só tinha
          // limite SUPERIOR (`radialOffset < 0.05` — não subiu alto o bastante), sem limite
          // INFERIOR — um jogador no CHÃO, bem abaixo de toda a estrutura do parkour, mas
          // lateralmente alinhado com um laser específico (mesma "linha" vinda do centro do
          // planeta), também batia nas duas condições e disparava a queda, mesmo estando longe
          // de qualquer plataforma. `radialOffset > -0.7` limita a zona de perigo a perto da
          // plataforma de onde o laser realmente guarda a entrada, não a coluna toda abaixo dele.
          if (laserStunTimer <= 0) {
            for (const laser of parkour4Lasers) {
              const toLaser = pos.subtract(laser.worldPos)
              const radialOffset = Vector3.Dot(toLaser, localUp)
              const lateralDist = toLaser.subtract(localUp.scale(radialOffset)).length()
              if (lateralDist < LASER_HIT_RADIUS && radialOffset < 0.05 && radialOffset > -0.7) {
                laserStunTimer = 2.2
                laserStunSeed = Math.random() * Math.PI * 2
                playLaserZap()
                // Empurrão inicial pra fora da plataforma (pra trás + pra baixo) — sem isso o
                // corpo continuaria apoiado na mesma plataforma indefinidamente (gravidade
                // sozinha não desgruda de uma superfície sólida com contato ativo).
                const pushDir = facing.scale(-1).add(localUp.scale(-1)).normalize()
                body.setLinearVelocity(pushDir.scale(4))
                break
              }
            }
          }

          // Correr/caminhar (pedido do usuário) — segurar Shift troca de velocidade; segurar o
          // botão de toque (`touchRunRef`, pedido do usuário: "botão de correr" pro Android sem
          // teclado) faz o mesmo.
          const running = !!keysDown['shift'] || touchRunRef.current
          const currentSpeed = running ? RUN_SPEED : WALK_SPEED
          const radialVel = localUp.scale(radialSpeed)
          if (laserStunTimer > 0) {
            // Caindo depois do laser — não mexe mais na velocidade, deixa só a gravidade (já
            // aplicada como força no topo deste bloco, todo quadro) levar o personagem de volta
            // pro chão de verdade, sem o jogador conseguir andar/pular durante a queda.
            laserStunTimer -= dt
          } else {
            const tangentVel = facing.scale(throttle * currentSpeed)
            body.setLinearVelocity(tangentVel.add(radialVel))
          }
          // Trava a rotação física do colisor — é uma cápsula em pé, não deve tombar/rolar
          // por causa de torque de contato com o chão (personagem visual gira por conta própria).
          body.setAngularVelocity(Vector3.Zero())

          // Personagem visual: segue a posição tangencial do colisor, mas "grudado" na
          // superfície do planeta (não na altura elevada do colisor físico), orientado pelos
          // eixos direita/cima-local/frente.
          const right = Vector3.Cross(localUp, facing).normalize()
          if (laserStunTimer > 0) {
            // Animação de "morrendo e caindo" (pedido do usuário) — cambalhota contínua em vez
            // da orientação normal (alinhada com a direção de andar), enquanto a gravidade
            // (aplicada acima) faz o trabalho de verdade de levar o personagem pro chão.
            const tumbleAngle = (2.2 - laserStunTimer) * 9 + laserStunSeed
            studentFigure.root.rotationQuaternion = Quaternion.RotationAxis(right, tumbleAngle).multiply(
              alignmentQuaternion(localUp),
            )
          } else {
            Matrix.FromXYZAxesToRef(right, localUp, facing, tmpMatrix)
            Quaternion.FromRotationMatrixToRef(tmpMatrix, tmpQuat)
            studentFigure.root.rotationQuaternion = tmpQuat.clone()
          }
          // Altura extra acima do "grudado no chão" quando o colisor físico sobe (pulo) —
          // sem isso o personagem visual ficava sempre preso na superfície e o pulo não aparecia.
          const airHeight = Math.max(0, dist - groundDist)
          studentFigure.root.position.copyFrom(
            currentWorldCenter.add(localUp.scale(currentGroundBaseFn(localUp) + 0.02 + airHeight))
          )

          // Ciclo de caminhada — só avança enquanto o personagem realmente anda (e não está
          // caindo do laser — a cambalhota acima já cuida da pose nesse caso); som de passo
          // sintetizado disparado a cada troca de perna (cruzamento de zero do seno).
          const moving = laserStunTimer <= 0 && Math.abs(throttle) > 0.05
          if (moving) {
            walkPhase += dt * Math.abs(throttle) * (running ? RUN_CYCLE_SPEED : WALK_CYCLE_SPEED)
            const swing = Math.sin(walkPhase) * LEG_SWING_MAX
            studentFigure.legPivotL.rotation.x = swing
            studentFigure.legPivotR.rotation.x = -swing
            studentFigure.armPivotL.rotation.x = -swing * 0.7
            studentFigure.armPivotR.rotation.x = swing * 0.7
            // Joelho/cotovelo dobram durante a fase de "levantar a perna" (metade do ciclo em
            // que a coxa está indo pra frente), esticam na fase de apoio — evita perna reta
            // o tempo todo, que é o que lia como "robotizado".
            const kneeL = KNEE_BEND_MIN + (Math.sin(walkPhase + Math.PI / 2) * 0.5 + 0.5) * (KNEE_BEND_MAX - KNEE_BEND_MIN)
            const kneeR = KNEE_BEND_MIN + (Math.sin(walkPhase - Math.PI / 2) * 0.5 + 0.5) * (KNEE_BEND_MAX - KNEE_BEND_MIN)
            studentFigure.kneePivotL.rotation.x = -kneeL
            studentFigure.kneePivotR.rotation.x = -kneeR
            studentFigure.elbowPivotL.rotation.x = kneeR * 0.5
            studentFigure.elbowPivotR.rotation.x = kneeL * 0.5
            studentFigure.head.position.y = 1.15 + Math.abs(Math.sin(walkPhase * 2)) * 0.025
            const footSign = Math.sign(swing)
            if (footSign !== 0 && footSign !== lastFootSign) {
              lastFootSign = footSign
              playFootstep()
            }
          } else {
            studentFigure.legPivotL.rotation.x *= 0.8
            studentFigure.legPivotR.rotation.x *= 0.8
            studentFigure.armPivotL.rotation.x *= 0.8
            studentFigure.armPivotR.rotation.x *= 0.8
            studentFigure.kneePivotL.rotation.x *= 0.8
            studentFigure.kneePivotR.rotation.x *= 0.8
            studentFigure.elbowPivotL.rotation.x *= 0.8
            studentFigure.elbowPivotR.rotation.x *= 0.8
            studentFigure.head.position.y += (1.15 - studentFigure.head.position.y) * 0.2
            lastFootSign = 0
          }

          // Animação de golpe/tiro (lab-62) — sobrescreve o braço calculado pelo ciclo de
          // caminhada acima por um instante curto (`ATTACK_ANIM_DURATION`), disparada em
          // `handleInteractPress` ao nocautear um inimigo em Marte. Espada: braço direito faz um
          // arco de corte. Arma: braço esquerdo levanta com um "coice" de recuo.
          if (attackAnimTimer > 0) {
            attackAnimTimer -= dt
            const swingT = Math.min(1, 1 - attackAnimTimer / ATTACK_ANIM_DURATION)
            if (attackAnimKind === 'sword') {
              studentFigure.armPivotR.rotation.x = -1.9 + Math.sin(swingT * Math.PI) * 2.4
              studentFigure.elbowPivotR.rotation.x = -0.4
            } else if (attackAnimKind === 'gun') {
              studentFigure.armPivotL.rotation.x = -1.3 - Math.sin(swingT * Math.PI) * 0.35
              studentFigure.elbowPivotL.rotation.x = 0.35
            }
            if (attackAnimTimer <= 0) attackAnimKind = null
          }
          } // fim do `if (!drivingCar && !drivingRocket)` — resto do bloco (câmera/multiplayer/
            // ranking/portais) continua rodando normalmente dirigindo ou não.

          // câmera segue a bola acompanhando a orientação local do planeta (sobrescrita pela
          // câmera do carro logo abaixo, se `drivingCar` estiver setado neste quadro)
          // Botões de rotação de câmera (lab-55, pedido do usuário — tablet sem mouse pra olhar
          // em volta): giram só a posição da câmera ao redor do jogador (`cameraYawOffsetRef`),
          // sem tocar em `facing` — o boneco continua andando pra onde o direcional manda, só a
          // vista gira, como olhar em volta sem mudar pra onde anda.
          if (cameraRotateLeftRef.current) cameraYawOffsetRef.current -= dt * CAMERA_ROTATE_SPEED
          if (cameraRotateRightRef.current) cameraYawOffsetRef.current += dt * CAMERA_ROTATE_SPEED
          Matrix.FromQuaternionToRef(Quaternion.RotationAxis(localUp, cameraYawOffsetRef.current), tmpMatrix)
          const camFacing = Vector3.TransformNormal(facing, tmpMatrix).normalize()
          const desiredCamPos = pos.subtract(camFacing.scale(CAMERA_DISTANCE)).add(localUp.scale(CAMERA_HEIGHT))
          camera.position = Vector3.Lerp(camera.position, desiredCamPos, 0.08)
          camera.upVector = Vector3.Lerp(camera.upVector, localUp, 0.15).normalize()
          camera.setTarget(pos)

          // Multiplayer: manda o próprio estado (posição/direção) num ritmo baixo (não todo
          // quadro) e atualiza a posição/orientação suavizada (lerp) dos jogadores remotos.
          netSendTimer += dt
          if (netSendTimer > 0.12) {
            netSendTimer = 0
            sendState(
              profileRef.current.name,
              profileRef.current.avatarEmoji,
              studentFigure.root.position.asArray() as [number, number, number],
              facing.asArray() as [number, number, number],
              progressRef.current.xp,
              progressRef.current.coins,
            )
          }
          const nowMs = performance.now()
          for (const [remoteId, rp] of remotePlayers) {
            if (nowMs - rp.lastSeen > 8000) {
              removeRemotePlayer(remoteId)
              continue
            }
            const prevRemotePos = rp.figure.root.position.clone()
            rp.figure.root.position = Vector3.Lerp(rp.figure.root.position, rp.targetPos, 0.15)
            const rLocalUp = rp.targetPos.length() > 0.0001 ? rp.targetPos.clone().normalize() : new Vector3(0, 1, 0)
            const rRight = Vector3.Cross(rLocalUp, rp.targetFacing).normalize()
            Matrix.FromXYZAxesToRef(rRight, rLocalUp, rp.targetFacing, tmpMatrix)
            Quaternion.FromRotationMatrixToRef(tmpMatrix, tmpQuat)
            rp.figure.root.rotationQuaternion = tmpQuat.clone()

            // Animação de andar (lab-55: "eles não mexem as pernas") — um jogador remoto não tem
            // throttle/input local, então a "velocidade" vem da distância percorrida neste quadro
            // (já suavizada pelo lerp acima), igual em espírito ao que o throttle representa pro
            // personagem local. Mesmas fórmulas de perna/joelho/braço/cabeça do avatar local.
            const remoteSpeed = Vector3.Distance(prevRemotePos, rp.figure.root.position) / Math.max(dt, 0.0001)
            const remoteMoving = remoteSpeed > 0.15
            if (remoteMoving) {
              const cycleSpeed = remoteSpeed > WALK_SPEED * 1.3 ? RUN_CYCLE_SPEED : WALK_CYCLE_SPEED
              rp.walkPhase += dt * cycleSpeed
              const rSwing = Math.sin(rp.walkPhase) * LEG_SWING_MAX
              rp.figure.legPivotL.rotation.x = rSwing
              rp.figure.legPivotR.rotation.x = -rSwing
              rp.figure.armPivotL.rotation.x = -rSwing * 0.7
              rp.figure.armPivotR.rotation.x = rSwing * 0.7
              const rKneeL = KNEE_BEND_MIN + (Math.sin(rp.walkPhase + Math.PI / 2) * 0.5 + 0.5) * (KNEE_BEND_MAX - KNEE_BEND_MIN)
              const rKneeR = KNEE_BEND_MIN + (Math.sin(rp.walkPhase - Math.PI / 2) * 0.5 + 0.5) * (KNEE_BEND_MAX - KNEE_BEND_MIN)
              rp.figure.kneePivotL.rotation.x = -rKneeL
              rp.figure.kneePivotR.rotation.x = -rKneeR
              rp.figure.elbowPivotL.rotation.x = rKneeR * 0.5
              rp.figure.elbowPivotR.rotation.x = rKneeL * 0.5
              rp.figure.head.position.y = 1.15 + Math.abs(Math.sin(rp.walkPhase * 2)) * 0.025
              const rFootSign = Math.sign(rSwing)
              if (rFootSign !== 0 && rFootSign !== rp.lastFootSign) {
                rp.lastFootSign = rFootSign
                // Passo dos outros jogadores mais baixo que o próprio e some com a distância
                // (12 unidades) — evita virar uma bagunça de som com vários jogadores por perto.
                const distToLocal = Vector3.Distance(pos, rp.figure.root.position)
                playFootstep(Math.max(0, 1 - distToLocal / 12) * 0.6)
              }
            } else {
              rp.figure.legPivotL.rotation.x *= 0.8
              rp.figure.legPivotR.rotation.x *= 0.8
              rp.figure.armPivotL.rotation.x *= 0.8
              rp.figure.armPivotR.rotation.x *= 0.8
              rp.figure.kneePivotL.rotation.x *= 0.8
              rp.figure.kneePivotR.rotation.x *= 0.8
              rp.figure.elbowPivotL.rotation.x *= 0.8
              rp.figure.elbowPivotR.rotation.x *= 0.8
              rp.figure.head.position.y += (1.15 - rp.figure.head.position.y) * 0.2
              rp.lastFootSign = 0
            }

            // Anel de onda sonora nos jogadores remotos (lab-64) — mesmo cálculo de "perto de
            // Marte" usado pra decidir a barra de vida (`onSecondPlanet`), mas por distância
            // direta até `SECOND_PLANET_CENTER`, já que o estado remoto só traz posição (sem
            // campo "planeta atual" — não precisa: a posição sozinha já resolve).
            const remoteNearMars = Vector3.Distance(rp.figure.root.position, SECOND_PLANET_CENTER) < SECOND_PLANET_RADIUS + 3
            rp.ring.setEnabled(remoteNearMars)
            if (remoteNearMars) {
              const pingT = ((time + rp.ringPhaseOffset) % 1.2) / 1.2
              rp.ring.scaling.setAll(0.6 + pingT * 1.0)
              ;(rp.ring.material as PBRMaterial).alpha = 0.5 * (1 - pingT)
            }
          }

          // Fade das paredes do Prédio dos Enigmas (ver comentário de `QT_FADE_START` acima, no
          // ponto onde o prédio é construído) — roda sempre, mesmo com um quiz aberto, pra não
          // "saltar" de opacidade quando o modal fecha.
          {
            const toPlayer = pos.subtract(quizTowerBase.position)
            const radial = Vector3.Dot(toPlayer, QT_ANCHOR_UP)
            const tangentialDist = toPlayer.subtract(QT_ANCHOR_UP.scale(radial)).length()
            const qtTarget =
              tangentialDist >= QT_FADE_START
                ? 1
                : tangentialDist <= QT_FADE_END
                  ? QT_MIN_ALPHA
                  : QT_MIN_ALPHA + ((tangentialDist - QT_FADE_END) / (QT_FADE_START - QT_FADE_END)) * (1 - QT_MIN_ALPHA)
            for (const wall of quizTowerWalls) {
              wall.visibility += (qtTarget - wall.visibility) * 0.15
            }
            const qtFloorTarget =
              tangentialDist >= QT_FADE_START
                ? 1
                : tangentialDist <= QT_FADE_END
                  ? QT_FLOOR_MIN_ALPHA
                  : QT_FLOOR_MIN_ALPHA +
                    ((tangentialDist - QT_FADE_END) / (QT_FADE_START - QT_FADE_END)) * (1 - QT_FLOOR_MIN_ALPHA)
            for (const floorMesh of quizTowerFloors) {
              floorMesh.visibility += (qtFloorTarget - floorMesh.visibility) * 0.15
            }
          }

          // checa proximidade dos portais
          if (!suspendRef.current && !chatOpenRef.current) {
            for (const entry of portalMeshes) {
              const idx = quests.findIndex((q) => q.id === entry.quest.id)
              const unlocked = isQuestUnlocked(progressRef.current, idx)
              const completed = progressRef.current.completedQuestIds.includes(entry.quest.id)
              if (!unlocked || completed) continue
              const d = Vector3.Distance(pos, entry.surfacePos)
              if (d < TRIGGER_DISTANCE && !triggered.has(entry.quest.id)) {
                triggered.add(entry.quest.id)
                onSelectQuestRef.current(entry.quest.id)
              } else if (d > RESET_DISTANCE) {
                triggered.delete(entry.quest.id)
              }
            }

            // Quiz surpresa de cada andar do Prédio dos Enigmas — sem checar `completedQuestIds`
            // (são bônus avulsos, podem ser refeitos: `triggered` só evita repetir sem o jogador
            // sair de perto e voltar).
            //
            // Bug real reportado pelo usuário: "o quiz do prédio abre só de chegar no andar, tem
            // que ser quando encosto na esfera amarela" — usava o mesmo `TRIGGER_DISTANCE` (2,4)
            // dos portais das escolas, generoso demais pra uma esfera pequena (raio 0,28):
            // disparava só de pisar no andar, bem antes de chegar perto da esfera de verdade.
            // Limiar bem mais apertado (0,85 ≈ raio da cápsula do avatar + raio da esfera + uma
            // margem pequena de caminhada) pra exigir contato de verdade com o marcador.
            for (const marker of quizMarkers) {
              const d = Vector3.Distance(pos, marker.worldPos)
              if (d < QT_QUIZ_TRIGGER_DISTANCE && !triggered.has(marker.id)) {
                triggered.add(marker.id)
                onSelectSurpriseQuizRef.current(marker.id)
              } else if (d > RESET_DISTANCE) {
                triggered.delete(marker.id)
              }
            }

            for (const coin of coins) {
              if (coin.collected) continue
              if (Vector3.Distance(pos, coin.worldPos) < 1.3) {
                coin.collected = true
                coin.pivot.setEnabled(false)
                onCollectCoinRef.current()
                playCoinCollect()
              }
            }

            // Loja: chegar perto do balcão abre o modal de lojinha já existente. Mesma
            // histerese gatilho/reset dos portais — evita reabrir o modal repetidamente
            // enquanto o jogador fica parado perto do balcão (só reseta ao se afastar).
            const shopDist = Vector3.Distance(pos, shopCounterWorldPos)
            if (shopDist < 1.4 && !shopTriggered) {
              shopTriggered = true
              onOpenShopRef.current()
            } else if (shopDist > 2.2) {
              shopTriggered = false
            }
          }

          for (const coin of coins) {
            if (coin.collected) continue
            coin.mesh.rotation.y = time * 2.4
            coin.mesh.position.y = Math.sin(time * 2.6 + coin.worldPos.x) * 0.12
          }
        }

        // Bichinhos de terra: IA de vagar (anda até um alvo aleatório na esfera, descansa,
        // escolhe outro) + pulinho enquanto anda (terrestres) ou voo com bater de asa (pássaro).
        for (const c of critters) {
          const angleToTarget = Math.acos(Math.max(-1, Math.min(1, Vector3.Dot(c.up, c.targetUp))))
          const moving = angleToTarget > 0.03
          if (!moving) {
            c.restTimer -= dt
            if (c.restTimer <= 0) {
              // Alvo pertinho do ponto atual (raio pequeno no plano tangente), não em qualquer
              // lugar da faixa caminhável — um alvo totalmente aleatório fazia o bicho andar em
              // linha reta por boa parte do planeta, parecendo um robô "teleportando" de vagar
              // em vagar, não um bicho circulando pela vizinhança onde nasceu.
              const seed = Math.abs(c.up.y) < 0.9 ? Vector3.Up() : Vector3.Right()
              const tangentA = Vector3.Cross(c.up, seed).normalize()
              const tangentB = Vector3.Cross(c.up, tangentA).normalize()
              const wanderAngle = Math.random() * Math.PI * 2
              const wanderRadius = 0.15 + Math.random() * 0.25
              const offset = tangentA
                .scale(Math.cos(wanderAngle) * wanderRadius)
                .add(tangentB.scale(Math.sin(wanderAngle) * wanderRadius))
              c.targetUp = c.up.add(offset).normalize()
              c.restTimer = 1.5 + Math.random() * 3
            }
          } else {
            const axis = Vector3.Cross(c.up, c.targetUp)
            if (axis.lengthSquared() > 1e-8) {
              axis.normalize()
              const step = Math.min(c.moveSpeed * dt, angleToTarget)
              c.up = rotateAroundAxis(c.up, axis, step).normalize()
            }
          }

          let fwd = c.targetUp.subtract(c.up.scale(Vector3.Dot(c.targetUp, c.up)))
          if (fwd.lengthSquared() > 1e-6) {
            fwd.normalize()
            c.forward = fwd
          } else {
            fwd = c.forward
          }

          const groundPos = c.up.scale(PLANET_RADIUS + terrainHeight(c.up) + c.flightHeight)
          if (c.kind === 'passarinho' || c.kind === 'falcao') {
            const bob = Math.sin(time * 2 + c.hopPhase) * 0.15
            c.root.position.copyFrom(groundPos.add(c.up.scale(bob)))
            const flap = Math.sin(time * c.hopSpeed) * 0.9
            if (c.wingL) c.wingL.rotation.z = flap
            if (c.wingR) c.wingR.rotation.z = -flap

            // Canto/grito baixinho quando o jogador está perto (pedido do usuário). Timer por
            // bicho (não sincronizado entre eles) — só checa a distância quando o timer zera,
            // não todo quadro, e só toca se o jogador estiver mesmo perto nesse instante.
            if (avatarMesh) {
              c.chirpTimer = (c.chirpTimer ?? 2 + Math.random() * 5) - dt
              if (c.chirpTimer <= 0) {
                c.chirpTimer = 3 + Math.random() * 5
                if (Vector3.Distance(c.root.position, avatarMesh.position) < BIRD_CHIRP_RADIUS) {
                  if (c.kind === 'passarinho') playBirdChirp()
                  else playFalconScreech()
                }
              }
            }
          } else {
            c.hopPhase += dt * c.hopSpeed * (moving ? 1 : 0.15)
            const hop = Math.max(0, Math.sin(c.hopPhase)) * 0.05
            c.root.position.copyFrom(groundPos.add(c.up.scale(hop)))

            // Latido/rosnado (cachorro/onça) quando o jogador está perto — mesmo mecanismo do
            // pássaro/falcão acima, timer independente.
            if (avatarMesh && (c.kind === 'cachorro' || c.kind === 'onca')) {
              c.soundTimer = (c.soundTimer ?? 3 + Math.random() * 5) - dt
              if (c.soundTimer <= 0) {
                c.soundTimer = 4 + Math.random() * 6
                if (Vector3.Distance(c.root.position, avatarMesh.position) < BIRD_CHIRP_RADIUS) {
                  if (c.kind === 'cachorro') playDogBark()
                  else playJaguarGrowl()
                }
              }
            }
          }

          // Som engraçado (pedido do usuário: "sons engraçados de conversa e pum") — qualquer
          // bicho, de vez em quando, quando o jogador está perto. Intervalo bem mais longo que
          // os sons de espécie acima (é um extra raro/cômico, não o som "normal" do bicho).
          if (avatarMesh) {
            c.funnyTimer = (c.funnyTimer ?? 10 + Math.random() * 20) - dt
            if (c.funnyTimer <= 0) {
              c.funnyTimer = 20 + Math.random() * 25
              if (Vector3.Distance(c.root.position, avatarMesh.position) < BIRD_CHIRP_RADIUS) {
                if (Math.random() < 0.5) playFunnyTalk()
                else playFart()
              }
            }
          }

          // "Amigo dos Bichos" (ver `metSpecies` acima) — checado todo quadro (não por timer,
          // diferente dos sons acima) porque só dispara UMA vez por espécie no total, não é
          // repetitivo o bastante pra precisar economizar checagens.
          if (avatarMesh && !metSpecies.has(c.kind)) {
            if (Vector3.Distance(c.root.position, avatarMesh.position) < FRIEND_RADIUS) {
              metSpecies.add(c.kind)
              playCoinCollect()
              onCollectCoinRef.current()
            }
          }

          const right = Vector3.Cross(c.up, fwd).normalize()
          Matrix.FromXYZAxesToRef(right, c.up, fwd, tmpMatrix)
          Quaternion.FromRotationMatrixToRef(tmpMatrix, tmpQuat)
          c.root.rotationQuaternion = tmpQuat.clone()
        }

        // Anel de onda sonora (lab-62) — só visível/animado em Marte, pulsando continuamente
        // ("sonar", cresce e desaparece, recomeça). `soundRingMat` foi dado o `alpha` inicial na
        // construção; aqui só o `alpha` muda por quadro, então o cast é seguro.
        if (soundRing) {
          soundRing.setEnabled(onSecondPlanet)
          if (onSecondPlanet) {
            const pingT = (time % 1.2) / 1.2
            soundRing.scaling.setAll(0.6 + pingT * 1.0)
            ;(soundRing.material as PBRMaterial).alpha = 0.5 * (1 - pingT)
          }
        }

        // Espada/arma (lab-61) — giro de exibição (ajuda a chamar atenção, funciona como parte
        // da "dica" de localização pedida pelo usuário, já que a legenda flutuante sozinha pode
        // passar despercebida) + detecção de "pegou o item" (anda por cima, mesmo raio de coleta
        // espiritualmente parecido com o das moedas). Só roda no planeta principal — os itens não
        // existem em Marte.
        if (!onSecondPlanet && avatarMesh) {
          if (swordPickup && !hasSwordRef.current) {
            swordPickup.root.rotationQuaternion = alignmentQuaternion(SWORD_LOCATION_DIR).multiply(
              Quaternion.RotationAxis(Vector3.Up(), time * 1.2),
            )
            if (Vector3.Distance(avatarMesh.position, swordPickup.root.position) < WEAPON_PICKUP_RADIUS) {
              hasSwordRef.current = true
              swordPickup.root.setEnabled(false)
              swordPickup.label.alpha = 0
              if (equippedSword) equippedSword.setEnabled(true)
              playCoinCollect()
              setHasSword(true)
              setWeaponMessage('Você encontrou a Espada! Agora ela fica na sua mão — pressione E perto de um ET em Marte pra nocauteá-lo.')
              window.setTimeout(() => setWeaponMessage(null), 4500)
            }
          }
          if (gunPickup && !hasGunRef.current) {
            gunPickup.root.rotationQuaternion = alignmentQuaternion(GUN_LOCATION_DIR).multiply(
              Quaternion.RotationAxis(Vector3.Up(), time * 1.2),
            )
            if (Vector3.Distance(avatarMesh.position, gunPickup.root.position) < WEAPON_PICKUP_RADIUS) {
              hasGunRef.current = true
              gunPickup.root.setEnabled(false)
              gunPickup.label.alpha = 0
              if (equippedGun) equippedGun.setEnabled(true)
              playCoinCollect()
              setHasGun(true)
              setWeaponMessage('Você encontrou a Arma a Laser! Agora ela fica na sua mão — pressione E perto de um robô em Marte pra nocauteá-lo.')
              window.setTimeout(() => setWeaponMessage(null), 4500)
            }
          }
        }

        // Inimigos de Marte (lab-60, pedido do usuário: "no planeta marciano tem que ter ETs e
        // robôs que tenta matar o nosso boneco") — só roda quando o jogador está lá (sem custo
        // nenhum no planeta principal). Mesmo esquema de IA de vagar dos bichos acima (`up`/
        // `targetUp`/`rotateAroundAxis`), mas perseguem o jogador (`targetUp` = posição dele)
        // dentro do raio de detecção, em vez de vagar aleatoriamente perto de onde nasceram.
        // `secondPlanetRoot` não tem rotação própria (só translação pra `SECOND_PLANET_CENTER`),
        // então posição local ↔ mundo é só somar/subtrair o centro — mesma conversão simples já
        // usada pelo laço de física principal pra calcular `localUp` em qualquer planeta.
        if (onSecondPlanet && avatarMesh) {
          const avatarLocalPos = avatarMesh.position.subtract(SECOND_PLANET_CENTER)
          // `.normalize()` do Babylon muta o vetor NO LUGAR (diferente de `.add()`/`.subtract()`,
          // que devolvem um vetor novo) — chamar direto em `avatarLocalPos` encolheria ele pra
          // magnitude 1 também, corrompendo a distância calculada logo abaixo (bug real
          // encontrado ao vivo: `distToPlayer` ficava travado em ~5 — a diferença entre a
          // magnitude do inimigo, ~6, e a do jogador encolhido pra ~1 — mesmo com os dois bem
          // perto de verdade). `.clone()` primeiro evita a mutação indesejada.
          const avatarUp =
            avatarLocalPos.length() > 0.0001 ? avatarLocalPos.clone().normalize() : SECOND_PLANET_LANDING_UP
          let aliveEnemyCount = 0
          let nearestEnemyDist = Infinity
          for (const enemy of marsEnemies) {
            if (!enemy.alive) continue
            aliveEnemyCount++
            const enemyLocalPos = enemy.up.scale(SECOND_PLANET_RADIUS)
            const distToPlayer = Vector3.Distance(enemyLocalPos, avatarLocalPos)
            if (distToPlayer < nearestEnemyDist) nearestEnemyDist = distToPlayer
            const chasing = distToPlayer < MARS_ENEMY_AGGRO_RADIUS
            if (chasing) {
              enemy.targetUp = avatarUp
            } else {
              const angleToHomeTarget = Math.acos(Math.max(-1, Math.min(1, Vector3.Dot(enemy.up, enemy.targetUp))))
              if (angleToHomeTarget < 0.03) {
                enemy.restTimer -= dt
                if (enemy.restTimer <= 0) {
                  const seed = Math.abs(enemy.homeUp.y) < 0.9 ? Vector3.Up() : Vector3.Right()
                  const tangentA = Vector3.Cross(enemy.homeUp, seed).normalize()
                  const tangentB = Vector3.Cross(enemy.homeUp, tangentA).normalize()
                  const wanderAngle = Math.random() * Math.PI * 2
                  const wanderRadius = 0.1 + Math.random() * 0.15
                  const offset = tangentA
                    .scale(Math.cos(wanderAngle) * wanderRadius)
                    .add(tangentB.scale(Math.sin(wanderAngle) * wanderRadius))
                  enemy.targetUp = enemy.homeUp.add(offset).normalize()
                  enemy.restTimer = 1.5 + Math.random() * 3
                }
              }
            }

            const angleToTarget = Math.acos(Math.max(-1, Math.min(1, Vector3.Dot(enemy.up, enemy.targetUp))))
            if (angleToTarget > 0.01) {
              const axis = Vector3.Cross(enemy.up, enemy.targetUp)
              if (axis.lengthSquared() > 1e-8) {
                axis.normalize()
                const speed = chasing ? MARS_ENEMY_MOVE_SPEED * 1.6 : MARS_ENEMY_MOVE_SPEED
                const step = Math.min(speed * dt, angleToTarget)
                enemy.up = rotateAroundAxis(enemy.up, axis, step).normalize()
              }
            }

            // "Colisão" com o jogador (lab-62, pedido do usuário: "os ET e o robô também têm que
            // ter colisão... ele não pode entrar dentro do meu corpo") — sem física de verdade
            // (cara demais por inimigo, decisão já tomada no lab-60): se a perseguição trouxe o
            // inimigo pra mais perto do que `MARS_ENEMY_PERSONAL_SPACE`, empurra ele de volta pra
            // fora desse raio, na direção oposta ao jogador. `.normalize()` no fim re-projeta na
            // esfera (o "empurrão" sozinho não garante ficar exatamente no raio do planeta).
            const enemyPosAfterMove = enemy.up.scale(SECOND_PLANET_RADIUS)
            const distAfterMove = Vector3.Distance(enemyPosAfterMove, avatarLocalPos)
            if (distAfterMove < MARS_ENEMY_PERSONAL_SPACE) {
              const awayFromPlayer = enemyPosAfterMove.subtract(avatarLocalPos)
              if (awayFromPlayer.lengthSquared() > 1e-6) {
                const pushedPos = avatarLocalPos.add(awayFromPlayer.normalize().scale(MARS_ENEMY_PERSONAL_SPACE))
                enemy.up = pushedPos.normalize()
              }
            }

            let enemyFwd = enemy.targetUp.subtract(enemy.up.scale(Vector3.Dot(enemy.targetUp, enemy.up)))
            if (enemyFwd.lengthSquared() > 1e-6) {
              enemyFwd.normalize()
              enemy.forward = enemyFwd
            } else {
              enemyFwd = enemy.forward
            }

            enemy.root.position.copyFrom(enemy.up.scale(SECOND_PLANET_RADIUS))
            const enemyRight = Vector3.Cross(enemy.up, enemyFwd).normalize()
            Matrix.FromXYZAxesToRef(enemyRight, enemy.up, enemyFwd, tmpMatrix)
            Quaternion.FromRotationMatrixToRef(tmpMatrix, tmpQuat)
            enemy.root.rotationQuaternion = tmpQuat.clone()

            // "Solavanco" visual ao atacar (lab-62, pedido do usuário: "mostrar uma animação...
            // não só de soco") — pulso de escala rápido (ET/robô não têm braço articulado pra
            // animar um soco de verdade). `lungeTimer` é setado em `applyMarsDamage`.
            if (enemy.lungeTimer > 0) {
              enemy.lungeTimer -= dt
              const lungeT = Math.max(0, enemy.lungeTimer / MARS_ENEMY_LUNGE_DURATION)
              enemy.root.scaling.setAll(1 + Math.sin(lungeT * Math.PI) * 0.28)
            } else if (enemy.root.scaling.x !== 1) {
              enemy.root.scaling.setAll(1)
            }

            // Ataque com intervalo entre golpes (não dano contínuo instantâneo) — dá chance do
            // jogador reagir/fugir em vez de perder vida toda de uma vez encostando sem querer.
            enemy.attackCooldown -= dt
            if (distToPlayer < MARS_ENEMY_ATTACK_RADIUS && enemy.attackCooldown <= 0) {
              enemy.attackCooldown = MARS_ENEMY_ATTACK_INTERVAL
              applyMarsDamage(MARS_ENEMY_DAMAGE, enemy)
            }
          }

          if (aliveEnemyCount !== lastMarsEnemyCount) {
            lastMarsEnemyCount = aliveEnemyCount
            setMarsEnemyCount(aliveEnemyCount)
          }

          // Alerta de perigo (lab-65) — intensidade cresce conforme o inimigo mais próximo se
          // aproxima, de 0 (fora de `MARS_DANGER_RADIUS`) até o máximo já dentro do raio de
          // ataque; um pulso senoidal por cima (reaproveitando `time`, já incrementado acima)
          // dá a sensação de "alerta piscando" em vez de uma cor fixa.
          if (dangerOverlayRef.current) {
            const dangerT = Math.max(
              0,
              Math.min(1, 1 - (nearestEnemyDist - MARS_ENEMY_ATTACK_RADIUS) / (MARS_DANGER_RADIUS - MARS_ENEMY_ATTACK_RADIUS)),
            )
            const pulse = 0.7 + 0.3 * Math.sin(time * 6)
            dangerOverlayRef.current.style.opacity = String(dangerT * pulse * 0.6)
          }
        } else if (dangerOverlayRef.current && dangerOverlayRef.current.style.opacity !== '0') {
          dangerOverlayRef.current.style.opacity = '0'
        }

        // Gatos no topo dos platôs/telhados: parados, só um giro lento de "olhando ao redor" —
        // não usam a IA de vagar (ver comentário onde são criados).
        for (const cat of perchedCats) {
          const lookAngle = Math.sin(time * 0.3 + cat.phase) * 0.6
          cat.root.rotationQuaternion = alignmentQuaternion(cat.up).multiply(
            Quaternion.RotationAxis(Vector3.Up(), lookAngle),
          )
        }

        // Pessoas civis: mesma IA de vagar dos bichos de terra (anda até um alvo perto, descansa,
        // escolhe outro), mas com o ciclo de caminhada completo (pernas/joelhos/braços) igual ao
        // personagem jogável, e bolha de fala só durante as pausas.
        for (const npc of walkerNpcs) {
          const angleToTarget = Math.acos(Math.max(-1, Math.min(1, Vector3.Dot(npc.up, npc.targetUp))))
          const moving = angleToTarget > 0.03
          if (!moving) {
            npc.restTimer -= dt
            if (npc.restTimer <= 0) {
              const seed = Math.abs(npc.up.y) < 0.9 ? Vector3.Up() : Vector3.Right()
              const tangentA = Vector3.Cross(npc.up, seed).normalize()
              const tangentB = Vector3.Cross(npc.up, tangentA).normalize()
              const wanderAngle = Math.random() * Math.PI * 2
              const wanderRadius = 0.2 + Math.random() * 0.3
              const offset = tangentA
                .scale(Math.cos(wanderAngle) * wanderRadius)
                .add(tangentB.scale(Math.sin(wanderAngle) * wanderRadius))
              npc.targetUp = npc.up.add(offset).normalize()
              npc.restTimer = 2 + Math.random() * 4
            }
          } else {
            const axis = Vector3.Cross(npc.up, npc.targetUp)
            if (axis.lengthSquared() > 1e-8) {
              axis.normalize()
              const step = Math.min(npc.moveSpeed * dt, angleToTarget)
              npc.up = rotateAroundAxis(npc.up, axis, step).normalize()
            }
          }

          let npcFwd = npc.targetUp.subtract(npc.up.scale(Vector3.Dot(npc.targetUp, npc.up)))
          if (npcFwd.lengthSquared() > 1e-6) {
            npcFwd.normalize()
            npc.forward = npcFwd
          } else {
            npcFwd = npc.forward
          }

          npc.figure.root.position.copyFrom(npc.up.scale(PLANET_RADIUS + terrainHeight(npc.up) + 0.02))
          const npcRight = Vector3.Cross(npc.up, npcFwd).normalize()
          Matrix.FromXYZAxesToRef(npcRight, npc.up, npcFwd, tmpMatrix)
          Quaternion.FromRotationMatrixToRef(tmpMatrix, tmpQuat)
          npc.figure.root.rotationQuaternion = tmpQuat.clone()
          // Colisor ANIMATED: `setTargetTransform` (não escrever a posição do transform direto)
          // é o jeito certo do Havok pra mover um corpo cinemático — assim ele calcula a
          // velocidade implícita do movimento e consegue empurrar o avatar corretamente em vez
          // de só teleportar o colisor sem gerar resposta de colisão. Centro elevado (+0.55, meia
          // altura da cápsula) igual na criação — a raiz visual (+0.02) fica só nos pés.
          npc.colliderBody.setTargetTransform(
            npc.up.scale(PLANET_RADIUS + terrainHeight(npc.up) + 0.55),
            npc.figure.root.rotationQuaternion,
          )

          if (moving) {
            npc.walkPhase += dt * WALK_CYCLE_SPEED * 0.7
            const swing = Math.sin(npc.walkPhase) * LEG_SWING_MAX
            npc.figure.legPivotL.rotation.x = swing
            npc.figure.legPivotR.rotation.x = -swing
            npc.figure.armPivotL.rotation.x = -swing * 0.7
            npc.figure.armPivotR.rotation.x = swing * 0.7
            const kneeL = KNEE_BEND_MIN + (Math.sin(npc.walkPhase + Math.PI / 2) * 0.5 + 0.5) * (KNEE_BEND_MAX - KNEE_BEND_MIN)
            const kneeR = KNEE_BEND_MIN + (Math.sin(npc.walkPhase - Math.PI / 2) * 0.5 + 0.5) * (KNEE_BEND_MAX - KNEE_BEND_MIN)
            npc.figure.kneePivotL.rotation.x = -kneeL
            npc.figure.kneePivotR.rotation.x = -kneeR
            npc.figure.elbowPivotL.rotation.x = kneeR * 0.5
            npc.figure.elbowPivotR.rotation.x = kneeL * 0.5
          } else {
            npc.figure.legPivotL.rotation.x *= 0.8
            npc.figure.legPivotR.rotation.x *= 0.8
            npc.figure.armPivotL.rotation.x *= 0.8
            npc.figure.armPivotR.rotation.x *= 0.8
            npc.figure.kneePivotL.rotation.x *= 0.8
            npc.figure.kneePivotR.rotation.x *= 0.8
            npc.figure.elbowPivotL.rotation.x *= 0.8
            npc.figure.elbowPivotR.rotation.x *= 0.8
          }

          // Bolha de fala só durante as pausas (parece bater papo antes de seguir andando) —
          // some assim que volta a andar.
          npc.chatTimer -= dt
          if (!moving && npc.chatTimer <= 0) {
            if (npc.chatLabel.alpha > 0) {
              npc.chatLabel.alpha = 0
              npc.chatTimer = 1.5 + Math.random() * 3
            } else {
              npc.chatLabel.text = NPC_CHAT_LINES[Math.floor(Math.random() * NPC_CHAT_LINES.length)]
              npc.chatLabel.alpha = 1
              npc.chatTimer = 1.8
            }
          } else if (moving && npc.chatLabel.alpha > 0) {
            npc.chatLabel.alpha = 0
          }
        }

        // Carros de IA: dão voltas contínuas na rua (laço fechado, lab-25) — `pathIndex` sobe
        // sempre na mesma direção, envolvendo (`%`, dentro de `positionOnLoopPath`) em vez de
        // ricochetear numa ponta que não existe mais.
        for (const car of carros) {
          if (car === drivingCar) continue // o jogador está no controle deste, não a IA
          car.pathIndex += car.direction * car.speed * dt
          positionOnLoopPath(streetCenter, car.pathIndex, car.direction, car.root, 0.08, tmpMatrix, tmpQuat)
        }

        // Carro que o jogador está dirigindo (lab-25, pedido do usuário: "andar de carro na
        // estrada atraves das setas") — mesmo trajeto/mecanismo dos carros de IA, mas o
        // `pathIndex` avança por input de teclado (cima/baixo, igual ao "throttle" do
        // personagem a pé) em vez de sozinho. Setas esquerda/direita não fazem nada aqui — a
        // rua é um trilho 1D, não tem pra onde "virar" fora dela.
        if (drivingCar) {
          const driveThrottle = Math.max(-1, Math.min(1, -y))
          drivingCar.direction = driveThrottle >= 0 ? 1 : -1
          drivingCar.pathIndex += driveThrottle * CAR_DRIVE_SPEED * dt
          positionOnLoopPath(streetCenter, drivingCar.pathIndex, drivingCar.direction, drivingCar.root, 0.08, tmpMatrix, tmpQuat)

          // Câmera segue o carro (mesmo esquema de lerp da câmera a pé) — usa a orientação do
          // próprio carro como "up"/"facing" local, já calculada por `positionOnLoopPath`.
          const carUpNow = drivingCar.root.position.clone().normalize()
          // `computeWorldMatrix(true)` força recálculo imediato — sem isso, `getWorldMatrix()`
          // devolveria a matriz de ANTES do `positionOnLoopPath` deste mesmo quadro (o
          // recálculo automático do Babylon só acontece depois, na passada de render), um
          // atraso de 1 quadro na direção da câmera (imperceptível a 60fps, mas incorreto).
          const carFwdNow = Vector3.TransformNormal(
            Vector3.Forward(),
            drivingCar.root.computeWorldMatrix(true),
          ).normalize()
          const desiredCarCamPos = drivingCar.root.position.subtract(carFwdNow.scale(CAMERA_DISTANCE)).add(carUpNow.scale(CAMERA_HEIGHT))
          camera.position = Vector3.Lerp(camera.position, desiredCarCamPos, 0.12)
          camera.upVector = Vector3.Lerp(camera.upVector, carUpNow, 0.15).normalize()
          camera.setTarget(drivingCar.root.position)
        }

        // Foguete que o jogador está pilotando (lab-59, pedido do usuário: "deve ter como
        // controlar como tem no carro, em que você consegue ir pra trás e pra frente com as
        // setas ou direcional, e viajar pelo espaço entre os dois planetas") — mesmo mecanismo
        // do carro (input cima/baixo vira progresso ao longo de um trajeto fixo), só que o
        // "trajeto" é a curva de voo entre as duas plataformas em vez de uma rua. Pouso
        // automático (`landRocket`) ao alcançar qualquer uma das duas pontas — não precisa
        // apertar E de novo pra desembarcar.
        if (drivingRocket && flyingRocket) {
          const rocketThrottle = Math.max(-1, Math.min(1, -y))
          drivingRocket.progress = Math.max(
            0,
            Math.min(1, drivingRocket.progress + rocketThrottle * ROCKET_FLIGHT_SPEED * dt),
          )
          const { position: shipPos, tangent: shipTangent } = sampleFlightArc(
            drivingRocket.p0,
            drivingRocket.c1,
            drivingRocket.c2,
            drivingRocket.p1,
            drivingRocket.progress,
          )
          flyingRocket.position.copyFrom(shipPos)
          // Orientação da nave em três trechos (lab-61, pedido do usuário: "ele deve voar
          // apontando pro planeta de destino e pousar de ré" — a versão anterior só interpolava
          // entre as duas rotações de repouso, então nunca apontava pra onde estava indo de
          // verdade durante o cruzeiro):
          // 1) decolagem (até `ROCKET_LAUNCH_HOLD_END`): trava na rotação de repouso da
          //    plataforma de partida — sai reto pra cima, sem guinada.
          // 2) cruzeiro (até `ROCKET_LANDING_FLIP_START`): nariz gira INCREMENTALMENTE
          //    (`quaternionBetweenVectors`, nunca degenera) atrás da tangente da curva a cada
          //    quadro — aponta pra onde a nave está indo de verdade, pedido do usuário.
          // 3) pouso: "flip" — interpola (Slerp) da orientação capturada no instante em que essa
          //    fase começa até a rotação de repouso da plataforma de chegada, terminando "de pé",
          //    motores (cauda) na frente descendo — pouso de ré.
          if (drivingRocket.progress <= ROCKET_LAUNCH_HOLD_END) {
            flyingRocket.rotationQuaternion = drivingRocket.fromRestQuat.clone()
            drivingRocket.flipStartQuat = null
          } else if (drivingRocket.progress < ROCKET_LANDING_FLIP_START) {
            flyingRocket.computeWorldMatrix(true)
            const currentNose = Vector3.TransformNormal(Vector3.Up(), flyingRocket.getWorldMatrix()).normalize()
            const deltaRotation = quaternionBetweenVectors(currentNose, shipTangent)
            flyingRocket.rotationQuaternion = deltaRotation.multiply(
              flyingRocket.rotationQuaternion ?? Quaternion.Identity(),
            )
            drivingRocket.flipStartQuat = null
          } else {
            if (!drivingRocket.flipStartQuat) {
              drivingRocket.flipStartQuat = (flyingRocket.rotationQuaternion ?? drivingRocket.fromRestQuat).clone()
            }
            flyingRocket.rotationQuaternion = Quaternion.Slerp(
              drivingRocket.flipStartQuat,
              drivingRocket.toRestQuat,
              holdFlipHoldCurve(drivingRocket.progress, ROCKET_LANDING_FLIP_START, 1),
            )
          }
          // Câmera posicionada atrás da CAUDA da nave (nariz invertido), não atrás da tangente
          // crua da curva — bug real reportado pelo usuário ("o foguete tem que viajar na
          // horizontal da câmera, eu deveria enxergar os motores dele na perspectiva de 3ª
          // pessoa, mas ele tá viajando na vertical"): a tangente da curva muda bruscamente de
          // direção e passa boa parte do voo quase paralela ao "pra cima" fixo do mundo (usado
          // antes como referência da câmera), o que deixava a câmera olhando quase reto pra
          // cima/baixo — a nave parecia subir/descer na tela em vez de voar "de lado", e o
          // ângulo não mostrava os motores. Usar o NARIZ DE VERDADE da nave (derivado da rotação
          // que ela já tem, suave por construção via `holdFlipHoldCurve`/`Slerp` acima) resolve
          // os dois problemas de uma vez: a câmera sempre fica do lado oposto ao nariz — vendo os
          // motores — e nunca mais degenera perto do "pra cima" do mundo.
          flyingRocket.computeWorldMatrix(true)
          const shipNoseDir = Vector3.TransformNormal(Vector3.Up(), flyingRocket.getWorldMatrix()).normalize()
          let upReference = Vector3.Up()
          if (Math.abs(Vector3.Dot(shipNoseDir, upReference)) > 0.9) upReference = Vector3.Right()
          const shipUp = upReference.subtract(shipNoseDir.scale(Vector3.Dot(upReference, shipNoseDir))).normalize()

          const desiredShipCamPos = shipPos.subtract(shipNoseDir.scale(CAMERA_DISTANCE)).add(shipUp.scale(CAMERA_HEIGHT))
          camera.position = Vector3.Lerp(camera.position, desiredShipCamPos, 0.1)
          camera.upVector = Vector3.Lerp(camera.upVector, shipUp, 0.15).normalize()
          camera.setTarget(shipPos)

          if (drivingRocket.progress >= 1 || drivingRocket.progress <= 0) landRocket()
        }

        // Dica "pressione E" (lab-25) — só visível perto de um carro parado e só quando o
        // jogador não está dirigindo nenhum (não faz sentido mostrar "entrar" em cima de outro
        // carro enquanto já se está dirigindo um). `avatarMesh.position` direto (não `pos`, que
        // só existe dentro do bloco `if (avatarBody && avatarMesh)` acima, já fechado aqui).
        if (!drivingCar && avatarMesh) {
          for (const car of carros) {
            const d = Vector3.Distance(avatarMesh.position, car.root.position)
            car.hintLabel.alpha = d < CAR_ENTER_DISTANCE ? 1 : 0
          }
        } else {
          for (const car of carros) car.hintLabel.alpha = 0
        }

        // Dica "pressione E" do foguete (lab-58) — mesmo padrão do carro acima: só o foguete do
        // planeta em que o jogador está agora (o outro fica escondido/distante, sem custo real de
        // checar já que é só uma comparação de distância).
        // Escondida durante o voo (lab-59) — sem isso ficaria presa em "Pressione E pra
        // embarcar" o trecho inteiro: `avatarMesh` (o colisor físico do jogador a pé) fica
        // parado perto da plataforma de partida durante o voo inteiro (só `flyingRocket` se move
        // de verdade), então a distância até o foguete parado continuaria pequena o tempo todo.
        if (avatarMesh && !drivingRocket) {
          const activeRocket = onSecondPlanet ? secondPlanetReturnRocket : mainRocket
          if (activeRocket) {
            // `getAbsolutePosition()` — mesmo motivo do outro ponto de checagem em
            // `handleInteractPress` (o foguete de volta é filho de `secondPlanetRoot`).
            const d = Vector3.Distance(avatarMesh.position, activeRocket.root.getAbsolutePosition())
            activeRocket.hintLabel.alpha = d < ROCKET_ENTER_DISTANCE ? 1 : 0
          }
        } else if (drivingRocket) {
          if (mainRocket) mainRocket.hintLabel.alpha = 0
          if (secondPlanetReturnRocket) secondPlanetReturnRocket.hintLabel.alpha = 0
        }

        // Bichos da lagoa: cada um percorre um círculo no plano local da lagoa (raio/velocidade/
        // fase próprios), orientados pra frente da direção de nado.
        for (const pc of pondCritters) {
          const t = time * pc.speed + pc.angleOffset
          const localX = Math.cos(t) * pc.radius
          const localZ = Math.sin(t) * pc.radius
          const bob = Math.sin(time * 2.4 + pc.bobPhase) * 0.015
          const worldPos = pondCenterPos
            .add(pondRight.scale(localX))
            .add(pondForward.scale(localZ))
            .add(pondUp.scale(pc.depth + bob))
          pc.root.position.copyFrom(worldPos)

          const dirX = -Math.sin(t)
          const dirZ = Math.cos(t)
          const fwd = pondRight.scale(dirX).add(pondForward.scale(dirZ)).normalize()
          const right = Vector3.Cross(pondUp, fwd).normalize()
          Matrix.FromXYZAxesToRef(right, pondUp, fwd, tmpMatrix)
          Quaternion.FromRotationMatrixToRef(tmpMatrix, tmpQuat)
          pc.root.rotationQuaternion = tmpQuat.clone()
        }

        // Gente na piscina: parada (sem ciclo de caminhada), só um balancinho vertical de
        // "boiando" — cada um com fase própria pra não subir/descer em sincronia.
        for (const pp of poolPeople) {
          const bob = Math.sin(time * 1.6 + pp.phase) * 0.05
          // Deriva devagar em círculo dentro da piscina, em vez de ficar plantado no mesmo
          // ponto — "se mexer" sem precisar de física de água de verdade.
          const drift = time * 0.15 + pp.phase
          const driftX = pp.localX + Math.cos(drift) * 0.12
          const driftZ = pp.localZ + Math.sin(drift) * 0.12
          const worldPos = poolCenterPos
            .add(poolRight.scale(driftX))
            .add(poolForward.scale(driftZ))
            .add(poolUp.scale(-0.32 + bob))
          pp.figure.root.position.copyFrom(worldPos)

          // Gira devagar (parece estar batendo papo, olhando de um lado pro outro) +
          // "nadadinha de cachorrinho" nos braços — não fica uma estátua parada boiando.
          const wobble = Math.sin(time * 0.6 + pp.phase) * 0.35
          pp.figure.root.rotationQuaternion = alignmentQuaternion(poolUp).multiply(
            Quaternion.RotationAxis(Vector3.Up(), wobble),
          )
          const paddle = Math.sin(time * 3.2 + pp.phase) * 0.4
          pp.figure.armPivotL.rotation.x = paddle
          pp.figure.armPivotR.rotation.x = -paddle

          // Bolha de fala: some, espera, aparece com uma frase por ~1.6s, some de novo — cada
          // um com timer próprio pra não falarem todos junto.
          pp.chatTimer -= dt
          if (pp.chatTimer <= 0) {
            if (pp.chatLabel.alpha > 0) {
              pp.chatLabel.alpha = 0
              pp.chatTimer = 2 + Math.random() * 4
            } else {
              pp.chatLabel.text = POOL_CHAT_LINES[Math.floor(Math.random() * POOL_CHAT_LINES.length)]
              pp.chatLabel.alpha = 1
              pp.chatTimer = 1.6
            }
          }
        }

        // Contador de FPS sempre visível, também em produção (lab-67, pedido do usuário:
        // "preciso de informações de FPS na tela em produção") — antes só aparecia em DEV; sem
        // isso não dava pra saber, num aparelho de verdade rodando o jogo publicado, se um ajuste
        // de performance realmente ajudou ou não.
        if (debugRef.current) {
          debugRef.current.textContent = `${Math.round(engine.getFps())} FPS · escala ${engine.getHardwareScalingLevel().toFixed(2)} · fraco=${isLowEndDevice} telaP=${isSmallScreen} · ${instrumentation.drawCallsCounter.current} draw calls · ${scene.getActiveMeshes().length}/${scene.meshes.length} meshes`
        }

        // Brilho pulsante suave no telhado das escolas desbloqueadas (prédio não flutua nem
        // gira — só o brilho pulsa, pra chamar atenção sem parecer um objeto mágico solto).
        for (const entry of portalMeshes) {
          const idx = quests.findIndex((q) => q.id === entry.quest.id)
          const unlocked = isQuestUnlocked(progressRef.current, idx)
          const completed = progressRef.current.completedQuestIds.includes(entry.quest.id)
          if (unlocked && !completed) {
            const pulse = 0.4 + Math.sin(time * 2 + idx) * 0.18
            const color = questTypeColor[entry.quest.type]
            ;(entry.roof.material as PBRMaterial).emissiveColor = color.scale(pulse)
          }
        }
      })

      // Instrumentação real (não estimada) de FPS/draw calls/física — lida via
      // window.__perf no console/DevTools para o relatório de desempenho.
      const instrumentation = new SceneInstrumentation(scene)
      instrumentation.capturePhysicsTime = true
      instrumentation.captureFrameTime = true
      ;(window as any).__perf = {
        fps: () => Math.round(engine.getFps()),
        drawCalls: () => instrumentation.drawCallsCounter.current,
        physicsTimeMs: () => instrumentation.physicsTimeCounter.current.toFixed(2),
        frameTimeMs: () => instrumentation.frameTimeCounter.current.toFixed(2),
        activeMeshes: () => scene.getActiveMeshes().length,
        totalMeshes: () => scene.meshes.length,
      }
    }

    setup()

    engine.runRenderLoop(() => {
      if (!disposed) scene.render()
    })

    const onResize = () => {
      engine.resize()
      ;(scene as any).__syncGuiResolution?.()
    }
    window.addEventListener('resize', onResize)

    // Auto-ajuste de resolução por FPS medido de verdade (lab-58) — em vez de continuar
    // adivinhando um `hardwareScalingLevel` fixo às cegas (lab-53: 1.5, lab-56: 1.75 — pesado
    // demais borrado num Poco C75, lab-57: de volta pra 1.5 — usuário ainda reportou "qualidade
    // gráfica muito baixa"), mede o FPS real e ajusta pro valor que ESSE aparelho específico
    // realmente precisa — pode inclusive VOLTAR pra quase resolução cheia se o aparelho aguentar,
    // coisa que um valor fixo nunca conseguiria.
    //
    // Tabela ajustada duas vezes no lab-59, em direções opostas — e isso é esperado, não um erro:
    // o Poco C75 (celular, tela pequena) reportou "qualidade muito baixa" (pediu nitidez), o Redmi
    // Pad 2 (tablet, tela bem maior — mais pixels pra sombrear no MESMO `hardwareScalingLevel")
    // reportou "muito lag" (pediu FPS) — dois aparelhos DIFERENTES, medidos independentemente por
    // este mesmo mecanismo. A correção: baixar o teto só das faixas de FPS "ok" (30-45, >45 —
    // aparelho com folga, favorece nitidez) enquanto SOBE o teto da faixa mais crítica (<20 —
    // aparelho realmente lutando pra rodar, onde jogabilidade importa mais que nitidez). Cada
    // aparelho cai na faixa que a PRÓPRIA medição de FPS dele indicar, então os dois pedidos
    // continuam satisfeitos ao mesmo tempo sem precisar saber qual aparelho é qual.
    //
    // Virou CONTÍNUO no lab-67 (pedido do usuário: "ainda tem lag ao mover a câmera e se percebe
    // baixo FPS ao andar") — a versão anterior (lab-58) media só uma vez, ~6s depois de carregar,
    // e travava esse valor pro resto da sessão inteira. Como a cena perto do ponto de nascimento é
    // mais leve que áreas densas do mapa (floresta cheia de props, perto da estação alienígena em
    // Marte etc.), uma amostra única logo no início podia escolher uma resolução alta demais pra
    // aguentar essas áreas mais pesadas depois — daí "lag ao andar" mesmo com o auto-ajuste já
    // tendo rodado uma vez. Agora repete o ciclo de amostragem indefinidamente (a cada ~12s: 6s de
    // descanso + ~4s de amostragem), reagindo tanto pra PIOR (entrou numa área pesada) quanto pra
    // MELHOR (voltou pra uma área leve) ao longo de toda a sessão, não só no carregamento.
    //
    // Tabela + passo gradual retrabalhados no lab-69 (usuário, Poco C75: "o fps estabilizou acima
    // de 35 fps está bom, pode melhorar a qualidade gráfica" — ou seja, o celular tinha folga de
    // FPS de sobra mas ficou preso numa resolução baixa demais pra ler o texto). Dois problemas
    // corrigidos juntos:
    // 1) Os limiares antigos só davam resolução cheia (1.0) a partir de 45fps — um aparelho
    //    estável em 35-44fps (bom o bastante, segundo o próprio usuário) ficava preso na faixa
    //    "1.15" pra sempre. Novo limiar: >=35fps já é resolução cheia.
    // 2) Pular direto pro pior nível (2.4) por causa de UMA amostra ruim (ex.: um pico de carga
    //    momentâneo) e nunca mais subir de novo seria o "flip-flop" que o comentário do lab-59 já
    //    evitava trocando os limiares — mas o mecanismo antigo ainda podia ficar preso embaixo se
    //    a amostra ruim batesse bem na janela de medição. Agora os níveis formam uma escada
    //    (`SCALING_TIERS`, do melhor pro pior) e cada ciclo só anda UM degrau por vez em direção
    //    ao nível que o FPS atual pede — a primeira medição (logo após carregar) ainda pode pular
    //    direto pro degrau certo, só os ciclos SEGUINTES ficam graduais. Isso amortece tanto uma
    //    queda pontual (não desaba direto pro pior nível) quanto uma melhora pontual (não sobe
    //    resolução cheia de repente só por uma amostra boa isolada), sem deixar de convergir pro
    //    nível certo em poucos ciclos (~12s cada).
    // Teto do pior nível reduzido de 2.2 pra 1.6 no lab-70 — usuário testou o Poco C75 depois do
    // lab-69 e reportou que mesmo no pior nível o FPS não passava de ~20 (o gargalo desse
    // aparelho não é fill-rate/resolução, é outra coisa — física/JS por quadro, não afetado por
    // `hardwareScalingLevel`), então baixar a resolução além de certo ponto só piorava a
    // legibilidade sem ganhar FPS o bastante pra compensar ("não compensa ter FPS mas não dá pra
    // ver as legendas... mesmo assim sem condição visual de jogabilidade"). Aceitar um piso de
    // FPS mais baixo em troca de continuar enxergando alguma coisa é a troca certa aqui.
    const SCALING_TIERS = [1.0, 1.15, 1.4, 1.6]
    function desiredTierIndex(avgFps: number): number {
      if (avgFps < 20) return 3
      if (avgFps < 30) return 2
      if (avgFps < 35) return 1
      return 0
    }
    let fpsAutoTuneInterval: number | null = null
    let fpsAutoTuneTimeout: number | null = null
    if (isLowEndDevice) {
      let currentTier = 1 // nível moderado inicial (ver `engine.setHardwareScalingLevel` mais acima)
      let firstCycle = true
      const runAutoTuneCycle = () => {
        if (disposed) return
        const fpsSamples: number[] = []
        fpsAutoTuneInterval = window.setInterval(() => {
          if (disposed) {
            if (fpsAutoTuneInterval !== null) window.clearInterval(fpsAutoTuneInterval)
            return
          }
          fpsSamples.push(engine.getFps())
          if (fpsSamples.length >= 3) {
            if (fpsAutoTuneInterval !== null) window.clearInterval(fpsAutoTuneInterval)
            const avgFps = fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length
            const target = desiredTierIndex(avgFps)
            if (firstCycle) {
              firstCycle = false
              currentTier = target
            } else if (target > currentTier) {
              currentTier += 1
            } else if (target < currentTier) {
              currentTier -= 1
            }
            const scaling = SCALING_TIERS[currentTier]
            if (scaling !== engine.getHardwareScalingLevel()) {
              engine.setHardwareScalingLevel(scaling)
              ;(scene as any).__syncGuiResolution?.()
            }
            // Descanso entre ciclos — não precisa reagir a cada quadro, só acompanhar mudanças
            // reais de área/cena ao longo do tempo.
            fpsAutoTuneTimeout = window.setTimeout(runAutoTuneCycle, 6000)
          }
        }, 1300)
      }
      // Espera 6s antes do PRIMEIRO ciclo (não só entre ciclos) — sem isso mediria FPS ainda
      // durante o carregamento inicial (física/glTF/texturas), que é enganosamente baixo e não
      // representa o jogo já rodando de verdade.
      fpsAutoTuneTimeout = window.setTimeout(runAutoTuneCycle, 6000)
    }

    return () => {
      disposed = true
      if (fpsAutoTuneInterval !== null) window.clearInterval(fpsAutoTuneInterval)
      if (fpsAutoTuneTimeout !== null) window.clearTimeout(fpsAutoTuneTimeout)
      window.removeEventListener('resize', onResize)
      ;(scene as any).__removeKeyListeners?.()
      ;(scene as any).__disposeMultiplayer?.()
      sceneRef.current = null
      scene.dispose()
      engine.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleJoystickChange(vector: { x: number; y: number }) {
    joystickRef.current = vector
  }

  function handleTouchJumpPress() {
    touchJumpRef.current = true
  }

  function handleTouchRunPress() {
    touchRunRef.current = true
  }

  function handleTouchRunRelease() {
    touchRunRef.current = false
  }

  function handleCameraRotateLeftPress() {
    cameraRotateLeftRef.current = true
  }

  function handleCameraRotateLeftRelease() {
    cameraRotateLeftRef.current = false
  }

  function handleCameraRotateRightPress() {
    cameraRotateRightRef.current = true
  }

  function handleCameraRotateRightRelease() {
    cameraRotateRightRef.current = false
  }

  // Botão de toque genérico pra ação da tecla E (lab-58, pedido do usuário: "se você estiver no
  // celular precisa de um pequeno botão transparente de função de ação da tecla E") — entrar/sair
  // do carro (lab-25, antes só teclado) ou embarcar/desembarcar do foguete (lab-58), o que
  // estiver por perto. Mesma função que o `onKeyDown` já chama pra tecla 'e' de verdade.
  function handleTouchInteractPress() {
    ;(sceneRef.current as any)?.__handleInteractPress?.()
  }

  function handleToggleMute() {
    setMuted(toggleAmbienceMute())
  }

  function handleSendChat(messageId: string) {
    sendChat(profile.name, messageId)
    setChatMessages((prev) => [...prev.slice(-49), { id: 'me', name: profile.name, messageId, ts: Date.now() }])
    ;(sceneRef.current as any)?.__showLocalChatBubble?.(messageId)
  }

  return (
    <div className="world3d-container">
      <canvas ref={canvasRef} className="world3d-canvas" />
      <div ref={debugRef} className="world3d-debug" />
      <HudHeader
        profile={profile}
        progress={progress}
        onOpenHelp={onOpenHelp}
        onOpenQuestList={onOpenQuestList}
        onOpenShop={onOpenShop}
        muted={muted}
        onToggleMute={handleToggleMute}
        onOpenChat={() => setChatOpen(true)}
        onOpenRanking={() => setRankingOpen(true)}
        showBag={hasSword || hasGun}
        onOpenBag={() => setBagOpen(true)}
      />
      {onMarsCombatZone && <MarsHealthBar health={marsHealthDisplay} maxHealth={MARS_MAX_HEALTH} />}
      {onMarsCombatZone && (
        <p className="mars-enemy-count">
          👽🤖 {marsEnemyCount} {marsEnemyCount === 1 ? 'marciano restante' : 'marcianos restantes'}
        </p>
      )}
      <div ref={dangerOverlayRef} className="mars-danger-overlay" style={{ opacity: 0 }} />
      {marsDeathMessage && <p className="mars-death-message">{marsDeathMessage}</p>}
      {weaponMessage && <p className="mars-death-message weapon-message">{weaponMessage}</p>}
      {bagOpen && (
        <WeaponBagPanel
          hasSword={hasSword}
          hasGun={hasGun}
          selected={selectedWeapon}
          onSelect={setSelectedWeapon}
          onClose={() => setBagOpen(false)}
        />
      )}
      <p className="world3d-hint">Caminhe até uma escolinha colorida pra abrir uma missão</p>
      <TouchJoystick onChange={handleJoystickChange} />
      <TouchActionButton className="touch-action-jump" label="⬆️" onPress={handleTouchJumpPress} />
      <TouchActionButton
        className="touch-action-run"
        label="🏃"
        onPress={handleTouchRunPress}
        onRelease={handleTouchRunRelease}
      />
      <TouchActionButton
        className="touch-action-cam-left"
        label="◀"
        onPress={handleCameraRotateLeftPress}
        onRelease={handleCameraRotateLeftRelease}
      />
      <TouchActionButton
        className="touch-action-cam-right"
        label="▶"
        onPress={handleCameraRotateRightPress}
        onRelease={handleCameraRotateRightRelease}
      />
      <TouchActionButton className="touch-action-interact" label="E" onPress={handleTouchInteractPress} />
      {chatOpen && (
        <ChatPanel
          messages={chatMessages}
          connected={mpConnected}
          onSend={handleSendChat}
          onClose={() => setChatOpen(false)}
        />
      )}
      {rankingOpen && (
        <RankingPanel entries={rankingEntries} connected={mpConnected} onClose={() => setRankingOpen(false)} />
      )}
    </div>
  )
}
