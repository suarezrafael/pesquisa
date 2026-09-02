// Catálogo de conquistas (lab-93) — dado de domínio puro, mesmo padrão de `avatars.ts`/`hats.ts`.
// Os 3 IDs vêm de `state/progression.ts` (`badgesEarnedAt`), fonte única de verdade — este
// catálogo só adiciona ícone/descrição pra exibição, nunca decide quando uma conquista é ganha.
import { BADGE_ALL_DONE, BADGE_FIRST_QUEST, BADGE_HALFWAY } from '../state/progression'
import { quests } from './quests'

export interface AchievementOption {
  id: string
  name: string
  emoji: string
  description: string
}

export const ACHIEVEMENT_CATALOG: AchievementOption[] = [
  {
    id: BADGE_FIRST_QUEST,
    name: BADGE_FIRST_QUEST,
    emoji: '🥇',
    description: 'Conclua sua primeira missão.',
  },
  {
    id: BADGE_HALFWAY,
    name: BADGE_HALFWAY,
    emoji: '🎖️',
    description: `Conclua ${Math.ceil(quests.length / 2)} das ${quests.length} missões do planeta.`,
  },
  {
    id: BADGE_ALL_DONE,
    name: BADGE_ALL_DONE,
    emoji: '🏆',
    description: `Conclua todas as ${quests.length} missões do planeta.`,
  },
]
