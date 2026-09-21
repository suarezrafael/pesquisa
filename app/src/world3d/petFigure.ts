// Montagem visual dos pets adotáveis — extraído de `World3D.tsx` (onde as duas funções já viviam
// como funções puras e autocontidas, sem nenhuma dependência de estado do componente) pro mesmo
// motivo de `studentFigure.ts` ter sido extraído em seu tempo: permitir um preview 3D isolado
// (`PetPreview3D.tsx`) reaproveitar a MESMA lógica de montagem usada pelo pet de verdade no mundo,
// em vez de duplicar geometria/material. `World3D.tsx` importa daqui pro pet no jogo principal — o
// comportamento lá não muda, só o arquivo onde a função mora.
import { Color3, Mesh, MeshBuilder, PBRMaterial, type Scene, type ShadowGenerator, TransformNode, Vector3 } from '@babylonjs/core'
import type { PetSpecies } from '../data/pets'
import type { PetStage } from '../state/progression'
import { findPetAccessoryById, type PetAccessoryOption } from '../data/petAccessories'

// Único sinal visual de "idoso" — pelo mais grisalho, mesmo corpo/tamanho de um adulto
// (`petVisualScale`, `progression.ts`) — nunca some, nunca fica doente, nunca reduz. Extraído pra
// cá (em vez de repetir o cálculo em `World3D.tsx` E `PetPreview3D.tsx`) pra impedir os dois
// lugares divergirem silenciosamente se a regra de blend mudar um dia.
export function petFurColor(furColorRgb: [number, number, number], stage: PetStage): Color3 {
  const baseFurColor = new Color3(...furColorRgb)
  return stage === 'idoso' ? Color3.Lerp(baseFurColor, new Color3(0.8, 0.8, 0.8), 0.45) : baseFurColor
}

// Gatos (pedido do usuário: "mais gato e alguns gatos ficam em cima de tudo") — a maioria vaga
// pelo chão igual coelho/esquilo, alguns ficam parados no topo dos platôs/telhados (ver
// `perchedCats` em `World3D.tsx`, fora da IA de vagar).
export function buildGato(scene: Scene, shadowGenerator: ShadowGenerator, furColor: Color3): TransformNode {
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

// Cachorro (pedido do usuário: "sons engraçados... onças, cachorro, falcão") — vaga pelo chão
// igual coelho/esquilo/gato, mesmo estilo baixo-poli de cápsulas/esferas.
export function buildCachorro(scene: Scene, shadowGenerator: ShadowGenerator, furColor: Color3): TransformNode {
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

// Silhueta com orelhas longas e patas traseiras aparentes. Sao sete malhas e um material, sem
// textura externa ou animacao propria; o movimento continua vindo da raiz compartilhada do pet.
export function buildCoelho(scene: Scene, shadowGenerator: ShadowGenerator, furColor: Color3): TransformNode {
  const root = new TransformNode('coelhoRoot', scene)
  const furMat = new PBRMaterial('coelhoFur', scene)
  furMat.albedoColor = furColor
  furMat.roughness = 0.88

  function add(mesh: Mesh) {
    mesh.material = furMat
    mesh.parent = root
    shadowGenerator.addShadowCaster(mesh)
    return mesh
  }

  const body = MeshBuilder.CreateCapsule('coelhoBody', { height: 0.32, radius: 0.13 }, scene)
  body.rotation.x = Math.PI / 2
  body.position.y = 0.14
  add(body)

  const head = MeshBuilder.CreateSphere('coelhoHead', { diameter: 0.18, segments: 10 }, scene)
  head.position = new Vector3(0, 0.23, 0.2)
  add(head)

  for (const side of [-1, 1]) {
    const ear = MeshBuilder.CreateCapsule(`coelhoEar${side}`, { height: 0.19, radius: 0.038, tessellation: 8 }, scene)
    ear.position = new Vector3(side * 0.052, 0.39, 0.18)
    ear.rotation.z = side * 0.12
    add(ear)

    const paw = MeshBuilder.CreateCapsule(`coelhoPaw${side}`, { height: 0.14, radius: 0.042, tessellation: 8 }, scene)
    paw.rotation.x = Math.PI / 2
    paw.position = new Vector3(side * 0.085, 0.065, -0.1)
    add(paw)
  }

  const tail = MeshBuilder.CreateSphere('coelhoTail', { diameter: 0.1, segments: 8 }, scene)
  tail.position = new Vector3(0, 0.19, -0.2)
  add(tail)

  return root
}

// O casco usa um segundo material para continuar legivel mesmo em telas pequenas. O modelo todo
// respeita o teto do laboratorio: oito malhas-base e dois materiais.
export function buildTartaruga(scene: Scene, shadowGenerator: ShadowGenerator, skinColor: Color3): TransformNode {
  const root = new TransformNode('tartarugaRoot', scene)
  const skinMat = new PBRMaterial('tartarugaSkin', scene)
  skinMat.albedoColor = skinColor
  skinMat.roughness = 0.9
  const shellMat = new PBRMaterial('tartarugaShell', scene)
  shellMat.albedoColor = Color3.Lerp(skinColor, new Color3(0.1, 0.24, 0.1), 0.48)
  shellMat.roughness = 0.72

  function add(mesh: Mesh, material: PBRMaterial = skinMat) {
    mesh.material = material
    mesh.parent = root
    shadowGenerator.addShadowCaster(mesh)
    return mesh
  }

  const body = MeshBuilder.CreateSphere('tartarugaBody', { diameter: 0.31, segments: 10 }, scene)
  body.scaling = new Vector3(1.04, 0.44, 1.22)
  body.position.y = 0.13
  add(body)

  const shell = MeshBuilder.CreateSphere('tartarugaShell', { diameter: 0.33, segments: 10 }, scene)
  shell.scaling = new Vector3(0.96, 0.55, 1.08)
  shell.position = new Vector3(0, 0.2, -0.015)
  add(shell, shellMat)

  const head = MeshBuilder.CreateSphere('tartarugaHead', { diameter: 0.14, segments: 10 }, scene)
  head.position = new Vector3(0, 0.14, 0.25)
  add(head)

  for (const side of [-1, 1]) {
    for (const direction of [-1, 1]) {
      const leg = MeshBuilder.CreateCapsule(
        `tartarugaLeg${side}-${direction}`,
        { height: 0.12, radius: 0.034, tessellation: 8 },
        scene,
      )
      leg.rotation.x = Math.PI / 2
      leg.position = new Vector3(side * 0.13, 0.06, direction * 0.1)
      add(leg)
    }
  }

  const tail = MeshBuilder.CreateCylinder(
    'tartarugaTail',
    { height: 0.11, diameterTop: 0, diameterBottom: 0.055, tessellation: 4 },
    scene,
  )
  tail.rotation.x = -Math.PI / 2
  tail.position = new Vector3(0, 0.1, -0.25)
  add(tail)

  return root
}

// Fonte unica para o preview e o mundo. O `switch` exaustivo faz o TypeScript acusar toda nova
// especie que ainda nao ganhou modelo, evitando o fallback silencioso para gato que existia antes.
export function buildPetFigure(
  scene: Scene,
  shadowGenerator: ShadowGenerator,
  species: PetSpecies,
  furColor: Color3,
): TransformNode {
  switch (species) {
    case 'gato':
      return buildGato(scene, shadowGenerator, furColor)
    case 'cachorro':
      return buildCachorro(scene, shadowGenerator, furColor)
    case 'coelho':
      return buildCoelho(scene, shadowGenerator, furColor)
    case 'tartaruga':
      return buildTartaruga(scene, shadowGenerator, furColor)
  }
}

interface PetAccessoryFit {
  neckY: number
  neckZ: number
  faceY: number
  faceZ: number
  collarDiameter: number
  capeWidth: number
  capeDepth: number
  capeY: number
  capeZ: number
  maskWidth: number
  maskHeight: number
}

const PET_ACCESSORY_FIT: Record<PetSpecies, PetAccessoryFit> = {
  gato: {
    neckY: 0.16, neckZ: 0.105, faceY: 0.19, faceZ: 0.225,
    collarDiameter: 0.18, capeWidth: 0.2, capeDepth: 0.26, capeY: 0.25, capeZ: -0.07,
    maskWidth: 0.145, maskHeight: 0.055,
  },
  cachorro: {
    neckY: 0.2, neckZ: 0.14, faceY: 0.205, faceZ: 0.305,
    collarDiameter: 0.23, capeWidth: 0.26, capeDepth: 0.32, capeY: 0.29, capeZ: -0.085,
    maskWidth: 0.17, maskHeight: 0.055,
  },
  coelho: {
    neckY: 0.22, neckZ: 0.125, faceY: 0.235, faceZ: 0.29,
    collarDiameter: 0.2, capeWidth: 0.22, capeDepth: 0.28, capeY: 0.29, capeZ: -0.07,
    maskWidth: 0.16, maskHeight: 0.052,
  },
  tartaruga: {
    neckY: 0.14, neckZ: 0.2, faceY: 0.15, faceZ: 0.315,
    collarDiameter: 0.16, capeWidth: 0.3, capeDepth: 0.32, capeY: 0.28, capeZ: -0.04,
    maskWidth: 0.135, maskHeight: 0.048,
  },
}

// Os acessorios usam no maximo uma malha simples por encaixe. Como sao filhos do mesmo `root`,
// herdam escala/rotacao do pet em qualquer fase e aparecem identicos no preview e no mundo.
export function applyPetAccessories(
  scene: Scene,
  shadowGenerator: ShadowGenerator,
  root: TransformNode,
  species: PetSpecies,
  accessoryIds: string[],
): void {
  const fit = PET_ACCESSORY_FIT[species]

  function addAccessory(item: PetAccessoryOption): void {
    const material = new PBRMaterial(`petAccessoryMat-${item.id}`, scene)
    material.albedoColor = new Color3(...item.colorRgb)
    material.roughness = 0.55
    material.metallic = 0.08

    let mesh: Mesh
    if (item.shape === 'collar') {
      mesh = MeshBuilder.CreateTorus(
        `petAccessory-${item.id}`,
        {
          diameter: fit.collarDiameter,
          thickness: 0.025,
          tessellation: 16,
        },
        scene,
      )
      mesh.position = new Vector3(0, fit.neckY, fit.neckZ)
    } else if (item.shape === 'cape') {
      mesh = MeshBuilder.CreateBox(
        `petAccessory-${item.id}`,
        {
          width: fit.capeWidth,
          height: 0.025,
          depth: fit.capeDepth,
        },
        scene,
      )
      mesh.position = new Vector3(0, fit.capeY, fit.capeZ)
      mesh.rotation.x = -0.14
    } else {
      // Visor de heroi em vez de uma mascara fechada: deixa focinho/olhos legiveis e evita uma
      // silhueta assustadora para criancas, com apenas uma caixa achatada por pet.
      mesh = MeshBuilder.CreateBox(
        `petAccessory-${item.id}`,
        {
          width: fit.maskWidth,
          height: fit.maskHeight,
          depth: 0.025,
        },
        scene,
      )
      mesh.position = new Vector3(0, fit.faceY, fit.faceZ)
    }

    mesh.material = material
    mesh.parent = root
    shadowGenerator.addShadowCaster(mesh)
  }

  for (const id of accessoryIds) {
    const item = findPetAccessoryById(id)
    if (item) addAccessory(item)
  }
}

// Todos os construtores de pet registram cada malha filha no `ShadowGenerator` via
// `addShadowCaster` — `root.dispose(false, true)` sozinho libera material/textura recursivamente,
// mas NUNCA remove essas malhas da `renderList` do gerador (mesmo achado do lab-176 pro boneco,
// `disposeStudentFigure`). Quem reconstrói o pet repetidamente no mesmo `ShadowGenerator` (o
// preview da lojinha, que troca de pet a cada seleção) precisa chamar isto ANTES de descartar a
// raiz antiga, senão a render list acumula referências mortas a cada troca.
export function disposePetFigure(root: TransformNode, shadowGenerator: ShadowGenerator): void {
  for (const mesh of root.getChildMeshes()) {
    shadowGenerator.removeShadowCaster(mesh)
  }
  root.dispose(false, true)
}
