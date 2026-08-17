import type { Progress, Quest } from '../types'
import { quests } from '../data/quests'
import { findAvatarById } from '../data/avatars'
import { findHatById } from '../data/hats'
import { getCurrentWeeklyEvent, type WeeklyEvent } from '../data/weeklyEvents'

// Cada nível pede um pouco mais de XP que o anterior (progressão simples, sem gambiarra de balanceamento).
export function xpForLevel(level: number): number {
  return level * 40
}

export function getLevel(xp: number): number {
  let level = 1
  while (xp >= xpForLevel(level)) level++
  return level
}

export function xpIntoLevel(xp: number): { current: number; needed: number } {
  const level = getLevel(xp)
  const floor = level === 1 ? 0 : xpForLevel(level - 1)
  return { current: xp - floor, needed: xpForLevel(level) - floor }
}

const BADGE_FIRST_QUEST = 'Primeira Missão'
const BADGE_HALFWAY = 'Metade do Caminho'
const BADGE_ALL_DONE = 'Mestre das Missões'

export function badgesEarnedAt(completedCount: number): string[] {
  const earned: string[] = []
  if (completedCount >= 1) earned.push(BADGE_FIRST_QUEST)
  if (completedCount >= Math.ceil(quests.length / 2)) earned.push(BADGE_HALFWAY)
  if (completedCount >= quests.length) earned.push(BADGE_ALL_DONE)
  return earned
}

export interface CompletionResult {
  progress: Progress
  newBadges: string[]
  // Recompensa realmente creditada, já com o multiplicador do evento semanal (lab-22) aplicado —
  // a UI de recompensa deve mostrar isto, nunca `quest.xpReward`/`coinReward` direto, senão
  // mostraria o valor errado numa semana com bônus.
  awardedXp: number
  awardedCoins: number
}

export function applyQuestCompletion(
  progress: Progress,
  quest: Quest,
  event: WeeklyEvent = getCurrentWeeklyEvent(),
): CompletionResult {
  if (progress.completedQuestIds.includes(quest.id)) {
    return { progress, newBadges: [], awardedXp: 0, awardedCoins: 0 }
  }
  const awardedXp = Math.round(quest.xpReward * event.xpMultiplier)
  const awardedCoins = Math.round(quest.coinReward * event.coinMultiplier)
  const completedQuestIds = [...progress.completedQuestIds, quest.id]
  const badges = badgesEarnedAt(completedQuestIds.length)
  const newBadges = badges.filter((b) => !progress.badges.includes(b))
  const next: Progress = {
    ...progress,
    completedQuestIds,
    xp: progress.xp + awardedXp,
    coins: progress.coins + awardedCoins,
    badges,
  }
  return { progress: next, newBadges, awardedXp, awardedCoins }
}

export function isQuestUnlocked(progress: Progress, questIndex: number): boolean {
  if (questIndex === 0) return true
  const previousQuest = quests[questIndex - 1]
  return progress.completedQuestIds.includes(previousQuest.id)
}

// Moedinhas espalhadas pelo terreno pra explorar — bônus à parte das missões, não persistem
// individualmente (reaparecem a cada sessão), só a moeda ganha soma no total mesmo.
export function applyCoinCollected(progress: Progress): Progress {
  return { ...progress, coins: progress.coins + 1 }
}

// Troca moedas por um novo avatar na loja. Não faz nada (retorna o mesmo progress) se o avatar
// não existir, já estiver desbloqueado, ou faltar moeda — a UI decide o que mostrar em cada caso,
// mas a regra de "pode comprar?" mora aqui, não no componente.
export function unlockAvatar(progress: Progress, avatarId: string): Progress {
  const avatar = findAvatarById(avatarId)
  if (!avatar) return progress
  if (progress.unlockedAvatarIds.includes(avatarId)) return progress
  if (progress.coins < avatar.cost) return progress
  return {
    ...progress,
    coins: progress.coins - avatar.cost,
    unlockedAvatarIds: [...progress.unlockedAvatarIds, avatarId],
  }
}

// Mesma regra de compra do `unlockAvatar`, mas pro catálogo de chapéus (lab-24) — eixo de
// customização independente (trocar de criatura não desbloqueia/perde chapéu nenhum).
export function unlockHat(progress: Progress, hatId: string): Progress {
  const hat = findHatById(hatId)
  if (!hat) return progress
  if (progress.unlockedHatIds.includes(hatId)) return progress
  if (progress.coins < hat.cost) return progress
  return {
    ...progress,
    coins: progress.coins - hat.cost,
    unlockedHatIds: [...progress.unlockedHatIds, hatId],
  }
}
