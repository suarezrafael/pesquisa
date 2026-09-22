import { describe, expect, it } from 'vitest'
import {
  SPHERICAL_CULL_HIDE_DEPTH,
  SPHERICAL_CULL_SHOW_DEPTH,
  shouldEnableSphericalObject,
  sphereOcclusionDepth,
} from './sphericalCulling'

describe('sphereOcclusionDepth (lab-221)', () => {
  it('distingue um alvo na face proxima de outro atras do planeta', () => {
    const camera = { x: 0, y: 0, z: 20 }
    expect(sphereOcclusionDepth(camera, { x: 0, y: 0, z: 15 }, 13)).toBe(Number.NEGATIVE_INFINITY)
    expect(sphereOcclusionDepth(camera, { x: 0, y: 0, z: -15 }, 13)).toBeCloseTo(13)
  })

  it('considera a altura do ponto visivel fornecido pelo chamador', () => {
    const camera = { x: 0, y: 17.5, z: -9 }
    const surfaceProbe = { x: 0, y: -13, z: 0 }
    const raisedProbe = { x: 0, y: -15.2, z: 0 }
    expect(sphereOcclusionDepth(camera, raisedProbe, 13)).toBeLessThan(
      sphereOcclusionDepth(camera, surfaceProbe, 13),
    )
  })
})

describe('shouldEnableSphericalObject (lab-221)', () => {
  it('oculta o grupo quando o mundo nao esta ativo', () => {
    expect(shouldEnableSphericalObject(false, true, 1)).toBe(false)
  })

  it('mantem sempre visivel o hemisferio proximo', () => {
    expect(shouldEnableSphericalObject(true, true, -1)).toBe(true)
    expect(shouldEnableSphericalObject(true, false, -1)).toBe(true)
  })

  it('oculta o hemisferio distante', () => {
    expect(shouldEnableSphericalObject(true, true, 10)).toBe(false)
    expect(shouldEnableSphericalObject(true, false, 10)).toBe(false)
  })

  it('preserva o estado dentro da faixa de histerese', () => {
    const insideHysteresis = (SPHERICAL_CULL_HIDE_DEPTH + SPHERICAL_CULL_SHOW_DEPTH) / 2
    expect(shouldEnableSphericalObject(true, true, insideHysteresis)).toBe(true)
    expect(shouldEnableSphericalObject(true, false, insideHysteresis)).toBe(false)
  })

  it('falha aberto se a direcao do observador for invalida', () => {
    expect(shouldEnableSphericalObject(true, false, Number.NaN)).toBe(true)
  })
})
