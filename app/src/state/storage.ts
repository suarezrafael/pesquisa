import type { Profile, Progress } from '../types'
import { DEFAULT_UNLOCKED_AVATAR_IDS } from '../data/avatars'
import { DEFAULT_UNLOCKED_HAT_IDS } from '../data/hats'

const PROFILE_KEY = 'jogo-educativo:profile'
const PROGRESS_KEY = 'jogo-educativo:progress'
const TUTORIAL_SEEN_KEY = 'jogo-educativo:tutorialSeen'

export const emptyProgress: Progress = {
  completedQuestIds: [],
  xp: 0,
  coins: 0,
  badges: [],
  unlockedAvatarIds: DEFAULT_UNLOCKED_AVATAR_IDS,
  unlockedHatIds: DEFAULT_UNLOCKED_HAT_IDS,
}

export function loadProfile(): Profile | null {
  const raw = localStorage.getItem(PROFILE_KEY)
  if (!raw) return null
  try {
    // `equippedHatId: null` como default cobre perfis salvos antes do lab-24 (chapéus), que não
    // têm esse campo gravado ainda — sem isso, `profile.equippedHatId` ficaria `undefined` em
    // vez de `null` pra quem já tinha perfil salvo, um valor fora do tipo declarado. `Partial`
    // no cast (não `Profile` direto) porque dado salvo antes deste lab pode legitimamente não
    // ter o campo — sem isso o TS assume que o spread sempre sobrescreve o default.
    return { equippedHatId: null, ...(JSON.parse(raw) as Partial<Profile>) } as Profile
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
