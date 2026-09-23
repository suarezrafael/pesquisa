import {
  InstancedMesh,
  MeshBuilder,
  NullEngine,
  Quaternion,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
} from '@babylonjs/core'
import { afterEach, describe, expect, it } from 'vitest'
import { freezeStaticHierarchy, instantiateStaticHierarchy } from './staticHierarchyInstances'

describe('instantiateStaticHierarchy (lab-220)', () => {
  let engine: NullEngine | null = null

  afterEach(() => {
    engine?.dispose()
    engine = null
  })

  it('preserva a hierarquia e compartilha a geometria das folhas', () => {
    engine = new NullEngine()
    const scene = new Scene(engine)
    const sourceRoot = new TransformNode('template-root', scene)
    // Os templates Nature Kit sao normalizados para determinante positivo no carregamento: os
    // clones historicos ja substituiam a escala glTF por uma escala uniforme positiva.
    sourceRoot.scaling.setAll(1)
    sourceRoot.rotationQuaternion = Quaternion.RotationAxis(Vector3.Up(), Math.PI)

    const pivot = new TransformNode('template-pivot', scene)
    pivot.parent = sourceRoot
    pivot.position.set(1, 2, 3)

    const sourceMesh = MeshBuilder.CreateBox('template-leaf', { size: 1 }, scene)
    sourceMesh.parent = pivot
    sourceMesh.position.set(0.25, 0.5, 0.75)
    sourceRoot.setEnabled(false)

    const createdLeaves: InstancedMesh[] = []
    const hierarchy = instantiateStaticHierarchy(sourceRoot, 'prop-1', (instance) => {
      createdLeaves.push(instance)
    })

    expect(hierarchy).not.toBeNull()
    expect(hierarchy?.name).toBe('prop-1')
    expect(hierarchy?.isEnabled()).toBe(true)
    expect(hierarchy?.scaling.asArray()).toEqual(sourceRoot.scaling.asArray())
    expect(hierarchy?.rotationQuaternion?.asArray()).toEqual(sourceRoot.rotationQuaternion.asArray())

    const clonedPivot = hierarchy?.getChildTransformNodes(true)[0]
    expect(clonedPivot?.position.asArray()).toEqual(pivot.position.asArray())

    expect(createdLeaves).toHaveLength(1)
    expect(createdLeaves[0]).toBeInstanceOf(InstancedMesh)
    expect(createdLeaves[0].sourceMesh).toBe(sourceMesh)
    expect(createdLeaves[0].geometry).toBe(sourceMesh.geometry)
    expect(createdLeaves[0].getVerticesData('position')).toEqual(sourceMesh.getVerticesData('position'))
    expect(createdLeaves[0].position.asArray()).toEqual(sourceMesh.position.asArray())
    expect(createdLeaves[0].name).toBe('prop-1/template-leaf')

    hierarchy?.scaling.setAll(2)
    hierarchy?.computeWorldMatrix(true)
    createdLeaves[0].computeWorldMatrix(true)
    sourceMesh.computeWorldMatrix(true)
    expect(Math.sign(createdLeaves[0].getWorldMatrix().determinant())).toBe(
      Math.sign(sourceMesh.getWorldMatrix().determinant()),
    )
  })

  it('mantem instancias independentes quando a hierarquia fonte fica sob um pai desabilitado', () => {
    engine = new NullEngine()
    const scene = new Scene(engine)
    const sourceParent = new TransformNode('source-parent', scene)
    const sourceRoot = new TransformNode('teacher-root', scene)
    sourceRoot.parent = sourceParent

    const limbPivot = new TransformNode('arm-pivot', scene)
    limbPivot.parent = sourceRoot
    limbPivot.rotation.z = 0.25
    const sourceMesh = MeshBuilder.CreateCapsule('arm', { height: 0.5, radius: 0.08 }, scene)
    sourceMesh.parent = limbPivot
    sourceMesh.material = new StandardMaterial('teacher-material', scene)

    const firstLeaves: InstancedMesh[] = []
    const secondLeaves: InstancedMesh[] = []
    const first = instantiateStaticHierarchy(sourceRoot, 'teacher-q02', (mesh) => firstLeaves.push(mesh))
    const second = instantiateStaticHierarchy(sourceRoot, 'teacher-q03', (mesh) => secondLeaves.push(mesh))
    const firstSchool = new TransformNode('school-q02', scene)
    const secondSchool = new TransformNode('school-q03', scene)
    first!.parent = firstSchool
    second!.parent = secondSchool

    sourceParent.setEnabled(false)
    firstSchool.setEnabled(false)

    expect(sourceRoot.isEnabled()).toBe(false)
    expect(first?.isEnabled()).toBe(false)
    expect(second?.isEnabled()).toBe(true)
    expect(firstLeaves).toHaveLength(1)
    expect(secondLeaves).toHaveLength(1)
    expect(firstLeaves[0].sourceMesh).toBe(sourceMesh)
    expect(secondLeaves[0].sourceMesh).toBe(sourceMesh)
    expect(firstLeaves[0].geometry).toBe(secondLeaves[0].geometry)
    expect(firstLeaves[0].material).toBe(sourceMesh.material)
    expect(secondLeaves[0].material).toBe(sourceMesh.material)
    expect(second?.getChildTransformNodes(true)[0]?.rotation.z).toBe(limbPivot.rotation.z)
  })

  it('instancia as tres folhas da estrutura e permite identificar a parede pelo mesh fonte', () => {
    engine = new NullEngine()
    const scene = new Scene(engine)
    const sourceRoot = new TransformNode('school-structure-q01', scene)
    const material = new StandardMaterial('school-material', scene)
    const walls = MeshBuilder.CreateBox('walls-q01', { width: 1.6, height: 1.1, depth: 1.4 }, scene)
    const foundation = MeshBuilder.CreateBox(
      'foundation-q01',
      { width: 1.72, height: 1.6, depth: 1.52 },
      scene,
    )
    const door = MeshBuilder.CreateBox('door-q01', { width: 0.42, height: 0.62, depth: 0.06 }, scene)

    for (const mesh of [walls, foundation, door]) {
      mesh.parent = sourceRoot
      mesh.material = material
    }

    const createdLeaves: InstancedMesh[] = []
    const hierarchy = instantiateStaticHierarchy(sourceRoot, 'school-structure-q02', (instance) => {
      createdLeaves.push(instance)
    })
    const wallInstance = createdLeaves.find((instance) => instance.sourceMesh === walls)

    expect(hierarchy?.getChildMeshes(false)).toHaveLength(3)
    expect(createdLeaves).toHaveLength(3)
    expect(wallInstance).toBeInstanceOf(InstancedMesh)
    expect(wallInstance?.geometry).toBe(walls.geometry)
    expect(createdLeaves.map((instance) => instance.material)).toEqual([material, material, material])
    expect(createdLeaves.map((instance) => instance.sourceMesh)).toEqual([walls, foundation, door])
  })

  it('congela fonte e instancias depois da posicao final sem bloquear visibilidade ou material', () => {
    engine = new NullEngine()
    const scene = new Scene(engine)
    const firstSchool = new TransformNode('school-q01', scene)
    firstSchool.position.set(2, 3, 4)
    const sourceRoot = new TransformNode('teacher-q01', scene)
    sourceRoot.parent = firstSchool
    const pivot = new TransformNode('teacher-pivot', scene)
    pivot.parent = sourceRoot
    pivot.position.y = 1
    const sourceMesh = MeshBuilder.CreateBox('teacher-body', { size: 0.5 }, scene)
    sourceMesh.parent = pivot
    const material = new StandardMaterial('teacher-material', scene)
    sourceMesh.material = material

    const secondSchool = new TransformNode('school-q02', scene)
    secondSchool.position.set(8, 3, 4)
    const copy = instantiateStaticHierarchy(sourceRoot, 'teacher-q02')!
    copy.parent = secondSchool
    const copiedMesh = copy.getChildMeshes(false)[0]

    const firstCount = freezeStaticHierarchy(firstSchool)
    const secondCount = freezeStaticHierarchy(secondSchool)
    expect(firstCount).toBe(firstSchool.getChildTransformNodes(false).length + 1)
    expect(secondCount).toBe(secondSchool.getChildTransformNodes(false).length + 1)
    expect([firstSchool, ...firstSchool.getChildTransformNodes(false)].every((node) => node.isWorldMatrixFrozen)).toBe(true)
    expect([secondSchool, ...secondSchool.getChildTransformNodes(false)].every((node) => node.isWorldMatrixFrozen)).toBe(true)
    expect(sourceMesh.getAbsolutePosition().x).toBeCloseTo(2)
    expect(copiedMesh.getAbsolutePosition().x).toBeCloseTo(8)

    secondSchool.setEnabled(false)
    expect(copiedMesh.isEnabled()).toBe(false)
    secondSchool.setEnabled(true)
    expect(copiedMesh.isEnabled()).toBe(true)
    material.diffuseColor.set(0.2, 0.6, 0.8)
    expect(copiedMesh.material).toBe(material)
    expect(material.diffuseColor.asArray()).toEqual([0.2, 0.6, 0.8])
  })
})
