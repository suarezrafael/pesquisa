// Includes the teacher offset (0.85, 0, 0.4), avatar height and room to stand beside it.
export const PLANET_SCHOOL_TRIGGER_DISTANCE = 1.8
export const PLANET_SCHOOL_RESET_DISTANCE = 3.6

export function planetSchoolTriggerAction(
  distanceSquared: number,
  eligible: boolean,
  triggered: boolean,
): 'open' | 'reset' | null {
  if (!eligible || distanceSquared > PLANET_SCHOOL_RESET_DISTANCE ** 2) return 'reset'
  if (!triggered && distanceSquared < PLANET_SCHOOL_TRIGGER_DISTANCE ** 2) return 'open'
  return null
}
