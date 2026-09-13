import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { TitleScreen } from './components/TitleScreen'
import { Onboarding } from './components/Onboarding'
import { ProfilePicker } from './components/ProfilePicker'
import { Tutorial } from './components/Tutorial'
import { QuestModal } from './components/QuestModal'
import { RewardToast } from './components/RewardToast'
import { MarsRewardToast } from './components/MarsRewardToast'
import { PairingScreen } from './components/PairingScreen'
import { DailyLoginToast } from './components/DailyLoginToast'
import { CoopChallengeToast } from './components/CoopChallengeToast'
import { QuestListOverlay } from './world3d/QuestListOverlay'
import { AchievementsPanel } from './world3d/AchievementsPanel'
import { MyHousePanel } from './world3d/MyHousePanel'
import { PetPanel } from './world3d/PetPanel'
import { FriendsPanel } from './world3d/FriendsPanel'
import { AvatarShop } from './world3d/AvatarShop'
import { useProfile } from './state/useProfile'
import { useProgress } from './state/useProgress'
import { useEntitlement } from './state/useEntitlement'
import { useHeartbeat, sendImmediateHouseVisibility } from './state/useHeartbeat'
import type { PublicHouseSnapshot } from './state/usePlayerPublicProfile'
import {
  trackFirstLearningChallenge,
  trackHouseVisited,
  trackLearningChallengeStarted,
  trackLearningChallengeCompleted,
} from './productAnalytics'
import { quests } from './data/quests'
import { surpriseQuizzes } from './data/surpriseQuizzes'
import { findPlanetQuestById } from './data/planetQuests'
import {
  clearActiveProfile,
  hasTutorialBeenSeen,
  listProfiles,
  loadLastPlayedAt,
  markTutorialSeen,
  saveProfile,
  saveProgress,
  switchActiveProfile,
  touchLastPlayed,
} from './state/storage'
import type { Profile, Progress, Quest } from './types'
import type { FurnitureOption } from './data/furniture'
import type { WeeklyEvent } from './data/weeklyEvents'

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
    collectCoins,
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
    removeFurniture,
    unlockMarsReward,
    foundTreasureChest,
    foundPlanetSecret,
    resetStreak,
    claimDailyLogin,
    collectPostcard,
    adoptPet,
    equipPet,
    feedPet,
    coopChallengeCompleted,
    petDailyChallengeCompleted,
    toggleHouseVisible,
    syncWeeklyXp,
  } = useProgress()
  const [activeQuest, setActiveQuest] = useState<Quest | null>(null)
  const [activeSurpriseQuiz, setActiveSurpriseQuiz] = useState<Quest | null>(null)
  const [activePlanetQuest, setActivePlanetQuest] = useState<Quest | null>(null)
  // Desafio em dupla (lab-172) — `activeCoopQuest` abre o `QuestModal`; `coopAnswerSignalId`
  // avisa `World3D.tsx` (mesma ponte de `pendingPlacementId`/`onPlacingRequestHandled` abaixo)
  // que a resposta certa aconteceu, pra mandar `sendCoopDone` pelo relé; `coopReward` só é
  // populado depois que `World3D.tsx` confirma que o PARCEIRO também respondeu certo.
  const [activeCoopQuest, setActiveCoopQuest] = useState<Quest | null>(null)
  const [coopAnswerSignalId, setCoopAnswerSignalId] = useState<string | null>(null)
  const [coopReward, setCoopReward] = useState<{ coins: number; newBadge: boolean } | null>(null)
  // Missões ambientais (lab-180) — DIFERENTE do desafio em dupla acima: acertar aqui credita
  // XP/moeda de verdade via `completeQuest` (é uma missão normal do pool de sempre, só alcançada
  // por um landmark do mundo em vez de só pela escolinha), então não precisa de nenhuma ponte de
  // volta pro `World3D.tsx` — fecha o modal e mostra o `RewardToast` de sempre, igual a
  // `activeQuest`.
  const [activeEnvironmentalChallenge, setActiveEnvironmentalChallenge] = useState<{
    quest: Quest
    kind: 'bridge' | 'rocket_fuel' | 'plaque'
    attemptId: string
  } | null>(null)
  // Achado do review automático do Copilot (PR #59): `QuestModal` atrasa `onCorrect` em 700ms
  // (`setTimeout`) depois de mostrar o feedback "certo" — se a criança fechar o modal DENTRO
  // desse intervalo (ou abrir um landmark diferente), o `onCorrect` capturado no fechamento do
  // `QuestModal` ainda dispara depois, lendo `activeEnvironmentalChallenge` de um render antigo
  // (via closure) — podia creditar recompensa de uma tentativa já cancelada, inclusive por cima
  // de um desafio novo aberto nesse meio-tempo. `attemptId` (só em memória, nunca persistido) é a
  // fonte de verdade de qual tentativa está REALMENTE ativa agora; comparado contra o valor
  // capturado na closure antes de creditar qualquer coisa.
  const activeEnvironmentalAttemptIdRef = useRef<string | null>(null)
  // Casa visitável (lab-175, "Lab 171 - Casa visitável somente leitura") — mesma ponte de
  // `coopAnswerSignalId`/`placingFurnitureRequestId` acima: o clique em "Visitar casa" acontece
  // dentro do `FriendsPanel`, fora deste componente e do `World3D.tsx`; `id` novo a cada clique
  // garante que visitar o MESMO amigo duas vezes seguidas ainda dispare o efeito.
  const [visitHouseRequest, setVisitHouseRequest] = useState<({ id: string; nickname: string } & PublicHouseSnapshot) | null>(null)
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
    // lab-150 (achado do Copilot, PR #2): evento semanal capturado no MOMENTO do cálculo da
    // recompensa (`CompletionResult.event`), não recalculado de novo na hora de mostrar o toast.
    event: WeeklyEvent
  } | null>(null)
  const [preProfileScreen, setPreProfileScreen] = useState<PreProfileScreen>('title')
  const [tutorialSeen, setTutorialSeen] = useState(hasTutorialBeenSeen)
  const [showHelp, setShowHelp] = useState(false)
  const [showQuestList, setShowQuestList] = useState(false)
  const [showShop, setShowShop] = useState(false)
  const [showPairing, setShowPairing] = useState(false)
  const [showAchievements, setShowAchievements] = useState(false)
  const [showMyHouse, setShowMyHouse] = useState(false)
  const [showPets, setShowPets] = useState(false)
  const [showFriends, setShowFriends] = useState(false)
  // lab-136 (pedido do usuário: "escolher em que posição da casa deve ficar a peça... o ângulo e
  // posição") — id do item que o jogador clicou "Mover" no `MyHousePanel`; `World3D.tsx` observa
  // essa prop e entra no modo de posicionamento dentro da cena 3D, depois chama
  // `onPlacingRequestHandled` pra limpar (senão o mesmo id reabriria o modo a cada re-render).
  const [pendingPlacementId, setPendingPlacementId] = useState<string | null>(null)
  const [showMarsReward, setShowMarsReward] = useState(false)
  // Login diário (lab-138) — `null` = nada pra mostrar; populado só quando `claimDailyLogin`
  // devolve `granted: true` (mesmo perfil não ganha duas vezes no mesmo dia — ver `progression.ts`).
  const [dailyLoginReward, setDailyLoginReward] = useState<{ streak: number; coins: number } | null>(null)
  const { entitlement, redeemCode, redeeming, redeemError, syncProgressSummary, syncProgressBackup, fetchProgressBackup } =
    useEntitlement()
  useHeartbeat(profile, progress)
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
      // lab-149 (achado do Copilot, PR #9): uma leitura de relógio só, reaproveitada pelos dois
      // lados — antes eram duas chamadas independentes de `new Date()` que podiam cair em dias
      // UTC diferentes bem na virada da meia-noite.
      const nowIso = new Date().toISOString()
      touchLastPlayed(nowIso)
      const result = claimDailyLogin(previousLastPlayedAt, nowIso)
      if (result.granted) setDailyLoginReward({ streak: result.streak, coins: result.coins })
      // Ranking local entre perfis (lab-157) — mesmo gatilho/instante de agora, reaproveitado sem
      // outra leitura de relógio.
      syncWeeklyXp(nowIso)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!profile])

  // lab-119, Fase F: sincroniza o resumo de progresso uma vez por sessão, assim que o entitlement
  // é confirmado como ATIVO (não a cada troca de progresso — o relatório é semanal, não precisa de
  // atualização em tempo real, e isso evita chamar o endpoint a cada moeda coletada). Família sem
  // entitlement ativo nunca dispara isto — ver `syncProgressSummary`/decisão registrada em
  // labs/lab-119-.../FEATURES.md.
  // lab-142: mesmo gatilho sincroniza o BACKUP completo (`syncProgressBackup`, G6 de
  // docs/prompts/05-escala-e-viabilidade.md) — não precisa de efeito/condição própria, é
  // exatamente a mesma janela de oportunidade ("família com assinatura ativa, uma vez por
  // sessão"). `profile` pode ainda ser `null` aqui (este efeito roda antes do primeiro
  // `if (!profile)` early return do componente) — sem perfil não há o que sincronizar.
  useEffect(() => {
    if (entitlement?.active && profile) {
      syncProgressSummary(progress)
      syncProgressBackup(profile, progress)
    }
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
    // lab-164 (jornada de ativação de 10 minutos) — "primeira missão aberta NESTA sessão", não
    // "primeira missão da vida do perfil"; `trackFirstLearningChallenge` já só dispara uma vez
    // por sessão sozinho.
    if (quest) trackFirstLearningChallenge()
  }

  function handleQuestCorrect() {
    if (!activeQuest) return
    // lab-126: bônus de moeda de assinante (`progression.ts`) — `entitlement?.active` já existe
    // aqui via `useEntitlement()`, só precisa ser repassado.
    const { newBadges, awardedXp, awardedCoins, currentStreak, streakBonusCoins, event } = completeQuest(
      activeQuest,
      entitlement?.active,
    )
    setReward({ quest: activeQuest, newBadges, awardedXp, awardedCoins, currentStreak, streakBonusCoins, event })
    setActiveQuest(null)
  }

  // Combo de respostas certas seguidas (lab-132) — fechar (×) uma missão que AINDA NÃO foi
  // respondida quebra a sequência; reabrir uma já completada (só revisão, sem recompensa nenhuma)
  // e fechar de novo não deveria punir o jogador, por isso a checagem contra `completedQuestIds`.
  function handleCloseQuest() {
    if (activeQuest && !progress.completedQuestIds.includes(activeQuest.id)) resetStreak()
    setActiveQuest(null)
  }

  // Missões ambientais (lab-180) — `World3D.tsx` já sorteou a missão do tipo certo pro landmark;
  // aqui só abre o modal e dispara `learning_challenge_started` (nomes exatos do documento,
  // ver `productAnalytics.ts`).
  //
  // Achado do review automático do Copilot (PR #59): esta também é uma abertura de missão — uma
  // criança que começa a sessão por um landmark em vez de uma escolinha (`handleSelectQuest`)
  // nunca disparava `trackFirstLearningChallenge()`, ficando de fora do funil de ativação de 10
  // minutos (lab-164). `trackFirstLearningChallenge` já é idempotente (só dispara uma vez por
  // sessão), então chamar aqui também é seguro mesmo se a criança já tiver aberto uma escolinha
  // antes.
  function handleOpenEnvironmentalChallenge(quest: Quest, kind: 'bridge' | 'rocket_fuel' | 'plaque') {
    const attemptId = crypto.randomUUID()
    activeEnvironmentalAttemptIdRef.current = attemptId
    setActiveEnvironmentalChallenge({ quest, kind, attemptId })
    trackFirstLearningChallenge()
    trackLearningChallengeStarted(kind)
  }

  // Resposta certa credita XP/moeda de verdade via `completeQuest` — mesmo caminho de
  // `handleQuestCorrect`, só que a missão veio de um landmark ambiental em vez da escolinha.
  function handleEnvironmentalChallengeCorrect() {
    if (!activeEnvironmentalChallenge) return
    // Guarda contra o `onCorrect` atrasado do `QuestModal` (setTimeout de 700ms) disparando
    // DEPOIS que esta tentativa específica já foi SUBSTITUÍDA por um landmark novo (o ref só
    // muda ao ABRIR um novo desafio, `handleOpenEnvironmentalChallenge` — nunca ao fechar, ver
    // `handleCloseEnvironmentalChallenge` — pra não invalidar uma resposta certa genuína que o
    // jogador fechou antes do próprio atraso de 700ms terminar).
    if (activeEnvironmentalAttemptIdRef.current !== activeEnvironmentalChallenge.attemptId) return
    const { quest, kind } = activeEnvironmentalChallenge
    const { newBadges, awardedXp, awardedCoins, currentStreak, streakBonusCoins, event } = completeQuest(
      quest,
      entitlement?.active,
    )
    setReward({ quest, newBadges, awardedXp, awardedCoins, currentStreak, streakBonusCoins, event })
    trackLearningChallengeCompleted(kind)
    activeEnvironmentalAttemptIdRef.current = null
    setActiveEnvironmentalChallenge(null)
  }

  // Mesmo raciocínio de `handleCloseQuest` — fechar sem responder quebra o combo de respostas
  // certas seguidas, revisar uma missão já concluída antes não deveria punir.
  //
  // Achado do review automático do Copilot (PR #59, 6ª rodada): a versão anterior zerava
  // `activeEnvironmentalAttemptIdRef` aqui também — mas `QuestModal` deixa o botão de fechar (×)
  // e Escape ativos mesmo DURANTE os 700ms de feedback "certo" antes do `onCorrect` atrasado
  // disparar. Uma criança que clicasse a resposta certa e fechasse o modal nesse intervalo
  // perdia a recompensa de verdade (o `onCorrect` atrasado ainda dispara, mas o ref já tinha
  // sido zerado por ESTE fechamento, então `handleEnvironmentalChallengeCorrect` rejeitava uma
  // conclusão genuína). NÃO zerar aqui continua protegendo contra o cenário que o `attemptId`
  // foi criado pra resolver (round anterior): se um landmark NOVO abrir antes do `onCorrect`
  // atrasado da tentativa antiga disparar, `handleOpenEnvironmentalChallenge` já sobrescreve o
  // ref com um `attemptId` novo — a comparação em `handleEnvironmentalChallengeCorrect` falha
  // do mesmo jeito, sem precisar que o fechamento zere nada.
  function handleCloseEnvironmentalChallenge() {
    if (activeEnvironmentalChallenge && !progress.completedQuestIds.includes(activeEnvironmentalChallenge.quest.id)) {
      resetStreak()
    }
    setActiveEnvironmentalChallenge(null)
  }

  function handleSelectSurpriseQuiz(quizId: string) {
    const quiz = surpriseQuizzes.find((q) => q.id === quizId) ?? null
    setActiveSurpriseQuiz(quiz)
  }

  // Bônus intencionalmente leve (pedido do usuário: "pequeno quiz surpresa" em cada andar do
  // Prédio dos Enigmas) — só moedas na hora via `collectCoins`, sem passar por `completeQuest`:
  // não conta pra `completedQuestIds`/badges nem aparece na `QuestListOverlay`, que listam as 21
  // missões das escolas.
  // lab-150 (achado do Copilot, PR #2): chamava `collectCoin()` em loop, uma escrita no
  // `localStorage` por moeda (8-10 escritas síncronas seguidas por um evento só). `collectCoins`
  // credita tudo de uma vez, com uma escrita só.
  function handleSurpriseQuizCorrect() {
    if (!activeSurpriseQuiz) return
    collectCoins(activeSurpriseQuiz.coinReward)
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
      event,
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
      event,
    })
    setActivePlanetQuest(null)
  }

  // Combo de respostas certas seguidas (lab-132) — mesmo raciocínio de `handleCloseQuest` acima,
  // só que contra `completedPlanetQuestIds`.
  function handleClosePlanetQuest() {
    if (activePlanetQuest && !progress.completedPlanetQuestIds.includes(activePlanetQuest.id)) resetStreak()
    setActivePlanetQuest(null)
  }

  // Desafio em dupla (lab-172) — DIFERENTE das outras missões: acertar aqui nunca credita XP/moeda
  // na hora (a pergunta em si não é nova, `completedQuestIds`/badges de missão normal não mudam
  // por respondê-la de novo aqui) — só fecha o modal e avisa `World3D.tsx` (`coopAnswerSignalId`)
  // que ESTE jogador terminou, pra ele mandar `sendCoopDone` pelo relé. A recompensa de verdade só
  // vem depois, em `handleCoopChallengeCompleted`, quando o PARCEIRO também confirmar.
  function handleCoopQuestCorrect() {
    setActiveCoopQuest(null)
    setCoopAnswerSignalId(crypto.randomUUID())
  }

  function handleCoopAnswerHandled() {
    setCoopAnswerSignalId(null)
  }

  function handleCloseCoopQuest() {
    setActiveCoopQuest(null)
  }

  // Chamado por `World3D.tsx` só depois que os DOIS participantes já confirmaram pelo relé —
  // `coopChallengeCompleted` (`useProgress.ts`) já aplica o próprio limite de uma vez por dia real
  // (`rewarded: false` se este perfil já ganhou hoje); nesse caso não mostra nada, silenciosamente
  // (o jogador já resolveu o desafio de verdade com o parceiro, só não ganha moeda de novo hoje).
  function handleCoopChallengeCompleted() {
    const result = coopChallengeCompleted(new Date().toISOString())
    if (result.rewarded) setCoopReward({ coins: result.coins, newBadge: result.newBadge })
  }

  // Casa visitável (lab-175) — fecha o painel de Amigos (mesmo padrão de `onStartPlacing` do
  // `MyHousePanel.tsx`: fechar o painel antes de agir na cena 3D) e sinaliza `World3D.tsx` com um
  // `id` novo pra garantir que visitar o MESMO amigo de novo ainda dispare a entrada.
  // `trackHouseVisited` aproxima (não mede de verdade — `weeklyFunnel.houseVisited` conta
  // dispositivo único, não criança; detalhe completo em `docs/event-catalog.md`) a "visitas por
  // criança" citada no documento — dispara aqui, não só quando `World3D.tsx` confirma a entrada,
  // porque o clique em si já é o sinal de intenção real (mesmo espírito de
  // `trackWeeklyReportPreviewViewed`, lab-173).
  function handleVisitHouse(nickname: string, house: PublicHouseSnapshot) {
    setShowFriends(false)
    trackHouseVisited()
    setVisitHouseRequest({ id: crypto.randomUUID(), nickname, ...house })
  }

  function handleVisitHouseHandled() {
    setVisitHouseRequest(null)
  }

  // Brinde de Marte (lab-94) — `unlockMarsReward()` já é idempotente (não faz nada se o jogador já
  // tiver o item); o aviso só aparece quando realmente concedeu algo novo, não a cada visita em
  // que o planeta é limpado de novo.
  function handleUnlockMarsReward() {
    if (unlockMarsReward()) setShowMarsReward(true)
  }

  // lab-142 (G6): restaura um backup encontrado no servidor por cima do perfil/progresso LOCAIS
  // deste aparelho — o jogador já confirmou explicitamente na tela de pareamento
  // (`PairingScreen.tsx`, "Restaurar progresso salvo"), então grava direto no `localStorage`
  // (`saveProfile`/`saveProgress`, sem passar pelos setters de `useProfile`/`useProgress`, que só
  // sabem editar UM campo por vez, nunca substituir o objeto inteiro) e recarrega a página —
  // mesmo padrão de `switchActiveProfile` (troca de perfil) logo abaixo, que também prefere um
  // reload de verdade a tentar sincronizar manualmente todo o estado do React.
  // lab-149 (achado do review automático do Copilot no PR #13): `/progress-backup` só valida
  // ESTRUTURALMENTE (profile/progress são objetos de verdade, não campo a campo — decisão de
  // propósito, ver lab-142/`isValidProgressBackupPayload`). Um backup de uma versão mais antiga do
  // jogo (sem um campo que só passou a existir depois) chegaria aqui faltando esse campo — gravar
  // DIRETO por cima quebraria o jogo depois do reload (`name`/`avatarEmoji` etc. virando
  // `undefined`). Mescla por cima do que já está no aparelho (não um objeto em branco) — campo
  // ausente no backup mantém o valor local atual em vez de virar `undefined`.
  function handleRestoreBackup(restoredProfile: Profile, restoredProgress: Progress) {
    if (profile) saveProfile({ ...profile, ...restoredProfile })
    saveProgress({ ...progress, ...restoredProgress })
    window.location.reload()
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
          onOpenPets={() => setShowPets(true)}
          onOpenFriends={() => setShowFriends(true)}
          onUnlockMarsReward={handleUnlockMarsReward}
          onFindTreasureChest={foundTreasureChest}
          onFindPlanetSecret={foundPlanetSecret}
          onCollectPostcard={collectPostcard}
          onCollectCoin={collectCoin}
          placingFurnitureRequestId={pendingPlacementId}
          onPlacingRequestHandled={() => setPendingPlacementId(null)}
          onFurniturePlaced={setFurniturePlacement}
          onOpenCoopChallenge={setActiveCoopQuest}
          coopAnswerSignalId={coopAnswerSignalId}
          onCoopAnswerHandled={handleCoopAnswerHandled}
          onCoopChallengeCompleted={handleCoopChallengeCompleted}
          visitHouseRequest={visitHouseRequest}
          onVisitHouseHandled={handleVisitHouseHandled}
          onOpenEnvironmentalChallenge={handleOpenEnvironmentalChallenge}
          onSwitchProfile={() => {
            clearActiveProfile()
            window.location.reload()
          }}
          suspendTriggers={
            activeQuest !== null ||
            activeSurpriseQuiz !== null ||
            activePlanetQuest !== null ||
            activeCoopQuest !== null ||
            activeEnvironmentalChallenge !== null ||
            reward !== null ||
            coopReward !== null ||
            showHelp ||
            showQuestList ||
            showShop ||
            showPairing ||
            showAchievements ||
            showMyHouse ||
            showPets ||
            showFriends ||
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

      {activeCoopQuest && (
        <QuestModal quest={activeCoopQuest} onCorrect={handleCoopQuestCorrect} onClose={handleCloseCoopQuest} />
      )}

      {activeEnvironmentalChallenge && (
        <QuestModal
          quest={activeEnvironmentalChallenge.quest}
          onCorrect={handleEnvironmentalChallengeCorrect}
          onClose={handleCloseEnvironmentalChallenge}
        />
      )}

      {coopReward && (
        <CoopChallengeToast
          coins={coopReward.coins}
          newBadge={coopReward.newBadge}
          onContinue={() => setCoopReward(null)}
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
          event={reward.event}
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
          onRemoveFurniture={removeFurniture}
          onToggleHouseVisible={(visible) => {
            toggleHouseVisible(visible)
            // lab-175 (achado do review automático do Copilot no PR #49) — não espera o próximo
            // tick do heartbeat (até 60s): desligar a visibilidade precisa valer imediatamente.
            // Envia o `progress` (snapshot completo, não só o booleano) — segunda rodada do
            // Copilot no mesmo PR: mandar só `houseVisible` deixava a mobília presa no valor do
            // último tick periódico até o próximo rodar.
            sendImmediateHouseVisibility(visible, progress)
          }}
          onClose={() => setShowMyHouse(false)}
        />
      )}

      {showPets && (
        <PetPanel
          progress={progress}
          onAdopt={adoptPet}
          onEquip={equipPet}
          onFeed={() => feedPet(new Date().toISOString())}
          onChallengeCorrect={() => petDailyChallengeCompleted(new Date().toISOString()).rewarded}
          onClose={() => setShowPets(false)}
        />
      )}

      {showFriends && (
        <FriendsPanel profile={profile} onClose={() => setShowFriends(false)} onVisitHouse={handleVisitHouse} />
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
          onFetchBackup={fetchProgressBackup}
          onRestoreBackup={handleRestoreBackup}
          onClose={() => setShowPairing(false)}
        />
      )}
    </>
  )
}

export default App
