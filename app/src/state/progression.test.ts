// Testes da lógica de domínio de progressão/recompensa/entitlement — requisito [MUST] de
// docs/prompts/04-manutencao-clean-code.md §5: "lógica de domínio (cálculo de recompensa,
// validação de resposta de quest, regra de entitlement por assinatura) tem teste unitário... a
// mais custosa de errar silenciosamente (ex.: dar recompensa errada, liberar feature paga de
// graça)". Este arquivo é o primeiro teste automatizado do projeto (lab-83).
import { describe, expect, it } from 'vitest'
import {
  applyCoinCollected,
  applyPlanetQuestCompletion,
  applyQuestCompletion,
  applyStreakReset,
  applyTreasureChestFound,
  badgesEarnedAt,
  getLevel,
  isQuestUnlocked,
  SUBSCRIBER_COIN_MULTIPLIER,
  unlockAvatar,
  unlockBackpackColor,
  unlockFurniture,
  unlockGlasses,
  unlockHat,
  unlockHairShape,
  unlockMarsReward,
  unlockPantsColor,
  unlockPlanetFurnitureReward,
  unlockShirtColor,
  unlockShoeColor,
  xpForLevel,
  xpIntoLevel,
} from './progression'
import { emptyProgress } from './storage'
import { quests } from '../data/quests'
import { planetQuests } from '../data/planetQuests'
import type { Quest } from '../types'
import type { WeeklyEvent } from '../data/weeklyEvents'

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

  it('unlockFurniture não desbloqueia o mesmo item duas vezes nem desconta moeda de novo', () => {
    const jaTem = { ...emptyProgress, coins: 100, unlockedFurnitureIds: ['cama'] }
    const next = unlockFurniture(jaTem, 'cama')
    expect(next).toBe(jaTem)
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
