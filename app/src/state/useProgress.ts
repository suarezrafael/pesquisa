import { useState } from 'react'
import type { Progress, Quest } from '../types'
import { loadProgress, saveProgress } from './storage'
import { applyCoinCollected, applyQuestCompletion } from './progression'

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(() => loadProgress())

  function completeQuest(quest: Quest): string[] {
    const { progress: next, newBadges } = applyQuestCompletion(progress, quest)
    setProgress(next)
    saveProgress(next)
    return newBadges
  }

  function collectCoin(): void {
    setProgress((prev) => {
      const next = applyCoinCollected(prev)
      saveProgress(next)
      return next
    })
  }

  return { progress, completeQuest, collectCoin }
}
