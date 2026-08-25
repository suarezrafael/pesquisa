import type { Progress, Quest } from '../types'
import { quests } from '../data/quests'
import { findAvatarById } from '../data/avatars'
import { findHatById } from '../data/hats'
import {
  BACKPACK_COLOR_CATALOG,
  HAIR_SHAPE_CATALOG,
  PANTS_COLOR_CATALOG,
  SHIRT_COLOR_CATALOG,
  SHOE_COLOR_CATALOG,
} from '../data/customization'
import { GLASSES_CATALOG } from '../data/glasses'
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
// não existir, já estiver desbloqueado, faltar moeda, ou for exclusivo de assinante — a UI decide
// o que mostrar em cada caso, mas a regra de "pode comprar?" mora aqui, não no componente.
// Itens `subscriptionOnly` (Fase E, ver docs/plano-comercial-backend.md) NUNCA entram aqui: o
// acesso deles é dinâmico via `entitlementActive` (useEntitlement), não uma compra permanente —
// sem esse bloqueio, qualquer chamada a esta função pra um id exclusivo (mesmo por engano, já que
// o custo desses itens é sempre 0) liberaria o item de graça pra sempre.
export function unlockAvatar(progress: Progress, avatarId: string): Progress {
  const avatar = findAvatarById(avatarId)
  if (!avatar || avatar.subscriptionOnly) return progress
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
  if (!hat || hat.subscriptionOnly) return progress
  if (progress.unlockedHatIds.includes(hatId)) return progress
  if (progress.coins < hat.cost) return progress
  return {
    ...progress,
    coins: progress.coins - hat.cost,
    unlockedHatIds: [...progress.unlockedHatIds, hatId],
  }
}

// Personalização de cores/cabelo (lab-73) — mesma regra de compra de `unlockAvatar`/`unlockHat`,
// só extraída num helper porque agora são CINCO catálogos iguais (camisa/calça/sapato/mochila/
// cabelo) em vez de repetir a mesma checagem cinco vezes.
function unlockGeneric<T extends { id: string; cost: number; subscriptionOnly?: boolean }>(
  coins: number,
  unlockedIds: string[],
  catalog: T[],
  id: string,
): { coins: number; unlockedIds: string[] } | null {
  const item = catalog.find((c) => c.id === id)
  if (!item || item.subscriptionOnly) return null
  if (unlockedIds.includes(id)) return null
  if (coins < item.cost) return null
  return { coins: coins - item.cost, unlockedIds: [...unlockedIds, id] }
}

export function unlockShirtColor(progress: Progress, id: string): Progress {
  const result = unlockGeneric(progress.coins, progress.unlockedShirtColorIds, SHIRT_COLOR_CATALOG, id)
  if (!result) return progress
  return { ...progress, coins: result.coins, unlockedShirtColorIds: result.unlockedIds }
}

export function unlockPantsColor(progress: Progress, id: string): Progress {
  const result = unlockGeneric(progress.coins, progress.unlockedPantsColorIds, PANTS_COLOR_CATALOG, id)
  if (!result) return progress
  return { ...progress, coins: result.coins, unlockedPantsColorIds: result.unlockedIds }
}

export function unlockShoeColor(progress: Progress, id: string): Progress {
  const result = unlockGeneric(progress.coins, progress.unlockedShoeColorIds, SHOE_COLOR_CATALOG, id)
  if (!result) return progress
  return { ...progress, coins: result.coins, unlockedShoeColorIds: result.unlockedIds }
}

export function unlockBackpackColor(progress: Progress, id: string): Progress {
  const result = unlockGeneric(progress.coins, progress.unlockedBackpackColorIds, BACKPACK_COLOR_CATALOG, id)
  if (!result) return progress
  return { ...progress, coins: result.coins, unlockedBackpackColorIds: result.unlockedIds }
}

export function unlockHairShape(progress: Progress, id: string): Progress {
  const result = unlockGeneric(progress.coins, progress.unlockedHairShapeIds, HAIR_SHAPE_CATALOG, id)
  if (!result) return progress
  return { ...progress, coins: result.coins, unlockedHairShapeIds: result.unlockedIds }
}

// Óculos (lab-92) — mesma regra de compra do resto, via `unlockGeneric` (GLASSES_CATALOG já tem o
// formato `{id, cost, subscriptionOnly?}` que a função espera).
export function unlockGlasses(progress: Progress, id: string): Progress {
  const result = unlockGeneric(progress.coins, progress.unlockedGlassesIds, GLASSES_CATALOG, id)
  if (!result) return progress
  return { ...progress, coins: result.coins, unlockedGlassesIds: result.unlockedIds }
}
