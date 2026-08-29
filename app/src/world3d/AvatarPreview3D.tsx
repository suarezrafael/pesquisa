import { useEffect, useRef } from 'react'
import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight,
  MeshBuilder,
  PBRMaterial,
  Scene,
  ShadowGenerator,
  Vector3,
} from '@babylonjs/core'
import { findHatById } from '../data/hats'
import { findGlassesById } from '../data/glasses'
import {
  BACKPACK_COLOR_CATALOG,
  PANTS_COLOR_CATALOG,
  SHIRT_COLOR_CATALOG,
  SHOE_COLOR_CATALOG,
  findColorOption,
  findHairShapeOption,
} from '../data/customization'
import {
  applyBonecoFeatures,
  applyClothingLook,
  applyGlasses,
  applyHairShape,
  applyHat,
  avatarColorFromEmoji,
  bonecoFeaturesFromEmoji,
  buildStudentFigure,
  type StudentFigure,
} from './studentFigure'

interface AvatarPreview3DProps {
  avatarEmoji: string
  hatId: string | null
  shirtColorId: string | null
  pantsColorId: string | null
  shoeColorId: string | null
  backpackColorId: string | null
  hairShapeId: string | null
  glassesId: string | null
}

// Preview 3D de verdade (lab-87, pedido do usuário: "mostrar um menu com um preview 3D do avatar
// e do boneco") — motor Babylon próprio, isolado do motor principal do jogo (World3D.tsx): canvas
// pequeno, sem física/Havok (o boneco não precisa colidir com nada aqui), sem mundo ao redor, só
// o boneco vestido com a combinação atual, girando devagar numa plataforma. Reaproveita as MESMAS
// funções de montagem/vestuário do jogo principal (exportadas de World3D.tsx só pra isso) em vez
// de duplicar a lógica de "como montar um boneco" — qualquer chapéu/cor/formato novo adicionado
// nos catálogos aparece aqui automaticamente, sem precisar mexer neste arquivo.
export function AvatarPreview3D({
  avatarEmoji,
  hatId,
  shirtColorId,
  pantsColorId,
  shoeColorId,
  backpackColorId,
  hairShapeId,
  glassesId,
}: AvatarPreview3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<Scene | null>(null)
  const shadowGeneratorRef = useRef<ShadowGenerator | null>(null)
  const figureRef = useRef<StudentFigure | null>(null)

  // Motor/cena/câmera/luz montados UMA vez só — trocar de item não deve reiniciar o giro da
  // câmera nem recriar o canvas, só o boneco em si (efeito separado abaixo).
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true })
    const scene = new Scene(engine)
    scene.clearColor = new Color4(0, 0, 0, 0)

    const camera = new ArcRotateCamera(
      'previewCamera',
      -Math.PI / 2,
      Math.PI / 2.3,
      2.6,
      new Vector3(0, 0.85, 0),
      scene,
    )
    camera.minZ = 0.1
    // lab-118, pedido do usuário: "na lojinha de avatar tem que ter como girar o avatar pra ver o
    // cabelo escolhido" — antes só existia o giro automático abaixo (sem `attachControl`, arrastar
    // não fazia nada), então dava pra perder itens que só aparecem de um ângulo específico (ex.:
    // o rabo do cabelo longo fica nas COSTAS, ver `studentFigure.ts`/`applyHairShape`). Arrastar
    // agora gira/aproxima livremente; limites evitam ver por baixo do chão ou colar a câmera
    // dentro da cabeça.
    camera.attachControl(canvas, true)
    camera.lowerRadiusLimit = 1.4
    camera.upperRadiusLimit = 4.5
    camera.lowerBetaLimit = 0.15
    camera.upperBetaLimit = Math.PI / 2 + 0.3
    // Giro automático "boneco numa vitrine" (mesmo espírito de antes) via comportamento nativo do
    // Babylon — ao contrário do `camera.alpha += ...` manual de antes, este pausa sozinho assim
    // que o jogador arrasta e retoma um tempo depois de soltar, em vez de brigar com o input do
    // usuário (o incremento manual antigo continuaria somando por cima de qualquer arraste).
    camera.useAutoRotationBehavior = true
    if (camera.autoRotationBehavior) {
      camera.autoRotationBehavior.idleRotationSpeed = 0.35
      camera.autoRotationBehavior.idleRotationWaitTime = 2000
      camera.autoRotationBehavior.idleRotationSpinupTime = 1000
    }

    const hemi = new HemisphericLight('previewHemi', new Vector3(0, 1, 0), scene)
    hemi.intensity = 0.75
    hemi.groundColor = new Color3(0.4, 0.4, 0.45)

    const sun = new DirectionalLight('previewSun', new Vector3(-0.5, -1, -0.3), scene)
    sun.intensity = 1.1

    const shadowGenerator = new ShadowGenerator(512, sun)
    shadowGenerator.useBlurExponentialShadowMap = true
    shadowGenerator.blurKernel = 16
    // Mesmo ajuste do lab-87 pro planeta principal (World3D.tsx) — evita "shadow acne" na malha
    // do próprio boneco (o disco do chão é plano, mas cabeça/tronco/membros são curvos).
    shadowGenerator.bias = 0.001
    shadowGenerator.normalBias = 0.02

    const ground = MeshBuilder.CreateDisc('previewGround', { radius: 0.85, tessellation: 32 }, scene)
    ground.rotation.x = Math.PI / 2
    ground.receiveShadows = true
    const groundMat = new PBRMaterial('previewGroundMat', scene)
    groundMat.albedoColor = Color3.White()
    groundMat.alpha = 0.16
    groundMat.roughness = 1
    ground.material = groundMat

    sceneRef.current = scene
    shadowGeneratorRef.current = shadowGenerator
    // Mesmo padrão de debug hook do `World3D.tsx` (`window.__scene`) — só em dev, pra inspecionar
    // a cena do preview via console sem precisar adivinhar ângulo de câmera em screenshot.
    if (import.meta.env.DEV) (window as any).__avatarPreviewScene = scene

    engine.runRenderLoop(() => {
      scene.render()
    })

    const onResize = () => engine.resize()
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      sceneRef.current = null
      shadowGeneratorRef.current = null
      figureRef.current = null
      engine.dispose()
    }
  }, [])

  // Reconstrói só o boneco (não o motor/câmera) a cada troca de criatura/chapéu/cor/cabelo —
  // mais simples e seguro que tentar atualizar peça por peça em cima do que já existe, e barato o
  // bastante nessa escala (uma figura, uma cena pequena) pra não precisar otimizar.
  useEffect(() => {
    const scene = sceneRef.current
    const shadowGenerator = shadowGeneratorRef.current
    if (!scene || !shadowGenerator) return

    figureRef.current?.root.dispose(false, true)

    const figure = buildStudentFigure(scene, avatarColorFromEmoji(avatarEmoji), shadowGenerator)
    applyBonecoFeatures(figure, bonecoFeaturesFromEmoji(avatarEmoji), scene, shadowGenerator)
    applyHat(figure, hatId ? (findHatById(hatId) ?? null) : null, scene, shadowGenerator)
    applyGlasses(figure, glassesId ? (findGlassesById(glassesId) ?? null) : null, scene, shadowGenerator)
    applyHairShape(figure, findHairShapeOption(hairShapeId)?.shape ?? 'padrao', scene, shadowGenerator)

    // lab-122: `applyClothingLook` também aplica o `style` (textura/metálico) dos itens
    // exclusivos — sem isso, a lojinha mostraria uma cor sólida diferente do que o boneco no
    // mundo 3D realmente usa depois de equipado.
    const shirtOpt = findColorOption(SHIRT_COLOR_CATALOG, shirtColorId)
    applyClothingLook(figure.shirtMat, shirtOpt, scene, avatarColorFromEmoji(avatarEmoji), 0.7)
    const pantsOpt = findColorOption(PANTS_COLOR_CATALOG, pantsColorId)
    applyClothingLook(figure.pantsMat, pantsOpt, scene, new Color3(0.22, 0.28, 0.48), 0.8)
    const shoeOpt = findColorOption(SHOE_COLOR_CATALOG, shoeColorId)
    applyClothingLook(figure.shoeMat, shoeOpt, scene, new Color3(0.12, 0.12, 0.14), 0.7)
    const backpackOpt = findColorOption(BACKPACK_COLOR_CATALOG, backpackColorId)
    applyClothingLook(
      figure.backpackMat,
      backpackOpt,
      scene,
      Color3.Lerp(avatarColorFromEmoji(avatarEmoji), new Color3(0.5, 0.15, 0.1), 0.5),
      0.75,
    )

    figureRef.current = figure
  }, [avatarEmoji, hatId, shirtColorId, pantsColorId, shoeColorId, backpackColorId, hairShapeId, glassesId])

  return <canvas ref={canvasRef} className="avatar-preview-3d-canvas" />
}
