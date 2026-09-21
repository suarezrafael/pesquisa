import { describe, expect, it } from 'vitest'
import { distanceSquared, isWithinDistance } from './spatialPerformance'

describe('spatial performance helpers', () => {
  it('preserva o limite estrito das verificacoes de proximidade', () => {
    const origin = { x: 0, y: 0, z: 0 }

    expect(isWithinDistance(origin, { x: 2.99, y: 0, z: 0 }, 3)).toBe(true)
    expect(isWithinDistance(origin, { x: 3, y: 0, z: 0 }, 3)).toBe(false)
  })

  it('calcula distancia ao quadrado sem raiz', () => {
    expect(distanceSquared({ x: 1, y: 2, z: 3 }, { x: 4, y: 6, z: 3 })).toBe(25)
  })
})
