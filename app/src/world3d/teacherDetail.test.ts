import { MeshBuilder, NullEngine, Scene, TransformNode, UniversalCamera, Vector3 } from '@babylonjs/core'
import { describe, expect, it } from 'vitest'
import { shouldUseDetailedTeacher } from './teacherDetail'

describe('teacher detail distance', () => {
  it('keeps the full figure nearby and simplifies it far away', () => {
    expect(shouldUseDetailedTeacher(24 * 24, false)).toBe(true)
    expect(shouldUseDetailedTeacher(31 * 31, true)).toBe(false)
  })

  it('uses hysteresis to prevent rapid switching near the threshold', () => {
    expect(shouldUseDetailedTeacher(27 * 27, true)).toBe(true)
    expect(shouldUseDetailedTeacher(27 * 27, false)).toBe(false)
    expect(shouldUseDetailedTeacher(25 * 25, false)).toBe(false)
    expect(shouldUseDetailedTeacher(30 * 30, true)).toBe(false)
  })

  it('keeps a distant instance visible when the first school uses its detailed model', () => {
    const engine = new NullEngine()
    const scene = new Scene(engine)
    const camera = new UniversalCamera('camera', new Vector3(0, 2, -5), scene)
    camera.setTarget(Vector3.Zero())
    scene.activeCamera = camera
    const firstSchool = new TransformNode('first', scene)
    const distantSchool = new TransformNode('distant', scene)
    const lodSource = MeshBuilder.CreateSphere('teacher-lod-source', {}, scene)
    lodSource.parent = firstSchool
    const lodInstance = lodSource.createInstance('teacher-lod-instance')
    lodInstance.parent = distantSchool

    lodSource.setEnabled(false)
    expect(lodInstance.isEnabled()).toBe(true)
    scene.render()
    const activeMeshes = scene.getActiveMeshes()
    expect(activeMeshes.data.slice(0, activeMeshes.length)).toContain(lodInstance)
    lodSource.setEnabled(true)
    expect(lodInstance.isEnabled()).toBe(true)

    scene.dispose()
    engine.dispose()
  })
})
