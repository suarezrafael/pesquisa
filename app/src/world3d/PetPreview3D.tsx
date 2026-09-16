import { useEffect, useRef } from 'react'
import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HDRCubeTexture,
  HemisphericLight,
  MeshBuilder,
  PBRMaterial,
  Scene,
  ShadowGenerator,
  TransformNode,
  Vector3,
} from '@babylonjs/core'
import { findPetById } from '../data/pets'
import { petVisualScale, type PetStage } from '../state/progression'
import { buildCachorro, buildGato, disposePetFigure, petFurColor } from './petFigure'

interface PetPreview3DProps {
  petId: string
  stage: PetStage
}

// Preview 3D de verdade do pet equipado — mesmo motivo/arquitetura de `AvatarPreview3D.tsx`
// (motor Babylon próprio, isolado do mundo principal, sem física/Havok, canvas pequeno) e mesma
// razão de reaproveitar a função de montagem do jogo de verdade (`buildGato`/`buildCachorro`,
// extraídas de `World3D.tsx` pra `petFigure.ts` só pra isso) em vez de duplicar geometria — o
// mesmo pet que a criança vê seguindo ela no mundo aparece aqui, sem duas fontes de verdade
// visual pra manter em sincronia.
export function PetPreview3D({ petId, stage }: PetPreview3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<Scene | null>(null)
  const shadowGeneratorRef = useRef<ShadowGenerator | null>(null)
  const petRootRef = useRef<TransformNode | null>(null)

  // Motor/cena/câmera/luz montados uma vez só — trocar de pet/estágio não deve reiniciar o giro
  // da câmera nem recriar o canvas, só o pet em si (efeito separado abaixo).
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true })
    const scene = new Scene(engine)
    scene.clearColor = new Color4(0, 0, 0, 0)

    const camera = new ArcRotateCamera(
      'petPreviewCamera',
      -Math.PI / 2,
      Math.PI / 2.3,
      1.1,
      new Vector3(0, 0.15, 0),
      scene,
    )
    camera.minZ = 0.05
    camera.attachControl(canvas, true)
    camera.lowerRadiusLimit = 0.6
    camera.upperRadiusLimit = 2
    camera.lowerBetaLimit = 0.15
    camera.upperBetaLimit = Math.PI / 2 + 0.3
    camera.useAutoRotationBehavior = true
    if (camera.autoRotationBehavior) {
      camera.autoRotationBehavior.idleRotationSpeed = 0.35
      camera.autoRotationBehavior.idleRotationWaitTime = 2000
      camera.autoRotationBehavior.idleRotationSpinupTime = 1000
    }

    const hemi = new HemisphericLight('petPreviewHemi', new Vector3(0, 1, 0), scene)
    hemi.intensity = 0.85
    hemi.groundColor = new Color3(0.4, 0.4, 0.45)

    const sun = new DirectionalLight('petPreviewSun', new Vector3(-0.5, -1, -0.3), scene)
    sun.intensity = 1.1

    // Sem isso os materiais PBR do pet (`buildGato`/`buildCachorro`) ficam sem reflexo/ambient
    // specular nenhum e leem como escuros mesmo com as 2 luzes diretas acima — MESMO achado já
    // corrigido pro preview de avatar (lab-87, "o avatar fica escuro"). Mesmo HDRI/URL já
    // carregado pelo mundo principal e pelo preview de avatar — o navegador já tem em cache
    // sempre que este painel abre (só alcançável depois do mundo 3D já estar montado).
    const hdrTexture = new HDRCubeTexture('/assets/hdri/kiara_4_mid-morning_1k.hdr', scene, 256)
    scene.environmentTexture = hdrTexture
    scene.environmentIntensity = 0.9

    const shadowGenerator = new ShadowGenerator(512, sun)
    shadowGenerator.useBlurExponentialShadowMap = true
    shadowGenerator.blurKernel = 16
    shadowGenerator.bias = 0.001
    shadowGenerator.normalBias = 0.02

    const ground = MeshBuilder.CreateDisc('petPreviewGround', { radius: 0.3, tessellation: 32 }, scene)
    ground.rotation.x = Math.PI / 2
    ground.receiveShadows = true
    const groundMat = new PBRMaterial('petPreviewGroundMat', scene)
    groundMat.albedoColor = Color3.White()
    groundMat.alpha = 0.16
    groundMat.roughness = 1
    ground.material = groundMat

    sceneRef.current = scene
    shadowGeneratorRef.current = shadowGenerator
    if (import.meta.env.DEV) (window as any).__petPreviewScene = scene

    engine.runRenderLoop(() => {
      scene.render()
    })

    const onResize = () => engine.resize()
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      sceneRef.current = null
      shadowGeneratorRef.current = null
      petRootRef.current = null
      engine.dispose()
    }
  }, [])

  // Reconstrói só o pet (não o motor/câmera) a cada troca de pet/estágio — mesma escolha de
  // `AvatarPreview3D.tsx` (mais simples e seguro que atualizar peça por peça, barato o bastante
  // nessa escala pra não precisar otimizar).
  useEffect(() => {
    const scene = sceneRef.current
    const shadowGenerator = shadowGeneratorRef.current
    if (!scene || !shadowGenerator) return

    if (petRootRef.current) disposePetFigure(petRootRef.current, shadowGenerator)
    petRootRef.current = null

    const pet = findPetById(petId)
    if (!pet) return

    const furColor = petFurColor(pet.furColorRgb, stage)
    const root = pet.species === 'cachorro' ? buildCachorro(scene, shadowGenerator, furColor) : buildGato(scene, shadowGenerator, furColor)
    root.scaling.setAll(petVisualScale(stage, pet.species))
    petRootRef.current = root
  }, [petId, stage])

  // `aria-label` — o canvas recebe `attachControl` (giro por arrasto), então é uma superfície
  // interativa/focável; sem nome acessível, um leitor de tela só anunciaria "canvas", sem indicar
  // que representa o pet equipado.
  return <canvas ref={canvasRef} className="pet-preview-3d-canvas" aria-label="Preview 3D do pet equipado" />
}
