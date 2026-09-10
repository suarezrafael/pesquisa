import { useEffect, useState } from 'react'
import type { Progress, Quest } from '../types'
import { trackFirstReward, trackQuestCompleted } from '../productAnalytics'
import { loadProgress, saveProgress } from './storage'
import {
  applyCoinCollected,
  applyQuestCompletion,
  applyPlanetQuestCompletion,
  type CompletionResult,
  unlockAvatar as applyAvatarUnlock,
  unlockHat as applyHatUnlock,
  unlockShirtColor as applyShirtColorUnlock,
  unlockPantsColor as applyPantsColorUnlock,
  unlockShoeColor as applyShoeColorUnlock,
  unlockBackpackColor as applyBackpackColorUnlock,
  unlockHairShape as applyHairShapeUnlock,
  unlockGlasses as applyGlassesUnlock,
  unlockFurniture as applyFurnitureUnlock,
  setFurniturePlacement as applySetFurniturePlacement,
  removeFurniture as applyRemoveFurniture,
  unlockMarsReward as applyMarsRewardUnlock,
  applyTreasureChestFound,
  applyStreakReset,
  applyDailyLoginReward,
  type DailyLoginResult,
  applyPostcardCollected,
  applyCoinsCollected,
  adoptPet as applyAdoptPet,
  equipPet as applyEquipPet,
  feedPet as applyFeedPet,
  type FeedPetResult,
  backfillPetAdoptedAt,
  applyCoopChallengeCompleted,
  type CoopChallengeResult,
  applyPetDailyChallengeCompleted,
  type PetDailyChallengeResult,
  syncWeeklyXpSnapshot as applySyncWeeklyXpSnapshot,
} from './progression'

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(() => loadProgress())

  // lab-169 (achado do review automático do Copilot): perfis com pet adotado antes do ciclo de
  // vida existir não têm `petAdoptedAt`; preenche uma vez ao carregar (começando a contar idade a
  // partir de HOJE). Rodar isto no `useEffect` (não dentro do inicializador do `useState` acima)
  // evita side effect em fase de render — `StrictMode` roda o inicializador 2x em dev, arriscando
  // uma escrita duplicada/imprevisível em `saveProgress`; `useEffect` com array de dependência
  // vazio já roda só uma vez de verdade por montagem.
  useEffect(() => {
    setProgress((prev) => {
      const migrated = backfillPetAdoptedAt(prev, new Date().toISOString())
      if (migrated !== prev) saveProgress(migrated)
      return migrated
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // lab-126: `entitlementActive` aplica o bônus de moeda de assinante (`progression.ts`) — default
  // `false` preserva o comportamento de quem chama sem saber/se importar com entitlement.
  function completeQuest(quest: Quest, entitlementActive = false): CompletionResult {
    // lab-99: `applyQuestCompletion` é idempotente (responder uma missão já concluída de novo não
    // premia XP/moeda de novo, ver `progression.ts`) — só dispara o evento de analytics numa
    // conclusão GENUÍNA (o array de concluídas cresceu), senão "quests concluídas por
    // dispositivo" ficaria inflado por reprises da mesma missão.
    const wasAlreadyCompleted = progress.completedQuestIds.includes(quest.id)
    // lab-164 (jornada de ativação de 10 minutos) — lido ANTES de `applyQuestCompletion`: só um
    // perfil que ainda não tinha NENHUMA missão concluída pode fechar o "ciclo de ativação"
    // (ver `trackFirstReward`, `productAnalytics.ts`).
    const isFirstQuestEver = progress.completedQuestIds.length === 0
    const result = applyQuestCompletion(progress, quest, undefined, entitlementActive)
    setProgress(result.progress)
    saveProgress(result.progress)
    if (!wasAlreadyCompleted) {
      trackQuestCompleted(quest.id)
      trackFirstReward(isFirstQuestEver)
    }
    return result
  }

  // Escolinhas de astronomia dos planetas do Sistema Solar (lab-115) — mesmo formato de
  // `completeQuest`, mas isolado (ver `applyPlanetQuestCompletion` em `progression.ts`).
  function completePlanetQuest(quest: Quest, entitlementActive = false): CompletionResult {
    const result = applyPlanetQuestCompletion(progress, quest, undefined, entitlementActive)
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

  // lab-150 (achado do Copilot, PR #2) — premia várias moedas de uma vez (ex.: quiz surpresa) com
  // UMA escrita no `localStorage`, em vez de chamar `collectCoin()` em loop.
  function collectCoins(count: number): void {
    setProgress((prev) => {
      const next = applyCoinsCollected(prev, count)
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

  // Mobília de Minha Casa (lab-106) — mesmo formato do `unlockGlasses` acima.
  function unlockFurniture(id: string): void {
    setProgress((prev) => {
      const next = applyFurnitureUnlock(prev, id)
      saveProgress(next)
      return next
    })
  }

  // Posicionamento manual de mobília dentro de casa (lab-136) — mesmo formato dos outros
  // `unlockXxx`, chamado por `World3D.tsx` ao confirmar o modo de posicionamento (nunca durante o
  // arrastar em si, só na confirmação — senão salvaria no localStorage a cada quadro).
  function setFurniturePlacement(id: string, x: number, z: number, rotY: number): void {
    setProgress((prev) => {
      const next = applySetFurniturePlacement(prev, id, x, z, rotY)
      saveProgress(next)
      return next
    })
  }

  // Excluir mobília (lab-170, pedido do usuário: "tem que ter como excluir objetos da casa
  // tbm") — mesmo formato de `unlockFurniture`/`setFurniturePlacement` acima.
  function removeFurniture(key: string): void {
    setProgress((prev) => {
      const next = applyRemoveFurniture(prev, key)
      saveProgress(next)
      return next
    })
  }

  // Brinde de Marte (lab-94) — diferente dos outros `unlockXxx`, devolve se realmente concedeu
  // algo novo (o chamador em `App.tsx` usa isso pra decidir se mostra o aviso de novo item).
  function unlockMarsReward(): boolean {
    const result = applyMarsRewardUnlock(progress)
    if (result.granted) {
      setProgress(result.progress)
      saveProgress(result.progress)
    }
    return result.granted
  }

  // Baú de tesouro escondido (lab-131) — mesmo formato de `unlockMarsReward` acima: devolve se
  // realmente concedeu moeda nova (o chamador em `App.tsx`/`World3D.tsx` usa isso pra decidir se
  // mostra a mensagem transitória de "achado", não a cada vez que a checagem de proximidade roda).
  function foundTreasureChest(chestId: string): boolean {
    const result = applyTreasureChestFound(progress, chestId)
    if (result.granted) {
      setProgress(result.progress)
      saveProgress(result.progress)
    }
    return result.granted
  }

  // Combo de respostas certas seguidas (lab-132) — chamado por `App.tsx` ao fechar (×) uma missão
  // ainda não completada; `applyStreakReset` já é idempotente sozinho (não faz nada se o combo já
  // estava zerado).
  function resetStreak(): void {
    setProgress((prev) => {
      const next = applyStreakReset(prev)
      saveProgress(next)
      return next
    })
  }

  // Login diário (lab-138) — `App.tsx` passa o `lastPlayedAt` da sessão ANTERIOR (lido antes de
  // `touchLastPlayed()` sobrescrever) + o instante de agora; devolve o resultado inteiro (não só
  // `granted`, como `unlockMarsReward`/`foundTreasureChest`) porque o toast precisa saber QUANTO
  // ganhou e em que dia da sequência, não só se ganhou algo.
  function claimDailyLogin(previousLastPlayedAtIso: string | null, nowIso: string): DailyLoginResult {
    const result = applyDailyLoginReward(progress, previousLastPlayedAtIso, nowIso)
    if (result.granted) {
      setProgress(result.progress)
      saveProgress(result.progress)
    }
    return result
  }

  // Cartão-postal colecionável (lab-141) — mesmo formato de `foundTreasureChest`/`unlockMarsReward`
  // acima: devolve se realmente concedeu um cartão novo (o chamador em `World3D.tsx` usa isso pra
  // decidir se mostra o aviso transitório de "novo cartão", não a cada pouso repetido no mesmo
  // planeta).
  function collectPostcard(planetId: string): boolean {
    const result = applyPostcardCollected(progress, planetId)
    if (result.granted) {
      setProgress(result.progress)
      saveProgress(result.progress)
    }
    return result.granted
  }

  // Pets adotáveis (lab-155) — mesmo formato do `unlockFurniture`/`unlockGlasses` acima.
  function adoptPet(id: string): void {
    setProgress((prev) => {
      const next = applyAdoptPet(prev, id, new Date().toISOString())
      saveProgress(next)
      return next
    })
  }

  function equipPet(id: string | null): void {
    setProgress((prev) => {
      const next = applyEquipPet(prev, id)
      saveProgress(next)
      return next
    })
  }

  // Alimentar o pet ativo — mesmo formato de `claimDailyLogin` (devolve o resultado inteiro, não
  // só um booleano, porque o chamador precisa saber se o estágio mudou pra mostrar um aviso).
  // lab-155 (achado real do review automático do Copilot no PR #26): diferente do resto deste
  // arquivo, `feedPet` é chamado por um botão que o jogador pode clicar repetidas vezes bem
  // rápido, antes do React re-renderizar com o `lastPetFeedAt` novo (que é o que desabilita o
  // botão) — ler `progress` do closure do componente (como `unlockMarsReward`/`claimDailyLogin`
  // fazem, chamados só uma vez por evento, nunca por clique repetido) arriscava computar duas
  // chamadas em cima do MESMO estado desatualizado. `setProgress` com atualização FUNCIONAL
  // sempre aplica sobre o estado mais recente da fila (mesmo sob batching do React); `result` é
  // capturado de dentro do updater pra ainda devolver o resultado de forma síncrona pro chamador.
  function feedPet(nowIso: string): FeedPetResult {
    let result!: FeedPetResult
    setProgress((prev) => {
      result = applyFeedPet(prev, nowIso)
      if (!result.fed) return prev
      saveProgress(result.progress)
      return result.progress
    })
    return result
  }

  // Desafio em dupla (lab-172) — chamado por `World3D.tsx` só depois que os DOIS participantes já
  // confirmaram pelo relé (ver `onCoopChallengeCompleted`, bridge do jogo 3D); mesmo formato
  // funcional de `feedPet` acima (protege contra clique/evento duplo antes do re-render).
  function coopChallengeCompleted(nowIso: string): CoopChallengeResult {
    let result!: CoopChallengeResult
    setProgress((prev) => {
      result = applyCoopChallengeCompleted(prev, nowIso)
      if (!result.rewarded) return prev
      saveProgress(result.progress)
      return result.progress
    })
    return result
  }

  // Desafio educativo leve do pet (lab-174) — mesmo formato funcional de `feedPet`/
  // `coopChallengeCompleted` acima (protege contra clique/evento duplo antes do re-render).
  function petDailyChallengeCompleted(nowIso: string): PetDailyChallengeResult {
    let result!: PetDailyChallengeResult
    setProgress((prev) => {
      result = applyPetDailyChallengeCompleted(prev, nowIso)
      if (!result.rewarded) return prev
      saveProgress(result.progress)
      return result.progress
    })
    return result
  }

  // Ranking local entre perfis (lab-157) — mesmo gatilho/formato de `touchLastPlayed`, uma vez
  // por sessão (ver `App.tsx`): reseta o snapshot de XP semanal se a semana real mudou desde a
  // última vez, sem mexer em nada se ainda é a mesma semana (ver `syncWeeklyXpSnapshot`).
  function syncWeeklyXp(nowIso: string): void {
    setProgress((prev) => {
      const next = applySyncWeeklyXpSnapshot(prev, nowIso)
      if (next === prev) return prev
      saveProgress(next)
      return next
    })
  }

  return {
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
    resetStreak,
    claimDailyLogin,
    collectPostcard,
    adoptPet,
    equipPet,
    feedPet,
    coopChallengeCompleted,
    petDailyChallengeCompleted,
    syncWeeklyXp,
  }
}
