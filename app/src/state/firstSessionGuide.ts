export type FirstSessionGuideStep = 'move' | 'mission' | 'reward'

export function firstSessionGuideStep(
  startedWithoutQuests: boolean,
  hasMoved: boolean,
  completedQuestCount: number,
  dismissed: boolean,
): FirstSessionGuideStep | null {
  if (!startedWithoutQuests || dismissed || completedQuestCount > 1) return null
  if (completedQuestCount === 1) return 'reward'
  return hasMoved ? 'mission' : 'move'
}
