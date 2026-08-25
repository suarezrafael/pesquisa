import { useState } from 'react'
import type { Progress, Quest } from '../types'
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
} from './progression'

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(() => loadProgress())

  function completeQuest(quest: Quest): CompletionResult {
    const result = applyQuestCompletion(progress, quest)
    setProgress(result.progress)
    saveProgress(result.progress)
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
  }
}
