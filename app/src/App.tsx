import { lazy, Suspense, useState } from 'react'
import { TitleScreen } from './components/TitleScreen'
import { Onboarding } from './components/Onboarding'
import { Tutorial } from './components/Tutorial'
import { QuestModal } from './components/QuestModal'
import { RewardToast } from './components/RewardToast'
import { useProfile } from './state/useProfile'
import { useProgress } from './state/useProgress'
import { quests } from './data/quests'
import { hasTutorialBeenSeen, markTutorialSeen } from './state/storage'
import type { Quest } from './types'

// O engine 3D (Babylon.js + Havok) só é baixado quando o jogador realmente
// entra no mundo — mantém as telas iniciais leves em conexão 4G.
const World3D = lazy(() => import('./world3d/World3D').then((m) => ({ default: m.World3D })))

type PreProfileScreen = 'title' | 'onboarding'

function App() {
  const { profile, createProfile } = useProfile()
  const { progress, completeQuest } = useProgress()
  const [activeQuest, setActiveQuest] = useState<Quest | null>(null)
  const [reward, setReward] = useState<{ quest: Quest; newBadges: string[] } | null>(null)
  const [preProfileScreen, setPreProfileScreen] = useState<PreProfileScreen>('title')
  const [tutorialSeen, setTutorialSeen] = useState(hasTutorialBeenSeen)
  const [showHelp, setShowHelp] = useState(false)

  if (!profile) {
    if (preProfileScreen === 'title') {
      return <TitleScreen onPlay={() => setPreProfileScreen('onboarding')} />
    }
    return <Onboarding onDone={createProfile} />
  }

  if (!tutorialSeen) {
    return (
      <Tutorial
        onDone={() => {
          markTutorialSeen()
          setTutorialSeen(true)
        }}
      />
    )
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
      <Suspense fallback={<div className="world-loading">Carregando o mundo 3D…</div>}>
        <World3D
          profile={profile}
          progress={progress}
          onSelectQuest={handleSelectQuest}
          onOpenHelp={() => setShowHelp(true)}
          suspendTriggers={activeQuest !== null || reward !== null || showHelp}
        />
      </Suspense>

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

      {showHelp && <Tutorial onDone={() => setShowHelp(false)} />}
    </>
  )
}

export default App
