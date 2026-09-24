import { MeshBuilder, NullEngine, Scene, TransformNode, UniversalCamera, Vector3 } from '@babylonjs/core'
import { describe, expect, it } from 'vitest'
import { shouldUseDetailedTeacher, teacherProjectedHeightScale } from './teacherDetail'

describe('teacher projected detail', () => {
  const pixelScale = teacherProjectedHeightScale(633, 0.8)

  it('keeps the full figure nearby and simplifies it far away', () => {
    expect(shouldUseDetailedTeacher(15 * 15, false, pixelScale)).toBe(true)
    expect(shouldUseDetailedTeacher(24 * 24, true, pixelScale)).toBe(false)
  })

  it('uses hysteresis to prevent rapid switching near the threshold', () => {
    expect(shouldUseDetailedTeacher(19 * 19, true, pixelScale)).toBe(true)
    expect(shouldUseDetailedTeacher(19 * 19, false, pixelScale)).toBe(false)
    expect(shouldUseDetailedTeacher(22 * 22, true, pixelScale)).toBe(false)
    expect(shouldUseDetailedTeacher(17 * 17, false, pixelScale)).toBe(true)
  })

  it('uses the visible viewport size rather than a fixed world distance', () => {
    const tallerViewportScale = teacherProjectedHeightScale(950, 0.8)
    expect(shouldUseDetailedTeacher(24 * 24, true, pixelScale)).toBe(false)
    expect(shouldUseDetailedTeacher(24 * 24, true, tallerViewportScale)).toBe(true)
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
