import { describe, expect, it } from 'vitest'
import { distanceSquared } from './spatialPerformance'
import { nearestPlanetSchoolQuest, planetSchoolTriggerAction, selectPlanetSchoolQuest, PLANET_SCHOOL_RESET_DISTANCE, PLANET_SCHOOL_TRIGGER_DISTANCE } from './planetSchoolTrigger'

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

  it('selects only one quest while still cleaning up markers later in the list', () => {
    const origin = { x: 0, y: 0, z: 0 }
    const triggered = new Set(['planet-school-far', 'planet-school-other', 'planet-school-completed'])
    const markers = [
      { planetId: 'venus', quest: { id: 'first' }, worldPos: origin },
      { planetId: 'venus', quest: { id: 'second' }, worldPos: origin },
      { planetId: 'venus', quest: { id: 'far' }, worldPos: { x: 4, y: 0, z: 0 } },
      { planetId: 'jupiter', quest: { id: 'other' }, worldPos: origin },
      { planetId: 'venus', quest: { id: 'completed' }, worldPos: origin },
    ]
    expect(selectPlanetSchoolQuest(markers, origin, 'venus', ['completed'], triggered)).toBe('first')
    expect([...triggered]).toEqual(['planet-school-first'])
  })

  it('keeps the selected quest latched until departure and allows a return', () => {
    const origin = { x: 0, y: 0, z: 0 }
    const markers = [{ planetId: 'venus', quest: { id: 'quiz' }, worldPos: origin }]
    const triggered = new Set<string>()
    expect(selectPlanetSchoolQuest(markers, origin, 'venus', [], triggered)).toBe('quiz')
    expect(selectPlanetSchoolQuest(markers, origin, 'venus', [], triggered)).toBeNull()
    expect(selectPlanetSchoolQuest(markers, { x: 4, y: 0, z: 0 }, 'venus', [], triggered)).toBeNull()
    expect(triggered.size).toBe(0)
    expect(selectPlanetSchoolQuest(markers, origin, 'venus', [], triggered)).toBe('quiz')
    expect(selectPlanetSchoolQuest(markers, origin, 'venus', ['quiz'], triggered)).toBeNull()
    expect(triggered.size).toBe(0)
  })
})

describe('explicit planet school interaction', () => {
  const origin = { x: 0, y: 0, z: 0 }
  const markers = [
    { planetId: 'venus', quest: { id: 'farther' }, worldPos: { x: 1.5, y: 0, z: 0 } },
    { planetId: 'venus', quest: { id: 'nearest' }, worldPos: { x: 0.85, y: 0, z: 0.4 } },
    { planetId: 'mars', quest: { id: 'other' }, worldPos: origin },
  ]

  it('selects the nearest eligible question, not the first marker', () => {
    expect(nearestPlanetSchoolQuest(markers, origin, 'venus', [])).toBe('nearest')
  })

  it('skips completed questions and other planets', () => {
    expect(nearestPlanetSchoolQuest(markers, origin, 'venus', ['nearest'])).toBe('farther')
    expect(nearestPlanetSchoolQuest(markers, origin, 'venus', ['nearest', 'farther'])).toBeNull()
    expect(nearestPlanetSchoolQuest(markers, origin, 'saturno', [])).toBeNull()
    expect(nearestPlanetSchoolQuest(markers, origin, null, [])).toBeNull()
  })

  it('shares the strict automatic trigger radius including avatar height', () => {
    const single = [{ planetId: 'venus', quest: { id: 'quiz' }, worldPos: origin }]
    expect(nearestPlanetSchoolQuest(single, { x: 1.4, y: 0.6, z: 0.4 }, 'venus', [])).toBe('quiz')
    expect(nearestPlanetSchoolQuest(single, { x: PLANET_SCHOOL_TRIGGER_DISTANCE, y: 0, z: 0 }, 'venus', [])).toBeNull()
    expect(nearestPlanetSchoolQuest(single, { x: 0, y: 2, z: 0 }, 'venus', [])).toBeNull()
  })

  it('keeps the first marker on an equal distance and handles an empty registry', () => {
    const tied = [
      { planetId: 'venus', quest: { id: 'first' }, worldPos: { x: -1, y: 0, z: 0 } },
      { planetId: 'venus', quest: { id: 'second' }, worldPos: { x: 1, y: 0, z: 0 } },
    ]
    expect(nearestPlanetSchoolQuest(tied, origin, 'venus', [])).toBe('first')
    expect(nearestPlanetSchoolQuest([], origin, 'venus', [])).toBeNull()
  })

  it('allows explicit retry while keeping automatic reopening latched', () => {
    const single = [{ planetId: 'venus', quest: { id: 'quiz' }, worldPos: origin }]
    const triggered = new Set<string>()
    expect(selectPlanetSchoolQuest(single, origin, 'venus', [], triggered)).toBe('quiz')
    expect(selectPlanetSchoolQuest(single, origin, 'venus', [], triggered)).toBeNull()
    expect(nearestPlanetSchoolQuest(single, origin, 'venus', [])).toBe('quiz')
    triggered.add('planet-school-quiz')
    expect(selectPlanetSchoolQuest(single, origin, 'venus', [], triggered)).toBeNull()
    expect(nearestPlanetSchoolQuest(single, origin, 'venus', ['quiz'])).toBeNull()
    expect(selectPlanetSchoolQuest(single, origin, 'venus', ['quiz'], triggered)).toBeNull()
    expect(triggered.size).toBe(0)
  })

  it('does not mutate markers or completed progress when finding a hint', () => {
    const completed = Object.freeze(['farther'])
    const immutableMarkers = markers.map((marker) => Object.freeze(marker))
    expect(nearestPlanetSchoolQuest(immutableMarkers, origin, 'venus', completed)).toBe('nearest')
    expect(completed).toEqual(['farther'])
    expect(immutableMarkers.map((marker) => marker.quest.id)).toEqual(['farther', 'nearest', 'other'])
  })
})
