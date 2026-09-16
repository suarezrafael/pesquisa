// Testes da lógica de domínio de progressão/recompensa/entitlement — requisito [MUST] de
// docs/prompts/04-manutencao-clean-code.md §5: "lógica de domínio (cálculo de recompensa,
// validação de resposta de quest, regra de entitlement por assinatura) tem teste unitário... a
// mais custosa de errar silenciosamente (ex.: dar recompensa errada, liberar feature paga de
// graça)". Este arquivo é o primeiro teste automatizado do projeto (lab-83).
import { describe, expect, it } from 'vitest'
import {
  adoptPet,
  applyCoinCollected,
  applyCoopChallengeCompleted,
  applyPetDailyChallengeCompleted,
  applyDailyLoginReward,
  applyPlanetQuestCompletion,
  applyPostcardCollected,
  applyQuestCompletion,
  applyStreakReset,
  applyTreasureChestFound,
  applyPlanetSecretFound,
  backfillPetAdoptedAt,
  badgesEarnedAt,
  BADGE_ALL_DONE,
  BADGE_COOP_FIRST,
  BADGE_FIRST_QUEST,
  canChangeNickname,
  equipPet,
  feedPet,
  furnitureQuantity,
  visitFurnitureQuantity,
  setHouseVisible,
  resolveHouseSyncSnapshot,
  getLevel,
  isQuestUnlocked,
  nextPlanetDiscovery,
  petAgeYears,
  planetDiscoverySlots,
  petLifecycleStage,
  petStageFor,
  petStageScale,
  petVisualScale,
  selectEnvironmentalChallengeQuest,
  seriesForLevel,
  skillBreakdown,
  syncWeeklyXpSnapshot,
  weeklyXpEarned,
  applyWeeklyEventObjectiveProgress,
  isWeeklyEventObjectiveDone,
  wouldGrantWeeklyEventObjectiveReward,
  weeklyEventObjectiveStatus,
  SUBSCRIBER_COIN_MULTIPLIER,
  unlockAvatar,
  unlockBackpackColor,
  unlockFurniture,
  setFurniturePlacement,
  removeFurniture,
  unlockGlasses,
  unlockHat,
  unlockHairShape,
  unlockMarsReward,
  markMarsCoinPotFound,
  unlockPantsColor,
  unlockPlanetFurnitureReward,
  unlockShirtColor,
  unlockShoeColor,
  xpForLevel,
  xpIntoLevel,
} from './progression'
import { emptyProgress } from './storage'
import { findFurnitureById } from '../data/furniture'
import { PET_CATALOG } from '../data/pets'
import { quests } from '../data/quests'
import { planetQuests } from '../data/planetQuests'
import type { Quest } from '../types'
import { WEEKLY_EVENT_OBJECTIVE_REWARD_COINS, type WeeklyEvent } from '../data/weeklyEvents'

const NO_BONUS_EVENT: WeeklyEvent = {
  id: 'teste',
  name: 'Sem evento',
  emoji: '📅',
  description: 'teste',
  xpMultiplier: 1,
  coinMultiplier: 1,
}

function makeQuest(overrides: Partial<Quest> = {}): Quest {
  return {
    id: 'quest-teste',
    type: 'logica',
    title: 'Quest de teste',
    prompt: 'Pergunta?',
    choices: [{ id: 'a', label: 'A' }],
    correctChoiceId: 'a',
    xpReward: 10,
    coinReward: 5,
    ...overrides,
  }
}

describe('níveis e XP', () => {
  it('nível 1 começa em 0 XP', () => {
    expect(getLevel(0)).toBe(1)
  })

  it('sobe de nível exatamente no limiar de xpForLevel', () => {
    const threshold = xpForLevel(1)
    expect(getLevel(threshold - 1)).toBe(1)
    expect(getLevel(threshold)).toBe(2)
  })

  it('xpIntoLevel reporta progresso relativo ao nível atual, não o XP total', () => {
    const { current, needed } = xpIntoLevel(xpForLevel(1) + 5)
    expect(current).toBe(5)
    expect(needed).toBe(xpForLevel(2) - xpForLevel(1))
  })
})

describe('badges', () => {
  it('dá a badge de primeira missão só depois de completar 1', () => {
    expect(badgesEarnedAt(0)).not.toContain('Primeira Missão')
    expect(badgesEarnedAt(1)).toContain('Primeira Missão')
  })

  it('dá a badge de "todas concluídas" só ao completar o catálogo inteiro de quests', () => {
    expect(badgesEarnedAt(quests.length - 1)).not.toContain('Mestre das Missões')
    expect(badgesEarnedAt(quests.length)).toContain('Mestre das Missões')
  })
})

describe('applyQuestCompletion — recompensa e evento semanal', () => {
  it('credita XP/moedas da quest sem multiplicador quando não há evento de bônus', () => {
    const quest = makeQuest({ xpReward: 20, coinReward: 8 })
    const result = applyQuestCompletion(emptyProgress, quest, NO_BONUS_EVENT)
    expect(result.awardedXp).toBe(20)
    expect(result.awardedCoins).toBe(8)
    expect(result.progress.xp).toBe(20)
    expect(result.progress.coins).toBe(8)
  })

  it('aplica o multiplicador do evento semanal na recompensa creditada, não no valor base da quest', () => {
    const quest = makeQuest({ xpReward: 10, coinReward: 10 })
    const dobrado: WeeklyEvent = { ...NO_BONUS_EVENT, xpMultiplier: 2, coinMultiplier: 1.5 }
    const result = applyQuestCompletion(emptyProgress, quest, dobrado)
    expect(result.awardedXp).toBe(20)
    expect(result.awardedCoins).toBe(15)
    // a quest original não deve ser mutada
    expect(quest.xpReward).toBe(10)
  })

  it('não credita recompensa de novo ao completar a mesma quest duas vezes', () => {
    const quest = makeQuest()
    const first = applyQuestCompletion(emptyProgress, quest, NO_BONUS_EVENT)
    const second = applyQuestCompletion(first.progress, quest, NO_BONUS_EVENT)
    expect(second.awardedXp).toBe(0)
    expect(second.awardedCoins).toBe(0)
    expect(second.progress).toBe(first.progress)
  })

  it('só concede uma badge nova (newBadges) na primeira vez que ela é alcançada', () => {
    const quest = makeQuest()
    const first = applyQuestCompletion(emptyProgress, quest, NO_BONUS_EVENT)
    expect(first.newBadges).toContain('Primeira Missão')

    const quest2 = makeQuest({ id: 'quest-teste-2' })
    const second = applyQuestCompletion(first.progress, quest2, NO_BONUS_EVENT)
    expect(second.newBadges).not.toContain('Primeira Missão')
  })
})

describe('applyQuestCompletion — bônus de moeda de assinante (lab-126)', () => {
  it('sem assinatura ativa, comportamento idêntico a antes (nenhum bônus)', () => {
    const quest = makeQuest({ xpReward: 20, coinReward: 8 })
    const result = applyQuestCompletion(emptyProgress, quest, NO_BONUS_EVENT, false)
    expect(result.awardedXp).toBe(20)
    expect(result.awardedCoins).toBe(8)
  })

  it('com assinatura ativa, multiplica só as moedas — XP fica intocado', () => {
    const quest = makeQuest({ xpReward: 20, coinReward: 8 })
    const result = applyQuestCompletion(emptyProgress, quest, NO_BONUS_EVENT, true)
    expect(result.awardedXp).toBe(20)
    expect(result.awardedCoins).toBe(Math.round(8 * SUBSCRIBER_COIN_MULTIPLIER))
  })

  it('empilha o bônus de assinante com o multiplicador do evento semanal', () => {
    const quest = makeQuest({ xpReward: 10, coinReward: 10 })
    const dobrado: WeeklyEvent = { ...NO_BONUS_EVENT, xpMultiplier: 2, coinMultiplier: 2 }
    const result = applyQuestCompletion(emptyProgress, quest, dobrado, true)
    expect(result.awardedXp).toBe(20)
    expect(result.awardedCoins).toBe(Math.round(10 * 2 * SUBSCRIBER_COIN_MULTIPLIER))
  })

  it('não credita bônus de assinante de novo ao completar a mesma quest duas vezes', () => {
    const quest = makeQuest()
    const first = applyQuestCompletion(emptyProgress, quest, NO_BONUS_EVENT, true)
    const second = applyQuestCompletion(first.progress, quest, NO_BONUS_EVENT, true)
    expect(second.awardedCoins).toBe(0)
  })
})

describe('applyPlanetQuestCompletion — escolinhas de astronomia dos planetas (lab-115)', () => {
  it('credita XP/moedas de verdade, com multiplicador do evento semanal', () => {
    const quest = makeQuest({ id: 'planet-teste', xpReward: 20, coinReward: 8 })
    const dobrado: WeeklyEvent = { ...NO_BONUS_EVENT, xpMultiplier: 2, coinMultiplier: 1 }
    const result = applyPlanetQuestCompletion(emptyProgress, quest, dobrado)
    expect(result.awardedXp).toBe(40)
    expect(result.awardedCoins).toBe(8)
    expect(result.progress.xp).toBe(40)
    expect(result.progress.completedPlanetQuestIds).toEqual(['planet-teste'])
  })

  it('não credita recompensa de novo ao completar a mesma escolinha de planeta duas vezes', () => {
    const quest = makeQuest({ id: 'planet-teste' })
    const first = applyPlanetQuestCompletion(emptyProgress, quest, NO_BONUS_EVENT)
    const second = applyPlanetQuestCompletion(first.progress, quest, NO_BONUS_EVENT)
    expect(second.awardedXp).toBe(0)
    expect(second.awardedCoins).toBe(0)
    expect(second.progress).toBe(first.progress)
  })

  it('nunca mexe em completedQuestIds/badges do planeta principal', () => {
    const quest = makeQuest({ id: 'planet-teste' })
    const result = applyPlanetQuestCompletion(emptyProgress, quest, NO_BONUS_EVENT)
    expect(result.progress.completedQuestIds).toEqual([])
    expect(result.progress.badges).toEqual([])
    expect(result.newBadges).toEqual([])
  })

  it('aplica o bônus de moeda de assinante (lab-126) só nas moedas, igual às missões normais', () => {
    const quest = makeQuest({ id: 'planet-teste', xpReward: 20, coinReward: 8 })
    const result = applyPlanetQuestCompletion(emptyProgress, quest, NO_BONUS_EVENT, true)
    expect(result.awardedXp).toBe(20)
    expect(result.awardedCoins).toBe(Math.round(8 * SUBSCRIBER_COIN_MULTIPLIER))
  })
})

describe('applyPlanetQuestCompletion — bônus por limpar o planeta inteiro (lab-133)', () => {
  it('não concede o bônus antes da 6ª (última) escolinha do planeta', () => {
    let progress = emptyProgress
    for (const quest of planetQuests.mercurio.slice(0, 5)) {
      const result = applyPlanetQuestCompletion(progress, quest, NO_BONUS_EVENT)
      expect(result.planetClearBonusXp).toBeUndefined()
      expect(result.planetClearBonusCoins).toBeUndefined()
      progress = result.progress
    }
  })

  it('concede +50 XP / +30 moedas exatamente ao responder a 6ª escolinha, sem evento/assinatura', () => {
    let progress = emptyProgress
    for (const quest of planetQuests.mercurio.slice(0, 5)) {
      progress = applyPlanetQuestCompletion(progress, quest, NO_BONUS_EVENT).progress
    }
    const last = applyPlanetQuestCompletion(progress, planetQuests.mercurio[5], NO_BONUS_EVENT)
    expect(last.planetClearBonusXp).toBe(50)
    expect(last.planetClearBonusCoins).toBe(30)
  })

  it('aplica o multiplicador de evento semanal e o bônus de assinante no bônus de limpar o planeta', () => {
    let progress = emptyProgress
    const dobrado: WeeklyEvent = { ...NO_BONUS_EVENT, xpMultiplier: 2, coinMultiplier: 2 }
    for (const quest of planetQuests.venus.slice(0, 5)) {
      progress = applyPlanetQuestCompletion(progress, quest, dobrado, true).progress
    }
    const last = applyPlanetQuestCompletion(progress, planetQuests.venus[5], dobrado, true)
    expect(last.planetClearBonusXp).toBe(100) // 50 × 2 (evento)
    expect(last.planetClearBonusCoins).toBe(Math.round(30 * 2 * SUBSCRIBER_COIN_MULTIPLIER)) // 30 × 2 (evento) × 1.5 (assinante)
  })

  it('não concede o bônus de novo ao reabrir uma escolinha já respondida do planeta já limpo', () => {
    let progress = emptyProgress
    for (const quest of planetQuests.mercurio) {
      progress = applyPlanetQuestCompletion(progress, quest, NO_BONUS_EVENT).progress
    }
    const again = applyPlanetQuestCompletion(progress, planetQuests.mercurio[5], NO_BONUS_EVENT)
    expect(again.planetClearBonusXp).toBeUndefined()
    expect(again.planetClearBonusCoins).toBeUndefined()
    expect(again.progress).toBe(progress)
  })

  it('applyQuestCompletion (missões do planeta principal) nunca popula os campos de bônus de planeta', () => {
    const quest = makeQuest()
    const result = applyQuestCompletion(emptyProgress, quest, NO_BONUS_EVENT)
    expect(result.planetClearBonusXp).toBeUndefined()
    expect(result.planetClearBonusCoins).toBeUndefined()
  })
})

describe('applyPlanetQuestCompletion — mobília de conquista de planeta (lab-130)', () => {
  it('não concede nada antes da 6ª (última) escolinha do planeta ser respondida', () => {
    let progress = emptyProgress
    const mercurio = planetQuests.mercurio
    for (const quest of mercurio.slice(0, 5)) {
      const result = applyPlanetQuestCompletion(progress, quest, NO_BONUS_EVENT)
      expect(result.unlockedFurnitureItem).toBeUndefined()
      progress = result.progress
    }
    expect(progress.unlockedFurnitureIds).not.toContain('meteorito_mercurio')
  })

  it('concede o item exclusivo do planeta exatamente ao responder a 6ª escolinha', () => {
    let progress = emptyProgress
    const mercurio = planetQuests.mercurio
    for (const quest of mercurio.slice(0, 5)) {
      progress = applyPlanetQuestCompletion(progress, quest, NO_BONUS_EVENT).progress
    }
    const last = applyPlanetQuestCompletion(progress, mercurio[5], NO_BONUS_EVENT)
    expect(last.unlockedFurnitureItem?.id).toBe('meteorito_mercurio')
    expect(last.progress.unlockedFurnitureIds).toContain('meteorito_mercurio')
  })

  it('não concede o item de novo ao reabrir uma escolinha já respondida do planeta já conquistado', () => {
    let progress = emptyProgress
    const mercurio = planetQuests.mercurio
    for (const quest of mercurio) {
      progress = applyPlanetQuestCompletion(progress, quest, NO_BONUS_EVENT).progress
    }
    const again = applyPlanetQuestCompletion(progress, mercurio[5], NO_BONUS_EVENT)
    expect(again.unlockedFurnitureItem).toBeUndefined()
    expect(again.progress).toBe(progress)
  })

  it('cada planeta concede o item certo, sem confundir um com o outro', () => {
    let progress = emptyProgress
    for (const quest of planetQuests.venus) {
      progress = applyPlanetQuestCompletion(progress, quest, NO_BONUS_EVENT).progress
    }
    expect(progress.unlockedFurnitureIds).toContain('vulcao_venus')
    expect(progress.unlockedFurnitureIds).not.toContain('meteorito_mercurio')
  })
})

describe('unlockPlanetFurnitureReward (lab-130)', () => {
  it('concede o item na primeira vez', () => {
    const result = unlockPlanetFurnitureReward(emptyProgress, 'saturno')
    expect(result.granted).toBe(true)
    expect(result.item?.id).toBe('anel_saturno')
    expect(result.progress.unlockedFurnitureIds).toContain('anel_saturno')
  })

  it('é idempotente — não concede de novo se o jogador já tiver o item', () => {
    const jaTem = { ...emptyProgress, unlockedFurnitureIds: [...emptyProgress.unlockedFurnitureIds, 'anel_saturno'] }
    const result = unlockPlanetFurnitureReward(jaTem, 'saturno')
    expect(result.granted).toBe(false)
    expect(result.progress).toBe(jaTem)
  })

  it('não faz nada pra um planeta sem item de recompensa cadastrado', () => {
    const result = unlockPlanetFurnitureReward(emptyProgress, 'planeta-inexistente')
    expect(result.granted).toBe(false)
  })
})

describe('unlockFurniture — itens de recompensa de planeta não são compráveis (lab-130)', () => {
  it('não deixa comprar um item planetReward mesmo com moeda de sobra', () => {
    const comMoedas = { ...emptyProgress, coins: 9999 }
    const next = unlockFurniture(comMoedas, 'meteorito_mercurio')
    expect(next).toBe(comMoedas)
    expect(next.unlockedFurnitureIds).not.toContain('meteorito_mercurio')
    expect(next.coins).toBe(9999)
  })
})

describe('removeFurniture (lab-170, pedido do usuário: "tem que ter como excluir objetos")', () => {
  it('remove uma cópia sem devolver moeda', () => {
    const progress = { ...emptyProgress, coins: 3, unlockedFurnitureIds: ['planta', 'planta'] }
    const next = removeFurniture(progress, 'planta#0')
    expect(next.unlockedFurnitureIds).toEqual(['planta'])
    expect(next.coins).toBe(3) // nunca reembolsa, decisão confirmada com o usuário
  })

  it('reindexa housePlacements ao excluir uma cópia do MEIO, preservando a posição das que sobram', () => {
    const progress = {
      ...emptyProgress,
      unlockedFurnitureIds: ['planta', 'planta', 'planta'],
      housePlacements: {
        'planta#0': { x: 1, z: 1, rotY: 0 },
        'planta#1': { x: 2, z: 2, rotY: 0.5 },
        'planta#2': { x: 3, z: 3, rotY: 1 },
      },
    }
    const next = removeFurniture(progress, 'planta#1')
    expect(next.unlockedFurnitureIds).toEqual(['planta', 'planta'])
    // a cópia #0 não mexe; a que era #2 vira #1, preservando SUA posição (3,3), não a da excluída
    expect(next.housePlacements['planta#0']).toEqual({ x: 1, z: 1, rotY: 0 })
    expect(next.housePlacements['planta#1']).toEqual({ x: 3, z: 3, rotY: 1 })
    expect(next.housePlacements['planta#2']).toBeUndefined()
  })

  it('não remove item subscriptionOnly nem planetReward', () => {
    const progress = { ...emptyProgress, unlockedFurnitureIds: ['meteorito_mercurio'] }
    const next = removeFurniture(progress, 'meteorito_mercurio#0')
    expect(next).toBe(progress)
  })

  it('não faz nada com um índice fora do intervalo (ex.: já excluído, chave obsoleta)', () => {
    const progress = { ...emptyProgress, unlockedFurnitureIds: ['planta'] }
    const next = removeFurniture(progress, 'planta#5')
    expect(next).toBe(progress)
  })

  it('não faz nada com um item que não existe no catálogo', () => {
    const progress = { ...emptyProgress, unlockedFurnitureIds: ['planta'] }
    const next = removeFurniture(progress, 'item-que-nao-existe#0')
    expect(next).toBe(progress)
  })

  it('descarta (nunca propaga como "#NaN") uma chave de housePlacements legada/corrompida sem índice numérico', () => {
    const progress = {
      ...emptyProgress,
      unlockedFurnitureIds: ['planta', 'planta'],
      housePlacements: {
        planta: { x: 9, z: 9, rotY: 0 }, // chave legada sem "#<índice>" — nunca deveria existir, mas não pode virar lixo
        'planta#1': { x: 1, z: 1, rotY: 0 },
      },
    }
    const next = removeFurniture(progress, 'planta#0')
    expect(Object.keys(next.housePlacements)).not.toContain('planta#NaN')
    expect(next.housePlacements['planta#0']).toEqual({ x: 1, z: 1, rotY: 0 })
  })
})

describe('combo de respostas certas seguidas (lab-132)', () => {
  it('não credita bônus antes do 3º acerto seguido', () => {
    let progress = emptyProgress
    for (let i = 0; i < 2; i++) {
      const quest = makeQuest({ id: `combo-teste-${i}` })
      const result = applyQuestCompletion(progress, quest, NO_BONUS_EVENT)
      expect(result.streakBonusCoins).toBe(0)
      progress = result.progress
    }
    expect(progress.currentStreak).toBe(2)
  })

  it('credita o bônus certo no 3º, 5º e 10º acerto seguido', () => {
    let progress = emptyProgress
    let lastResult: ReturnType<typeof applyQuestCompletion> | null = null
    for (let i = 0; i < 10; i++) {
      const quest = makeQuest({ id: `combo-teste-${i}` })
      lastResult = applyQuestCompletion(progress, quest, NO_BONUS_EVENT)
      progress = lastResult.progress
      if (i === 2) expect(lastResult.streakBonusCoins).toBe(5) // 3º acerto (índice 2)
      if (i === 4) expect(lastResult.streakBonusCoins).toBe(10) // 5º acerto
      if (i === 9) expect(lastResult.streakBonusCoins).toBe(20) // 10º acerto
    }
    expect(progress.currentStreak).toBe(10)
  })

  it('não incrementa o combo nem credita bônus de novo ao completar a mesma missão duas vezes', () => {
    const quest = makeQuest({ id: 'combo-repetido' })
    const first = applyQuestCompletion(emptyProgress, quest, NO_BONUS_EVENT)
    const second = applyQuestCompletion(first.progress, quest, NO_BONUS_EVENT)
    expect(second.currentStreak).toBe(first.currentStreak)
    expect(second.streakBonusCoins).toBe(0)
    expect(second.progress).toBe(first.progress)
  })

  it('o combo é COMPARTILHADO entre missão principal e escolinha de planeta', () => {
    const quest1 = makeQuest({ id: 'combo-principal-1' })
    const quest2 = makeQuest({ id: 'combo-principal-2' })
    const planetQuest = makeQuest({ id: 'planet-combo-teste' })
    let progress = applyQuestCompletion(emptyProgress, quest1, NO_BONUS_EVENT).progress
    progress = applyQuestCompletion(progress, quest2, NO_BONUS_EVENT).progress
    const third = applyPlanetQuestCompletion(progress, planetQuest, NO_BONUS_EVENT)
    expect(third.currentStreak).toBe(3)
    expect(third.streakBonusCoins).toBe(5)
  })

  it('applyStreakReset zera o combo', () => {
    const quest = makeQuest({ id: 'combo-antes-do-reset' })
    const withStreak = applyQuestCompletion(emptyProgress, quest, NO_BONUS_EVENT).progress
    expect(withStreak.currentStreak).toBe(1)
    const reset = applyStreakReset(withStreak)
    expect(reset.currentStreak).toBe(0)
  })

  it('applyStreakReset é idempotente — não muda a referência se já estava zerado', () => {
    expect(applyStreakReset(emptyProgress)).toBe(emptyProgress)
  })
})

describe('applyTreasureChestFound — baús de tesouro escondidos (lab-131)', () => {
  it('credita a moeda do baú e marca como achado na primeira vez', () => {
    const result = applyTreasureChestFound(emptyProgress, 'bau-mercurio')
    expect(result.granted).toBe(true)
    expect(result.progress.coins).toBe(15)
    expect(result.progress.foundTreasureChestIds).toEqual(['bau-mercurio'])
  })

  it('é idempotente — não credita de novo se o baú já tiver sido achado', () => {
    const first = applyTreasureChestFound(emptyProgress, 'bau-mercurio')
    const second = applyTreasureChestFound(first.progress, 'bau-mercurio')
    expect(second.granted).toBe(false)
    expect(second.progress).toBe(first.progress)
    expect(second.progress.coins).toBe(15)
  })

  it('baús de planetas diferentes não se confundem', () => {
    const first = applyTreasureChestFound(emptyProgress, 'bau-mercurio')
    const second = applyTreasureChestFound(first.progress, 'bau-venus')
    expect(second.granted).toBe(true)
    expect(second.progress.coins).toBe(30)
    expect(second.progress.foundTreasureChestIds).toEqual(['bau-mercurio', 'bau-venus'])
  })

  it('não faz nada (nem quebra) pra um chestId inexistente', () => {
    const result = applyTreasureChestFound(emptyProgress, 'bau-inexistente')
    expect(result.granted).toBe(false)
    expect(result.progress).toBe(emptyProgress)
  })
})

describe('applyPlanetSecretFound — segredos visuais escondidos (lab-179)', () => {
  it('credita a moeda do segredo e marca como achado na primeira vez', () => {
    const result = applyPlanetSecretFound(emptyProgress, 'segredo-marte-sonda')
    expect(result.granted).toBe(true)
    expect(result.progress.coins).toBe(15)
    expect(result.progress.foundPlanetSecretIds).toEqual(['segredo-marte-sonda'])
  })

  it('é idempotente — não credita de novo se o segredo já tiver sido achado', () => {
    const first = applyPlanetSecretFound(emptyProgress, 'segredo-marte-sonda')
    const second = applyPlanetSecretFound(first.progress, 'segredo-marte-sonda')
    expect(second.granted).toBe(false)
    expect(second.progress).toBe(first.progress)
    expect(second.progress.coins).toBe(15)
  })

  it('não faz nada (nem quebra) pra um secretId inexistente', () => {
    const result = applyPlanetSecretFound(emptyProgress, 'segredo-inexistente')
    expect(result.granted).toBe(false)
    expect(result.progress).toBe(emptyProgress)
  })
})

describe('isQuestUnlocked', () => {
  it('a primeira quest do catálogo real está sempre desbloqueada', () => {
    expect(isQuestUnlocked(emptyProgress, 0)).toBe(true)
  })

  it('a segunda quest só desbloqueia depois de completar a primeira', () => {
    if (quests.length < 2) return
    expect(isQuestUnlocked(emptyProgress, 1)).toBe(false)
    const progressComQuestUm: typeof emptyProgress = {
      ...emptyProgress,
      completedQuestIds: [quests[0].id],
    }
    expect(isQuestUnlocked(progressComQuestUm, 1)).toBe(true)
  })
})

describe('skillBreakdown (lab-167)', () => {
  it('perfil sem missão concluída começa zerado nas 3 habilidades', () => {
    expect(skillBreakdown(emptyProgress)).toEqual({ logica: 0, matematica: 0, leitura: 0 })
  })

  it('conta cada missão concluída na habilidade certa', () => {
    const logica = quests.find((q) => q.type === 'logica')!
    const matematica = quests.find((q) => q.type === 'matematica')!
    const leitura = quests.find((q) => q.type === 'leitura')!
    const progress: typeof emptyProgress = {
      ...emptyProgress,
      completedQuestIds: [logica.id, matematica.id],
    }
    const result = skillBreakdown(progress)
    expect(result.logica).toBe(1)
    expect(result.matematica).toBe(1)
    expect(result.leitura).toBe(0)
    // sanidade: a missão de leitura escolhida acima nunca foi marcada como concluída
    expect(progress.completedQuestIds).not.toContain(leitura.id)
  })

  it('nunca conta as perguntas de astronomia dos outros planetas (completedPlanetQuestIds)', () => {
    const progress: typeof emptyProgress = {
      ...emptyProgress,
      completedPlanetQuestIds: Object.values(planetQuests).flat().map((q) => q.id),
    }
    expect(skillBreakdown(progress)).toEqual({ logica: 0, matematica: 0, leitura: 0 })
  })
})

describe('selectEnvironmentalChallengeQuest (lab-180, "Missões ambientais de aprendizagem")', () => {
  it('sorteia só entre missões do tipo pedido', () => {
    const quest = selectEnvironmentalChallengeQuest('matematica', [], () => 0)
    expect(quest.type).toBe('matematica')
  })

  it('prioriza uma missão ainda não concluída do tipo', () => {
    const allMatematica = quests.filter((q) => q.type === 'matematica')
    // completa todas menos a última do tipo
    const completedQuestIds = allMatematica.slice(0, -1).map((q) => q.id)
    const quest = selectEnvironmentalChallengeQuest('matematica', completedQuestIds, () => 0)
    expect(quest.id).toBe(allMatematica[allMatematica.length - 1].id)
  })

  it('cai pro pool inteiro do tipo se todas já foram concluídas (nunca trava sem opção)', () => {
    const allLeitura = quests.filter((q) => q.type === 'leitura')
    const completedQuestIds = allLeitura.map((q) => q.id)
    const quest = selectEnvironmentalChallengeQuest('leitura', completedQuestIds, () => 0)
    expect(quest.type).toBe('leitura')
    expect(allLeitura.map((q) => q.id)).toContain(quest.id)
  })

  it('usa o RNG injetado pra escolher a posição dentro do pool (determinístico em teste)', () => {
    const allLogica = quests.filter((q) => q.type === 'logica')
    const first = selectEnvironmentalChallengeQuest('logica', [], () => 0)
    const last = selectEnvironmentalChallengeQuest('logica', [], () => 0.999999)
    expect(first.id).toBe(allLogica[0].id)
    expect(last.id).toBe(allLogica[allLogica.length - 1].id)
  })
})

describe('applyCoinCollected', () => {
  it('soma exatamente 1 moeda', () => {
    const next = applyCoinCollected(emptyProgress)
    expect(next.coins).toBe(emptyProgress.coins + 1)
  })
})

// Regressão do lab-83: um item marcado `subscriptionOnly` tem `cost: 0` (mesma convenção usada
// pro item padrão grátis de cada catálogo) — sem a checagem explícita, `unlockXxx` liberava um
// cosmético exclusivo de assinante de graça pra sempre, mesmo sem entitlement ativo. A UI da
// lojinha já não oferece botão de compra pra esses itens, mas a regra de negócio real tem que
// viver aqui, não só na renderização condicional do componente.
describe('itens exclusivos de assinante nunca são obtidos via moeda (Fase E)', () => {
  it('unlockAvatar recusa um avatar subscriptionOnly mesmo com moedas suficientes', () => {
    const comMoedas = { ...emptyProgress, coins: 9999 }
    const next = unlockAvatar(comMoedas, 'fenix')
    expect(next.unlockedAvatarIds).not.toContain('fenix')
    expect(next.coins).toBe(9999)
  })

  it('unlockHat recusa um chapéu subscriptionOnly mesmo com moedas suficientes', () => {
    const comMoedas = { ...emptyProgress, coins: 9999 }
    const next = unlockHat(comMoedas, 'coroa_diamante')
    expect(next.unlockedHatIds).not.toContain('coroa_diamante')
  })

  it('unlockShirtColor recusa a Camisa Holográfica mesmo com moedas suficientes', () => {
    const comMoedas = { ...emptyProgress, coins: 9999 }
    const next = unlockShirtColor(comMoedas, 'camisa_holografica')
    expect(next.unlockedShirtColorIds).not.toContain('camisa_holografica')
  })

  it('unlockPantsColor recusa a Calça Estelar mesmo com moedas suficientes', () => {
    const next = unlockPantsColor({ ...emptyProgress, coins: 9999 }, 'calca_estelar')
    expect(next.unlockedPantsColorIds).not.toContain('calca_estelar')
  })

  it('unlockShoeColor recusa o Tênis Neon mesmo com moedas suficientes', () => {
    const next = unlockShoeColor({ ...emptyProgress, coins: 9999 }, 'sapato_neon')
    expect(next.unlockedShoeColorIds).not.toContain('sapato_neon')
  })

  it('unlockBackpackColor recusa a Mochila Dourada mesmo com moedas suficientes', () => {
    const next = unlockBackpackColor({ ...emptyProgress, coins: 9999 }, 'mochila_dourada')
    expect(next.unlockedBackpackColorIds).not.toContain('mochila_dourada')
  })

  // lab-92: mesmo teste de regressão pro eixo de óculos, novo neste laboratório.
  it('unlockGlasses recusa os Óculos de Realidade Virtual mesmo com moedas suficientes', () => {
    const next = unlockGlasses({ ...emptyProgress, coins: 9999 }, 'oculos_rv')
    expect(next.unlockedGlassesIds).not.toContain('oculos_rv')
    expect(next.coins).toBe(9999)
  })

  // lab-94: mesmo teste de regressão, pro brinde exclusivo de Marte — nunca liberável pelo botão
  // de compra normal, só por `unlockMarsReward` (testado à parte abaixo).
  it('unlockHat recusa a Coroa de Herói de Marte mesmo com moedas suficientes', () => {
    const next = unlockHat({ ...emptyProgress, coins: 9999 }, 'capacete_heroi_marte')
    expect(next.unlockedHatIds).not.toContain('capacete_heroi_marte')
    expect(next.coins).toBe(9999)
  })

  // lab-107: mesmo teste de regressão, pros dois sets de mobília exclusivos de assinante.
  it('unlockFurniture recusa a Cama-Nave (set Quarto Espacial) mesmo com moedas suficientes', () => {
    const next = unlockFurniture({ ...emptyProgress, coins: 9999 }, 'cama_nave')
    expect(next.unlockedFurnitureIds).not.toContain('cama_nave')
    expect(next.coins).toBe(9999)
  })

  it('unlockFurniture recusa as Borboletas Animadas (set Jardim Encantado) mesmo com moedas suficientes', () => {
    const next = unlockFurniture({ ...emptyProgress, coins: 9999 }, 'borboletas_animadas')
    expect(next.unlockedFurnitureIds).not.toContain('borboletas_animadas')
    expect(next.coins).toBe(9999)
  })
})

describe('unlockMarsReward (lab-94)', () => {
  it('concede o brinde na primeira vez, sem mexer em moeda', () => {
    const result = unlockMarsReward({ ...emptyProgress, coins: 7 })
    expect(result.granted).toBe(true)
    expect(result.progress.unlockedHatIds).toContain('capacete_heroi_marte')
    expect(result.progress.coins).toBe(7)
  })

  it('é idempotente — não concede de novo se o jogador já tiver o item', () => {
    const jaTem = { ...emptyProgress, unlockedHatIds: [...emptyProgress.unlockedHatIds, 'capacete_heroi_marte'] }
    const result = unlockMarsReward(jaTem)
    expect(result.granted).toBe(false)
    expect(result.progress).toBe(jaTem)
  })
})

describe('markMarsCoinPotFound (lab-181, marco permanente do pote de moedas)', () => {
  it('marca o marco na primeira vez', () => {
    const result = markMarsCoinPotFound(emptyProgress)
    expect(result.granted).toBe(true)
    expect(result.progress.foundMarsCoinPotEver).toBe(true)
  })

  it('é idempotente — não "concede" de novo se o marco já estiver marcado (pote continua repetível)', () => {
    const jaAchou = { ...emptyProgress, foundMarsCoinPotEver: true }
    const result = markMarsCoinPotFound(jaAchou)
    expect(result.granted).toBe(false)
    expect(result.progress).toBe(jaAchou)
  })
})

describe('applyPostcardCollected (lab-141)', () => {
  it('concede o cartão na primeira chegada, sem mexer em moeda/XP', () => {
    const result = applyPostcardCollected({ ...emptyProgress, coins: 7 }, 'marte')
    expect(result.granted).toBe(true)
    expect(result.progress.collectedPostcardIds).toContain('marte')
    expect(result.progress.coins).toBe(7)
    expect(result.progress.xp).toBe(emptyProgress.xp)
  })

  it('é idempotente — não concede de novo se o jogador já tiver o cartão', () => {
    const jaTem = { ...emptyProgress, collectedPostcardIds: ['marte'] }
    const result = applyPostcardCollected(jaTem, 'marte')
    expect(result.granted).toBe(false)
    expect(result.progress).toBe(jaTem)
  })

  it('não concede nada pra um id de planeta sem cartão no catálogo', () => {
    const result = applyPostcardCollected(emptyProgress, 'planeta-que-nao-existe')
    expect(result.granted).toBe(false)
    expect(result.progress).toBe(emptyProgress)
  })

  it('cartões de planetas diferentes acumulam independentemente', () => {
    const comMarte = applyPostcardCollected(emptyProgress, 'marte').progress
    const comOsDois = applyPostcardCollected(comMarte, 'venus')
    expect(comOsDois.granted).toBe(true)
    expect(comOsDois.progress.collectedPostcardIds).toEqual(['marte', 'venus'])
  })
})

describe('applyDailyLoginReward (lab-138)', () => {
  it('primeira sessão de todas (sem lastPlayedAt anterior) começa no dia 1 e premia', () => {
    const result = applyDailyLoginReward(emptyProgress, null, '2026-09-02T12:00:00.000Z')
    expect(result.granted).toBe(true)
    expect(result.streak).toBe(1)
    expect(result.coins).toBe(5)
    expect(result.progress.loginStreak).toBe(1)
    expect(result.progress.coins).toBe(5)
  })

  it('reabrir no mesmo dia não concede de novo (idempotente por dia)', () => {
    const comStreak = { ...emptyProgress, loginStreak: 3, coins: 100 }
    const result = applyDailyLoginReward(comStreak, '2026-09-02T08:00:00.000Z', '2026-09-02T20:00:00.000Z')
    expect(result.granted).toBe(false)
    expect(result.progress).toBe(comStreak)
    expect(result.coins).toBe(0)
  })

  it('abrir no dia seguinte incrementa a sequência e premia o valor daquele dia', () => {
    const comStreak = { ...emptyProgress, loginStreak: 1, coins: 0 }
    const result = applyDailyLoginReward(comStreak, '2026-09-01T10:00:00.000Z', '2026-09-02T10:00:00.000Z')
    expect(result.granted).toBe(true)
    expect(result.streak).toBe(2)
    expect(result.coins).toBe(8)
    expect(result.progress.loginStreak).toBe(2)
  })

  it('hiato de 2+ dias reinicia a sequência em 1, não zera', () => {
    const comStreak = { ...emptyProgress, loginStreak: 6, coins: 0 }
    const result = applyDailyLoginReward(comStreak, '2026-08-20T10:00:00.000Z', '2026-09-02T10:00:00.000Z')
    expect(result.granted).toBe(true)
    expect(result.streak).toBe(1)
    expect(result.coins).toBe(5)
  })

  it('ciclo de 7 dias repete o valor do dia 1 no dia 8', () => {
    const comStreak = { ...emptyProgress, loginStreak: 7, coins: 0 }
    const result = applyDailyLoginReward(comStreak, '2026-09-01T10:00:00.000Z', '2026-09-02T10:00:00.000Z')
    expect(result.streak).toBe(8)
    expect(result.coins).toBe(5)
  })

  it('nunca concede XP, só moeda — mesmo padrão de baú/pote de Marte/combo', () => {
    const result = applyDailyLoginReward(emptyProgress, null, '2026-09-02T12:00:00.000Z')
    expect(result.progress.xp).toBe(emptyProgress.xp)
  })

  // lab-149 (achado do review automático do Copilot no PR #9): `dayGap` negativo (relógio do
  // sistema ajustado pra trás) não concedia recompensa nem resetava a streak — sem essa guarda,
  // caía no mesmo caminho de "dia seguinte" e permitia farm infinito de moeda só voltando o
  // relógio do aparelho.
  it('relógio ajustado pra trás (nowIso ANTES de lastPlayedAt) não concede nem reseta a streak', () => {
    const comStreak = { ...emptyProgress, loginStreak: 5, coins: 100 }
    const result = applyDailyLoginReward(comStreak, '2026-09-02T10:00:00.000Z', '2026-09-01T10:00:00.000Z')
    expect(result.granted).toBe(false)
    expect(result.progress).toBe(comStreak)
    expect(result.coins).toBe(0)
    expect(result.streak).toBe(5)
  })

  // lab-149 (segundo round do review do Copilot no PR #9, mesmo PR): `dayGap <= 0` sozinho não
  // cobre `NaN` — comparações com `NaN` são sempre `false` em JS, então um `lastPlayedAt`
  // corrompido (ISO inválido) passava direto pela guarda anterior e caía no mesmo caminho de
  // "conceder" que o bug original.
  it('lastPlayedAt corrompido (ISO inválido, dayGap vira NaN) não concede nem reseta a streak', () => {
    const comStreak = { ...emptyProgress, loginStreak: 5, coins: 100 }
    const result = applyDailyLoginReward(comStreak, 'isto-nao-e-um-ISO-valido', '2026-09-02T10:00:00.000Z')
    expect(result.granted).toBe(false)
    expect(result.progress).toBe(comStreak)
    expect(result.coins).toBe(0)
    expect(result.streak).toBe(5)
  })
})

describe('compra normal com moeda continua funcionando', () => {
  it('unlockHat desbloqueia e desconta o custo quando há moeda suficiente', () => {
    const next = unlockHat({ ...emptyProgress, coins: 20 }, 'coroa')
    expect(next.unlockedHatIds).toContain('coroa')
    expect(next.coins).toBe(0)
  })

  it('unlockGlasses desbloqueia e desconta o custo quando há moeda suficiente', () => {
    const next = unlockGlasses({ ...emptyProgress, coins: 10 }, 'oculos_sol')
    expect(next.unlockedGlassesIds).toContain('oculos_sol')
    expect(next.coins).toBe(0)
  })

  // lab-106: mesmo teste de regressão, pro eixo novo de mobília de Minha Casa.
  it('unlockFurniture desbloqueia e desconta o custo quando há moeda suficiente', () => {
    const next = unlockFurniture({ ...emptyProgress, coins: 20 }, 'cama')
    expect(next.unlockedFurnitureIds).toContain('cama')
    expect(next.coins).toBe(0)
  })

  it('unlockFurniture não faz nada sem moeda suficiente', () => {
    const progress = { ...emptyProgress, coins: 2 }
    const next = unlockFurniture(progress, 'cama')
    expect(next).toBe(progress)
  })

  // lab-138 (pedido do usuário: "tem que dar pra colocar mais de um item na casa do mesmo,
  // comprando outro, nao so um") — mudança de comportamento intencional: comprar de novo um item
  // já possuído ACRESCENTA outra cópia (id repetido em `unlockedFurnitureIds`) e desconta moeda de
  // novo, ao contrário do resto dos eixos de customização (`unlockHat`/`unlockGlasses`/etc., que
  // continuam bloqueando comprar duas vezes via `unlockGeneric`).
  it('unlockFurniture comprado de novo acrescenta outra cópia e desconta moeda de novo', () => {
    const jaTem = { ...emptyProgress, coins: 100, unlockedFurnitureIds: ['cama'] }
    const next = unlockFurniture(jaTem, 'cama')
    expect(next.unlockedFurnitureIds).toEqual(['cama', 'cama'])
    expect(next.coins).toBe(80)
  })
})

describe('furnitureQuantity (lab-138)', () => {
  it('conta quantas cópias repetidas de um item normal existem em unlockedFurnitureIds', () => {
    const cama = findFurnitureById('cama')!
    const progress = { ...emptyProgress, unlockedFurnitureIds: ['cama', 'tapete', 'cama', 'cama'] }
    expect(furnitureQuantity(cama, progress, false)).toBe(3)
  })

  it('item normal nunca comprado tem quantidade 0', () => {
    const cama = findFurnitureById('cama')!
    expect(furnitureQuantity(cama, emptyProgress, false)).toBe(0)
  })

  it('item subscriptionOnly ignora unlockedFurnitureIds — só olha entitlementActive', () => {
    const camaNave = findFurnitureById('cama_nave')!
    expect(furnitureQuantity(camaNave, emptyProgress, false)).toBe(0)
    expect(furnitureQuantity(camaNave, emptyProgress, true)).toBe(1)
    // mesmo se por algum motivo o id aparecesse em unlockedFurnitureIds (não deveria, mas não é
    // essa lista que decide pra item de assinante), o resultado continua vindo do entitlement.
    const comIdSolto = { ...emptyProgress, unlockedFurnitureIds: ['cama_nave', 'cama_nave'] }
    expect(furnitureQuantity(camaNave, comIdSolto, false)).toBe(0)
  })

  it('item de recompensa de planeta tem quantidade 0 ou 1, nunca mais (concedido uma vez só)', () => {
    const meteorito = findFurnitureById('meteorito_mercurio')!
    expect(furnitureQuantity(meteorito, emptyProgress, false)).toBe(0)
    const concedido = { ...emptyProgress, unlockedFurnitureIds: ['meteorito_mercurio'] }
    expect(furnitureQuantity(meteorito, concedido, false)).toBe(1)
  })
})

describe('visitFurnitureQuantity (lab-175, casa visitável)', () => {
  it('conta quantas cópias repetidas de um item normal existem no snapshot do anfitrião', () => {
    const cama = findFurnitureById('cama')!
    expect(visitFurnitureQuantity(cama, ['cama', 'tapete', 'cama', 'cama'])).toBe(3)
  })

  it('item subscriptionOnly sempre conta 0 pra visitante, mesmo se aparecer no snapshot', () => {
    const camaNave = findFurnitureById('cama_nave')!
    expect(visitFurnitureQuantity(camaNave, [])).toBe(0)
    expect(visitFurnitureQuantity(camaNave, ['cama_nave', 'cama_nave'])).toBe(0)
  })

  it('item de recompensa de planeta conta normalmente (não é subscriptionOnly)', () => {
    const meteorito = findFurnitureById('meteorito_mercurio')!
    expect(visitFurnitureQuantity(meteorito, ['meteorito_mercurio'])).toBe(1)
  })
})

describe('setHouseVisible (lab-175, casa visitável)', () => {
  it('liga e desliga a visibilidade da casa', () => {
    expect(setHouseVisible(emptyProgress, false).houseVisible).toBe(false)
    expect(setHouseVisible({ ...emptyProgress, houseVisible: false }, true).houseVisible).toBe(true)
  })
})

describe('resolveHouseSyncSnapshot (lab-175, achados do review automático do Copilot no PR #49)', () => {
  it('remove item subscriptionOnly da lista e dos placements, preservando o resto', () => {
    const progress = {
      ...emptyProgress,
      unlockedFurnitureIds: ['cama', 'cama_nave', 'tapete'],
      housePlacements: { 'cama#0': { x: 1, z: 2, rotY: 0 }, 'cama_nave#0': { x: 3, z: 4, rotY: 1 } },
    }
    const snapshot = resolveHouseSyncSnapshot(progress)
    expect(snapshot.furnitureIds).toEqual(['cama', 'tapete'])
    expect(snapshot.placements).toEqual({ 'cama#0': { x: 1, z: 2, rotY: 0 } })
  })

  it('descarta uma chave de housePlacements sem o sufixo "#índice" (save legado de antes do lab-136)', () => {
    const progress = {
      ...emptyProgress,
      unlockedFurnitureIds: ['cama'],
      housePlacements: { cama: { x: 1, z: 2, rotY: 0 } },
    }
    const snapshot = resolveHouseSyncSnapshot(progress)
    expect(snapshot.placements).toEqual({})
  })

  it('descarta chave com id/índice absurdamente longo (achado do Copilot na 11ª rodada: o servidor tem o mesmo teto e rejeitava o heartbeat inteiro)', () => {
    const progress = {
      ...emptyProgress,
      unlockedFurnitureIds: ['cama'],
      housePlacements: {
        'cama#0': { x: 1, z: 2, rotY: 0 },
        [`${'a'.repeat(61)}#0`]: { x: 1, z: 2, rotY: 0 },
        [`cama#${'1'.repeat(7)}`]: { x: 1, z: 2, rotY: 0 },
      },
    }
    const snapshot = resolveHouseSyncSnapshot(progress)
    expect(snapshot.placements).toEqual({ 'cama#0': { x: 1, z: 2, rotY: 0 } })
  })

  it('não afeta nada quando não há item subscriptionOnly nem chave legada', () => {
    const progress = {
      ...emptyProgress,
      unlockedFurnitureIds: ['cama', 'tapete'],
      housePlacements: { 'cama#0': { x: 1, z: 2, rotY: 0 } },
    }
    const snapshot = resolveHouseSyncSnapshot(progress)
    expect(snapshot.furnitureIds).toEqual(['cama', 'tapete'])
    expect(snapshot.placements).toEqual({ 'cama#0': { x: 1, z: 2, rotY: 0 } })
  })

  it('trunca em 300 entradas em vez de mandar tudo (achado do Copilot na 4ª rodada: o servidor recusa o heartbeat inteiro acima disso)', () => {
    const progress = {
      ...emptyProgress,
      unlockedFurnitureIds: Array.from({ length: 301 }, () => 'cama'),
      housePlacements: Object.fromEntries(
        Array.from({ length: 301 }, (_, i) => [`cama#${i}`, { x: 0, z: 0, rotY: 0 }]),
      ),
    }
    const snapshot = resolveHouseSyncSnapshot(progress)
    expect(snapshot.furnitureIds).toHaveLength(300)
    expect(Object.keys(snapshot.placements)).toHaveLength(300)
  })

  it('descarta valor de placement corrompido/fora do limite real antes de enviar (achado do Copilot na 7ª rodada: um único valor assim travava o heartbeat INTEIRO)', () => {
    const progress = {
      ...emptyProgress,
      unlockedFurnitureIds: ['cama', 'tapete'],
      housePlacements: {
        'cama#0': { x: 1, z: 2, rotY: 0 },
        'tapete#0': { x: 999, z: 0, rotY: 0 },
      },
    }
    const snapshot = resolveHouseSyncSnapshot(progress)
    expect(snapshot.placements).toEqual({ 'cama#0': { x: 1, z: 2, rotY: 0 } })
  })

  it('descarta valor de placement nulo/não-objeto e contêiner nulo sem lançar (achado do Copilot na 8ª rodada: value.x estourava antes do filtro)', () => {
    const progress = {
      ...emptyProgress,
      unlockedFurnitureIds: ['cama'],
      housePlacements: {
        'cama#0': { x: 1, z: 2, rotY: 0 },
        'tapete#0': null,
        'grama#0': 'corrompido',
        'banco#0': [1, 2, 3],
      } as unknown as Record<string, { x: number; z: number; rotY: number }>,
    }
    const snapshot = resolveHouseSyncSnapshot(progress)
    expect(snapshot.placements).toEqual({ 'cama#0': { x: 1, z: 2, rotY: 0 } })

    const progressWithNullContainer = {
      ...emptyProgress,
      housePlacements: null as unknown as Record<string, { x: number; z: number; rotY: number }>,
    }
    expect(() => resolveHouseSyncSnapshot(progressWithNullContainer)).not.toThrow()
    expect(resolveHouseSyncSnapshot(progressWithNullContainer).placements).toEqual({})
  })

  it('trata unlockedFurnitureIds não-array como lista vazia sem lançar (achado do Copilot na 10ª rodada: .filter() estourava antes de qualquer heartbeat sair)', () => {
    const progressWithNullFurnitureIds = {
      ...emptyProgress,
      unlockedFurnitureIds: null as unknown as string[],
    }
    expect(() => resolveHouseSyncSnapshot(progressWithNullFurnitureIds)).not.toThrow()
    expect(resolveHouseSyncSnapshot(progressWithNullFurnitureIds).furnitureIds).toEqual([])
  })

  it('descarta placement com propriedade extra além de x/z/rotY (achado do Copilot na 9ª rodada: o servidor exige exatamente 3 chaves e rejeitava o heartbeat inteiro)', () => {
    const progress = {
      ...emptyProgress,
      unlockedFurnitureIds: ['cama', 'tapete'],
      housePlacements: {
        'cama#0': { x: 1, z: 2, rotY: 0 },
        'tapete#0': { x: 1, z: 2, rotY: 0, legacy: true },
      } as unknown as Record<string, { x: number; z: number; rotY: number }>,
    }
    const snapshot = resolveHouseSyncSnapshot(progress)
    expect(snapshot.placements).toEqual({ 'cama#0': { x: 1, z: 2, rotY: 0 } })
  })

  // lab-136: posicionamento manual de mobília ("Mover" no MyHousePanel) — testes de regressão pro
  // eixo novo, mesmo espírito dos testes de `unlockFurniture` acima.
  it('setFurniturePlacement grava posição/ângulo novos pra um item ainda sem posição salva', () => {
    const next = setFurniturePlacement(emptyProgress, 'cama', 1.5, -2.25, Math.PI / 2)
    expect(next.housePlacements.cama).toEqual({ x: 1.5, z: -2.25, rotY: Math.PI / 2 })
  })

  it('setFurniturePlacement sobrescreve uma posição salva anteriormente pro MESMO item', () => {
    const jaPosicionado = setFurniturePlacement(emptyProgress, 'cama', 1, 1, 0)
    const reposicionado = setFurniturePlacement(jaPosicionado, 'cama', -3, 4, Math.PI)
    expect(reposicionado.housePlacements.cama).toEqual({ x: -3, z: 4, rotY: Math.PI })
  })

  it('setFurniturePlacement não afeta a posição salva de OUTRO item nem outros campos do progresso', () => {
    const comMesa = setFurniturePlacement(emptyProgress, 'mesa_cadeira', 2, 2, 0)
    const comCamaTambem = setFurniturePlacement(comMesa, 'cama', -1, -1, Math.PI / 4)
    expect(comCamaTambem.housePlacements.mesa_cadeira).toEqual({ x: 2, z: 2, rotY: 0 })
    expect(comCamaTambem.housePlacements.cama).toEqual({ x: -1, z: -1, rotY: Math.PI / 4 })
    expect(comCamaTambem.coins).toBe(emptyProgress.coins)
    expect(comCamaTambem.unlockedFurnitureIds).toBe(emptyProgress.unlockedFurnitureIds)
  })

  it('unlockHat não faz nada sem moeda suficiente', () => {
    const progress = { ...emptyProgress, coins: 5 }
    const next = unlockHat(progress, 'coroa')
    expect(next).toBe(progress)
  })

  it('unlockHat não faz nada pra um id que não existe no catálogo', () => {
    const progress = { ...emptyProgress, coins: 999 }
    const next = unlockHat(progress, 'chapeu-que-nao-existe')
    expect(next).toBe(progress)
  })

  it('unlockHairShape (catálogo genérico) desbloqueia normalmente com moeda suficiente', () => {
    const next = unlockHairShape({ ...emptyProgress, coins: 12 }, 'cabelo_moicano')
    expect(next.unlockedHairShapeIds).toContain('cabelo_moicano')
    expect(next.coins).toBe(0)
  })
})

describe('adoptPet/equipPet/feedPet (lab-155)', () => {
  const petId = PET_CATALOG[0].id
  const petCost = PET_CATALOG[0].cost
  const secondPetId = PET_CATALOG[1].id

  const adoptedAtIso = '2026-09-08T12:00:00.000Z'

  it('adoptPet não faz nada sem moeda suficiente', () => {
    const progress = { ...emptyProgress, coins: petCost - 1 }
    const next = adoptPet(progress, petId, adoptedAtIso)
    expect(next).toBe(progress)
  })

  it('adoptPet não faz nada pra um id que não existe no catálogo', () => {
    const progress = { ...emptyProgress, coins: 9999 }
    const next = adoptPet(progress, 'pet-que-nao-existe', adoptedAtIso)
    expect(next).toBe(progress)
  })

  it('adoptPet desbloqueia, desconta o custo, equipa automaticamente o primeiro pet, e grava a data de adoção', () => {
    const next = adoptPet({ ...emptyProgress, coins: petCost }, petId, adoptedAtIso)
    expect(next.unlockedPetIds).toEqual([petId])
    expect(next.coins).toBe(0)
    expect(next.equippedPetId).toBe(petId)
    expect(next.petAdoptedAt[petId]).toBe(adoptedAtIso)
  })

  it('adoptPet preserva a data de adoção já existente em vez de "rejuvenescer" o pet (progress inconsistente)', () => {
    const dataAntiga = '2026-01-01T00:00:00.000Z'
    const progressInconsistente = { ...emptyProgress, coins: 9999, petAdoptedAt: { [petId]: dataAntiga } }
    const next = adoptPet(progressInconsistente, petId, adoptedAtIso)
    expect(next.petAdoptedAt[petId]).toBe(dataAntiga)
  })

  it('adotar um segundo pet NÃO troca o equipado automaticamente', () => {
    const comPrimeiro = { ...emptyProgress, coins: 9999, unlockedPetIds: [petId], equippedPetId: petId }
    const next = adoptPet(comPrimeiro, secondPetId, adoptedAtIso)
    expect(next.unlockedPetIds).toEqual([petId, secondPetId])
    expect(next.equippedPetId).toBe(petId)
  })

  it('equipPet recusa um pet que o jogador não possui', () => {
    const progress = { ...emptyProgress, unlockedPetIds: [petId], equippedPetId: petId }
    const next = equipPet(progress, secondPetId)
    expect(next).toBe(progress)
  })

  it('equipPet troca pro pet possuído', () => {
    const progress = { ...emptyProgress, unlockedPetIds: [petId, secondPetId], equippedPetId: petId }
    const next = equipPet(progress, secondPetId)
    expect(next.equippedPetId).toBe(secondPetId)
  })

  it('equipPet(null) desequipa (nenhum pet segue o jogador)', () => {
    const progress = { ...emptyProgress, unlockedPetIds: [petId], equippedPetId: petId }
    const next = equipPet(progress, null)
    expect(next.equippedPetId).toBeNull()
  })

  it('feedPet não faz nada sem pet equipado', () => {
    const result = feedPet(emptyProgress, '2026-09-08T12:00:00.000Z')
    expect(result.fed).toBe(false)
    expect(result.progress).toBe(emptyProgress)
  })

  it('primeira alimentação de todas conta e não muda de estágio (ainda filhote)', () => {
    const progress = { ...emptyProgress, equippedPetId: petId }
    const result = feedPet(progress, '2026-09-08T12:00:00.000Z')
    expect(result.fed).toBe(true)
    expect(result.progress.petCareCounts[petId]).toBe(1)
    expect(result.newStage).toBeUndefined()
  })

  it('alimentar de novo no MESMO dia não conta (uma vez por dia real)', () => {
    const progress = { ...emptyProgress, equippedPetId: petId, petCareCounts: { [petId]: 1 }, lastPetFeedAt: '2026-09-08T08:00:00.000Z' }
    const result = feedPet(progress, '2026-09-08T20:00:00.000Z')
    expect(result.fed).toBe(false)
    expect(result.progress).toBe(progress)
  })

  it('alimentar no dia seguinte conta de novo', () => {
    const progress = { ...emptyProgress, equippedPetId: petId, petCareCounts: { [petId]: 1 }, lastPetFeedAt: '2026-09-08T08:00:00.000Z' }
    const result = feedPet(progress, '2026-09-09T08:00:00.000Z')
    expect(result.fed).toBe(true)
    expect(result.progress.petCareCounts[petId]).toBe(2)
  })

  it('a 3ª alimentação avança o estágio de filhote pra jovem', () => {
    const progress = { ...emptyProgress, equippedPetId: petId, petCareCounts: { [petId]: 2 }, lastPetFeedAt: '2026-09-06T08:00:00.000Z' }
    const result = feedPet(progress, '2026-09-08T08:00:00.000Z')
    expect(result.newStage).toBe('jovem')
  })

  it('a 7ª alimentação avança o estágio de jovem pra adulto', () => {
    const progress = { ...emptyProgress, equippedPetId: petId, petCareCounts: { [petId]: 6 }, lastPetFeedAt: '2026-09-10T08:00:00.000Z' }
    const result = feedPet(progress, '2026-09-11T08:00:00.000Z')
    expect(result.newStage).toBe('adulto')
  })

  it('relógio ajustado pra trás não conta como nova alimentação (mesma defesa do login diário)', () => {
    const progress = { ...emptyProgress, equippedPetId: petId, petCareCounts: { [petId]: 1 }, lastPetFeedAt: '2026-09-10T08:00:00.000Z' }
    const result = feedPet(progress, '2026-09-08T08:00:00.000Z')
    expect(result.fed).toBe(false)
    expect(result.progress).toBe(progress)
  })

  it('cada pet cresce no próprio ritmo — trocar de equipado não mistura as contagens', () => {
    const progress = {
      ...emptyProgress,
      equippedPetId: secondPetId,
      petCareCounts: { [petId]: 6 },
      lastPetFeedAt: '2026-09-07T08:00:00.000Z',
    }
    const result = feedPet(progress, '2026-09-08T08:00:00.000Z')
    expect(result.progress.petCareCounts[petId]).toBe(6)
    expect(result.progress.petCareCounts[secondPetId]).toBe(1)
  })

  it('petStageFor: limiares exatos (0/2 filhote, 3/6 jovem, 7+ adulto)', () => {
    expect(petStageFor(0)).toBe('filhote')
    expect(petStageFor(2)).toBe('filhote')
    expect(petStageFor(3)).toBe('jovem')
    expect(petStageFor(6)).toBe('jovem')
    expect(petStageFor(7)).toBe('adulto')
    expect(petStageFor(50)).toBe('adulto')
  })

  it('petStageScale cresce com o estágio, e "idoso" usa a mesma escala de adulto', () => {
    expect(petStageScale('filhote')).toBeLessThan(petStageScale('jovem'))
    expect(petStageScale('jovem')).toBeLessThan(petStageScale('adulto'))
    expect(petStageScale('adulto')).toBe(1)
    expect(petStageScale('idoso')).toBe(1)
  })

  it('petVisualScale multiplica a progressão relativa de estágio pelo limite da espécie', () => {
    // Valores fixos (não derivados de `PET_SPECIES_SCALE_MULTIPLIER`) — se o multiplicador de
    // alguma espécie voltar a 1.0 por engano, este teste tem que falhar, não só confirmar que a
    // multiplicação em si está correta.
    expect(petVisualScale('adulto', 'gato')).toBe(1.6)
    expect(petVisualScale('adulto', 'cachorro')).toBe(1.8)
    // filhote continua proporcionalmente menor que adulto DA MESMA espécie, mesmo com o
    // multiplicador de espécie por cima — a progressão relativa de `petStageScale` não muda.
    expect(petVisualScale('filhote', 'gato')).toBeLessThan(petVisualScale('adulto', 'gato'))
    expect(petVisualScale('filhote', 'cachorro')).toBeLessThan(petVisualScale('adulto', 'cachorro'))
  })
})

describe('applyCoopChallengeCompleted (lab-172, desafio em dupla)', () => {
  it('recompensa a primeira vez, concede o emblema "Dupla Dinâmica" e grava a data', () => {
    const result = applyCoopChallengeCompleted(emptyProgress, '2026-09-10T12:00:00.000Z')
    expect(result.rewarded).toBe(true)
    expect(result.newBadge).toBe(true)
    expect(result.coins).toBeGreaterThan(0)
    expect(result.progress.coins).toBe(result.coins)
    expect(result.progress.badges).toContain(BADGE_COOP_FIRST)
    expect(result.progress.lastCoopChallengeAt).toBe('2026-09-10T12:00:00.000Z')
  })

  it('não recompensa de novo no MESMO dia real (uma vez por dia, mesmo padrão de feedPet)', () => {
    const progress = { ...emptyProgress, lastCoopChallengeAt: '2026-09-10T08:00:00.000Z' }
    const result = applyCoopChallengeCompleted(progress, '2026-09-10T20:00:00.000Z')
    expect(result.rewarded).toBe(false)
    expect(result.progress).toBe(progress)
  })

  it('recompensa de novo no dia seguinte, mas sem repetir o emblema (já ganho antes)', () => {
    const progress = {
      ...emptyProgress,
      badges: [BADGE_COOP_FIRST],
      lastCoopChallengeAt: '2026-09-10T08:00:00.000Z',
    }
    const result = applyCoopChallengeCompleted(progress, '2026-09-11T08:00:00.000Z')
    expect(result.rewarded).toBe(true)
    expect(result.newBadge).toBe(false)
    expect(result.progress.badges).toEqual([BADGE_COOP_FIRST])
  })

  it('relógio ajustado pra trás não conta como novo dia (mesma defesa de feedPet/login diário)', () => {
    const progress = { ...emptyProgress, lastCoopChallengeAt: '2026-09-10T08:00:00.000Z' }
    const result = applyCoopChallengeCompleted(progress, '2026-09-08T08:00:00.000Z')
    expect(result.rewarded).toBe(false)
  })
})

describe('applyPetDailyChallengeCompleted (lab-174, desafio educativo leve da rotina do pet)', () => {
  it('não recompensa sem pet equipado', () => {
    const result = applyPetDailyChallengeCompleted(emptyProgress, '2026-09-10T12:00:00.000Z')
    expect(result.rewarded).toBe(false)
    expect(result.progress).toBe(emptyProgress)
  })

  it('recompensa a primeira vez com pet equipado e grava a data', () => {
    const progress = { ...emptyProgress, equippedPetId: 'gato' }
    const result = applyPetDailyChallengeCompleted(progress, '2026-09-10T12:00:00.000Z')
    expect(result.rewarded).toBe(true)
    expect(result.coins).toBeGreaterThan(0)
    expect(result.progress.coins).toBe(result.coins)
    expect(result.progress.lastPetChallengeAt).toBe('2026-09-10T12:00:00.000Z')
  })

  it('não recompensa de novo no MESMO dia real (uma vez por dia, mesmo padrão de feedPet/coop)', () => {
    const progress = {
      ...emptyProgress,
      equippedPetId: 'gato',
      lastPetChallengeAt: '2026-09-10T08:00:00.000Z',
    }
    const result = applyPetDailyChallengeCompleted(progress, '2026-09-10T20:00:00.000Z')
    expect(result.rewarded).toBe(false)
    expect(result.progress).toBe(progress)
  })

  it('recompensa de novo no dia seguinte', () => {
    const progress = {
      ...emptyProgress,
      equippedPetId: 'gato',
      lastPetChallengeAt: '2026-09-10T08:00:00.000Z',
    }
    const result = applyPetDailyChallengeCompleted(progress, '2026-09-11T08:00:00.000Z')
    expect(result.rewarded).toBe(true)
  })

  it('relógio ajustado pra trás não conta como novo dia (mesma defesa de feedPet/login diário)', () => {
    const progress = {
      ...emptyProgress,
      equippedPetId: 'gato',
      lastPetChallengeAt: '2026-09-10T08:00:00.000Z',
    }
    const result = applyPetDailyChallengeCompleted(progress, '2026-09-08T08:00:00.000Z')
    expect(result.rewarded).toBe(false)
  })
})

describe('applyQuestCompletion preserva emblemas de outras origens (lab-172, achado ao adicionar o emblema do desafio em dupla)', () => {
  it('completar uma missão normal NUNCA apaga um emblema já ganho de outra origem (ex.: Dupla Dinâmica)', () => {
    const progress = { ...emptyProgress, badges: [BADGE_COOP_FIRST] }
    const result = applyQuestCompletion(progress, quests[0], NO_BONUS_EVENT)
    expect(result.progress.badges).toContain(BADGE_COOP_FIRST)
    expect(result.progress.badges).toContain(BADGE_FIRST_QUEST)
  })

  it('completar TODAS as missões ainda concede Mestre das Missões junto com um emblema de outra origem', () => {
    let progress = { ...emptyProgress, badges: [BADGE_COOP_FIRST] }
    for (const quest of quests) {
      progress = applyQuestCompletion(progress, quest, NO_BONUS_EVENT).progress
    }
    expect(progress.badges).toEqual(
      expect.arrayContaining([BADGE_COOP_FIRST, BADGE_FIRST_QUEST, BADGE_ALL_DONE]),
    )
  })
})

describe('petAgeYears/petLifecycleStage/backfillPetAdoptedAt (lab-169, ciclo de vida)', () => {
  const petId = PET_CATALOG[0].id
  const secondPetId = PET_CATALOG[1].id

  it('petAgeYears conta 1 "ano" por dia real corrido desde a adoção', () => {
    const progress = { ...emptyProgress, petAdoptedAt: { [petId]: '2026-09-08T20:00:00.000Z' } }
    expect(petAgeYears(progress, petId, '2026-09-08T21:00:00.000Z')).toBe(0)
    expect(petAgeYears(progress, petId, '2026-09-09T00:00:00.000Z')).toBe(1)
    expect(petAgeYears(progress, petId, '2026-10-08T20:00:00.000Z')).toBe(30)
  })

  it('petAgeYears devolve 0 pra um pet sem data de adoção registrada (nunca NaN/erro)', () => {
    expect(petAgeYears(emptyProgress, 'pet-sem-data', '2026-09-08T12:00:00.000Z')).toBe(0)
  })

  it('petAgeYears devolve 0 (nunca NaN) com uma data de adoção corrompida/ISO inválida', () => {
    const progress = { ...emptyProgress, petAdoptedAt: { [petId]: 'nao-e-uma-data' } }
    expect(petAgeYears(progress, petId, '2026-09-08T12:00:00.000Z')).toBe(0)
  })

  it('petLifecycleStage só promove pra "idoso" quem já é adulto E tem 30+ anos', () => {
    expect(petLifecycleStage('filhote', 999)).toBe('filhote')
    expect(petLifecycleStage('jovem', 999)).toBe('jovem')
    expect(petLifecycleStage('adulto', 29)).toBe('adulto')
    expect(petLifecycleStage('adulto', 30)).toBe('idoso')
    expect(petLifecycleStage('adulto', 40)).toBe('idoso')
  })

  it('backfillPetAdoptedAt preenche só os pets possuídos que ainda não têm data', () => {
    const progress = {
      ...emptyProgress,
      unlockedPetIds: [petId, secondPetId],
      petAdoptedAt: { [petId]: '2026-09-01T00:00:00.000Z' },
    }
    const next = backfillPetAdoptedAt(progress, '2026-09-09T00:00:00.000Z')
    expect(next.petAdoptedAt[petId]).toBe('2026-09-01T00:00:00.000Z')
    expect(next.petAdoptedAt[secondPetId]).toBe('2026-09-09T00:00:00.000Z')
  })

  it('backfillPetAdoptedAt não muda nada (mesma referência) quando não há pet faltando', () => {
    const progress = { ...emptyProgress, unlockedPetIds: [petId], petAdoptedAt: { [petId]: '2026-09-01T00:00:00.000Z' } }
    const next = backfillPetAdoptedAt(progress, '2026-09-09T00:00:00.000Z')
    expect(next).toBe(progress)
  })
})

describe('syncWeeklyXpSnapshot/weeklyXpEarned (lab-157)', () => {
  it('primeira sincronização (weeklyXpWeekKey null) sempre reseta o snapshot pro xp atual', () => {
    const progress = { ...emptyProgress, xp: 150 }
    const next = syncWeeklyXpSnapshot(progress, '2026-09-08T12:00:00.000Z')
    expect(next.weeklyXpWeekKey).not.toBeNull()
    expect(next.weeklyXpSnapshot).toBe(150)
  })

  it('sincronizar de novo na MESMA semana não muda nada (idempotente)', () => {
    const synced = syncWeeklyXpSnapshot({ ...emptyProgress, xp: 150 }, '2026-09-08T12:00:00.000Z')
    const comMaisXp = { ...synced, xp: 200 } // ganhou XP durante a semana
    const segunda = syncWeeklyXpSnapshot(comMaisXp, '2026-09-10T12:00:00.000Z') // mesma semana
    expect(segunda).toBe(comMaisXp) // mesma referência — não mexeu em nada
  })

  it('sincronizar numa semana NOVA reseta o snapshot pro xp atual', () => {
    const synced = syncWeeklyXpSnapshot({ ...emptyProgress, xp: 150 }, '2026-09-08T12:00:00.000Z')
    const comMaisXp = { ...synced, xp: 200 }
    const semanaSeguinte = syncWeeklyXpSnapshot(comMaisXp, '2026-09-15T12:00:00.000Z')
    expect(semanaSeguinte.weeklyXpSnapshot).toBe(200)
    expect(semanaSeguinte.weeklyXpWeekKey).not.toBe(synced.weeklyXpWeekKey)
  })

  it('weeklyXpEarned calcula a diferença dentro da mesma semana', () => {
    const synced = syncWeeklyXpSnapshot({ ...emptyProgress, xp: 150 }, '2026-09-08T12:00:00.000Z')
    const comMaisXp = { ...synced, xp: 230 }
    expect(weeklyXpEarned(comMaisXp, '2026-09-10T12:00:00.000Z')).toBe(80)
  })

  it('weeklyXpEarned devolve 0 se o snapshot é de uma semana anterior (perfil que não abriu essa semana)', () => {
    const synced = syncWeeklyXpSnapshot({ ...emptyProgress, xp: 150 }, '2026-09-08T12:00:00.000Z')
    const comMaisXp = { ...synced, xp: 500 }
    expect(weeklyXpEarned(comMaisXp, '2026-09-15T12:00:00.000Z')).toBe(0)
  })

  it('weeklyXpEarned nunca é negativo mesmo se xp cair abaixo do snapshot (defensivo)', () => {
    const synced = syncWeeklyXpSnapshot({ ...emptyProgress, xp: 150 }, '2026-09-08T12:00:00.000Z')
    const comMenosXp = { ...synced, xp: 100 }
    expect(weeklyXpEarned(comMenosXp, '2026-09-09T12:00:00.000Z')).toBe(0)
  })
})

describe('applyWeeklyEventObjectiveProgress/isWeeklyEventObjectiveDone (lab-182, "Eventos semanais saudáveis")', () => {
  it('concede o bônus na primeira vez da semana', () => {
    const result = applyWeeklyEventObjectiveProgress(emptyProgress, '2026-09-08T12:00:00.000Z')
    expect(result.rewardGranted).toBe(true)
    expect(result.progress.coins).toBe(emptyProgress.coins + WEEKLY_EVENT_OBJECTIVE_REWARD_COINS)
    expect(result.progress.weeklyEventObjectiveRewardedAtIso).toBe('2026-09-08T12:00:00.000Z')
  })

  it('não concede de novo na MESMA semana (idempotente, mesmo completando outro desafio)', () => {
    const primeira = applyWeeklyEventObjectiveProgress(emptyProgress, '2026-09-08T12:00:00.000Z')
    const segunda = applyWeeklyEventObjectiveProgress(primeira.progress, '2026-09-10T12:00:00.000Z') // mesma semana
    expect(segunda.rewardGranted).toBe(false)
    expect(segunda.progress).toBe(primeira.progress) // mesma referência — não mexeu em nada
  })

  it('concede de novo numa semana NOVA', () => {
    const primeira = applyWeeklyEventObjectiveProgress(emptyProgress, '2026-09-08T12:00:00.000Z')
    const semanaSeguinte = applyWeeklyEventObjectiveProgress(primeira.progress, '2026-09-15T12:00:00.000Z')
    expect(semanaSeguinte.rewardGranted).toBe(true)
    expect(semanaSeguinte.progress.coins).toBe(primeira.progress.coins + WEEKLY_EVENT_OBJECTIVE_REWARD_COINS)
  })

  it('isWeeklyEventObjectiveDone reflete o estado real por semana', () => {
    const progress = applyWeeklyEventObjectiveProgress(emptyProgress, '2026-09-08T12:00:00.000Z').progress
    expect(isWeeklyEventObjectiveDone(progress, '2026-09-10T12:00:00.000Z')).toBe(true) // mesma semana
    expect(isWeeklyEventObjectiveDone(progress, '2026-09-15T12:00:00.000Z')).toBe(false) // semana seguinte
  })

  it('perfil que nunca completou nada não mostra o objetivo como feito', () => {
    expect(isWeeklyEventObjectiveDone(emptyProgress, '2026-09-08T12:00:00.000Z')).toBe(false)
  })

  it('achado do review automático do Copilot: adiantar o relógio pra uma semana futura e depois voltar não libera o bônus de novo pra semana real', () => {
    // Semana real: 2026-W37 (8 de setembro). Criança adianta o relógio do aparelho pra 2026-W40
    // (29 de setembro), reivindica o bônus "daquela semana futura", depois volta o relógio pra
    // 2026-W37 de novo — o bônus NÃO pode ser concedido outra vez pra 2026-W37, mesmo a chave de
    // semana guardada ("2026-W40") não batendo mais com "agora" ("2026-W37").
    const adiantouRelogio = applyWeeklyEventObjectiveProgress(emptyProgress, '2026-09-29T12:00:00.000Z')
    expect(adiantouRelogio.rewardGranted).toBe(true)
    const voltouRelogio = applyWeeklyEventObjectiveProgress(adiantouRelogio.progress, '2026-09-08T12:00:00.000Z')
    expect(voltouRelogio.rewardGranted).toBe(false)
    expect(voltouRelogio.progress).toBe(adiantouRelogio.progress) // mesma referência — não mexeu em nada
  })

  it('achado do review automático do Copilot: wouldGrantWeeklyEventObjectiveReward nunca diverge de applyWeeklyEventObjectiveProgress no cenário de recuo de relógio', () => {
    // O pré-check síncrono usado por `useProgress.ts` (`weeklyEventObjectiveProgress`) precisa
    // concordar com a decisão real de `applyWeeklyEventObjectiveProgress`, senão o app mostra
    // "+20 moedas" no toast sem a moeda ter sido creditada de verdade (achado real desta rodada).
    const adiantouRelogio = applyWeeklyEventObjectiveProgress(emptyProgress, '2026-09-29T12:00:00.000Z')
    expect(wouldGrantWeeklyEventObjectiveReward(adiantouRelogio.progress, '2026-09-08T12:00:00.000Z')).toBe(false)
    expect(applyWeeklyEventObjectiveProgress(adiantouRelogio.progress, '2026-09-08T12:00:00.000Z').rewardGranted).toBe(
      false,
    )
  })

  it('weeklyEventObjectiveStatus distingue "pendente" de "concluído" de "bloqueado por recuo de relógio"', () => {
    expect(weeklyEventObjectiveStatus(emptyProgress, '2026-09-08T12:00:00.000Z')).toBe('pending')

    const concluido = applyWeeklyEventObjectiveProgress(emptyProgress, '2026-09-08T12:00:00.000Z').progress
    expect(weeklyEventObjectiveStatus(concluido, '2026-09-10T12:00:00.000Z')).toBe('done') // mesma semana

    // achado do review automático do Copilot: no cenário de recuo de relógio, a recompensa foi
    // dada numa semana FUTURA — "concluído esta semana" seria falso, mas também não pode prometer
    // "pendente, complete um desafio" (a próxima tentativa real seria recusada). É um 3º estado.
    const adiantouRelogio = applyWeeklyEventObjectiveProgress(emptyProgress, '2026-09-29T12:00:00.000Z').progress
    expect(weeklyEventObjectiveStatus(adiantouRelogio, '2026-09-08T12:00:00.000Z')).toBe('blocked')
  })

  it('achado do review automático do Copilot: recuar o relógio DENTRO da mesma semana ISO também bloqueia, não mostra "concluído"', () => {
    // Reivindica numa sexta-feira (2026-09-11, ainda semana 2026-W37), depois o relógio volta pra
    // segunda-feira DA MESMA SEMANA (2026-09-08) — comparar só a semana ISO diria "concluído" (as
    // duas datas caem na mesma semana), mas o recuo de relógio em si já é o sinal de manipulação,
    // independente de cair na mesma semana ou numa diferente.
    const reivindicouSexta = applyWeeklyEventObjectiveProgress(emptyProgress, '2026-09-11T12:00:00.000Z').progress
    expect(weeklyEventObjectiveStatus(reivindicouSexta, '2026-09-08T09:00:00.000Z')).toBe('blocked')
  })

  it('achado do review automático do Copilot: nowIso IGUAL ao instante da recompensa mostra "concluído", não "bloqueado"', () => {
    // App.tsx grava o MESMO nowIso tanto em weeklyEventObjectiveRewardedAtIso quanto no snapshot
    // usado pra calcular o status logo em seguida (avança o snapshot junto ao conceder a
    // recompensa, pra não ler um valor mais velho) — abrir o emblema imediatamente após ganhar o
    // bônus consulta o status com nowIso === rewardedAtIso, não um instante posterior.
    const nowIso = '2026-09-08T12:00:00.000Z'
    const concluidoAgoraMesmo = applyWeeklyEventObjectiveProgress(emptyProgress, nowIso).progress
    expect(weeklyEventObjectiveStatus(concluidoAgoraMesmo, nowIso)).toBe('done')
  })
})

describe('seriesForLevel (lab-156)', () => {
  it('limiares exatos: 1-8 bronze, 9-16 prata, 17-24 ouro, 25+ diamante', () => {
    expect(seriesForLevel(1)).toBe('bronze')
    expect(seriesForLevel(8)).toBe('bronze')
    expect(seriesForLevel(9)).toBe('prata')
    expect(seriesForLevel(16)).toBe('prata')
    expect(seriesForLevel(17)).toBe('ouro')
    expect(seriesForLevel(24)).toBe('ouro')
    expect(seriesForLevel(25)).toBe('diamante')
    expect(seriesForLevel(100)).toBe('diamante')
  })
})

describe('planetDiscoverySlots (lab-181, "Circuito de descoberta e álbum de planetas")', () => {
  it('Marte tem 3 slots — postal, pote de moedas, segredo visual (nunca baú/escolinha)', () => {
    const slots = planetDiscoverySlots('marte', emptyProgress)
    expect(slots.map((s) => s.kind)).toEqual(['collectible', 'actionable_object', 'visual_secret'])
    expect(slots.every((s) => !s.discovered)).toBe(true)
  })

  it('os outros 6 planetas têm 3 slots — postal, baú, escolinha (nunca segredo visual)', () => {
    const slots = planetDiscoverySlots('mercurio', emptyProgress)
    expect(slots.map((s) => s.kind)).toEqual(['collectible', 'actionable_object', 'educational_quiz'])
    expect(slots.every((s) => !s.discovered)).toBe(true)
  })

  it('planeta inexistente devolve lista vazia (não quebra)', () => {
    expect(planetDiscoverySlots('planeta-que-nao-existe', emptyProgress)).toEqual([])
  })

  it('nome de propriedade herdada de Object.prototype não quebra nem finge ser um planeta válido', () => {
    expect(planetDiscoverySlots('constructor', emptyProgress)).toEqual([])
    expect(planetDiscoverySlots('toString', emptyProgress)).toEqual([])
  })

  it('cada slot reflete o progresso real (postal coletado, pote de Marte revelado)', () => {
    const comPostal = applyPostcardCollected(emptyProgress, 'marte').progress
    const comPoteTambem = markMarsCoinPotFound(comPostal).progress
    const slots = planetDiscoverySlots('marte', comPoteTambem)
    expect(slots.find((s) => s.kind === 'collectible')?.discovered).toBe(true)
    expect(slots.find((s) => s.kind === 'actionable_object')?.discovered).toBe(true)
    expect(slots.find((s) => s.kind === 'visual_secret')?.discovered).toBe(false)
  })

  it('baú e escolinha de um planeta normal refletem o progresso real', () => {
    const comBau = applyTreasureChestFound(emptyProgress, 'bau-mercurio').progress
    const comEscolinhaTambem = {
      ...comBau,
      completedPlanetQuestIds: planetQuests.mercurio.map((q) => q.id),
    }
    const slots = planetDiscoverySlots('mercurio', comEscolinhaTambem)
    expect(slots.find((s) => s.kind === 'actionable_object')?.discovered).toBe(true)
    expect(slots.find((s) => s.kind === 'educational_quiz')?.discovered).toBe(true)
    expect(slots.find((s) => s.kind === 'collectible')?.discovered).toBe(false)
  })

  it('escolinha já conta como descoberta na 1ª pergunta certa do planeta, não só quando as 6 terminam', () => {
    const comUmaPergunta = {
      ...emptyProgress,
      completedPlanetQuestIds: [planetQuests.mercurio[0].id],
    }
    const slots = planetDiscoverySlots('mercurio', comUmaPergunta)
    expect(slots.find((s) => s.kind === 'educational_quiz')?.discovered).toBe(true)
  })
})

describe('nextPlanetDiscovery (lab-181)', () => {
  it('perfil sem nenhuma descoberta aponta pro postal de Marte (1º planeta, 1º slot)', () => {
    const next = nextPlanetDiscovery(emptyProgress)
    expect(next).toEqual({ planetId: 'marte', slot: expect.objectContaining({ kind: 'collectible' }) })
  })

  it('depois de completar os 3 slots de Marte, avança pro próximo planeta (Mercúrio)', () => {
    let progress = applyPostcardCollected(emptyProgress, 'marte').progress
    progress = markMarsCoinPotFound(progress).progress
    progress = applyPlanetSecretFound(progress, 'segredo-marte-sonda').progress
    const next = nextPlanetDiscovery(progress)
    expect(next?.planetId).toBe('mercurio')
    expect(next?.slot.kind).toBe('collectible')
  })

  it('perfil com TUDO descoberto nos 7 planetas devolve null (nunca trava numa tela vazia)', () => {
    const allPostcards = ['marte', 'mercurio', 'venus', 'jupiter', 'saturno', 'urano', 'netuno']
    const progress = {
      ...emptyProgress,
      collectedPostcardIds: allPostcards,
      foundMarsCoinPotEver: true,
      foundPlanetSecretIds: ['segredo-marte-sonda'],
      foundTreasureChestIds: ['bau-mercurio', 'bau-venus', 'bau-jupiter', 'bau-saturno', 'bau-urano', 'bau-netuno'],
      completedPlanetQuestIds: Object.values(planetQuests).flat().map((q) => q.id),
    }
    expect(nextPlanetDiscovery(progress)).toBeNull()
  })

  it('nunca depende de assinatura — mesmo resultado com ou sem entitlement (regra inegociável do projeto)', () => {
    // planetDiscoverySlots/nextPlanetDiscovery não recebem nem checam entitlementActive — a
    // ausência do parâmetro na assinatura JÁ é a garantia; este teste documenta a intenção.
    expect(nextPlanetDiscovery(emptyProgress)).toEqual(nextPlanetDiscovery({ ...emptyProgress }))
  })
})

describe('canChangeNickname — cooldown de troca de apelido', () => {
  it('permite a primeira troca (nunca trocou antes)', () => {
    expect(canChangeNickname(null, '2026-09-16T00:00:00.000Z')).toBe(true)
  })

  it('bloqueia antes dos 7 dias completos', () => {
    const changedAt = '2026-09-10T12:00:00.000Z'
    const almostSevenDays = '2026-09-17T11:59:59.000Z'
    expect(canChangeNickname(changedAt, almostSevenDays)).toBe(false)
  })

  it('libera exatamente aos 7 dias corridos, não por dia civil UTC', () => {
    const changedAt = '2026-09-10T23:00:00.000Z'
    // menos de 24h de diferença de calendário, mas exatamente 7*24h decorridas
    const sevenDaysLater = '2026-09-17T23:00:00.000Z'
    expect(canChangeNickname(changedAt, sevenDaysLater)).toBe(true)
  })

  it('data corrompida não trava a criança pra sempre — falha aberta (permite)', () => {
    expect(canChangeNickname('data-invalida', '2026-09-16T00:00:00.000Z')).toBe(true)
  })
})
