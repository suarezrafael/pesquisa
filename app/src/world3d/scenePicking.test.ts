import { describe, expect, it, vi } from 'vitest'
import { FreeCamera, MeshBuilder, NullEngine, Scene, Vector3 } from '@babylonjs/core'

describe('Babylon picking coordinates', () => {
  it.each([1, 1.15, 1.4, 1.6])('accepts CSS coordinates at hardware scaling %s', (scale) => {
    const engine = new NullEngine({
      renderWidth: 1000,
      renderHeight: 500,
      textureSize: 512,
      deterministicLockstep: false,
      lockstepMaxSteps: 4,
    })
    // NullEngine has no canvas resize; model a real engine's scaled backing buffer.
    vi.spyOn(engine, 'getHardwareScalingLevel').mockReturnValue(scale)
    vi.spyOn(engine, 'getRenderWidth').mockReturnValue(Math.round(1000 / scale))
    vi.spyOn(engine, 'getRenderHeight').mockReturnValue(Math.round(500 / scale))
    const scene = new Scene(engine)
    const camera = new FreeCamera('camera', new Vector3(0, 0, -10), scene)
    camera.setTarget(Vector3.Zero())
    const target = MeshBuilder.CreateBox('answer', { size: 1 }, scene)
    target.computeWorldMatrix(true)

    try {
      expect(scene.pick(500, 250, (mesh) => mesh === target)?.pickedMesh).toBe(target)
      if (scale > 1) {
        // Pre-scaling duplicates Babylon's conversion and misses the center target.
        expect(scene.pick(500 / scale, 250 / scale, (mesh) => mesh === target)?.hit).toBe(false)
      }
    } finally {
      scene.dispose()
      engine.dispose()
      vi.restoreAllMocks()
    }
  })
})
