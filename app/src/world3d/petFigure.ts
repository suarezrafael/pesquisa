// Montagem visual dos pets adotáveis — extraído de `World3D.tsx` (onde as duas funções já viviam
// como funções puras e autocontidas, sem nenhuma dependência de estado do componente) pro mesmo
// motivo de `studentFigure.ts` ter sido extraído em seu tempo: permitir um preview 3D isolado
// (`PetPreview3D.tsx`) reaproveitar a MESMA lógica de montagem usada pelo pet de verdade no mundo,
// em vez de duplicar geometria/material. `World3D.tsx` importa daqui pro pet no jogo principal — o
// comportamento lá não muda, só o arquivo onde a função mora.
import { Color3, Mesh, MeshBuilder, PBRMaterial, type Scene, type ShadowGenerator, TransformNode, Vector3 } from '@babylonjs/core'

// Gatos (pedido do usuário: "mais gato e alguns gatos ficam ensima de tudo") — a maioria vaga
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
