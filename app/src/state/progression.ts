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
import { findPostcardByPlanetId } from '../data/postcards'
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
  // Combo de respostas certas seguidas (lab-132) — `currentStreak` é sempre o valor ATUAL depois
  // desta resposta (mesmo em completion repetida, onde fica igual ao `progress` recebido, sem
  // incrementar); `streakBonusCoins` só é maior que 0 quando esta resposta atinge um marco de
  // sequência novo (`streakBonusFor`).
  currentStreak: number
  streakBonusCoins: number
  // Bônus por limpar um planeta inteiro (lab-133) — mesmo espírito de `unlockedFurnitureItem`:
  // só populado por `applyPlanetQuestCompletion`, e só na resposta que completa as 6 escolinhas de
  // um planeta pela primeira vez. `applyQuestCompletion` (missões do planeta principal) nunca seta
  // estes campos.
  planetClearBonusXp?: number
  planetClearBonusCoins?: number
  // lab-150 (achado do review automático do Copilot no PR #2, nunca lido antes desta sessão): o
  // evento semanal usado pra calcular `awardedXp`/`awardedCoins` acima — devolvido aqui pra UI
  // (`RewardToast`) nunca precisar chamar `getCurrentWeeklyEvent()` de novo por conta própria. Sem
  // isso, se a semana virasse (ou o relógio do aparelho mudasse) entre o cálculo aqui e a
  // renderização do toast, a linha "Bônus de X aplicado!" podia mostrar um evento diferente do que
  // realmente foi usado pra calcular os números acima.
  event: WeeklyEvent
}

// Combo de respostas certas seguidas (lab-132, pedido do usuário: "combo de respostas certas
// seguidas") — bônus de moeda crescente por marco de sequência. Só incrementado em completions
// GENUÍNAS de missão real (`applyQuestCompletion`/`applyPlanetQuestCompletion`, nunca quiz
// surpresa: `handleSurpriseQuizCorrect` não é idempotente por id, seria fácil de farmar marcos
// respondendo o mesmo quiz em loop) — a própria checagem de idempotência de cada função (retorna
// cedo sem creditar nada numa missão já completada) já impede farmar reabrindo uma missão
// respondida. Zera em `applyStreakReset`, chamado por `App.tsx` ao fechar (×) uma missão AINDA NÃO
// completada — "seguidas" é o que dá nome ao recurso, desistir no meio quebra a sequência.
function streakBonusFor(streak: number): number {
  if (streak === 3) return 5
  if (streak === 5) return 10
  if (streak >= 10 && streak % 10 === 0) return 20
  return 0
}

export function applyStreakReset(progress: Progress): Progress {
  if (progress.currentStreak === 0) return progress
  return { ...progress, currentStreak: 0 }
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
    return {
      progress,
      newBadges: [],
      awardedXp: 0,
      awardedCoins: 0,
      currentStreak: progress.currentStreak,
      streakBonusCoins: 0,
      event,
    }
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
  const currentStreak = progress.currentStreak + 1
  const streakBonusCoins = streakBonusFor(currentStreak)
  const next: Progress = {
    ...progress,
    completedQuestIds,
    xp: progress.xp + awardedXp,
    coins: progress.coins + awardedCoins + streakBonusCoins,
    badges,
    currentStreak,
  }
  return { progress: next, newBadges, awardedXp, awardedCoins, currentStreak, streakBonusCoins, event }
}

// Bônus por limpar um planeta inteiro (lab-133, pedido do usuário: backlog de engajamento) —
// creditado UMA VEZ, na resposta que completa as 6 escolinhas de um planeta, além da recompensa da
// própria pergunta e do item de mobília (lab-130). Segue os MESMOS multiplicadores de evento
// semanal/assinante da recompensa de pergunta (ao contrário do pote de Marte/baú de tesouro, que
// são moeda flat de exploração) — este bônus está diretamente ligado a responder perguntas de
// verdade, fica na mesma "economia" de recompensa de missão. Valores base ~2× a recompensa média
// de uma única pergunta do planeta — grande o bastante pra parecer um marco de verdade, sem
// desequilibrar a progressão geral.
const PLANET_CLEAR_BONUS_XP = 50
const PLANET_CLEAR_BONUS_COINS = 30

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
    return {
      progress,
      newBadges: [],
      awardedXp: 0,
      awardedCoins: 0,
      currentStreak: progress.currentStreak,
      streakBonusCoins: 0,
      event,
    }
  }
  const awardedXp = Math.round(quest.xpReward * event.xpMultiplier)
  const awardedCoins = Math.round(
    quest.coinReward * event.coinMultiplier * (entitlementActive ? SUBSCRIBER_COIN_MULTIPLIER : 1),
  )
  const completedPlanetQuestIds = [...progress.completedPlanetQuestIds, quest.id]
  const currentStreak = progress.currentStreak + 1
  const streakBonusCoins = streakBonusFor(currentStreak)
  let next: Progress = {
    ...progress,
    completedPlanetQuestIds,
    xp: progress.xp + awardedXp,
    coins: progress.coins + awardedCoins + streakBonusCoins,
    currentStreak,
  }
  // lab-130: só verifica/concede quando esta resposta ACABOU de completar o planeta (a checagem
  // teria dado o mesmo resultado antes de responder, se o planeta já estivesse completo) — evita
  // reprocessar a concessão (ainda que idempotente) a cada resposta de escolinha já feita antes.
  let unlockedFurnitureItem: FurnitureOption | undefined
  let planetClearBonusXp: number | undefined
  let planetClearBonusCoins: number | undefined
  const planetId = findPlanetIdForQuest(quest.id)
  if (planetId && isPlanetFullyCompleted(planetId, completedPlanetQuestIds)) {
    const reward = unlockPlanetFurnitureReward(next, planetId)
    if (reward.granted) {
      next = reward.progress
      unlockedFurnitureItem = reward.item
    }
    planetClearBonusXp = Math.round(PLANET_CLEAR_BONUS_XP * event.xpMultiplier)
    planetClearBonusCoins = Math.round(
      PLANET_CLEAR_BONUS_COINS * event.coinMultiplier * (entitlementActive ? SUBSCRIBER_COIN_MULTIPLIER : 1),
    )
    next = { ...next, xp: next.xp + planetClearBonusXp, coins: next.coins + planetClearBonusCoins }
  }
  return {
    progress: next,
    newBadges: [],
    awardedXp,
    awardedCoins,
    unlockedFurnitureItem,
    currentStreak,
    streakBonusCoins,
    planetClearBonusXp,
    planetClearBonusCoins,
    event,
  }
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

// lab-150 (achado do review automático do Copilot no PR #2, nunca lido antes desta sessão): o
// quiz surpresa premiava várias moedas de uma vez chamando `collectCoin()` (que grava no
// `localStorage` a CADA chamada, ver `useProgress.ts`) num loop — 8-10 escritas síncronas em
// sequência por um evento só, trabalho redundante que podia causar stutter. Uma função em lote,
// uma escrita só.
export function applyCoinsCollected(progress: Progress, count: number): Progress {
  return { ...progress, coins: progress.coins + count }
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

export interface PostcardResult {
  progress: Progress
  granted: boolean
}

// Cartão-postal colecionável (lab-141, item do backlog de engajamento discutido em chat, mesma
// lista de onde saiu o login diário — lab-138) — mesmo padrão de `unlockMarsReward`/
// `applyTreasureChestFound` acima: concessão de graça, idempotente (devolve `granted: false` se o
// jogador já tiver o cartão daquele planeta), disparada por um evento de gameplay (pousar de
// verdade em `World3D.tsx`), nunca por compra. Sem moeda/XP — é coleção pura, mesmo espírito de
// `badges`, não recompensa de missão.
export function applyPostcardCollected(progress: Progress, planetId: string): PostcardResult {
  if (progress.collectedPostcardIds.includes(planetId)) return { progress, granted: false }
  if (!findPostcardByPlanetId(planetId)) return { progress, granted: false }
  return {
    progress: { ...progress, collectedPostcardIds: [...progress.collectedPostcardIds, planetId] },
    granted: true,
  }
}

// Login diário (lab-138, item do backlog de engajamento discutido em chat) — recompensa em moeda
// por ciclo de 7 dias consecutivos (dia 8 volta a valer o mesmo que o dia 1, dia 15 idem...),
// pra sempre ter algo pra mostrar mesmo numa sequência bem longa, sem uma tabela crescendo sem
// fim. `((streak - 1) % 7) + 1` mapeia qualquer streak pra uma posição 1-7 nesta tabela.
const DAILY_LOGIN_REWARD_BY_DAY_IN_CYCLE = [5, 8, 12, 15, 20, 25, 40]

function dailyLoginRewardFor(streak: number): number {
  const dayInCycle = ((streak - 1) % 7) + 1
  return DAILY_LOGIN_REWARD_BY_DAY_IN_CYCLE[dayInCycle - 1]
}

// Trunca um ISO qualquer pro número de dias desde a época Unix, em UTC — mesmo raciocínio de
// "dia" já usado pelo carimbo de `lastPlayedAt` (lab-91), que também é gravado em UTC
// (`new Date().toISOString()`). Vira do dia limpo à meia-noite LOCAL do fuso do jogador em vez de
// UTC (ex.: Brasil, UTC-3, a virada acontece 21h no relógio local) — simplificação conhecida,
// documentada em vez de escondida; não afeta a contagem em si, só EM QUE HORÁRIO exato ela vira.
function utcDayNumber(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 86_400_000)
}

export interface DailyLoginResult {
  progress: Progress
  granted: boolean
  streak: number
  coins: number
}

// `previousLastPlayedAtIso` deve ser o valor de `loadLastPlayedAt()` lido ANTES de
// `touchLastPlayed()` sobrescrever — `App.tsx` é quem garante essa ordem (ver comentário lá).
// `null` (primeira sessão de todas deste perfil) conta como um hiato — sempre começa do dia 1,
// mesma regra de qualquer volta depois de 2+ dias sem abrir o jogo.
export function applyDailyLoginReward(
  progress: Progress,
  previousLastPlayedAtIso: string | null,
  nowIso: string,
): DailyLoginResult {
  const dayGap = previousLastPlayedAtIso === null ? Infinity : utcDayNumber(nowIso) - utcDayNumber(previousLastPlayedAtIso)

  // lab-149 (achado do Copilot, PR #9): `dayGap` negativo (relógio do sistema ajustado pra trás,
  // ou `lastPlayedAt` corrompido) caía no `else` abaixo igual a qualquer outro valor diferente de
  // 1 — resetava a streak pra 1 e CONCEDIA moeda, permitindo farm infinito só ajustando o relógio
  // do aparelho pra trás e pra frente. `dayGap <= 0` (mesmo dia OU um "dia" que voltou no tempo)
  // agora conta como "não concede", mesmo tratamento de idempotência de `dayGap === 0`.
  //
  // Segundo round do Copilot (mesmo PR): `dayGap <= 0` sozinho NÃO cobre `NaN` — comparações com
  // `NaN` são sempre `false` em JS, então um `lastPlayedAt` corrompido (ISO inválido,
  // `utcDayNumber` devolve `NaN`) passava direto por essa guarda e caía no mesmo caminho de
  // "conceder" que o bug original. `!Number.isFinite(dayGap)` cobre `NaN`/`Infinity` INESPERADO
  // (a `Infinity` intencional de "primeira sessão" já foi tratada — `dayGap === Infinity` só
  // acontece quando `previousLastPlayedAtIso === null`, que sempre concede de propósito; qualquer
  // OUTRO não-finito só pode vir de dado corrompido).
  const dayGapIsCorrupted = previousLastPlayedAtIso !== null && !Number.isFinite(dayGap)
  if (dayGap <= 0 || dayGapIsCorrupted) {
    return { progress, granted: false, streak: progress.loginStreak, coins: 0 }
  }

  const streak = dayGap === 1 ? progress.loginStreak + 1 : 1
  const coins = dailyLoginRewardFor(streak)
  return {
    progress: { ...progress, loginStreak: streak, coins: progress.coins + coins },
    granted: true,
    streak,
    coins,
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

// Mobília de Minha Casa (lab-106) — NÃO usa `unlockGeneric` (que bloqueia comprar de novo um id já
// possuído) desde o lab-138 (pedido do usuário: "tem que dar pra colocar mais de um item na casa
// do mesmo, comprando outro, nao so um"): `unlockedFurnitureIds` guarda um id REPETIDO por cópia
// comprada (não é mais um conjunto de "tenho/não tenho") — a quantidade de um item é
// `unlockedFurnitureIds.filter(x => x === id).length`, contada onde precisar (`MyHousePanel.tsx`,
// `World3D.tsx`). Item `subscriptionOnly`/`planetReward` continua de fora (nunca comprável com
// moeda, cada um sempre 0 ou 1 cópia, concedido por outro caminho).
export function unlockFurniture(progress: Progress, id: string): Progress {
  const item = FURNITURE_CATALOG.find((c) => c.id === id)
  if (!item || item.subscriptionOnly || item.planetReward) return progress
  if (progress.coins < item.cost) return progress
  return {
    ...progress,
    coins: progress.coins - item.cost,
    unlockedFurnitureIds: [...progress.unlockedFurnitureIds, id],
  }
}

// Quantas cópias de um item o jogador tem de verdade (lab-138) — fonte única de verdade
// reaproveitada tanto pelo painel (`MyHousePanel.tsx`, quantas linhas "Mover" mostrar) quanto pela
// sala 3D (`World3D.tsx`, quantas peças construir), pra nunca divergir uma da outra. Item
// `subscriptionOnly` não usa `unlockedFurnitureIds` pra nada (nunca é comprado, ver
// `unlockFurniture` acima) — sempre 0 ou 1, direto do entitlement. Os outros (compráveis normais E
// recompensa de planeta) contam quantas vezes o id se repete em `unlockedFurnitureIds`.
export function furnitureQuantity(item: FurnitureOption, progress: Progress, entitlementActive: boolean): number {
  if (item.subscriptionOnly) return entitlementActive ? 1 : 0
  return progress.unlockedFurnitureIds.filter((x) => x === item.id).length
}

// Posicionamento manual de mobília dentro de casa (lab-136, pedido do usuário: "tem que ter
// opção... de escolher em que posição da casa deve ficar a peça... o ângulo e posição onde fica o
// objeto"). Pura escrita de coordenadas já escolhidas pelo jogador na cena 3D — a geometria/
// limites da sala (`HOUSE_ROOM_HALF_SIZE` etc.) são de `World3D.tsx`, que já clampa a posição
// ANTES de confirmar; esta função não precisa (nem deve) conhecer nada de 3D, só guarda o
// resultado, igual a todo outro `unlockXxx` deste arquivo.
export function setFurniturePlacement(progress: Progress, id: string, x: number, z: number, rotY: number): Progress {
  return { ...progress, housePlacements: { ...progress.housePlacements, [id]: { x, z, rotY } } }
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
