import { describe, expect, it } from 'vitest'
import { firstSessionGuideStep } from './firstSessionGuide'

describe('firstSessionGuideStep', () => {
  it('acompanha o primeiro movimento e a primeira recompensa', () => {
    expect(firstSessionGuideStep(true, false, 0, false)).toBe('move')
    expect(firstSessionGuideStep(true, true, 0, false)).toBe('mission')
    expect(firstSessionGuideStep(true, true, 1, false)).toBe('reward')
  })

  it('nao repete o roteiro para quem ja jogou ou o dispensou', () => {
    expect(firstSessionGuideStep(false, false, 0, false)).toBeNull()
    expect(firstSessionGuideStep(true, true, 2, false)).toBeNull()
    expect(firstSessionGuideStep(true, false, 0, true)).toBeNull()
  })
})
