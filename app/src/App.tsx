import { lazy, Suspense, useEffect, useState } from 'react'
import { TitleScreen } from './components/TitleScreen'
import { Onboarding } from './components/Onboarding'
import { ProfilePicker } from './components/ProfilePicker'
import { Tutorial } from './components/Tutorial'
import { QuestModal } from './components/QuestModal'
import { RewardToast } from './components/RewardToast'
import { MarsRewardToast } from './components/MarsRewardToast'
import { PairingScreen } from './components/PairingScreen'
import { QuestListOverlay } from './world3d/QuestListOverlay'
import { AchievementsPanel } from './world3d/AchievementsPanel'
import { MyHousePanel } from './world3d/MyHousePanel'
import { AvatarShop } from './world3d/AvatarShop'
import { useProfile } from './state/useProfile'
import { useProgress } from './state/useProgress'
import { useEntitlement } from './state/useEntitlement'
import { quests } from './data/quests'
import { surpriseQuizzes } from './data/surpriseQuizzes'
import {
  clearActiveProfile,
  hasTutorialBeenSeen,
  listProfiles,
  markTutorialSeen,
  switchActiveProfile,
  touchLastPlayed,
} from './state/storage'
import type { Quest } from './types'

// O engine 3D (Babylon.js + Havok) só é baixado quando o jogador realmente
// entra no mundo — mantém as telas iniciais leves em conexão 4G.
const World3D = lazy(() => import('./world3d/World3D').then((m) => ({ default: m.World3D })))

// Portal dos responsáveis (Fase B do plano comercial) — carregado sob demanda, só quem acessa
// `/familia` baixa o cliente de autenticação; a criança nunca paga esse custo de bundle.
const FamilyPortal = lazy(() => import('./components/FamilyPortal').then((m) => ({ default: m.FamilyPortal })))

// Termos de Uso / Política de Privacidade — mesmo raciocínio de bundle sob demanda do
// FamilyPortal; a criança nunca visita essas rotas no fluxo normal de jogo.
const LegalPage = lazy(() => import('./components/LegalPage').then((m) => ({ default: m.LegalPage })))

type PreProfileScreen = 'title' | 'onboarding'

// Rota separada do jogo (Fase B do plano comercial) — decidida ANTES de qualquer hook do jogo
// rodar, por isso vira um componente à parte (`GameApp`) em vez de um `return` antecipado dentro
// dele: um `return` no meio de `GameApp`, antes dos hooks de perfil/progresso, violaria a regra
// de hooks do React (chamados incondicionalmente, sempre na mesma ordem).
function App() {
  const path = window.location.pathname
  if (path === '/familia') {
    return (
      <Suspense fallback={<div className="world-loading">Carregando…</div>}>
        <FamilyPortal />
      </Suspense>
    )
  }
  if (path === '/termos' || path === '/privacidade') {
    return (
      <Suspense fallback={<div className="world-loading">Carregando…</div>}>
        <LegalPage page={path === '/termos' ? 'termos' : 'privacidade'} />
      </Suspense>
    )
  }
  return <GameApp />
}

function GameApp() {
  const {
    profile,
    createProfile,
    equipAvatar,
    equipHat,
    equipShirtColor,
    equipPantsColor,
    equipShoeColor,
    equipBackpackColor,
    equipHairShape,
    equipGlasses,
  } = useProfile()
  const {
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
  } = useProgress()
  const [activeQuest, setActiveQuest] = useState<Quest | null>(null)
  const [activeSurpriseQuiz, setActiveSurpriseQuiz] = useState<Quest | null>(null)
  const [reward, setReward] = useState<{ quest: Quest; newBadges: string[]; awardedXp: number; awardedCoins: number } | null>(
    null,
  )
  const [preProfileScreen, setPreProfileScreen] = useState<PreProfileScreen>('title')
  const [tutorialSeen, setTutorialSeen] = useState(hasTutorialBeenSeen)
  const [showHelp, setShowHelp] = useState(false)
  const [showQuestList, setShowQuestList] = useState(false)
  const [showShop, setShowShop] = useState(false)
  const [showPairing, setShowPairing] = useState(false)
  const [showAchievements, setShowAchievements] = useState(false)
  const [showMyHouse, setShowMyHouse] = useState(false)
  const [showMarsReward, setShowMarsReward] = useState(false)
  const { entitlement, redeemCode, redeeming, redeemError } = useEntitlement()
  // Múltiplos perfis por aparelho (lab-108) — lido no topo do componente, reaproveitado tanto pra
  // decidir se mostra o `ProfilePicker` (quando não há perfil ativo) quanto pra decidir se mostra
  // o botão de trocar perfil no HUD (só faz sentido com 2+ perfis já criados neste aparelho).
  const roster = listProfiles()

  // lab-91: carimba "última vez jogado" pro painel de progresso do `/familia` — só quando já
  // existe perfil (senão a criança ainda nem chegou a jogar de verdade, só abriu a tela título).
  useEffect(() => {
    if (profile) touchLastPlayed()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!profile])

  if (!profile) {
    // Perfil único (o caso comum) nunca cai aqui — a migração/leitura já deixa `profile` truthy
    // direto. Só aparece quando o aparelho já tem 2+ perfis e nenhum está ativo no momento (o
    // responsável trocou de perfil, ou o segundo filho está entrando pela primeira vez).
    if (preProfileScreen !== 'onboarding' && roster.length > 0) {
      return (
        <ProfilePicker
          roster={roster}
          onSelect={(id) => {
            switchActiveProfile(id)
            window.location.reload()
          }}
          onCreateNew={() => setPreProfileScreen('onboarding')}
        />
      )
    }
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

  function handleSelectSurpriseQuiz(quizId: string) {
    const quiz = surpriseQuizzes.find((q) => q.id === quizId) ?? null
    setActiveSurpriseQuiz(quiz)
  }

  // Bônus intencionalmente leve (pedido do usuário: "pequeno quiz surpresa" em cada andar do
  // Prédio dos Enigmas) — só moedas na hora via `collectCoin`, sem passar por `completeQuest`:
  // não conta pra `completedQuestIds`/badges nem aparece na `QuestListOverlay`, que listam as 21
  // missões das escolas.
  function handleSurpriseQuizCorrect() {
    if (!activeSurpriseQuiz) return
    for (let i = 0; i < activeSurpriseQuiz.coinReward; i++) collectCoin()
    setActiveSurpriseQuiz(null)
  }

  // Brinde de Marte (lab-94) — `unlockMarsReward()` já é idempotente (não faz nada se o jogador já
  // tiver o item); o aviso só aparece quando realmente concedeu algo novo, não a cada visita em
  // que o planeta é limpado de novo.
  function handleUnlockMarsReward() {
    if (unlockMarsReward()) setShowMarsReward(true)
  }

  return (
    <>
      <Suspense fallback={<div className="world-loading">Carregando o mundo 3D…</div>}>
        <World3D
          profile={profile}
          progress={progress}
          onSelectQuest={handleSelectQuest}
          onSelectSurpriseQuiz={handleSelectSurpriseQuiz}
          onOpenHelp={() => setShowHelp(true)}
          onOpenQuestList={() => setShowQuestList(true)}
          onOpenShop={() => setShowShop(true)}
          onOpenPairing={() => setShowPairing(true)}
          onOpenAchievements={() => setShowAchievements(true)}
          onOpenMyHouse={() => setShowMyHouse(true)}
          onUnlockMarsReward={handleUnlockMarsReward}
          onCollectCoin={collectCoin}
          onSwitchProfile={() => {
            clearActiveProfile()
            window.location.reload()
          }}
          suspendTriggers={
            activeQuest !== null ||
            activeSurpriseQuiz !== null ||
            reward !== null ||
            showHelp ||
            showQuestList ||
            showShop ||
            showPairing ||
            showAchievements ||
            showMyHouse ||
            showMarsReward
          }
        />
      </Suspense>

      {activeQuest && (
        <QuestModal
          quest={activeQuest}
          onCorrect={handleQuestCorrect}
          onClose={() => setActiveQuest(null)}
        />
      )}

      {activeSurpriseQuiz && (
        <QuestModal
          quest={activeSurpriseQuiz}
          onCorrect={handleSurpriseQuizCorrect}
          onClose={() => setActiveSurpriseQuiz(null)}
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

      {showAchievements && (
        <AchievementsPanel progress={progress} onClose={() => setShowAchievements(false)} />
      )}

      {showMyHouse && (
        <MyHousePanel
          progress={progress}
          entitlementActive={entitlement?.active ?? false}
          onUnlockFurniture={unlockFurniture}
          onClose={() => setShowMyHouse(false)}
        />
      )}

      {showMarsReward && <MarsRewardToast onContinue={() => setShowMarsReward(false)} />}

      {showShop && (
        <AvatarShop
          profile={profile}
          progress={progress}
          entitlementActive={entitlement?.active ?? false}
          onUnlock={unlockAvatar}
          onEquip={equipAvatar}
          onUnlockHat={unlockHat}
          onEquipHat={equipHat}
          onUnlockShirtColor={unlockShirtColor}
          onEquipShirtColor={equipShirtColor}
          onUnlockPantsColor={unlockPantsColor}
          onEquipPantsColor={equipPantsColor}
          onUnlockShoeColor={unlockShoeColor}
          onEquipShoeColor={equipShoeColor}
          onUnlockBackpackColor={unlockBackpackColor}
          onEquipBackpackColor={equipBackpackColor}
          onUnlockHairShape={unlockHairShape}
          onUnlockGlasses={unlockGlasses}
          onEquipGlasses={equipGlasses}
          onEquipHairShape={equipHairShape}
          onClose={() => setShowShop(false)}
        />
      )}

      {showPairing && (
        <PairingScreen
          active={entitlement?.active ?? false}
          redeeming={redeeming}
          redeemError={redeemError}
          onRedeem={redeemCode}
          onClose={() => setShowPairing(false)}
        />
      )}
    </>
  )
}

export default App
