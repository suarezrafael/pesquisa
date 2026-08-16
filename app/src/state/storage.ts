import type { Profile, Progress } from '../types'

const PROFILE_KEY = 'jogo-educativo:profile'
const PROGRESS_KEY = 'jogo-educativo:progress'
const TUTORIAL_SEEN_KEY = 'jogo-educativo:tutorialSeen'

export const emptyProgress: Progress = {
  completedQuestIds: [],
  xp: 0,
  coins: 0,
  badges: [],
}

export function loadProfile(): Profile | null {
  const raw = localStorage.getItem(PROFILE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Profile
  } catch {
    return null
  }
}

export function saveProfile(profile: Profile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

export function loadProgress(): Progress {
  const raw = localStorage.getItem(PROGRESS_KEY)
  if (!raw) return emptyProgress
  try {
    return { ...emptyProgress, ...(JSON.parse(raw) as Progress) }
  } catch {
    return emptyProgress
  }
}

export function saveProgress(progress: Progress): void {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
}

export function hasTutorialBeenSeen(): boolean {
  return localStorage.getItem(TUTORIAL_SEEN_KEY) === 'true'
}

export function markTutorialSeen(): void {
  localStorage.setItem(TUTORIAL_SEEN_KEY, 'true')
}
