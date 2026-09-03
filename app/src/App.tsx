import { lazy, Suspense, useEffect, useState } from 'react'
import { TitleScreen } from './components/TitleScreen'
import { Onboarding } from './components/Onboarding'
import { ProfilePicker } from './components/ProfilePicker'
import { Tutorial } from './components/Tutorial'
import { QuestModal } from './components/QuestModal'
import { RewardToast } from './components/RewardToast'
import { MarsRewardToast } from './components/MarsRewardToast'
import { PairingScreen } from './components/PairingScreen'
import { DailyLoginToast } from './components/DailyLoginToast'
import { QuestListOverlay } from './world3d/QuestListOverlay'
import { AchievementsPanel } from './world3d/AchievementsPanel'
import { MyHousePanel } from './world3d/MyHousePanel'
import { AvatarShop } from './world3d/AvatarShop'
import { useProfile } from './state/useProfile'
import { useProgress } from './state/useProgress'
import { useEntitlement } from './state/useEntitlement'
import { quests } from './data/quests'
import { surpriseQuizzes } from './data/surpriseQuizzes'
import { findPlanetQuestById } from './data/planetQuests'
import {
  clearActiveProfile,
  hasTutorialBeenSeen,
  listProfiles,
  loadLastPlayedAt,
  markTutorialSeen,
  switchActiveProfile,
  touchLastPlayed,
} from './state/storage'
import type { Quest } from './types'
import type { FurnitureOption } from './data/furniture'

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
    completePlanetQuest,
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
    setFurniturePlacement,
    unlockMarsReward,
    foundTreasureChest,
    resetStreak,
    claimDailyLogin,
    collectPostcard,
  } = useProgress()
  const [activeQuest, setActiveQuest] = useState<Quest | null>(null)
  const [activeSurpriseQuiz, setActiveSurpriseQuiz] = useState<Quest | null>(null)
  const [activePlanetQuest, setActivePlanetQuest] = useState<Quest | null>(null)
  const [reward, setReward] = useState<{
    quest: Quest
    newBadges: string[]
    awardedXp: number
    awardedCoins: number
    unlockedFurnitureItem?: FurnitureOption
    currentStreak: number
    streakBonusCoins: number
    planetClearBonusXp?: number
    planetClearBonusCoins?: number
  } | null>(null)
  const [preProfileScreen, setPreProfileScreen] = useState<PreProfileScreen>('title')
  const [tutorialSeen, setTutorialSeen] = useState(hasTutorialBeenSeen)
  const [showHelp, setShowHelp] = useState(false)
  const [showQuestList, setShowQuestList] = useState(false)
  const [showShop, setShowShop] = useState(false)
  const [showPairing, setShowPairing] = useState(false)
  const [showAchievements, setShowAchievements] = useState(false)
  const [showMyHouse, setShowMyHouse] = useState(false)
  // lab-136 (pedido do usuário: "escolher em que posição da casa deve ficar a peça... o ângulo e
  // posição") — id do item que o jogador clicou "Mover" no `MyHousePanel`; `World3D.tsx` observa
  // essa prop e entra no modo de posicionamento dentro da cena 3D, depois chama
  // `onPlacingRequestHandled` pra limpar (senão o mesmo id reabriria o modo a cada re-render).
  const [pendingPlacementId, setPendingPlacementId] = useState<string | null>(null)
  const [showMarsReward, setShowMarsReward] = useState(false)
  // Login diário (lab-138) — `null` = nada pra mostrar; populado só quando `claimDailyLogin`
  // devolve `granted: true` (mesmo perfil não ganha duas vezes no mesmo dia — ver `progression.ts`).
  const [dailyLoginReward, setDailyLoginReward] = useState<{ streak: number; coins: number } | null>(null)
  const { entitlement, redeemCode, redeeming, redeemError, syncProgressSummary } = useEntitlement()
  // Múltiplos perfis por aparelho (lab-108) — lido no topo do componente, reaproveitado tanto pra
  // decidir se mostra o `ProfilePicker` (quando não há perfil ativo) quanto pra decidir se mostra
  // o botão de trocar perfil no HUD (só faz sentido com 2+ perfis já criados neste aparelho).
  const roster = listProfiles()

  // lab-91: carimba "última vez jogado" pro painel de progresso do `/familia` — só quando já
  // existe perfil (senão a criança ainda nem chegou a jogar de verdade, só abriu a tela título).
  // lab-138: login diário reaproveita o MESMO carimbo, sem storage novo — lê o valor da sessão
  // ANTERIOR antes de `touchLastPlayed()` sobrescrever (ordem importa: ler depois já veria "agora").
  useEffect(() => {
    if (profile) {
      const previousLastPlayedAt = loadLastPlayedAt()
      touchLastPlayed()
      const result = claimDailyLogin(previousLastPlayedAt, new Date().toISOString())
      if (result.granted) setDailyLoginReward({ streak: result.streak, coins: result.coins })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!profile])

  // lab-119, Fase F: sincroniza o resumo de progresso uma vez por sessão, assim que o entitlement
  // é confirmado como ATIVO (não a cada troca de progresso — o relatório é semanal, não precisa de
  // atualização em tempo real, e isso evita chamar o endpoint a cada moeda coletada). Família sem
  // entitlement ativo nunca dispara isto — ver `syncProgressSummary`/decisão registrada em
  // labs/lab-119-.../FEATURES.md.
  useEffect(() => {
    if (entitlement?.active) syncProgressSummary(progress)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entitlement?.active])

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
    // lab-126: bônus de moeda de assinante (`progression.ts`) — `entitlement?.active` já existe
    // aqui via `useEntitlement()`, só precisa ser repassado.
    const { newBadges, awardedXp, awardedCoins, currentStreak, streakBonusCoins } = completeQuest(
      activeQuest,
      entitlement?.active,
    )
    setReward({ quest: activeQuest, newBadges, awardedXp, awardedCoins, currentStreak, streakBonusCoins })
    setActiveQuest(null)
  }

  // Combo de respostas certas seguidas (lab-132) — fechar (×) uma missão que AINDA NÃO foi
  // respondida quebra a sequência; reabrir uma já completada (só revisão, sem recompensa nenhuma)
  // e fechar de novo não deveria punir o jogador, por isso a checagem contra `completedQuestIds`.
  function handleCloseQuest() {
    if (activeQuest && !progress.completedQuestIds.includes(activeQuest.id)) resetStreak()
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

  // lab-127: cada planeta agora tem 6 perguntas (não mais 1), então o gatilho de proximidade
  // manda o id de uma pergunta ESPECÍFICA, não mais o id do planeta.
  function handleSelectPlanetQuest(questId: string) {
    const quest = findPlanetQuestById(questId) ?? null
    setActivePlanetQuest(quest)
  }

  // Escolinhas de astronomia dos planetas do Sistema Solar (lab-115, pedido do usuário: "crie
  // escolinhas com perguntas tbm nos planetas novos para ampliar a elevação dos níveis") —
  // DIFERENTE do quiz surpresa: `completePlanetQuest` credita XP de verdade (via
  // `completedPlanetQuestIds`, isolado de `completedQuestIds`/badges do planeta principal, ver
  // `progression.ts`), então mostra o mesmo `RewardToast` das missões normais.
  function handleCompletePlanetQuest() {
    if (!activePlanetQuest) return
    const {
      newBadges,
      awardedXp,
      awardedCoins,
      unlockedFurnitureItem,
      currentStreak,
      streakBonusCoins,
      planetClearBonusXp,
      planetClearBonusCoins,
    } = completePlanetQuest(activePlanetQuest, entitlement?.active)
    setReward({
      quest: activePlanetQuest,
      newBadges,
      awardedXp,
      awardedCoins,
      unlockedFurnitureItem,
      currentStreak,
      streakBonusCoins,
      planetClearBonusXp,
      planetClearBonusCoins,
    })
    setActivePlanetQuest(null)
  }

  // Combo de respostas certas seguidas (lab-132) — mesmo raciocínio de `handleCloseQuest` acima,
  // só que contra `completedPlanetQuestIds`.
  function handleClosePlanetQuest() {
    if (activePlanetQuest && !progress.completedPlanetQuestIds.includes(activePlanetQuest.id)) resetStreak()
    setActivePlanetQuest(null)
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
          entitlementActive={entitlement?.active ?? false}
          onSelectQuest={handleSelectQuest}
          onSelectSurpriseQuiz={handleSelectSurpriseQuiz}
          onSelectPlanetQuest={handleSelectPlanetQuest}
          onOpenHelp={() => setShowHelp(true)}
          onOpenQuestList={() => setShowQuestList(true)}
          onOpenShop={() => setShowShop(true)}
          onOpenPairing={() => setShowPairing(true)}
          onOpenAchievements={() => setShowAchievements(true)}
          onOpenMyHouse={() => setShowMyHouse(true)}
          onUnlockMarsReward={handleUnlockMarsReward}
          onFindTreasureChest={foundTreasureChest}
          onCollectPostcard={collectPostcard}
          onCollectCoin={collectCoin}
          placingFurnitureRequestId={pendingPlacementId}
          onPlacingRequestHandled={() => setPendingPlacementId(null)}
          onFurniturePlaced={setFurniturePlacement}
          onSwitchProfile={() => {
            clearActiveProfile()
            window.location.reload()
          }}
          suspendTriggers={
            activeQuest !== null ||
            activeSurpriseQuiz !== null ||
            activePlanetQuest !== null ||
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
        <QuestModal quest={activeQuest} onCorrect={handleQuestCorrect} onClose={handleCloseQuest} />
      )}

      {activeSurpriseQuiz && (
        <QuestModal
          quest={activeSurpriseQuiz}
          onCorrect={handleSurpriseQuizCorrect}
          onClose={() => setActiveSurpriseQuiz(null)}
        />
      )}

      {activePlanetQuest && (
        <QuestModal
          quest={activePlanetQuest}
          onCorrect={handleCompletePlanetQuest}
          onClose={handleClosePlanetQuest}
        />
      )}

      {reward && (
        <RewardToast
          awardedXp={reward.awardedXp}
          awardedCoins={reward.awardedCoins}
          newBadges={reward.newBadges}
          entitlementActive={entitlement?.active ?? false}
          unlockedFurnitureItem={reward.unlockedFurnitureItem}
          currentStreak={reward.currentStreak}
          streakBonusCoins={reward.streakBonusCoins}
          planetClearBonusXp={reward.planetClearBonusXp}
          planetClearBonusCoins={reward.planetClearBonusCoins}
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
          onStartPlacing={(id) => {
            setShowMyHouse(false)
            setPendingPlacementId(id)
          }}
          onClose={() => setShowMyHouse(false)}
        />
      )}

      {showMarsReward && <MarsRewardToast onContinue={() => setShowMarsReward(false)} />}

      {dailyLoginReward && (
        <DailyLoginToast
          streak={dailyLoginReward.streak}
          coins={dailyLoginReward.coins}
          onContinue={() => setDailyLoginReward(null)}
        />
      )}

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
