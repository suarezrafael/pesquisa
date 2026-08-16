import { useState } from 'react'
import { Onboarding } from './components/Onboarding'
import { Hub } from './components/Hub'
import { QuestModal } from './components/QuestModal'
import { RewardToast } from './components/RewardToast'
import { useProfile } from './state/useProfile'
import { useProgress } from './state/useProgress'
import { quests } from './data/quests'
import type { Quest } from './types'

function App() {
  const { profile, createProfile } = useProfile()
  const { progress, completeQuest } = useProgress()
  const [activeQuest, setActiveQuest] = useState<Quest | null>(null)
  const [reward, setReward] = useState<{ quest: Quest; newBadges: string[] } | null>(null)

  if (!profile) {
    return <Onboarding onDone={createProfile} />
  }

  function handleSelectQuest(questId: string) {
    const quest = quests.find((q) => q.id === questId) ?? null
    setActiveQuest(quest)
  }

  function handleQuestCorrect() {
    if (!activeQuest) return
    const newBadges = completeQuest(activeQuest)
    setReward({ quest: activeQuest, newBadges })
    setActiveQuest(null)
  }

  return (
    <>
      <Hub profile={profile} progress={progress} onSelectQuest={handleSelectQuest} />

      {activeQuest && (
        <QuestModal
          quest={activeQuest}
          onCorrect={handleQuestCorrect}
          onClose={() => setActiveQuest(null)}
        />
      )}

      {reward && (
        <RewardToast
          quest={reward.quest}
          newBadges={reward.newBadges}
          onContinue={() => setReward(null)}
        />
      )}
    </>
  )
}

export default App
