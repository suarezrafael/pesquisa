import { distanceSquared, type Point3Like } from './spatialPerformance'

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
interface PlanetSchoolMarker {
  planetId: string
  quest: { id: string }
  worldPos: Point3Like
}

export function selectPlanetSchoolQuest(
  markers: readonly PlanetSchoolMarker[],
  avatarPosition: Point3Like,
  currentPlanetId: string | null,
  completedQuestIds: readonly string[],
  triggered: Set<string>,
): string | null {
  let selectedQuestId: string | null = null
  for (const marker of markers) {
    const triggerId = `planet-school-${marker.quest.id}`
    const eligible = marker.planetId === currentPlanetId && !completedQuestIds.includes(marker.quest.id)
    const action = planetSchoolTriggerAction(
      eligible ? distanceSquared(avatarPosition, marker.worldPos) : 0,
      eligible,
      triggered.has(triggerId),
    )
    if (action === 'reset') triggered.delete(triggerId)
    else if (action === 'open' && selectedQuestId === null) selectedQuestId = marker.quest.id
  }
  // Finish every marker's cleanup before opening a modal that suspends proximity updates.
  if (selectedQuestId !== null) triggered.add(`planet-school-${selectedQuestId}`)
  return selectedQuestId
}
