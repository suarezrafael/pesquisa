import type { Progress, Quest } from '../types'
import { quests } from '../data/quests'
import { findAvatarById } from '../data/avatars'
import { findHatById } from '../data/hats'
import {
  BACKPACK_COLOR_CATALOG,
  HAIR_SHAPE_CATALOG,
  PANTS_COLOR_CATALOG,
  SHIRT_COLOR_CATALOG,
  SHOE_COLOR_CATALOG,
} from '../data/customization'
import { GLASSES_CATALOG } from '../data/glasses'
import { FURNITURE_CATALOG, findFurnitureRewardForPlanet, type FurnitureOption } from '../data/furniture'
import { findPlanetIdForQuest, isPlanetFullyCompleted } from '../data/planetQuests'
import { findTreasureChestById } from '../data/treasureChests'
import { getCurrentWeeklyEvent, type WeeklyEvent } from '../data/weeklyEvents'

// Cada nível pede um pouco mais de XP que o anterior (progressão simples, sem gambiarra de balanceamento).
export function xpForLevel(level: number): number {
  return level * 40
}

export function getLevel(xp: number): number {
  let level = 1
  while (xp >= xpForLevel(level)) level++
  return level
}

export function xpIntoLevel(xp: number): { current: number; needed: number } {
  const level = getLevel(xp)
  const floor = level === 1 ? 0 : xpForLevel(level - 1)
  return { current: xp - floor, needed: xpForLevel(level) - floor }
}

// Exportadas (lab-93) pra `data/achievements.ts` usar como fonte única de verdade — sem isso, o
// catálogo de conquistas teria que duplicar essas strings, arriscando os dois lados divergirem.
export const BADGE_FIRST_QUEST = 'Primeira Missão'
export const BADGE_HALFWAY = 'Metade do Caminho'
export const BADGE_ALL_DONE = 'Mestre das Missões'

export function badgesEarnedAt(completedCount: number): string[] {
  const earned: string[] = []
  if (completedCount >= 1) earned.push(BADGE_FIRST_QUEST)
  if (completedCount >= Math.ceil(quests.length / 2)) earned.push(BADGE_HALFWAY)
  if (completedCount >= quests.length) earned.push(BADGE_ALL_DONE)
  return earned
}

export interface CompletionResult {
  progress: Progress
  newBadges: string[]
  // Recompensa realmente creditada, já com o multiplicador do evento semanal (lab-22) e o bônus
  // de assinante (lab-126) aplicados — a UI de recompensa deve mostrar isto, nunca
  // `quest.xpReward`/`coinReward` direto, senão mostraria o valor errado numa semana com bônus
  // ou pra quem tem assinatura ativa.
  awardedXp: number
  awardedCoins: number
  // lab-130: só populado por `applyPlanetQuestCompletion`, e só na resposta que completa as 6
  // escolinhas de um planeta pela primeira vez — a UI (`RewardToast`) usa isto pra anunciar o
  // item novo junto da recompensa da própria pergunta, sem precisar de um segundo toast.
  unlockedFurnitureItem?: FurnitureOption
}

// lab-126 (`prompt.md` §6, P2: "moeda bônus por assinatura") — só MOEDA, nunca XP: moeda aqui só
// compra cosmético (avatar/roupas/mobília), nunca desbloqueia missão/nível/conteúdo educacional,
// então não viola a regra inegociável de nunca gatear educação atrás de assinatura
// (`docs/plano-comercial-backend.md`). XP fica de fora de propósito — também abre viagem a
// planetas (`requiredLevel`, lab-115), então boostar XP por pagamento teria um cheiro de
// pay-to-win que este projeto evita mesmo fora de conteúdo estritamente educacional.
export const SUBSCRIBER_COIN_MULTIPLIER = 1.5

export function applyQuestCompletion(
  progress: Progress,
  quest: Quest,
  event: WeeklyEvent = getCurrentWeeklyEvent(),
  entitlementActive = false,
): CompletionResult {
  if (progress.completedQuestIds.includes(quest.id)) {
    return { progress, newBadges: [], awardedXp: 0, awardedCoins: 0 }
  }
  const awardedXp = Math.round(quest.xpReward * event.xpMultiplier)
  // Os dois multiplicadores se EMPILHAM (evento semanal × bônus de assinante), não se substituem —
  // nenhum dos dois foi desenhado pensando em exclusão mútua, e um assinante numa semana de bônus
  // simplesmente ganha os dois efeitos juntos.
  const awardedCoins = Math.round(
    quest.coinReward * event.coinMultiplier * (entitlementActive ? SUBSCRIBER_COIN_MULTIPLIER : 1),
  )
  const completedQuestIds = [...progress.completedQuestIds, quest.id]
  const badges = badgesEarnedAt(completedQuestIds.length)
  const newBadges = badges.filter((b) => !progress.badges.includes(b))
  const next: Progress = {
    ...progress,
    completedQuestIds,
    xp: progress.xp + awardedXp,
    coins: progress.coins + awardedCoins,
    badges,
  }
  return { progress: next, newBadges, awardedXp, awardedCoins }
}

// Escolinhas de astronomia dos planetas do Sistema Solar (lab-115) — mesmo formato de
// `applyQuestCompletion` (idempotente, aplica o multiplicador do evento semanal), mas grava em
// `completedPlanetQuestIds`, NUNCA em `completedQuestIds`/`badges`: essas duas contam contra
// `quests.length` (fixo em 30) pra decidir "Metade do Caminho"/"Mestre das Missões" — misturar as
// perguntas de planeta ali concederia esses emblemas cedo demais pra quem nunca terminou as 30
// missões de verdade.
export function applyPlanetQuestCompletion(
  progress: Progress,
  quest: Quest,
  event: WeeklyEvent = getCurrentWeeklyEvent(),
  entitlementActive = false,
): CompletionResult {
  if (progress.completedPlanetQuestIds.includes(quest.id)) {
    return { progress, newBadges: [], awardedXp: 0, awardedCoins: 0 }
  }
  const awardedXp = Math.round(quest.xpReward * event.xpMultiplier)
  const awardedCoins = Math.round(
    quest.coinReward * event.coinMultiplier * (entitlementActive ? SUBSCRIBER_COIN_MULTIPLIER : 1),
  )
  const completedPlanetQuestIds = [...progress.completedPlanetQuestIds, quest.id]
  let next: Progress = {
    ...progress,
    completedPlanetQuestIds,
    xp: progress.xp + awardedXp,
    coins: progress.coins + awardedCoins,
  }
  // lab-130: só verifica/concede quando esta resposta ACABOU de completar o planeta (a checagem
  // teria dado o mesmo resultado antes de responder, se o planeta já estivesse completo) — evita
  // reprocessar a concessão (ainda que idempotente) a cada resposta de escolinha já feita antes.
  let unlockedFurnitureItem: FurnitureOption | undefined
  const planetId = findPlanetIdForQuest(quest.id)
  if (planetId && isPlanetFullyCompleted(planetId, completedPlanetQuestIds)) {
    const reward = unlockPlanetFurnitureReward(next, planetId)
    if (reward.granted) {
      next = reward.progress
      unlockedFurnitureItem = reward.item
    }
  }
  return { progress: next, newBadges: [], awardedXp, awardedCoins, unlockedFurnitureItem }
}

export function isQuestUnlocked(progress: Progress, questIndex: number): boolean {
  if (questIndex === 0) return true
  const previousQuest = quests[questIndex - 1]
  return progress.completedQuestIds.includes(previousQuest.id)
}

// Moedinhas espalhadas pelo terreno pra explorar — bônus à parte das missões, não persistem
// individualmente (reaparecem a cada sessão), só a moeda ganha soma no total mesmo.
export function applyCoinCollected(progress: Progress): Progress {
  return { ...progress, coins: progress.coins + 1 }
}

// Troca moedas por um novo avatar na loja. Não faz nada (retorna o mesmo progress) se o avatar
// não existir, já estiver desbloqueado, faltar moeda, ou for exclusivo de assinante — a UI decide
// o que mostrar em cada caso, mas a regra de "pode comprar?" mora aqui, não no componente.
// Itens `subscriptionOnly` (Fase E, ver docs/plano-comercial-backend.md) NUNCA entram aqui: o
// acesso deles é dinâmico via `entitlementActive` (useEntitlement), não uma compra permanente —
// sem esse bloqueio, qualquer chamada a esta função pra um id exclusivo (mesmo por engano, já que
// o custo desses itens é sempre 0) liberaria o item de graça pra sempre.
export function unlockAvatar(progress: Progress, avatarId: string): Progress {
  const avatar = findAvatarById(avatarId)
  if (!avatar || avatar.subscriptionOnly) return progress
  if (progress.unlockedAvatarIds.includes(avatarId)) return progress
  if (progress.coins < avatar.cost) return progress
  return {
    ...progress,
    coins: progress.coins - avatar.cost,
    unlockedAvatarIds: [...progress.unlockedAvatarIds, avatarId],
  }
}

// Mesma regra de compra do `unlockAvatar`, mas pro catálogo de chapéus (lab-24) — eixo de
// customização independente (trocar de criatura não desbloqueia/perde chapéu nenhum).
export function unlockHat(progress: Progress, hatId: string): Progress {
  const hat = findHatById(hatId)
  if (!hat || hat.subscriptionOnly || hat.marsRewardOnly) return progress
  if (progress.unlockedHatIds.includes(hatId)) return progress
  if (progress.coins < hat.cost) return progress
  return {
    ...progress,
    coins: progress.coins - hat.cost,
    unlockedHatIds: [...progress.unlockedHatIds, hatId],
  }
}

// Brinde exclusivo de Marte (lab-94, pedido do usuário: "ao vencer os ETs e o robô você
// desbloqueia um brinde") — diferente de `unlockHat`, não gasta moeda nem checa custo, é concedido
// direto pelo evento de limpar Marte (World3D.tsx, disparado uma vez por visita). Idempotente:
// devolve `progress` inalterado se o jogador já tiver o item (visita seguinte, planeta limpo de
// novo) — o `granted` no retorno é o que decide se a UI mostra o aviso de "novo item" ou fica
// quieta.
const MARS_REWARD_HAT_ID = 'capacete_heroi_marte'

export interface MarsRewardResult {
  progress: Progress
  granted: boolean
}

export function unlockMarsReward(progress: Progress): MarsRewardResult {
  if (progress.unlockedHatIds.includes(MARS_REWARD_HAT_ID)) return { progress, granted: false }
  return {
    progress: { ...progress, unlockedHatIds: [...progress.unlockedHatIds, MARS_REWARD_HAT_ID] },
    granted: true,
  }
}

export interface TreasureChestResult {
  progress: Progress
  granted: boolean
}

// Baú de tesouro escondido (lab-131, pedido do usuário: "baús de tesouro escondidos") — mesmo
// padrão de `unlockMarsReward` acima: concessão de graça (moeda, não item), idempotente (devolve
// `granted: false` se o baú já tiver sido achado ANTES, mesmo em uma sessão anterior — permanente,
// diferente do pote de Marte que reseta a cada visita), disparada por um evento de gameplay
// (proximidade real em `World3D.tsx`), nunca por compra. Sem multiplicador de evento semanal/
// assinante — é recompensa de exploração, não de responder pergunta (mesmo raciocínio do pote de
// Marte, lab-128).
export function applyTreasureChestFound(progress: Progress, chestId: string): TreasureChestResult {
  if (progress.foundTreasureChestIds.includes(chestId)) return { progress, granted: false }
  const chest = findTreasureChestById(chestId)
  if (!chest) return { progress, granted: false }
  return {
    progress: {
      ...progress,
      foundTreasureChestIds: [...progress.foundTreasureChestIds, chestId],
      coins: progress.coins + chest.coinReward,
    },
    granted: true,
  }
}

// Personalização de cores/cabelo (lab-73) — mesma regra de compra de `unlockAvatar`/`unlockHat`,
// só extraída num helper porque agora são CINCO catálogos iguais (camisa/calça/sapato/mochila/
// cabelo) em vez de repetir a mesma checagem cinco vezes.
function unlockGeneric<T extends { id: string; cost: number; subscriptionOnly?: boolean; planetReward?: string }>(
  coins: number,
  unlockedIds: string[],
  catalog: T[],
  id: string,
): { coins: number; unlockedIds: string[] } | null {
  const item = catalog.find((c) => c.id === id)
  // lab-130: itens de recompensa de planeta (`planetReward`) nunca são compráveis, mesmo com
  // `cost: 0` — só `unlockPlanetFurnitureReward` pode concedê-los, ao completar as 6 escolinhas
  // do planeta correspondente.
  if (!item || item.subscriptionOnly || item.planetReward) return null
  if (unlockedIds.includes(id)) return null
  if (coins < item.cost) return null
  return { coins: coins - item.cost, unlockedIds: [...unlockedIds, id] }
}

export function unlockShirtColor(progress: Progress, id: string): Progress {
  const result = unlockGeneric(progress.coins, progress.unlockedShirtColorIds, SHIRT_COLOR_CATALOG, id)
  if (!result) return progress
  return { ...progress, coins: result.coins, unlockedShirtColorIds: result.unlockedIds }
}

export function unlockPantsColor(progress: Progress, id: string): Progress {
  const result = unlockGeneric(progress.coins, progress.unlockedPantsColorIds, PANTS_COLOR_CATALOG, id)
  if (!result) return progress
  return { ...progress, coins: result.coins, unlockedPantsColorIds: result.unlockedIds }
}

export function unlockShoeColor(progress: Progress, id: string): Progress {
  const result = unlockGeneric(progress.coins, progress.unlockedShoeColorIds, SHOE_COLOR_CATALOG, id)
  if (!result) return progress
  return { ...progress, coins: result.coins, unlockedShoeColorIds: result.unlockedIds }
}

export function unlockBackpackColor(progress: Progress, id: string): Progress {
  const result = unlockGeneric(progress.coins, progress.unlockedBackpackColorIds, BACKPACK_COLOR_CATALOG, id)
  if (!result) return progress
  return { ...progress, coins: result.coins, unlockedBackpackColorIds: result.unlockedIds }
}

export function unlockHairShape(progress: Progress, id: string): Progress {
  const result = unlockGeneric(progress.coins, progress.unlockedHairShapeIds, HAIR_SHAPE_CATALOG, id)
  if (!result) return progress
  return { ...progress, coins: result.coins, unlockedHairShapeIds: result.unlockedIds }
}

// Óculos (lab-92) — mesma regra de compra do resto, via `unlockGeneric` (GLASSES_CATALOG já tem o
// formato `{id, cost, subscriptionOnly?}` que a função espera).
export function unlockGlasses(progress: Progress, id: string): Progress {
  const result = unlockGeneric(progress.coins, progress.unlockedGlassesIds, GLASSES_CATALOG, id)
  if (!result) return progress
  return { ...progress, coins: result.coins, unlockedGlassesIds: result.unlockedIds }
}

// Mobília de Minha Casa (lab-106) — mesma regra de compra do resto, via `unlockGeneric`
// (`FURNITURE_CATALOG` já tem o formato `{id, cost, subscriptionOnly?}` que a função espera).
export function unlockFurniture(progress: Progress, id: string): Progress {
  const result = unlockGeneric(progress.coins, progress.unlockedFurnitureIds, FURNITURE_CATALOG, id)
  if (!result) return progress
  return { ...progress, coins: result.coins, unlockedFurnitureIds: result.unlockedIds }
}

export interface PlanetFurnitureRewardResult {
  progress: Progress
  granted: boolean
  item?: FurnitureOption
}

// lab-130 (pedido do usuário: "cada planeta deve... liberar mais itens na casinha de cada um") —
// mesmo padrão de `unlockMarsReward` acima: concessão de graça, idempotente (devolve `granted:
// false` se o jogador já tiver o item daquele planeta), disparada por um evento de gameplay
// (chamada por `applyPlanetQuestCompletion` ao detectar que o planeta acabou de ficar 100%
// completo), nunca pela compra normal (`unlockGeneric` rejeita itens `planetReward`).
export function unlockPlanetFurnitureReward(progress: Progress, planetId: string): PlanetFurnitureRewardResult {
  const item = findFurnitureRewardForPlanet(planetId)
  if (!item || progress.unlockedFurnitureIds.includes(item.id)) return { progress, granted: false }
  return {
    progress: { ...progress, unlockedFurnitureIds: [...progress.unlockedFurnitureIds, item.id] },
    granted: true,
    item,
  }
}
