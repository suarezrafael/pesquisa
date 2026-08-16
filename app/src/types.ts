export type QuestType = 'logica' | 'matematica' | 'leitura'

export interface QuestChoice {
  id: string
  label: string
}

export interface Quest {
  id: string
  type: QuestType
  title: string
  passage?: string
  prompt: string
  choices: QuestChoice[]
  correctChoiceId: string
  xpReward: number
  coinReward: number
}

export interface Profile {
  name: string
  avatarEmoji: string
  createdAt: string
}

export interface Progress {
  completedQuestIds: string[]
  xp: number
  coins: number
  badges: string[]
  unlockedAvatarIds: string[]
}
