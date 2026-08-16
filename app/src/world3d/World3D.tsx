import { useEffect, useRef } from 'react'
import {
  ArcRotateCamera,
  Color3,
  Color4,
  DefaultRenderingPipeline,
  DirectionalLight,
  Engine,
  GlowLayer,
  HavokPlugin,
  HDRCubeTexture,
  HemisphericLight,
  MeshBuilder,
  PBRMaterial,
  PhysicsAggregate,
  PhysicsShapeType,
  Scene,
  SceneInstrumentation,
  SceneLoader,
  SSAO2RenderingPipeline,
  ShadowGenerator,
  Vector3,
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

interface World3DProps {
  profile: Profile
  progress: Progress
  onSelectQuest: (questId: string) => void
  suspendTriggers: boolean
}

const PORTAL_RADIUS = 15
const TRIGGER_DISTANCE = 2.2
const RESET_DISTANCE = 3.5
const MAX_SPEED = 6

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

export function World3D({ profile, progress, onSelectQuest, suspendTriggers }: World3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const inputRef = useRef({ x: 0, y: 0 })
  const joystickRef = useRef({ x: 0, y: 0 })
  const progressRef = useRef(progress)
  const suspendRef = useRef(suspendTriggers)
  const onSelectQuestRef = useRef(onSelectQuest)
  const sceneRef = useRef<Scene | null>(null)
  const debugRef = useRef<HTMLDivElement>(null)

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
    scene.fogDensity = 0.012
    scene.fogColor = new Color3(0.65, 0.82, 0.93)

    const camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2,
      Math.PI / 3.4,
      16,
      Vector3.Zero(),
      scene,
    )
    camera.inputs.clear()

    // Tonemapping ACES + FXAA — sem isso PBR com luz forte estoura o branco e serrilha nas bordas.
    const pipeline = new DefaultRenderingPipeline('quality', true, scene, [camera])
    pipeline.samples = 4
    pipeline.fxaaEnabled = true
    pipeline.imageProcessing.toneMappingEnabled = true
    pipeline.imageProcessing.toneMappingType = 1 // ACES
    pipeline.imageProcessing.exposure = 0.9
    pipeline.bloomEnabled = false // o GlowLayer já cobre o brilho emissivo dos portais, mais barato

    // SSAO leve — contato visual entre bola/árvores e o chão, orçamento mobile-friendly.
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
    const triggered = new Set<string>()
    const portalMeshes: { quest: (typeof quests)[number]; ring: any; base: any }[] = []
    let keysDown: Record<string, boolean> = {}

    async function setup() {
      // IBL real: HDRI CC0 (Poly Haven, kiara_4_mid-morning) — reflexo de ambiente de verdade
      // nos materiais PBR, não só luz hemisférica/direcional aproximada.
      const hdrTexture = new HDRCubeTexture('/assets/hdri/kiara_4_mid-morning_1k.hdr', scene, 256)
      scene.environmentTexture = hdrTexture
      scene.environmentIntensity = 0.75
      scene.createDefaultSkybox(hdrTexture, true, 500)

      const havokInstance = await HavokPhysics()
      if (disposed) return
      // useDeltaForWorldStep=false -> Havok roda em passo fixo (~60Hz) interno,
      // desacoplado do framerate de renderização (evita física variar com FPS).
      havokPlugin = new HavokPlugin(false, havokInstance)
      scene.enablePhysics(new Vector3(0, -9.81, 0), havokPlugin)

      // Chão
      const ground = MeshBuilder.CreateGround('ground', { width: 60, height: 60 }, scene)
      const groundMat = new PBRMaterial('groundMat', scene)
      groundMat.albedoColor = new Color3(0.42, 0.68, 0.4)
      groundMat.roughness = 0.97
      groundMat.metallic = 0
      ground.material = groundMat
      ground.receiveShadows = true
      new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0, friction: 0.7 }, scene)

      // Muro invisível pra bola não sair do mundo
      const wallMat = new PBRMaterial('wallMat', scene)
      wallMat.alpha = 0
      const wallPositions = [
        { pos: new Vector3(0, 1, 28), size: { width: 60, height: 4, depth: 1 } },
        { pos: new Vector3(0, 1, -28), size: { width: 60, height: 4, depth: 1 } },
        { pos: new Vector3(28, 1, 0), size: { width: 1, height: 4, depth: 60 } },
        { pos: new Vector3(-28, 1, 0), size: { width: 1, height: 4, depth: 60 } },
      ]
      for (const w of wallPositions) {
        const wall = MeshBuilder.CreateBox('wall', w.size, scene)
        wall.position = w.pos
        wall.material = wallMat
        new PhysicsAggregate(wall, PhysicsShapeType.BOX, { mass: 0 }, scene)
      }

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

      const [treeDefaultT, treeOakT, treePineT, rockLargeT, rockSmallT, mushroomT] = await Promise.all([
        loadPropTemplate('tree_default.glb'),
        loadPropTemplate('tree_oak.glb'),
        loadPropTemplate('tree_pineRoundA.glb'),
        loadPropTemplate('rock_largeA.glb'),
        loadPropTemplate('rock_smallA.glb'),
        loadPropTemplate('mushroom_red.glb'),
      ])
      if (disposed) return

      type PropSpot = { x: number; z: number; template: typeof treeDefaultT; scale: number; colliderH: number; colliderD: number }
      const propSpots: PropSpot[] = [
        { x: 22, z: 22, template: treeDefaultT, scale: 2.2, colliderH: 3.5, colliderD: 1.4 },
        { x: -22, z: 22, template: treeOakT, scale: 2, colliderH: 3.2, colliderD: 1.6 },
        { x: 22, z: -22, template: treePineT, scale: 2.4, colliderH: 3.8, colliderD: 1.2 },
        { x: -22, z: -22, template: treeDefaultT, scale: 2, colliderH: 3.2, colliderD: 1.3 },
        { x: 24, z: 0, template: treeOakT, scale: 2.2, colliderH: 3.4, colliderD: 1.5 },
        { x: -24, z: 0, template: treePineT, scale: 2, colliderH: 3.4, colliderD: 1.1 },
        { x: 0, z: 24, template: treeDefaultT, scale: 2.3, colliderH: 3.6, colliderD: 1.4 },
        { x: 0, z: -24, template: treeOakT, scale: 2, colliderH: 3.2, colliderD: 1.5 },
        { x: 12, z: 12, template: rockLargeT, scale: 1.8, colliderH: 1.4, colliderD: 1.6 },
        { x: -12, z: 12, template: rockSmallT, scale: 1.6, colliderH: 0.8, colliderD: 1 },
        { x: 12, z: -12, template: rockLargeT, scale: 1.6, colliderH: 1.3, colliderD: 1.5 },
        { x: -12, z: -12, template: rockSmallT, scale: 1.8, colliderH: 0.8, colliderD: 1.1 },
        { x: 5, z: -20, template: mushroomT, scale: 2, colliderH: 0.5, colliderD: 0.6 },
        { x: -6, z: 20, template: mushroomT, scale: 2.4, colliderH: 0.6, colliderD: 0.7 },
      ]

      propSpots.forEach((spot, i) => {
        const instance = spot.template.clone(`prop-${i}`, null)
        if (!instance) return
        instance.setEnabled(true)
        instance.position = new Vector3(spot.x, 0, spot.z)
        instance.scaling.setAll(spot.scale)
        instance.rotation.y = (i * 47) % 360 * (Math.PI / 180)
        instance.getChildMeshes().forEach((m) => shadowGenerator.addShadowCaster(m))

        // Collider simplificado e invisível — nunca a malha visual detalhada do glTF.
        const collider = MeshBuilder.CreateCylinder(
          `propCollider-${i}`,
          { height: spot.colliderH, diameter: spot.colliderD },
          scene,
        )
        collider.position = new Vector3(spot.x, spot.colliderH / 2, spot.z)
        collider.isVisible = false
        new PhysicsAggregate(collider, PhysicsShapeType.CYLINDER, { mass: 0 }, scene)
      })

      // Avatar (esfera física real)
      avatarMesh = MeshBuilder.CreateSphere('avatar', { diameter: 1.1 }, scene)
      avatarMesh.position = new Vector3(0, 3, 8)
      const avatarMat = new PBRMaterial('avatarMat', scene)
      avatarMat.albedoColor = avatarColorFromEmoji(profile.avatarEmoji)
      avatarMat.roughness = 0.3
      avatarMat.metallic = 0.1
      avatarMesh.material = avatarMat
      shadowGenerator.addShadowCaster(avatarMesh)
      avatarBody = new PhysicsAggregate(
        avatarMesh,
        PhysicsShapeType.SPHERE,
        { mass: 1, restitution: 0.35, friction: 0.5 },
        scene,
      )

      if (import.meta.env.DEV) {
        // Teleporte de QA — só em dev, pra testar o gatilho dos portais sem depender
        // de simular teclado segurado por um tempo real.
        ;(window as any).__debugTeleport = (x: number, z: number) => {
          if (!avatarMesh || !avatarBody) return
          avatarBody.body.disablePreStep = false
          avatarMesh.position.set(x, 1.5, z)
          avatarBody.body.setLinearVelocity(Vector3.Zero())
          avatarBody.body.setAngularVelocity(Vector3.Zero())
        }
      }

      // Portais de missão
      const guiTexture = AdvancedDynamicTexture.CreateFullscreenUI('portalLabels', true, scene)
      quests.forEach((quest, index) => {
        const angle = (index / quests.length) * Math.PI * 2
        const x = Math.cos(angle) * PORTAL_RADIUS
        const z = Math.sin(angle) * PORTAL_RADIUS

        const base = MeshBuilder.CreateCylinder(`base-${quest.id}`, { height: 0.4, diameter: 2.2 }, scene)
        base.position = new Vector3(x, 0.2, z)
        base.receiveShadows = true

        const ring = MeshBuilder.CreateTorus(`ring-${quest.id}`, { diameter: 2, thickness: 0.22 }, scene)
        ring.position = new Vector3(x, 1.4, z)
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

        portalMeshes.push({ quest, ring, base })
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
      ;(scene as any).__applyPortalVisuals = () => portalMeshes.forEach(applyPortalVisual)

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
        inputRef.current = { x, y }

        if (avatarBody && avatarMesh) {
          const body = avatarBody.body
          const currentVel = body.getLinearVelocity()
          const desiredX = x * MAX_SPEED
          const desiredZ = y * MAX_SPEED
          body.setLinearVelocity(new Vector3(desiredX, currentVel.y, desiredZ))

          // câmera segue a bola
          camera.target = Vector3.Lerp(camera.target, avatarMesh.position, 0.08)

          // checa proximidade dos portais
          if (!suspendRef.current) {
            for (const entry of portalMeshes) {
              const idx = quests.findIndex((q) => q.id === entry.quest.id)
              const unlocked = isQuestUnlocked(progressRef.current, idx)
              const completed = progressRef.current.completedQuestIds.includes(entry.quest.id)
              if (!unlocked || completed) continue
              const dx = avatarMesh.position.x - entry.base.position.x
              const dz = avatarMesh.position.z - entry.base.position.z
              const dist = Math.hypot(dx, dz)
              if (dist < TRIGGER_DISTANCE && !triggered.has(entry.quest.id)) {
                triggered.add(entry.quest.id)
                onSelectQuestRef.current(entry.quest.id)
              } else if (dist > RESET_DISTANCE) {
                triggered.delete(entry.quest.id)
              }
            }
          }
        }

        if (import.meta.env.DEV && debugRef.current) {
          debugRef.current.textContent = `${Math.round(engine.getFps())} FPS · ${instrumentation.drawCallsCounter.current} draw calls · ${scene.getActiveMeshes().length}/${scene.meshes.length} meshes`
        }

        // animação sutil dos portais desbloqueados (bobbing)
        for (const entry of portalMeshes) {
          const idx = quests.findIndex((q) => q.id === entry.quest.id)
          const unlocked = isQuestUnlocked(progressRef.current, idx)
          const completed = progressRef.current.completedQuestIds.includes(entry.quest.id)
          if (unlocked && !completed) {
            entry.ring.position.y = 1.4 + Math.sin(time * 2 + idx) * 0.15
            entry.ring.rotation.z = time * 0.6
          }
        }
      })
      ;(scene as any).__refreshPortals = () => portalMeshes.forEach(applyPortalVisual)

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

  return (
    <div className="world3d-container">
      <canvas ref={canvasRef} className="world3d-canvas" />
      {import.meta.env.DEV && <div ref={debugRef} className="world3d-debug" />}
      <HudHeader profile={profile} progress={progress} />
      <p className="world3d-hint">Ande até os portais brilhantes pra abrir uma missão</p>
      <TouchJoystick onChange={handleJoystickChange} />
    </div>
  )
}
