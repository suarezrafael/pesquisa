import { lazy, Suspense, useState } from 'react'
import { TitleScreen } from './components/TitleScreen'
import { Onboarding } from './components/Onboarding'
import { Tutorial } from './components/Tutorial'
import { QuestModal } from './components/QuestModal'
import { RewardToast } from './components/RewardToast'
import { QuestListOverlay } from './world3d/QuestListOverlay'
import { AvatarShop } from './world3d/AvatarShop'
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
  const { profile, createProfile, equipAvatar } = useProfile()
  const { progress, completeQuest, collectCoin, unlockAvatar } = useProgress()
  const [activeQuest, setActiveQuest] = useState<Quest | null>(null)
  const [reward, setReward] = useState<{ quest: Quest; newBadges: string[]; awardedXp: number; awardedCoins: number } | null>(
    null,
  )
  const [preProfileScreen, setPreProfileScreen] = useState<PreProfileScreen>('title')
  const [tutorialSeen, setTutorialSeen] = useState(hasTutorialBeenSeen)
  const [showHelp, setShowHelp] = useState(false)
  const [showQuestList, setShowQuestList] = useState(false)
  const [showShop, setShowShop] = useState(false)

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
    const { newBadges, awardedXp, awardedCoins } = completeQuest(activeQuest)
    setReward({ quest: activeQuest, newBadges, awardedXp, awardedCoins })
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
          onOpenQuestList={() => setShowQuestList(true)}
          onOpenShop={() => setShowShop(true)}
          onCollectCoin={collectCoin}
          suspendTriggers={activeQuest !== null || reward !== null || showHelp || showQuestList || showShop}
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
          awardedXp={reward.awardedXp}
          awardedCoins={reward.awardedCoins}
          newBadges={reward.newBadges}
          onContinue={() => setReward(null)}
        />
      )}

      {showHelp && <Tutorial onDone={() => setShowHelp(false)} />}

      {showQuestList && (
        <QuestListOverlay progress={progress} onClose={() => setShowQuestList(false)} />
      )}

      {showShop && (
        <AvatarShop
          profile={profile}
          progress={progress}
          onUnlock={unlockAvatar}
          onEquip={equipAvatar}
          onClose={() => setShowShop(false)}
        />
      )}
    </>
  )
}

export default App
