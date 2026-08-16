import { useState } from 'react'
import type { Progress, Quest } from '../types'
import { loadProgress, saveProgress } from './storage'
import { applyQuestCompletion } from './progression'

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(() => loadProgress())

  function completeQuest(quest: Quest): string[] {
    const { progress: next, newBadges } = applyQuestCompletion(progress, quest)
    setProgress(next)
    saveProgress(next)
    return newBadges
  }

  return { progress, completeQuest }
}
