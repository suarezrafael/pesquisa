import { useState } from 'react'
import type { Progress, Quest } from '../types'
import { loadProgress, saveProgress } from './storage'
import {
  applyCoinCollected,
  applyQuestCompletion,
  type CompletionResult,
  unlockAvatar as applyAvatarUnlock,
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

  return { progress, completeQuest, collectCoin, unlockAvatar }
}
