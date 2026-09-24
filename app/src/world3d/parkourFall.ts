export const PARKOUR_FALL_MARGIN = 1.3
export const PARKOUR_ESCAPE_RADIUS = 2.5

export type ParkourFallAction = 'continue' | 'respawn' | 'exit'

export function parkourFallAction(heightVsCheckpoint: number, lateralDistanceSquared: number): ParkourFallAction {
  if (heightVsCheckpoint >= -PARKOUR_FALL_MARGIN) return 'continue'
  return lateralDistanceSquared >= PARKOUR_ESCAPE_RADIUS ** 2 ? 'exit' : 'respawn'
}
