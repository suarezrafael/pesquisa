import { describe, expect, it } from 'vitest'
import { PARKOUR_ESCAPE_RADIUS, PARKOUR_FALL_MARGIN, parkourFallAction } from './parkourFall'

describe('parkour fall', () => {
  it('does nothing while the avatar has not fallen below the checkpoint', () => {
    expect(parkourFallAction(-PARKOUR_FALL_MARGIN, 0)).toBe('continue')
    expect(parkourFallAction(0, PARKOUR_ESCAPE_RADIUS ** 2 + 1)).toBe('continue')
  })

  it('respawns near the course but lets a player falling away from it leave', () => {
    expect(parkourFallAction(-PARKOUR_FALL_MARGIN - 0.01, 0)).toBe('respawn')
    expect(parkourFallAction(-PARKOUR_FALL_MARGIN - 0.01, PARKOUR_ESCAPE_RADIUS ** 2)).toBe('exit')
  })
})
