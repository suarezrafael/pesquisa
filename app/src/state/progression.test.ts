// Testes da lógica de domínio de progressão/recompensa/entitlement — requisito [MUST] de
// docs/prompts/04-manutencao-clean-code.md §5: "lógica de domínio (cálculo de recompensa,
// validação de resposta de quest, regra de entitlement por assinatura) tem teste unitário... a
// mais custosa de errar silenciosamente (ex.: dar recompensa errada, liberar feature paga de
// graça)". Este arquivo é o primeiro teste automatizado do projeto (lab-83).
import { describe, expect, it } from 'vitest'
import {
  applyCoinCollected,
  applyQuestCompletion,
  badgesEarnedAt,
  getLevel,
  isQuestUnlocked,
  unlockAvatar,
  unlockBackpackColor,
  unlockFurniture,
  unlockGlasses,
  unlockHat,
  unlockHairShape,
  unlockMarsReward,
  unlockPantsColor,
  unlockShirtColor,
  unlockShoeColor,
  xpForLevel,
  xpIntoLevel,
} from './progression'
import { emptyProgress } from './storage'
import { quests } from '../data/quests'
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
