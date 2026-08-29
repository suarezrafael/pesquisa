import { useState } from 'react'
import type { Progress, Quest } from '../types'
import { trackQuestCompleted } from '../productAnalytics'
import { loadProgress, saveProgress } from './storage'
import {
  applyCoinCollected,
  applyQuestCompletion,
  type CompletionResult,
  unlockAvatar as applyAvatarUnlock,
  unlockHat as applyHatUnlock,
  unlockShirtColor as applyShirtColorUnlock,
  unlockPantsColor as applyPantsColorUnlock,
  unlockShoeColor as applyShoeColorUnlock,
  unlockBackpackColor as applyBackpackColorUnlock,
  unlockHairShape as applyHairShapeUnlock,
  unlockGlasses as applyGlassesUnlock,
  unlockFurniture as applyFurnitureUnlock,
  unlockMarsReward as applyMarsRewardUnlock,
} from './progression'

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(() => loadProgress())

  function completeQuest(quest: Quest): CompletionResult {
    // lab-99: `applyQuestCompletion` é idempotente (responder uma missão já concluída de novo não
    // premia XP/moeda de novo, ver `progression.ts`) — só dispara o evento de analytics numa
    // conclusão GENUÍNA (o array de concluídas cresceu), senão "quests concluídas por
    // dispositivo" ficaria inflado por reprises da mesma missão.
    const wasAlreadyCompleted = progress.completedQuestIds.includes(quest.id)
    const result = applyQuestCompletion(progress, quest)
    setProgress(result.progress)
    saveProgress(result.progress)
    if (!wasAlreadyCompleted) trackQuestCompleted(quest.id)
    return result
  }

  function collectCoin(): void {
    setProgress((prev) => {
      const next = applyCoinCollected(prev)
      saveProgress(next)
      return next
    })
  }

  function unlockAvatar(avatarId: string): void {
    setProgress((prev) => {
      const next = applyAvatarUnlock(prev, avatarId)
      saveProgress(next)
      return next
    })
  }

  function unlockHat(hatId: string): void {
    setProgress((prev) => {
      const next = applyHatUnlock(prev, hatId)
      saveProgress(next)
      return next
    })
  }

  // Personalização de cores/cabelo (lab-73) — mesmo formato do `unlockHat` acima, um por eixo.
  function unlockShirtColor(id: string): void {
    setProgress((prev) => {
      const next = applyShirtColorUnlock(prev, id)
      saveProgress(next)
      return next
    })
  }

  function unlockPantsColor(id: string): void {
    setProgress((prev) => {
      const next = applyPantsColorUnlock(prev, id)
      saveProgress(next)
      return next
    })
  }

  function unlockShoeColor(id: string): void {
    setProgress((prev) => {
      const next = applyShoeColorUnlock(prev, id)
      saveProgress(next)
      return next
    })
  }

  function unlockBackpackColor(id: string): void {
    setProgress((prev) => {
      const next = applyBackpackColorUnlock(prev, id)
      saveProgress(next)
      return next
    })
  }

  function unlockHairShape(id: string): void {
    setProgress((prev) => {
      const next = applyHairShapeUnlock(prev, id)
      saveProgress(next)
      return next
    })
  }

  function unlockGlasses(id: string): void {
    setProgress((prev) => {
      const next = applyGlassesUnlock(prev, id)
      saveProgress(next)
      return next
    })
  }

  // Mobília de Minha Casa (lab-106) — mesmo formato do `unlockGlasses` acima.
  function unlockFurniture(id: string): void {
    setProgress((prev) => {
      const next = applyFurnitureUnlock(prev, id)
      saveProgress(next)
      return next
    })
  }

  // Brinde de Marte (lab-94) — diferente dos outros `unlockXxx`, devolve se realmente concedeu
  // algo novo (o chamador em `App.tsx` usa isso pra decidir se mostra o aviso de novo item).
  function unlockMarsReward(): boolean {
    const result = applyMarsRewardUnlock(progress)
    if (result.granted) {
      setProgress(result.progress)
      saveProgress(result.progress)
    }
    return result.granted
  }

  return {
    progress,
    completeQuest,
    collectCoin,
    unlockAvatar,
    unlockHat,
    unlockShirtColor,
    unlockPantsColor,
    unlockShoeColor,
    unlockBackpackColor,
    unlockHairShape,
    unlockGlasses,
    unlockFurniture,
    unlockMarsReward,
  }
}
