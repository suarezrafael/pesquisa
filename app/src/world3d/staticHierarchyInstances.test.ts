import { InstancedMesh, MeshBuilder, NullEngine, Quaternion, Scene, TransformNode, Vector3 } from '@babylonjs/core'
import { afterEach, describe, expect, it } from 'vitest'
import { instantiateStaticHierarchy } from './staticHierarchyInstances'

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
})
