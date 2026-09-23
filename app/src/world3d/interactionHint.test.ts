import { describe, expect, it } from 'vitest'
import { interactionHint, interactionInputForDevice } from './interactionHint'

describe('interaction hint', () => {
  it('names the keyboard key on desktop', () => {
    expect(interactionHint('entrar no carro', 'keyboard')).toBe('Pressione E pra entrar no carro')
    expect(interactionHint('', 'keyboard')).toBe('Pressione E')
  })

  it('points to the on-screen E button on touch devices', () => {
    expect(interactionHint('entrar no carro', 'touch')).toBe('Toque em E pra entrar no carro')
    expect(interactionHint('', 'touch')).toBe('Toque em E')
  })

  it('prefers touch when the device has a coarse pointer or touch points', () => {
    expect(interactionInputForDevice(false, 0)).toBe('keyboard')
    expect(interactionInputForDevice(true, 0)).toBe('touch')
    expect(interactionInputForDevice(false, 5)).toBe('touch')
  })
})
