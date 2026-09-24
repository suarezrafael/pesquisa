import { describe, expect, it } from 'vitest'
import { nearestInteraction } from './nearestInteraction'

describe('nearestInteraction', () => {
  const targets = {
    contar: { x: -2, y: 0, z: -4 },
    memoria: { x: 0, y: 0, z: -4 },
    logica: { x: 2, y: 0, z: -4 },
  }
  const ids = ['contar', 'memoria', 'logica'] as const

  it('selects memory in an overlap even when another portal comes first', () => {
    expect(nearestInteraction({ x: -0.8, y: 0.5, z: -4 }, targets, ids, 1.6)).toBe('memoria')
  })

  it('does not interact outside the radius', () => {
    expect(nearestInteraction({ x: 0, y: 0.5, z: 0 }, targets, ids, 1.6)).toBeNull()
  })
})
