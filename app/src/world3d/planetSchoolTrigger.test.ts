import { describe, expect, it } from 'vitest'
import { distanceSquared } from './spatialPerformance'
import { planetSchoolTriggerAction, PLANET_SCHOOL_RESET_DISTANCE, PLANET_SCHOOL_TRIGGER_DISTANCE } from './planetSchoolTrigger'

describe('planet school proximity', () => {
  it('opens beside the sign and beside the offset teacher, including avatar height', () => {
    const school = { x: 0, y: 0, z: 0 }
    for (const avatar of [
      { x: 0, y: 0.6, z: 0.6 },
      { x: 0.85 + 0.55, y: 0.6, z: 0.4 },
      { x: 0.85, y: 0.6, z: 0.4 + 0.55 },
    ]) {
      expect(planetSchoolTriggerAction(distanceSquared(avatar, school), true, false)).toBe('open')
    }
  })

  it('uses the same distances on an oriented planet away from the origin', () => {
    const school = { x: 400, y: -20, z: 90 }
    const avatar = { x: 400.6, y: -20.4, z: 91.4 }
    expect(planetSchoolTriggerAction(distanceSquared(avatar, school), true, false)).toBe('open')
  })

  it('does not open at a distance or reopen while the player is still nearby', () => {
    expect(planetSchoolTriggerAction(2.2 ** 2, true, false)).toBeNull()
    expect(planetSchoolTriggerAction(PLANET_SCHOOL_TRIGGER_DISTANCE ** 2, true, false)).toBeNull()
    expect(planetSchoolTriggerAction(0.6 ** 2, true, true)).toBeNull()
    expect(planetSchoolTriggerAction(3 ** 2, true, true)).toBeNull()
  })

  it('resets only beyond the exit radius so a return can open a new attempt', () => {
    expect(planetSchoolTriggerAction(PLANET_SCHOOL_RESET_DISTANCE ** 2, true, true)).toBeNull()
    expect(planetSchoolTriggerAction(3.7 ** 2, true, true)).toBe('reset')
    expect(planetSchoolTriggerAction(1 ** 2, true, false)).toBe('open')
  })

  it('never opens a completed quest or a marker on another planet', () => {
    expect(planetSchoolTriggerAction(0, false, false)).toBe('reset')
    expect(planetSchoolTriggerAction(0, false, true)).toBe('reset')
  })
})
