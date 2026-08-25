// Montagem/vestuário do boneco-estudante — extraído de `World3D.tsx` (lab-87) pra um módulo
// próprio, sem nenhum import do resto da cena principal (planeta, física, NPCs, etc.). Motivo
// real, não estético: `AvatarShop.tsx` (lab-87, preview 3D na lojinha) precisa dessas funções,
// mas `AvatarShop.tsx` é importado direto (não via `lazy()`) em `App.tsx`, enquanto `World3D.tsx`
// É carregado via `lazy()` justamente pra não pesar o carregamento inicial (~6,4MB/1,37MB gzip —
// ver `docs/prompts/05-escala-e-viabilidade.md` G12). Se a lojinha importasse essas funções direto
// de `World3D.tsx`, o bundler juntaria o World3D inteiro (Babylon + Havok + carregadores glTF) no
// chunk principal do app de novo, quebrando o `lazy()` pra todo mundo — inclusive quem só abre
// `/familia`, `/termos` ou `/privacidade` e nunca chega a ver o mundo 3D. Um módulo pequeno e
// isolado, sem física/cena principal, evita esse acoplamento.
import { Color3, Mesh, MeshBuilder, PBRMaterial, Scene, ShadowGenerator, TransformNode, Vector3 } from '@babylonjs/core'
import { findAvatarByEmoji, type BonecoFeatures } from '../data/avatars'
import type { HatOption } from '../data/hats'
import type { HairShape } from '../data/customization'
import type { GlassesOption } from '../data/glasses'

// Cor da camisa vem do catálogo de avatares (src/data/avatars.ts) — fonte única de verdade,
// compartilhada entre o mundo 3D e a lojinha. O fallback cobre só o caso de um emoji não
// catalogado chegar aqui (não deveria acontecer, mas evita crash).
export function avatarColorFromEmoji(emoji: string): Color3 {
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

export function bonecoFeaturesFromEmoji(emoji: string): BonecoFeatures {
  return findAvatarByEmoji(emoji)?.features ?? FALLBACK_BONECO_FEATURES
}

export interface StudentFigure {
  root: TransformNode
  shirtMat: PBRMaterial
  // Cores de calça/sapato/mochila (lab-73) — expostas junto de `shirtMat` pro mesmo padrão de
  // recolorir ao vivo (ver `__setAvatarShirtColor`) funcionar pros outros eixos também.
  pantsMat: PBRMaterial
  shoeMat: PBRMaterial
  backpackMat: PBRMaterial
  hairMat: PBRMaterial
  // Cabelo (lab-73) — separado de `accessories`/`hatMeshes` porque tem seu próprio eixo de troca
  // de FORMATO (não só cor), populado por `applyHairShape` (mesmo padrão de `applyHat`).
  hairMeshes: Mesh[]
  head: Mesh
  legPivotL: TransformNode
  legPivotR: TransformNode
  kneePivotL: TransformNode
  kneePivotR: TransformNode
  armPivotL: TransformNode
  armPivotR: TransformNode
  elbowPivotL: TransformNode
  elbowPivotR: TransformNode
  accessories: Mesh[]
  hatMeshes: Mesh[]
  // Óculos (lab-92) — mesmo padrão do chapéu: eixo de customização independente, populado por
  // `applyGlasses`.
  glassesMeshes: Mesh[]
}

export interface StudentFigureColorOptions {
  pantsColor?: Color3
  shoeColor?: Color3
  backpackColor?: Color3
}

export function buildStudentFigure(
  scene: Scene,
  shirtColor: Color3,
  shadowGenerator: ShadowGenerator,
  colorOptions?: StudentFigureColorOptions,
): StudentFigure {
  const root = new TransformNode('studentRoot', scene)

  const skinMat = new PBRMaterial('skinMat', scene)
  skinMat.albedoColor = new Color3(0.94, 0.76, 0.6)
  skinMat.roughness = 0.6

  const shirtMat = new PBRMaterial('shirtMat', scene)
  shirtMat.albedoColor = shirtColor
  shirtMat.roughness = 0.7

  const pantsMat = new PBRMaterial('pantsMat', scene)
  pantsMat.albedoColor = colorOptions?.pantsColor ?? new Color3(0.22, 0.28, 0.48)
  pantsMat.roughness = 0.8

  const shoeMat = new PBRMaterial('shoeMat', scene)
  shoeMat.albedoColor = colorOptions?.shoeColor ?? new Color3(0.12, 0.12, 0.14)
  shoeMat.roughness = 0.7

  const backpackMat = new PBRMaterial('backpackMat', scene)
  backpackMat.albedoColor = colorOptions?.backpackColor ?? Color3.Lerp(shirtColor, new Color3(0.5, 0.15, 0.1), 0.5)
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

    // Tênis (lab-73, pedido do usuário: "a cor do sapato") — só nas pernas, na ponta da canela,
    // um pouco pra frente (eixo Z) pra ficar visível saindo da calça em vez de escondido atrás.
    if (isLeg) {
      const shoe = MeshBuilder.CreateBox(`${name}Shoe`, { width: 0.1, height: 0.06, depth: 0.16 }, scene)
      shoe.position = new Vector3(0, -lowerLen - 0.01, 0.04)
      addMesh(shoe, shoeMat, lowerPivot)
    }

    return { upperPivot, lowerPivot }
  }

  const leg1 = buildTwoSegmentLimb('legL', -1, true)
  const leg2 = buildTwoSegmentLimb('legR', 1, true)
  const arm1 = buildTwoSegmentLimb('armL', -1, false)
  const arm2 = buildTwoSegmentLimb('armR', 1, false)

  const figure: StudentFigure = {
    root,
    shirtMat,
    pantsMat,
    shoeMat,
    backpackMat,
    hairMat,
    hairMeshes: [],
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
    glassesMeshes: [],
  }
  // Cabelo padrão — trocável depois via `applyHairShape` (ver `__setHairShape`), mesmo padrão de
  // `applyHat` sendo chamado de novo quando o jogador troca de item na lojinha em cena.
  applyHairShape(figure, 'padrao', scene, shadowGenerator)
  return figure
}

// Peças 3D que dão a cada avatar do catálogo (src/data/avatars.ts) uma forma de verdade — não só
// uma cor de camisa (pedido do usuário: "bonecos 3d pra trocar não só de avatar", lab-13).
// Descarta as peças antigas (se houver — troca de avatar em cena já com a cena montada) e monta
// as novas a partir de `features`, tudo parentado em `figure.root` (mesmo padrão da mochila/
// cabelo: offset absoluto, não aninhado na cabeça) reaproveitando primitivas simples, sem asset
// externo, igual ao resto do jogo.
export function applyBonecoFeatures(
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
export function applyHat(
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

// Óculos equipados (lab-92) — mesmo padrão de `applyHat`: eixo de customização independente,
// guardado em `figure.glassesMeshes`. `glasses` null = remove qualquer óculos, descarta as
// malhas e sai. Posicionado na altura dos olhos (`EYE_Y`, mesma referência já usada pelo
// acessório `special: 'eyes'` em `applyBonecoFeatures` acima) — na frente do rosto (+Z),
// independente da criatura escolhida.
export function applyGlasses(
  figure: StudentFigure,
  glasses: GlassesOption | null,
  scene: Scene,
  shadowGenerator: ShadowGenerator,
): void {
  for (const mesh of figure.glassesMeshes) mesh.dispose()
  figure.glassesMeshes = []
  if (!glasses) return

  const glassesMat = new PBRMaterial(`glassesMat-${glasses.id}`, scene)
  glassesMat.albedoColor = new Color3(...glasses.colorRgb)
  glassesMat.roughness = 0.3
  glassesMat.metallic = 0.2

  function add(mesh: Mesh) {
    mesh.material = glassesMat
    mesh.parent = figure.root
    shadowGenerator.addShadowCaster(mesh)
    figure.glassesMeshes.push(mesh)
    return mesh
  }

  const EYE_Y = 1.15 + 0.13

  if (glasses.shape === 'sunglasses') {
    for (const side of [-1, 1]) {
      const lens = MeshBuilder.CreateSphere(`glassesLens${side}`, { diameter: 0.11 }, scene)
      lens.scaling.z = 0.4
      lens.position = new Vector3(side * 0.09, EYE_Y, 0.14)
      add(lens)
    }
    const bridge = MeshBuilder.CreateBox('glassesBridge', { width: 0.06, height: 0.02, depth: 0.02 }, scene)
    bridge.position = new Vector3(0, EYE_Y, 0.14)
    add(bridge)
  } else if (glasses.shape === 'vr') {
    const visor = MeshBuilder.CreateBox('glassesVisor', { width: 0.24, height: 0.1, depth: 0.08 }, scene)
    visor.position = new Vector3(0, EYE_Y, 0.13)
    add(visor)
    const strap = MeshBuilder.CreateCylinder('glassesStrap', { height: 0.05, diameter: 0.34, tessellation: 12 }, scene)
    strap.rotation.x = Math.PI / 2
    strap.position = new Vector3(0, EYE_Y, -0.02)
    add(strap)
  }
}

// Formato do cabelo (lab-73, pedido do usuário: "o formato do cabelo, pode ser 3 opções") — mesmo
// padrão de `applyHat` (descarta as peças antigas, monta as novas), mas continua usando
// `figure.hairMat` (não um material novo por chamada) já que cor de cabelo não é um eixo de
// customização pedido — só o formato muda.
export function applyHairShape(figure: StudentFigure, shape: HairShape, scene: Scene, shadowGenerator: ShadowGenerator): void {
  for (const mesh of figure.hairMeshes) mesh.dispose()
  figure.hairMeshes = []

  function add(mesh: Mesh) {
    mesh.material = figure.hairMat
    mesh.parent = figure.root
    shadowGenerator.addShadowCaster(mesh)
    figure.hairMeshes.push(mesh)
    return mesh
  }

  if (shape === 'moicano') {
    const fin = MeshBuilder.CreateBox('hairMoicanoFin', { width: 0.05, height: 0.18, depth: 0.3 }, scene)
    fin.position.y = 1.32
    add(fin)
    const sides = MeshBuilder.CreateSphere('hairMoicanoSides', { diameter: 0.33, slice: 0.4 }, scene)
    sides.position.y = 1.22
    add(sides)
  } else if (shape === 'longo') {
    const top = MeshBuilder.CreateSphere('hairLongoTop', { diameter: 0.35, slice: 0.55 }, scene)
    top.position.y = 1.24
    add(top)
    // Rabo/franja caindo pelas costas — cápsula inclinada, mais estreita embaixo (escala não
    // uniforme) pra não parecer um cilindro reto.
    const back = MeshBuilder.CreateCapsule('hairLongoBack', { height: 0.34, radius: 0.1 }, scene)
    back.scaling = new Vector3(0.75, 1, 0.5)
    back.rotation.x = 0.2
    back.position = new Vector3(0, 1.03, -0.14)
    add(back)
  } else {
    const hair = MeshBuilder.CreateSphere('hair', { diameter: 0.35, slice: 0.55 }, scene)
    hair.position.y = 1.24
    add(hair)
  }
}
