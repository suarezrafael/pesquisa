import { useEffect, useRef, useState } from 'react'
import {
  Color3,
  Color4,
  DefaultRenderingPipeline,
  DirectionalLight,
  Effect,
  Engine,
  GlowLayer,
  HavokPlugin,
  HDRCubeTexture,
  HemisphericLight,
  Matrix,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  PhysicsAggregate,
  PhysicsShapeType,
  Quaternion,
  Scene,
  SceneInstrumentation,
  SceneLoader,
  ShaderMaterial,
  SSAO2RenderingPipeline,
  ShadowGenerator,
  UniversalCamera,
  Vector3,
  VertexData,
} from '@babylonjs/core'
import '@babylonjs/loaders/glTF'
import { AdvancedDynamicTexture, TextBlock } from '@babylonjs/gui'
import HavokPhysics from '@babylonjs/havok'
import { quests } from '../data/quests'
import { questTypeColor } from './questVisuals'
import { isQuestUnlocked } from '../state/progression'
import type { Profile, Progress } from '../types'
import { HudHeader } from './HudHeader'
import { TouchJoystick } from './TouchJoystick'
import { startAmbience, toggleMute as toggleAmbienceMute } from './ambientAudio'

interface World3DProps {
  profile: Profile
  progress: Progress
  onSelectQuest: (questId: string) => void
  onOpenHelp: () => void
  onOpenQuestList: () => void
  suspendTriggers: boolean
}

const PLANET_RADIUS = 13
const AVATAR_RADIUS = 0.55
const GRAVITY = 9.81
const MAX_SPEED = 6
const TURN_RATE = 2.6 // rad/s — velocidade de giro ao segurar esquerda/direita
const CAMERA_DISTANCE = 9
const CAMERA_HEIGHT = 4.5
const TRIGGER_DISTANCE = 2.4
const RESET_DISTANCE = 3.6
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

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

function avatarColorFromEmoji(emoji: string): Color3 {
  const palette: Record<string, Color3> = {
    '🦊': new Color3(0.94, 0.51, 0.2),
    '🐱': new Color3(0.95, 0.72, 0.25),
    '🐼': new Color3(0.85, 0.85, 0.9),
    '🐸': new Color3(0.36, 0.75, 0.4),
    '🦄': new Color3(0.8, 0.6, 0.95),
    '🐯': new Color3(0.95, 0.55, 0.15),
  }
  return palette[emoji] ?? new Color3(0.96, 0.51, 0.68)
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

export function World3D({ profile, progress, onSelectQuest, onOpenHelp, onOpenQuestList, suspendTriggers }: World3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const joystickRef = useRef({ x: 0, y: 0 })
  const progressRef = useRef(progress)
  const suspendRef = useRef(suspendTriggers)
  const onSelectQuestRef = useRef(onSelectQuest)
  const sceneRef = useRef<Scene | null>(null)
  const debugRef = useRef<HTMLDivElement>(null)
  const [muted, setMuted] = useState(false)

  progressRef.current = progress
  suspendRef.current = suspendTriggers
  onSelectQuestRef.current = onSelectQuest

  useEffect(() => {
    ;(sceneRef.current as any)?.__refreshPortals?.()
  }, [progress])

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
    scene.fogDensity = 0.01
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
    let avatarMesh: ReturnType<typeof MeshBuilder.CreateSphere> | null = null
    let facing = new Vector3(0, 0, 1)
    const triggered = new Set<string>()
    const portalMeshes: { quest: (typeof quests)[number]; ring: any; base: any; surfacePos: Vector3 }[] = []
    let keysDown: Record<string, boolean> = {}

    async function setup() {
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

      // Planeta
      const planet = MeshBuilder.CreateSphere('planet', { diameter: PLANET_RADIUS * 2, segments: 32 }, scene)
      const planetMat = new PBRMaterial('planetMat', scene)
      planetMat.albedoColor = new Color3(0.42, 0.68, 0.4)
      planetMat.roughness = 0.97
      planetMat.metallic = 0
      planet.material = planetMat
      planet.receiveShadows = true
      new PhysicsAggregate(planet, PhysicsShapeType.SPHERE, { mass: 0, friction: 0.7 }, scene)

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
        const pos = localUp.scale(PLANET_RADIUS)
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
        const colliderDiameter = 1.1 * scale
        const collider = MeshBuilder.CreateSphere(`propCollider-${i}`, { diameter: colliderDiameter }, scene)
        collider.position = pos.add(localUp.scale(colliderDiameter * 0.4))
        collider.isVisible = false
        new PhysicsAggregate(collider, PhysicsShapeType.SPHERE, { mass: 0 }, scene)
      }

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

      // Rio — tubo estreito seguindo um caminho curvo sobre a superfície do planeta,
      // ligeiramente acima do chão pra não brigar (z-fighting) com a malha da grama/terreno.
      function pointOnSphere(phi: number, theta: number, r: number): Vector3 {
        return new Vector3(
          Math.sin(phi) * Math.cos(theta),
          Math.cos(phi),
          Math.sin(phi) * Math.sin(theta),
        ).scale(r)
      }
      const riverPath: Vector3[] = []
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
        riverPath.push(pointOnSphere(phi, theta, PLANET_RADIUS + 0.06))
      }
      const river = MeshBuilder.CreateTube(
        'river',
        { path: riverPath, radius: 0.7, tessellation: 8, cap: Mesh.CAP_ALL },
        scene,
      )
      const riverMat = new PBRMaterial('riverMat', scene)
      riverMat.albedoColor = new Color3(0.15, 0.45, 0.75)
      riverMat.roughness = 0.12
      riverMat.metallic = 0.05
      riverMat.alpha = 0.92
      river.material = riverMat
      river.receiveShadows = true

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
        const bladePos = up.scale(PLANET_RADIUS + 0.02)
        const rot = alignmentQuaternion(up).multiply(Quaternion.RotationAxis(Vector3.Up(), Math.random() * Math.PI * 2))
        const scale = 0.7 + Math.random() * 0.7
        const m = Matrix.Compose(new Vector3(scale, scale, scale), rot, bladePos)
        m.copyToArray(grassMatrices, i * 16)
      }
      grassBlade.thinInstanceSetBuffer('matrix', grassMatrices, 16, true)

      // Avatar (esfera física real) — nasce no "polo norte" do planeta.
      const spawnUp = new Vector3(0, 1, 0)
      avatarMesh = MeshBuilder.CreateSphere('avatar', { diameter: AVATAR_RADIUS * 2 }, scene)
      avatarMesh.position = spawnUp.scale(PLANET_RADIUS + AVATAR_RADIUS + 0.05)
      const avatarMat = new PBRMaterial('avatarMat', scene)
      avatarMat.albedoColor = avatarColorFromEmoji(profile.avatarEmoji)
      avatarMat.roughness = 0.3
      avatarMat.metallic = 0.1
      avatarMesh.material = avatarMat
      shadowGenerator.addShadowCaster(avatarMesh)
      avatarBody = new PhysicsAggregate(
        avatarMesh,
        PhysicsShapeType.SPHERE,
        { mass: 1, restitution: 0.35, friction: 0.6 },
        scene,
      )

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
          avatarMesh.position = localUp.scale(PLANET_RADIUS + AVATAR_RADIUS + 0.05)
          avatarBody.body.setLinearVelocity(Vector3.Zero())
          avatarBody.body.setAngularVelocity(Vector3.Zero())
        }
      }

      // Portais de missão, apoiados na curvatura do planeta
      const guiTexture = AdvancedDynamicTexture.CreateFullscreenUI('portalLabels', true, scene)
      quests.forEach((quest, index) => {
        const t = quests.length > 1 ? index / (quests.length - 1) : 0
        const phi = Math.PI * 0.22 + t * Math.PI * 0.4
        const theta = index * GOLDEN_ANGLE * 1.7
        const localUp = new Vector3(
          Math.sin(phi) * Math.cos(theta),
          Math.cos(phi),
          Math.sin(phi) * Math.sin(theta),
        )
        const surfacePos = localUp.scale(PLANET_RADIUS)

        const rotation = alignmentQuaternion(localUp)

        const base = MeshBuilder.CreateCylinder(`base-${quest.id}`, { height: 0.4, diameter: 2.2 }, scene)
        base.position = surfacePos
        base.rotationQuaternion = rotation
        base.receiveShadows = true

        const ring = MeshBuilder.CreateTorus(`ring-${quest.id}`, { diameter: 2, thickness: 0.22 }, scene)
        ring.parent = base
        ring.position = new Vector3(0, 1.2, 0)
        ring.rotation.x = Math.PI / 2
        shadowGenerator.addShadowCaster(ring)

        const baseMat = new PBRMaterial(`baseMat-${quest.id}`, scene)
        const ringMat = new PBRMaterial(`ringMat-${quest.id}`, scene)
        const color = questTypeColor[quest.type]
        baseMat.albedoColor = color.scale(0.6)
        baseMat.roughness = 0.85
        baseMat.metallic = 0
        ringMat.albedoColor = color
        ringMat.roughness = 0.3
        ringMat.metallic = 0.2
        base.material = baseMat
        ring.material = ringMat

        const label = new TextBlock(`label-${quest.id}`, `${index + 1}`)
        label.color = 'white'
        label.fontSize = 28
        label.fontWeight = 'bold'
        label.outlineWidth = 4
        label.outlineColor = 'rgba(0,0,0,0.5)'
        guiTexture.addControl(label)
        label.linkWithMesh(ring)
        label.linkOffsetY = -60

        portalMeshes.push({ quest, ring, base, surfacePos })
      })

      function applyPortalVisual(entry: (typeof portalMeshes)[number]) {
        const p = progressRef.current
        const idx = quests.findIndex((q) => q.id === entry.quest.id)
        const unlocked = isQuestUnlocked(p, idx)
        const completed = p.completedQuestIds.includes(entry.quest.id)
        const ringMat = entry.ring.material as PBRMaterial
        const color = questTypeColor[entry.quest.type]

        if (completed) {
          ringMat.emissiveColor = new Color3(0.25, 0.75, 0.35)
          ringMat.albedoColor = color
        } else if (unlocked) {
          ringMat.emissiveColor = color.scale(0.6)
          ringMat.albedoColor = color
        } else {
          ringMat.emissiveColor = Color3.Black()
          ringMat.albedoColor = new Color3(0.55, 0.55, 0.58)
        }
        entry.ring.visibility = unlocked || completed ? 1 : 0.45
      }

      portalMeshes.forEach(applyPortalVisual)
      ;(scene as any).__refreshPortals = () => portalMeshes.forEach(applyPortalVisual)

      // Input de teclado
      const onKeyDown = (e: KeyboardEvent) => (keysDown[e.key.toLowerCase()] = true)
      const onKeyUp = (e: KeyboardEvent) => (keysDown[e.key.toLowerCase()] = false)
      window.addEventListener('keydown', onKeyDown)
      window.addEventListener('keyup', onKeyUp)
      ;(scene as any).__removeKeyListeners = () => {
        window.removeEventListener('keydown', onKeyDown)
        window.removeEventListener('keyup', onKeyUp)
      }

      let time = 0
      scene.onBeforeRenderObservable.add(() => {
        const dt = engine.getDeltaTime() / 1000
        time += dt

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
          const radialVel = localUp.scale(Vector3.Dot(currentVel, localUp))
          const tangentVel = facing.scale(throttle * MAX_SPEED)
          body.setLinearVelocity(tangentVel.add(radialVel))

          // câmera segue a bola acompanhando a orientação local do planeta
          const desiredCamPos = pos.subtract(facing.scale(CAMERA_DISTANCE)).add(localUp.scale(CAMERA_HEIGHT))
          camera.position = Vector3.Lerp(camera.position, desiredCamPos, 0.08)
          camera.upVector = Vector3.Lerp(camera.upVector, localUp, 0.15).normalize()
          camera.setTarget(pos)

          // checa proximidade dos portais
          if (!suspendRef.current) {
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
          }
        }

        if (import.meta.env.DEV && debugRef.current) {
          debugRef.current.textContent = `${Math.round(engine.getFps())} FPS · ${instrumentation.drawCallsCounter.current} draw calls · ${scene.getActiveMeshes().length}/${scene.meshes.length} meshes`
        }

        // animação sutil dos portais desbloqueados (bobbing), em espaço local do "base"
        // (que já está alinhado à curvatura do planeta) — continua correto em qualquer ponto.
        for (const entry of portalMeshes) {
          const idx = quests.findIndex((q) => q.id === entry.quest.id)
          const unlocked = isQuestUnlocked(progressRef.current, idx)
          const completed = progressRef.current.completedQuestIds.includes(entry.quest.id)
          if (unlocked && !completed) {
            entry.ring.position.y = 1.2 + Math.sin(time * 2 + idx) * 0.15
            entry.ring.rotation.z = time * 0.6
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

  return (
    <div className="world3d-container">
      <canvas ref={canvasRef} className="world3d-canvas" />
      {import.meta.env.DEV && <div ref={debugRef} className="world3d-debug" />}
      <HudHeader
        profile={profile}
        progress={progress}
        onOpenHelp={onOpenHelp}
        onOpenQuestList={onOpenQuestList}
        muted={muted}
        onToggleMute={handleToggleMute}
      />
      <p className="world3d-hint">Role até os portais brilhantes pra abrir uma missão</p>
      <TouchJoystick onChange={handleJoystickChange} />
    </div>
  )
}
