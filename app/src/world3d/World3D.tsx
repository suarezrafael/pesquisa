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
// lab-11) e alcance horizontal de sobra (MAX_SPEED × tempo no ar ≈ 4.65, contra os 2.27
// necessários entre plataformas).
const GRAVITY = 16
const MAX_SPEED = 6
const JUMP_SPEED = 6.2 // velocidade radial (pra fora do planeta) aplicada ao pular
const TURN_RATE = 2.6 // rad/s — velocidade de giro ao segurar esquerda/direita
const WALK_CYCLE_SPEED = 7 // rad/s de fase do ciclo de caminhada, por unidade de throttle
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

// Centros dos platôs (direção normalizada no planeta + raio angular de influência + altura).
// Ficam dentro da mesma faixa "caminhável" onde props/portais já são colocados.
const PLATEAU_CENTERS = [
  { dir: new Vector3(0.75, 0.6, -0.2).normalize(), radius: 0.34, height: 2.4 },
  { dir: new Vector3(-0.5, 0.55, 0.62).normalize(), radius: 0.3, height: 1.9 },
  { dir: new Vector3(0.15, 0.3, -0.9).normalize(), radius: 0.28, height: 2.1 },
  { dir: new Vector3(-0.8, 0.25, -0.45).normalize(), radius: 0.26, height: 1.6 },
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
  height = applyBasin(height, dir, POND_CENTER_DIR, 0.45, 0.65)
  height = applyBasin(height, dir, POOL_CENTER_DIR, 0.32, 0.55)

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

// Bichinhos que vagam pelo planeta (pedido do usuário: "animais no mundo, animais aleatorios")
// — feitos só de primitivas, iguais em espírito ao personagem, mas bem mais simples (sem
// articulação). A IA de cada um é: anda até um ponto aleatório na faixa caminhável, descansa um
// tempo, escolhe outro ponto — tudo em coordenadas de "up local" (direção a partir do centro do
// planeta), igual ao resto do mundo, pra já nascer alinhado à curvatura sem lógica extra.
type CritterKind = 'coelho' | 'esquilo' | 'passarinho' | 'gato'

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

export function World3D({
  profile,
  progress,
  onSelectQuest,
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
  onCollectCoinRef.current = onCollectCoin
  onOpenShopRef.current = onOpenShop

  useEffect(() => {
    ;(sceneRef.current as any)?.__refreshPortals?.()
  }, [progress])

  useEffect(() => {
    ;(sceneRef.current as any)?.__setAvatarShirtColor?.(profile.avatarEmoji)
  }, [profile.avatarEmoji])

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

      const PROP_COUNT = 42
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
        const pos = localUp.scale(PLANET_RADIUS + terrainHeight(localUp))
        const template = propTemplates[i % propTemplates.length]
        const scale = 1.3 + ((i * 7) % 5) * 0.18
        const spin = (i * GOLDEN_ANGLE * 5) % (Math.PI * 2)

        const instance = template.clone(`prop-${i}`, null)
        if (!instance) continue
        instance.setEnabled(true)
        instance.position = pos
        instance.rotationQuaternion = alignmentQuaternion(localUp).multiply(
          Quaternion.RotationAxis(Vector3.Up(), spin),
        )
        instance.scaling.setAll(scale)
        instance.getChildMeshes().forEach((m) => shadowGenerator.addShadowCaster(m))

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
      // confortável contra o quanto dá pra andar nesse tempo (MAX_SPEED=6 → até 6.7).
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

      // Bichinhos vagando pelo planeta (pedido do usuário: "animais no mundo, animais
      // aleatorios", depois "mais gato") — tipo e ponto de partida sorteados, cada um com
      // velocidade/fase própria pra não se moverem em sincronia. IA de vagar (wander) roda no
      // loop de render abaixo.
      const critters: Critter[] = []
      const CRITTER_COUNT = 26
      for (let i = 0; i < CRITTER_COUNT; i++) {
        const kind: CritterKind = i < 8 ? 'coelho' : i < 14 ? 'esquilo' : i < 20 ? 'gato' : 'passarinho'
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
        } else {
          const passarinhoColor = Color3.Lerp(new Color3(0.75, 0.25, 0.2), new Color3(0.3, 0.4, 0.75), Math.random())
          const built = buildPassarinho(scene, shadowGenerator, passarinhoColor)
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
          moveSpeed: (kind === 'passarinho' ? 0.35 : 0.18) + Math.random() * 0.12,
          hopPhase: Math.random() * Math.PI * 2,
          hopSpeed: (kind === 'passarinho' ? 12 : 8) + Math.random() * 3,
          restTimer: Math.random() * 3,
          flightHeight: kind === 'passarinho' ? 1.6 + Math.random() * 0.6 : 0,
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
          const puff = MeshBuilder.CreateSphere(`cloud-${i}-${p}`, { diameter: 2.2 + Math.random() * 1.3 }, scene)
          puff.scaling.y = 0.55
          puff.position = new Vector3((p - puffCount / 2) * 1.4, Math.random() * 0.4, Math.random() * 0.6)
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

      // Rio — faixa achatada (ribbon) rente à curvatura do planeta, não um tubo redondo
      // flutuando acima do chão (era isso que ficava "sobressalente"/estranho antes).
      function pointOnSphere(phi: number, theta: number, r: number): Vector3 {
        return new Vector3(
          Math.sin(phi) * Math.cos(theta),
          Math.cos(phi),
          Math.sin(phi) * Math.sin(theta),
        ).scale(r)
      }
      const riverCenter: Vector3[] = []
      const RIVER_SEGMENTS = 48
      const riverStartPhi = Math.PI * 0.2
      const riverEndPhi = Math.PI * 0.62
      const riverStartTheta = Math.PI * 0.15
      const riverEndTheta = Math.PI * 1.35
      for (let i = 0; i <= RIVER_SEGMENTS; i++) {
        const t = i / RIVER_SEGMENTS
        const wobble = Math.sin(t * Math.PI * 4) * 0.06
        const phi = riverStartPhi + (riverEndPhi - riverStartPhi) * t + wobble
        const theta = riverStartTheta + (riverEndTheta - riverStartTheta) * t
        // Levemente acima da altura do terreno naquele ponto — só o suficiente pra não brigar
        // (z-fighting) com o chão, nunca a ponto de parecer um objeto flutuando por cima dele.
        const riverDir = pointOnSphere(phi, theta, 1)
        riverCenter.push(riverDir.scale(PLANET_RADIUS + terrainHeight(riverDir) + 0.025))
      }
      const riverHalfWidth = 1.1
      const riverLeftBank: Vector3[] = []
      const riverRightBank: Vector3[] = []
      for (let i = 0; i < riverCenter.length; i++) {
        const p = riverCenter[i]
        // Bug real encontrado nesta sessão (lab-15, testando a rua nova): `.normalize()` muta o
        // vetor NO LUGAR (ao contrário de `.scale()`/`.add()`/`.subtract()`, que retornam um
        // vetor novo) — `p` é a mesma referência guardada em `riverCenter[i]`, então
        // `p.normalize()` encolhia cada ponto do rio pra comprimento 1 (perto da origem do
        // planeta) como efeito colateral, silenciosamente, desde que este trecho foi escrito.
        // `.clone()` antes evita mutar `p` (e por extensão `riverCenter[i]`, usado logo abaixo
        // em `p.add()`/`p.subtract()` — precisa continuar com o comprimento de verdade).
        const up = p.clone().normalize()
        const next = riverCenter[Math.min(i + 1, riverCenter.length - 1)]
        const prev = riverCenter[Math.max(i - 1, 0)]
        const along = next.subtract(prev).normalize()
        const side = Vector3.Cross(up, along).normalize()
        riverLeftBank.push(p.add(side.scale(riverHalfWidth)))
        riverRightBank.push(p.subtract(side.scale(riverHalfWidth)))
      }
      const river = MeshBuilder.CreateRibbon(
        'river',
        { pathArray: [riverLeftBank, riverRightBank], sideOrientation: Mesh.DOUBLESIDE },
        scene,
      )
      const riverMat = new PBRMaterial('riverMat', scene)
      riverMat.albedoColor = new Color3(0.15, 0.45, 0.75)
      riverMat.roughness = 0.12
      riverMat.metallic = 0.05
      riverMat.alpha = 0.92
      river.material = riverMat
      river.receiveShadows = true

      // Rua (lab-15, pedido do usuário: "ruas+carros") — mesma técnica do rio (ribbon rente à
      // curvatura do planeta), asfalto com linha central tracejada. Local (theta 280°-320°, phi
      // igual à faixa das escolas) escolhido por busca de distância angular contra todos os
      // outros marcos do mapa (platôs, lagoa, piscina, escolas, percurso de parkour, o próprio
      // rio) — mesmo método usado pra achar o lugar da piscina/parkour, ~13.5° de folga do
      // vizinho mais próximo.
      const streetCenter: Vector3[] = []
      const STREET_SEGMENTS = 32
      const streetStartPhi = Math.PI * 0.22
      const streetEndPhi = Math.PI * 0.62
      const streetStartTheta = (280 * Math.PI) / 180
      const streetEndTheta = (320 * Math.PI) / 180
      for (let i = 0; i <= STREET_SEGMENTS; i++) {
        const t = i / STREET_SEGMENTS
        const phi = streetStartPhi + (streetEndPhi - streetStartPhi) * t
        const theta = streetStartTheta + (streetEndTheta - streetStartTheta) * t
        const streetDir = pointOnSphere(phi, theta, 1)
        streetCenter.push(streetDir.scale(PLANET_RADIUS + terrainHeight(streetDir) + 0.02))
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
        const next = streetCenter[Math.min(i + 1, streetCenter.length - 1)]
        const prev = streetCenter[Math.max(i - 1, 0)]
        const along = next.subtract(prev).normalize()
        const side = Vector3.Cross(up, along).normalize()
        streetLeftBank.push(p.add(side.scale(streetHalfWidth)))
        streetRightBank.push(p.subtract(side.scale(streetHalfWidth)))
      }
      const street = MeshBuilder.CreateRibbon(
        'street',
        { pathArray: [streetLeftBank, streetRightBank], sideOrientation: Mesh.DOUBLESIDE },
        scene,
      )
      const streetMat = new PBRMaterial('streetMat', scene)
      streetMat.albedoColor = new Color3(0.22, 0.22, 0.25)
      streetMat.roughness = 0.9
      street.material = streetMat
      street.receiveShadows = true

      // Linha central tracejada — só desenha em segmentos alternados (índice par), fininha e
      // levemente acima do asfalto (evita brigar com o chão, mesmo truque do rio).
      const centerLineMat = new PBRMaterial('centerLineMat', scene)
      centerLineMat.albedoColor = new Color3(0.92, 0.8, 0.25)
      centerLineMat.emissiveColor = new Color3(0.15, 0.13, 0.03)
      centerLineMat.roughness = 0.6
      const centerLineHalfWidth = 0.05
      for (let i = 0; i < streetCenter.length - 1; i += 2) {
        const p = streetCenter[i]
        const up = p.clone().normalize()
        const next = streetCenter[i + 1]
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

      // Carrinhos andando pra frente e pra trás ao longo da rua (ping-pong), espalhados e com
      // velocidades diferentes pra não andarem em fileira sincronizada.
      interface Carro {
        root: TransformNode
        pathIndex: number
        direction: 1 | -1
        speed: number
      }
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
        carros.push({
          root: carRoot,
          pathIndex: (i / CARRO_COUNT) * (streetCenter.length - 1),
          direction: i % 2 === 0 ? 1 : -1,
          speed: 3 + Math.random() * 2,
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
      pond.material = riverMat
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
        const phi = Math.PI * 0.08 + Math.random() * Math.PI * 0.7
        const theta = Math.random() * Math.PI * 2
        const up = new Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta))
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
      studentFigure.root.position = spawnUp.scale(PLANET_RADIUS + terrainHeight(spawnUp) + 0.02)
      if (import.meta.env.DEV) (window as any).__playerFigure = studentFigure

      // Trocar de avatar na lojinha não reconstrói a cena inteira (custoso) — só recolore a
      // camisa e remonta as peças do boneco (orelhas/rabo/etc., lab-13) do personagem já em
      // cena. Ver useEffect que observa `profile.avatarEmoji`.
      ;(scene as any).__setAvatarShirtColor = (emoji: string) => {
        studentFigure.shirtMat.albedoColor = avatarColorFromEmoji(emoji)
        applyBonecoFeatures(studentFigure, bonecoFeaturesFromEmoji(emoji), scene, shadowGenerator)
      }

      // Câmera já posicionada corretamente antes do primeiro quadro (evita "pulo" inicial).
      camera.position = avatarMesh.position.subtract(facing.scale(CAMERA_DISTANCE)).add(spawnUp.scale(CAMERA_HEIGHT))
      camera.upVector = spawnUp
      camera.setTarget(avatarMesh.position)

      if (import.meta.env.DEV) {
        // Teleporte de QA — só em dev, pra testar o gatilho dos portais sem depender
        // de simular teclado segurado por um tempo real.
        ;(window as any).__debugTeleport = (x: number, y: number, z: number) => {
          if (!avatarMesh || !avatarBody) return
          const localUp = new Vector3(x, y, z).normalize()
          avatarBody.body.disablePreStep = false
          avatarMesh.position = localUp.scale(PLANET_RADIUS + terrainHeight(localUp) + AVATAR_RADIUS + 0.05)
          avatarBody.body.setLinearVelocity(Vector3.Zero())
          avatarBody.body.setAngularVelocity(Vector3.Zero())
        }
      }

      // Missões viram miniescolas (não anéis abstratos) — prédio baixo-poli com telhado colorido
      // por tipo/estado da missão, mais um professor parado na porta.
      const guiTexture = AdvancedDynamicTexture.CreateFullscreenUI('portalLabels', true, scene)
      const wallMatShared = new PBRMaterial('schoolWallMat', scene)
      wallMatShared.albedoColor = new Color3(0.94, 0.88, 0.75)
      wallMatShared.roughness = 0.8
      const doorMatShared = new PBRMaterial('schoolDoorMat', scene)
      doorMatShared.albedoColor = new Color3(0.42, 0.26, 0.16)
      doorMatShared.roughness = 0.7

      quests.forEach((quest, index) => {
        const t = quests.length > 1 ? index / (quests.length - 1) : 0
        const phi = Math.PI * 0.22 + t * Math.PI * 0.4
        const theta = index * GOLDEN_ANGLE * 1.7
        const localUp = new Vector3(
          Math.sin(phi) * Math.cos(theta),
          Math.cos(phi),
          Math.sin(phi) * Math.sin(theta),
        )
        const surfacePos = localUp.scale(PLANET_RADIUS + terrainHeight(localUp))

        const base = new TransformNode(`school-${quest.id}`, scene)
        base.position = surfacePos
        base.rotationQuaternion = alignmentQuaternion(localUp)

        const walls = MeshBuilder.CreateBox(`walls-${quest.id}`, { width: 1.6, height: 1.1, depth: 1.4 }, scene)
        walls.position = new Vector3(0, 0.55, 0)
        walls.material = wallMatShared
        walls.parent = base
        walls.receiveShadows = true
        shadowGenerator.addShadowCaster(walls)

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
      shopBase.position = SHOP_ANCHOR_UP.scale(PLANET_RADIUS + terrainHeight(SHOP_ANCHOR_UP))
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
        catRoot.position.copyFrom(up.scale(PLANET_RADIUS + terrainHeight(up) + 0.02))
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
            if (grounded) radialSpeed = JUMP_SPEED
          }

          const radialVel = localUp.scale(radialSpeed)
          const tangentVel = facing.scale(throttle * MAX_SPEED)
          body.setLinearVelocity(tangentVel.add(radialVel))
          // Trava a rotação física do colisor — é uma cápsula em pé, não deve tombar/rolar
          // por causa de torque de contato com o chão (personagem visual gira por conta própria).
          body.setAngularVelocity(Vector3.Zero())

          // Personagem visual: segue a posição tangencial do colisor, mas "grudado" na
          // superfície do planeta (não na altura elevada do colisor físico), orientado pelos
          // eixos direita/cima-local/frente.
          const right = Vector3.Cross(localUp, facing).normalize()
          Matrix.FromXYZAxesToRef(right, localUp, facing, tmpMatrix)
          Quaternion.FromRotationMatrixToRef(tmpMatrix, tmpQuat)
          // Altura extra acima do "grudado no chão" quando o colisor físico sobe (pulo) —
          // sem isso o personagem visual ficava sempre preso na superfície e o pulo não aparecia.
          const airHeight = Math.max(0, dist - groundDist)
          studentFigure.root.position.copyFrom(
            localUp.scale(PLANET_RADIUS + terrainHeight(localUp) + 0.02 + airHeight)
          )
          studentFigure.root.rotationQuaternion = tmpQuat.clone()

          // Ciclo de caminhada — só avança enquanto o personagem realmente anda; som de
          // passo sintetizado disparado a cada troca de perna (cruzamento de zero do seno).
          const moving = Math.abs(throttle) > 0.05
          if (moving) {
            walkPhase += dt * Math.abs(throttle) * WALK_CYCLE_SPEED
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

          // câmera segue a bola acompanhando a orientação local do planeta
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
          if (c.kind === 'passarinho') {
            const bob = Math.sin(time * 2 + c.hopPhase) * 0.15
            c.root.position.copyFrom(groundPos.add(c.up.scale(bob)))
            const flap = Math.sin(time * c.hopSpeed) * 0.9
            if (c.wingL) c.wingL.rotation.z = flap
            if (c.wingR) c.wingR.rotation.z = -flap

            // Canto baixinho quando o jogador está perto (pedido do usuário). Timer por
            // pássaro (não sincronizado entre eles) — só checa a distância quando o timer zera,
            // não todo quadro, e só canta se o jogador estiver mesmo perto nesse instante.
            if (avatarMesh) {
              c.chirpTimer = (c.chirpTimer ?? 2 + Math.random() * 5) - dt
              if (c.chirpTimer <= 0) {
                c.chirpTimer = 3 + Math.random() * 5
                if (Vector3.Distance(c.root.position, avatarMesh.position) < BIRD_CHIRP_RADIUS) {
                  playBirdChirp()
                }
              }
            }
          } else {
            c.hopPhase += dt * c.hopSpeed * (moving ? 1 : 0.15)
            const hop = Math.max(0, Math.sin(c.hopPhase)) * 0.05
            c.root.position.copyFrom(groundPos.add(c.up.scale(hop)))
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

        // Carros: andam pra frente e pra trás ao longo da rua (`streetCenter`), nunca saindo do
        // asfalto — `pathIndex` é uma posição fracionária dentro do array de pontos da rua,
        // interpolada entre os dois pontos vizinhos pra um movimento suave.
        for (const car of carros) {
          car.pathIndex += car.direction * car.speed * dt
          if (car.pathIndex >= streetCenter.length - 1) {
            car.pathIndex = streetCenter.length - 1
            car.direction = -1
          } else if (car.pathIndex <= 0) {
            car.pathIndex = 0
            car.direction = 1
          }
          const i0 = Math.floor(car.pathIndex)
          const i1 = Math.min(i0 + 1, streetCenter.length - 1)
          const frac = car.pathIndex - i0
          const p0 = streetCenter[i0]
          const p1 = streetCenter[i1]
          const carPos = Vector3.Lerp(p0, p1, frac)
          // `.clone()` antes de `.normalize()` — mesmo bug do rio/rua (ver comentário lá acima):
          // `carPos.normalize()` sem clonar mutava `carPos` pro comprimento 1 no lugar, e
          // `carPos` ainda é usado embaixo (`car.root.position.copyFrom(carPos...)`) precisando
          // do comprimento de verdade (distância até a superfície da rua).
          const carUp = carPos.clone().normalize()
          let carFwd = p1.subtract(p0)
          carFwd = carFwd.subtract(carUp.scale(Vector3.Dot(carFwd, carUp)))
          if (carFwd.lengthSquared() < 1e-8) carFwd = Vector3.Cross(carUp, Vector3.Right())
          carFwd.normalize()
          if (car.direction === -1) carFwd.scaleInPlace(-1)
          car.root.position.copyFrom(carPos.add(carUp.scale(0.08)))
          const carRight = Vector3.Cross(carUp, carFwd).normalize()
          Matrix.FromXYZAxesToRef(carRight, carUp, carFwd, tmpMatrix)
          Quaternion.FromRotationMatrixToRef(tmpMatrix, tmpQuat)
          car.root.rotationQuaternion = tmpQuat.clone()
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
