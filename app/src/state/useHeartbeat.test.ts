import { describe, expect, it } from 'vitest'
import type { Profile } from '../types'
import { effectiveLookHeartbeatBody } from './useHeartbeat'

const profile: Profile = {
  name: 'Jogadora',
  avatarEmoji: '🦊',
  createdAt: '2026-09-24T00:00:00.000Z',
  nicknameChangedAt: null,
  equippedHatId: null,
  equippedShirtColorId: 'camiseta_azul',
  equippedPantsColorId: null,
  equippedShoeColorId: null,
  equippedBackpackColorId: null,
  equippedHairShapeId: null,
  equippedGlassesId: null,
}

describe('effectiveLookHeartbeatBody', () => {
  it('sends the avatar only with proof of profile ownership', () => {
    expect(effectiveLookHeartbeatBody('player-id', profile, 'player-secret')).toEqual({
      playerId: 'player-id',
      avatarEmoji: '🦊',
      secret: 'player-secret',
      equippedLook: {
        equippedHatId: null,
        equippedShirtColorId: 'camiseta_azul',
        equippedPantsColorId: null,
        equippedShoeColorId: null,
        equippedBackpackColorId: null,
        equippedHairShapeId: null,
        equippedGlassesId: null,
      },
    })
  })

  it('keeps legacy heartbeats compatible without a saved secret', () => {
    const body = effectiveLookHeartbeatBody('player-id', profile, null)
    expect(body).not.toHaveProperty('avatarEmoji')
    expect(body).not.toHaveProperty('secret')
    expect(body.equippedLook).toHaveProperty('equippedShirtColorId', 'camiseta_azul')
  })
})
