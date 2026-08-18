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
import { findAvatarByEmoji, type BonecoFeatures } from '../data/avatars'
import { findHatById, type HatOption } from '../data/hats'
import { questTypeColor } from './questVisuals'
import { isQuestUnlocked } from '../state/progression'
import type { Profile, Progress } from '../types'
import { HudHeader } from './HudHeader'
import { TouchJoystick } from './TouchJoystick'
import { ChatPanel } from './ChatPanel'
import { RankingPanel } from './RankingPanel'
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
    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true })
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
    pipeline.samples = 4
    pipeline.fxaaEnabled = true
    pipeline.imageProcessing.toneMappingEnabled = true
    pipeline.imageProcessing.toneMappingType = 1 // ACES
    pipeline.imageProcessing.exposure = 0.9
    pipeline.bloomEnabled = false // o GlowLayer já cobre o brilho emissivo dos portais, mais barato

    const ssao = new SSAO2RenderingPipeline('ssao', scene, {
      ssaoRatio: 0.5,
      blurRatio: 0.5,
    }, [camera])
    ssao.radius = 2
    ssao.totalStrength = 0.8
    ssao.expensiveBlur = false
    ssao.samples = 8

    const hemiLight = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene)
    hemiLight.intensity = 0.3
    hemiLight.groundColor = new Color3(0.4, 0.35, 0.3)

    const sunLight = new DirectionalLight('sun', new Vector3(-0.6, -1.2, -0.4), scene)
    sunLight.intensity = 1.0
    sunLight.position = new Vector3(20, 30, 20)

    const shadowGenerator = new ShadowGenerator(1024, sunLight)
    shadowGenerator.useBlurExponentialShadowMap = true
    shadowGenerator.blurKernel = 32

    const glow = new GlowLayer('glow', scene)
    glow.intensity = 0.7

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
    let rankingTimer = 0
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
      const onKeyDown = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement | null
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
        const key = e.key.toLowerCase()
        // Latch no próprio evento (não no polling do loop de render) — ver comentário onde
        // `jumpRequested` é consumido, no loop de render. `!keysDown[key]` evita re-latch por
        // key-repeat do SO enquanto o jogador segura a tecla.
        if (key === ' ' && !keysDown[key]) jumpRequested = true
        // Entrar/sair do carro (lab-25, pedido do usuário: "pressionar alguma tecla e entrar
        // no carro") — `e`, alternando: perto de um carro parado vira "dirigindo"; dirigindo
        // vira "a pé" de novo, reaparecendo do lado do carro. `!keysDown[key]` evita alternar
        // várias vezes num só toque por causa de key-repeat do SO.
        if (key === 'e' && !keysDown[key]) {
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
          } else if (!suspendRef.current && !chatOpenRef.current && avatarMesh) {
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
            }
          }
        }
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

      const PROP_COUNT = 65
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
        const DESERT_PROP_COUNT = 7
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
        const ROCKS_PER_MOUNTAIN = 4
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
      const CRITTER_COUNT = 39
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

      const cloudGroups: { node: Mesh; basePos: Vector3; speed: number }[] = []
      const CLOUD_COUNT = 9
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
        cloudGroups.push({ node, basePos, speed: 0.03 + (i % 4) * 0.01 })
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

      const rainSystem = new ParticleSystem('rain', 600, scene)
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
        hintLabel.fontSize = 18
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

      // Lagoa (pedido do usuário: "lago com peixe e pato e tartaruga") — separada do rio, num
      // ponto de theta bem distante da faixa do rio (0.15-1.35) pra não sobrepor. Os bichos da
      // lagoa se movem em círculos num plano local tangente à esfera (aproximação razoável pro
      // raio pequeno da lagoa — a curvatura do planeta nessa escala é desprezível), não com a
      // mesma IA de "vagar pela esfera toda" dos bichos de terra, porque ficam confinados aqui.
      const pondUp = POND_CENTER_DIR
      const pondCenterPos = pondUp.scale(PLANET_RADIUS + terrainHeight(pondUp) + 0.3)
      const pondForward = Vector3.Cross(pondUp, Vector3.Right()).normalize()
      const pondRight = Vector3.Cross(pondUp, pondForward).normalize()
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

      const pondCritters: PondCritter[] = []
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

      const GRASS_COUNT = 2600
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
        label.fontSize = 28
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
      shopLabel.fontSize = 26
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
      towerLabel.fontSize = 24
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
      quizTowerBase.rotationQuaternion = alignmentQuaternion(QT_ANCHOR_UP)

      // Eixo x local: [-1.7,-0.7] é o poço da escada (sempre aberto, do térreo ao topo); [-0.7,1.7]
      // é o piso andável de cada andar.
      const QT_WIDTH = 3.4
      const QT_DEPTH = 3.4
      const QT_HALF_W = QT_WIDTH / 2
      const QT_HALF_D = QT_DEPTH / 2
      const QT_FLOOR_HEIGHT = 1.8
      const QT_FLOOR_COUNT = 4
      const QT_DOOR_WIDTH = 1.0
      const QT_FLOOR_X_MIN = -0.7
      const QT_FLOOR_WIDTH = QT_HALF_W - QT_FLOOR_X_MIN // 2.4 — exclui o poço da escada
      const QT_FLOOR_CENTER_X = (QT_FLOOR_X_MIN + QT_HALF_W) / 2
      const QT_STAIR_CENTER_X = (-QT_HALF_W + QT_FLOOR_X_MIN) / 2 // -1.2
      const QT_STEPS_PER_FLIGHT = 9
      const QT_STEP_RISE = QT_FLOOR_HEIGHT / QT_STEPS_PER_FLIGHT
      const QT_STEP_RUN = QT_DEPTH / QT_STEPS_PER_FLIGHT

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

      // Malhas das paredes (não o telhado/piso/escada) — as únicas que ficam quase transparentes
      // quando a câmera se aproxima (ver `onBeforeRenderObservable` mais abaixo).
      const quizTowerWalls: Mesh[] = []

      function addQtMesh(mesh: Mesh, mat: PBRMaterial, collide: boolean, isWall = false) {
        mesh.material = mat
        mesh.parent = quizTowerBase
        mesh.receiveShadows = true
        shadowGenerator.addShadowCaster(mesh)
        if (collide) new PhysicsAggregate(mesh, PhysicsShapeType.BOX, { mass: 0, friction: 0.7 }, scene)
        if (isWall) quizTowerWalls.push(mesh)
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
          addQtMesh(slab, qtFloorMat, true)
        } else {
          const slab = MeshBuilder.CreateBox(
            `quizFloor-${floor}`,
            { width: QT_FLOOR_WIDTH, height: 0.12, depth: QT_DEPTH },
            scene,
          )
          slab.position = new Vector3(QT_FLOOR_CENTER_X, floorY + 0.06, 0)
          addQtMesh(slab, qtFloorMat, true)

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

        // Paredes do andar — 4 lados; só o térreo tem vão de porta na frente (entrada).
        const backWall = MeshBuilder.CreateBox(
          `quizBackWall-${floor}`,
          { width: QT_WIDTH, height: QT_FLOOR_HEIGHT, depth: 0.15 },
          scene,
        )
        backWall.position = new Vector3(0, floorY + QT_FLOOR_HEIGHT / 2, QT_HALF_D)
        addQtMesh(backWall, qtWallMat, true, true)

        for (const side of [-1, 1]) {
          const sideWall = MeshBuilder.CreateBox(
            `quizSideWall-${floor}-${side}`,
            { width: 0.15, height: QT_FLOOR_HEIGHT, depth: QT_DEPTH },
            scene,
          )
          sideWall.position = new Vector3(side * QT_HALF_W, floorY + QT_FLOOR_HEIGHT / 2, 0)
          addQtMesh(sideWall, qtWallMat, true, true)
        }

        if (floor === 0) {
          const frontSegWidth = (QT_WIDTH - QT_DOOR_WIDTH) / 2
          for (const side of [-1, 1]) {
            const frontWall = MeshBuilder.CreateBox(
              `quizFrontWall-${floor}-${side}`,
              { width: frontSegWidth, height: QT_FLOOR_HEIGHT, depth: 0.15 },
              scene,
            )
            frontWall.position = new Vector3(
              side * (QT_DOOR_WIDTH / 2 + frontSegWidth / 2),
              floorY + QT_FLOOR_HEIGHT / 2,
              -QT_HALF_D,
            )
            addQtMesh(frontWall, qtWallMat, true, true)
          }
        } else {
          const frontWall = MeshBuilder.CreateBox(
            `quizFrontWall-${floor}`,
            { width: QT_WIDTH, height: QT_FLOOR_HEIGHT, depth: 0.15 },
            scene,
          )
          frontWall.position = new Vector3(0, floorY + QT_FLOOR_HEIGHT / 2, -QT_HALF_D)
          addQtMesh(frontWall, qtWallMat, true, true)
        }

        // Escada — só até o próximo andar (o topo não sobe mais). Degraus empilhados (cada um
        // mais alto que o anterior, descendo até o piso do próprio andar) andando de
        // z=-QT_HALF_D até z=+QT_HALF_D, sempre no mesmo sentido — pra subir o próximo lance o
        // jogador atravessa o piso do andar até voltar pro início do poço.
        if (floor < QT_FLOOR_COUNT - 1) {
          for (let i = 0; i < QT_STEPS_PER_FLIGHT; i++) {
            const stepZ = -QT_HALF_D + (i + 0.5) * QT_STEP_RUN
            const step = MeshBuilder.CreateBox(
              `quizStep-${floor}-${i}`,
              { width: 0.9, height: (i + 1) * QT_STEP_RISE, depth: QT_STEP_RUN + 0.02 },
              scene,
            )
            step.position = new Vector3(QT_STAIR_CENTER_X, floorY + ((i + 1) * QT_STEP_RISE) / 2, stepZ)
            addQtMesh(step, qtStepMat, true)
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
        markerLabel.fontSize = 32
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
      qtLabel.fontSize = 24
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
      const poolUp = POOL_CENTER_DIR
      const poolCenterPos = poolUp.scale(PLANET_RADIUS + terrainHeight(poolUp) + 0.25)
      const poolForward = Vector3.Cross(poolUp, Vector3.Right()).normalize()
      const poolRight = Vector3.Cross(poolUp, poolForward).normalize()
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

      const POOL_SHIRT_COLORS = [
        new Color3(0.9, 0.35, 0.35),
        new Color3(0.3, 0.65, 0.85),
        new Color3(0.95, 0.75, 0.2),
        new Color3(0.5, 0.8, 0.4),
        new Color3(0.75, 0.4, 0.85),
      ]
      const POOL_PEOPLE_COUNT = 5
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
      for (let i = 0; i < POOL_PEOPLE_COUNT; i++) {
        const figure = buildStudentFigure(scene, POOL_SHIRT_COLORS[i], shadowGenerator)
        const angle = (i / POOL_PEOPLE_COUNT) * Math.PI * 2
        const localX = Math.cos(angle) * poolRadius * 0.5
        const localZ = Math.sin(angle) * poolRadius * 0.5

        // Bolha de fala que pisca de vez em quando — só pra dar a impressão de estarem
        // conversando (não é chat de verdade, é decoração ambiente).
        const chatLabel = new TextBlock(`poolChat-${i}`, '')
        chatLabel.color = 'white'
        chatLabel.fontSize = 20
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
      const WALKER_COUNT = 10
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
        chatLabel.fontSize = 18
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
          rLabel.fontSize = 20
          rLabel.fontWeight = 'bold'
          rLabel.outlineWidth = 3
          rLabel.outlineColor = 'rgba(0,0,0,0.6)'
          guiTexture.addControl(rLabel)
          rLabel.linkWithMesh(rFigure.root)
          rLabel.linkOffsetY = -115
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
          }
          remotePlayers.set(state.id, rp)
        }
        return rp
      }

      function removeRemotePlayer(id: string) {
        const rp = remotePlayers.get(id)
        if (!rp) return
        guiTexture.removeControl(rp.label)
        rp.figure.root.dispose()
        remotePlayers.delete(id)
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
      })
      const unsubConnection = onConnectionChange((connected) => setMpConnected(connected))
      connectMultiplayer()
      setMpConnected(isMultiplayerConnected())
      ;(scene as any).__disposeMultiplayer = () => {
        unsubState()
        unsubLeave()
        unsubChat()
        unsubConnection()
        disconnectMultiplayer()
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
        rainSystem.emitRate = rainAmount * 500

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
          const dist = pos.length()
          const localUp = dist > 0.0001 ? pos.scale(1 / dist) : new Vector3(0, 1, 0)

          // Chuva acompanha o jogador — reorienta o emissor pro "up" local atual, senão a chuva
          // continuaria caindo na direção de onde o jogador nasceu conforme ele anda pela esfera.
          rainAnchor.position.copyFrom(pos)
          rainAnchor.rotationQuaternion = alignmentQuaternion(localUp)

          // Dirigindo um carro (lab-25): o corpo físico do avatar fica congelado (sem
          // gravidade/velocidade nova) e a figura visual escondida (ver handler de entrar/sair)
          // — o input de teclado vira controle do carro, não do personagem a pé, então nada
          // aqui deve mexer no avatar enquanto isso.
          if (!drivingCar) {
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
          const groundDist = PLANET_RADIUS + terrainHeight(localUp) + AVATAR_RADIUS + 0.05

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

          // Correr/caminhar (pedido do usuário) — segurar Shift troca de velocidade. Só no
          // teclado por enquanto (sem toggle equivalente no joystick de toque).
          const running = !!keysDown['shift']
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
            localUp.scale(PLANET_RADIUS + terrainHeight(localUp) + 0.02 + airHeight)
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
          } // fim do `if (!drivingCar)` — resto do bloco (câmera/multiplayer/ranking/portais)
            // continua rodando normalmente dirigindo ou não.

          // câmera segue a bola acompanhando a orientação local do planeta (sobrescrita pela
          // câmera do carro logo abaixo, se `drivingCar` estiver setado neste quadro)
          const desiredCamPos = pos.subtract(facing.scale(CAMERA_DISTANCE)).add(localUp.scale(CAMERA_HEIGHT))
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
            rp.figure.root.position = Vector3.Lerp(rp.figure.root.position, rp.targetPos, 0.15)
            const rLocalUp = rp.targetPos.length() > 0.0001 ? rp.targetPos.clone().normalize() : new Vector3(0, 1, 0)
            const rRight = Vector3.Cross(rLocalUp, rp.targetFacing).normalize()
            Matrix.FromXYZAxesToRef(rRight, rLocalUp, rp.targetFacing, tmpMatrix)
            Quaternion.FromRotationMatrixToRef(tmpMatrix, tmpQuat)
            rp.figure.root.rotationQuaternion = tmpQuat.clone()
          }

          // Ranking (lab-20): não recalcula/renderiza a cada quadro (o `state` de rede já chega
          // a cada ~0.12s por jogador) — só 1x/s, throttle suficiente pra uma lista que muda
          // devagar (XP/moedas), evitando re-renders React desnecessários.
          rankingTimer += dt
          if (rankingTimer > 1) {
            rankingTimer = 0
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

            // Quiz surpresa de cada andar do Prédio dos Enigmas — mesmo padrão de gatilho por
            // distância dos portais das escolas, mas sem checar `completedQuestIds` (são bônus
            // avulsos, podem ser refeitos: `triggered` só evita repetir sem o jogador sair de
            // perto e voltar).
            for (const marker of quizMarkers) {
              const d = Vector3.Distance(pos, marker.worldPos)
              if (d < TRIGGER_DISTANCE && !triggered.has(marker.id)) {
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

        if (import.meta.env.DEV && debugRef.current) {
          debugRef.current.textContent = `${Math.round(engine.getFps())} FPS · ${instrumentation.drawCallsCounter.current} draw calls · ${scene.getActiveMeshes().length}/${scene.meshes.length} meshes`
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

    const onResize = () => engine.resize()
    window.addEventListener('resize', onResize)

    return () => {
      disposed = true
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

  function handleToggleMute() {
    setMuted(toggleAmbienceMute())
  }

  function handleSendChat(messageId: string) {
    sendChat(profile.name, messageId)
    setChatMessages((prev) => [...prev.slice(-49), { id: 'me', name: profile.name, messageId, ts: Date.now() }])
  }

  return (
    <div className="world3d-container">
      <canvas ref={canvasRef} className="world3d-canvas" />
      {import.meta.env.DEV && <div ref={debugRef} className="world3d-debug" />}
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
      />
      <p className="world3d-hint">Caminhe até uma escolinha colorida pra abrir uma missão</p>
      <TouchJoystick onChange={handleJoystickChange} />
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
