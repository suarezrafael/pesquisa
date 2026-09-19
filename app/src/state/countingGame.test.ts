import { describe, expect, it } from 'vitest'
import {
  COUNTING_ROUNDS_TO_WIN,
  answerCountingRound,
  createCountingGame,
  createCountingRound,
  isCountingGameComplete,
} from './countingGame'

describe('createCountingRound', () => {
  it('gera 3 opções únicas, incluindo o alvo, dentro do intervalo 2-6', () => {
    const round = createCountingRound(() => 0.5)
    expect(round.targetCount).toBeGreaterThanOrEqual(2)
    expect(round.targetCount).toBeLessThanOrEqual(6)
    expect(round.options).toHaveLength(3)
    expect(new Set(round.options).size).toBe(3)
    expect(round.options).toContain(round.targetCount)
    for (const opt of round.options) {
      expect(opt).toBeGreaterThanOrEqual(2)
      expect(opt).toBeLessThanOrEqual(6)
    }
  })

  it('não trava mesmo com um `random` que sempre devolve o mesmo valor', () => {
    // o pool de opções erradas vem de uma lista de tamanho fixo (embaralhada), não de sorteio
    // repetido — um `random` constante não pode causar loop infinito.
    const round = createCountingRound(() => 0)
    expect(round.options).toHaveLength(3)
    expect(new Set(round.options).size).toBe(3)
  })

  it('usa o `random` injetado (determinismo pra teste) em vez de Math.random real', () => {
    const roundA = createCountingRound(() => 0.17)
    const roundB = createCountingRound(() => 0.17)
    expect(roundA).toEqual(roundB)
  })
})

describe('createCountingGame', () => {
  it('começa com 0 rodadas ganhas e uma rodada válida', () => {
    const game = createCountingGame(() => 0.3)
    expect(game.roundsWon).toBe(0)
    expect(game.round.options).toContain(game.round.targetCount)
  })
})

describe('answerCountingRound', () => {
  it('resposta certa soma 1 rodada ganha e gera uma rodada nova', () => {
    const game = createCountingGame(() => 0.2)
    const { state, correct } = answerCountingRound(game, game.round.targetCount, () => 0.9)
    expect(correct).toBe(true)
    expect(state.roundsWon).toBe(1)
    expect(state.round.options).toContain(state.round.targetCount)
  })

  it('resposta errada não perde progresso: rodada e contagem de vitórias continuam iguais', () => {
    const game = createCountingGame(() => 0.2)
    const wrongOption = [2, 3, 4, 5, 6].find((n) => n !== game.round.targetCount)!
    const { state, correct } = answerCountingRound(game, wrongOption)
    expect(correct).toBe(false)
    expect(state).toEqual(game)
  })
})

describe('isCountingGameComplete', () => {
  it(`falso até ${COUNTING_ROUNDS_TO_WIN} rodadas ganhas, verdadeiro a partir daí`, () => {
    let game = createCountingGame(() => 0.4)
    expect(isCountingGameComplete(game)).toBe(false)
    for (let i = 0; i < COUNTING_ROUNDS_TO_WIN; i++) {
      expect(isCountingGameComplete(game)).toBe(false)
      game = answerCountingRound(game, game.round.targetCount, () => 0.4).state
    }
    expect(isCountingGameComplete(game)).toBe(true)
  })
})
