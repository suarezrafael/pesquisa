import type { QuestChoice } from '../types'

export function shuffleQuestChoices(
  choices: readonly QuestChoice[],
  random: () => number = Math.random,
): QuestChoice[] {
  const ordered = [...choices]
  for (let i = ordered.length - 1; i > 0; i--) {
    const j = Math.min(Math.max(Math.floor(random() * (i + 1)), 0), i)
    const choice = ordered[i]
    ordered[i] = ordered[j]
    ordered[j] = choice
  }
  return ordered
}
