import { describe, expect, it } from 'vitest'
import {
  PATTERN_PAD_COUNT,
  PATTERN_ROUNDS_TO_WIN,
  PATTERN_START_LENGTH,
  createPatternGame,
  isPatternGameComplete,
  pressPatternPad,
} from './patternGame'

describe('createPatternGame', () => {
  it('começa com uma sequência do tamanho inicial, rodada 1, progresso 0', () => {
    const game = createPatternGame(() => 0.4)
    expect(game.sequence).toHaveLength(PATTERN_START_LENGTH)
    expect(game.round).toBe(1)
    expect(game.playerProgress).toBe(0)
    for (const pad of game.sequence) {
      expect(pad).toBeGreaterThanOrEqual(0)
      expect(pad).toBeLessThan(PATTERN_PAD_COUNT)
    }
  })

  it('usa o `random` injetado (determinismo pra teste) em vez de Math.random real', () => {
    const gameA = createPatternGame(() => 0.17)
    const gameB = createPatternGame(() => 0.17)
    expect(gameA).toEqual(gameB)
  })
})

describe('pressPatternPad', () => {
  it('apertar o pad certo avança o progresso sem completar a rodada antes da hora', () => {
    const game = createPatternGame(() => 0)
    const { state, correct, roundComplete } = pressPatternPad(game, game.sequence[0])
    expect(correct).toBe(true)
    expect(roundComplete).toBe(false)
    expect(state.playerProgress).toBe(1)
    expect(state.round).toBe(1)
  })

  it('completar a sequência inteira avança a rodada e cresce a sequência em 1', () => {
    let state = createPatternGame(() => 0)
    // comprimento da rodada travado ANTES do loop — a sequência cresce no último aperto certo, e
    // reavaliar `state.sequence.length` a cada iteração faria o loop rodar um aperto extra na
    // rodada NOVA que acabou de começar (achado escrevendo este próprio teste).
    const roundLength = state.sequence.length
    for (let i = 0; i < roundLength; i++) {
      state = pressPatternPad(state, state.sequence[i], () => 0).state
    }
    expect(state.round).toBe(2)
    expect(state.sequence).toHaveLength(PATTERN_START_LENGTH + 1)
    expect(state.playerProgress).toBe(0)
  })

  it('errar no meio não perde a rodada — só zera o progresso da MESMA sequência', () => {
    const game = createPatternGame(() => 0)
    const correctFirst = pressPatternPad(game, game.sequence[0]).state
    const wrongPad = (game.sequence[1] + 1) % PATTERN_PAD_COUNT
    const { state, correct, roundComplete } = pressPatternPad(correctFirst, wrongPad)
    expect(correct).toBe(false)
    expect(roundComplete).toBe(false)
    expect(state.playerProgress).toBe(0)
    expect(state.round).toBe(1)
    expect(state.sequence).toEqual(game.sequence) // sequência da rodada não muda ao errar
  })
})

describe('isPatternGameComplete', () => {
  it(`falso até completar ${PATTERN_ROUNDS_TO_WIN} rodadas, verdadeiro a partir daí`, () => {
    let state = createPatternGame(() => 0)
    for (let round = 1; round <= PATTERN_ROUNDS_TO_WIN; round++) {
      expect(isPatternGameComplete(state)).toBe(false)
      // mesmo cuidado do teste acima: trava o comprimento ANTES do loop, não reavalia
      // `state.sequence.length` a cada iteração (a sequência cresce no último aperto certo).
      const roundLength = state.sequence.length
      for (let i = 0; i < roundLength; i++) {
        state = pressPatternPad(state, state.sequence[i], () => 0).state
      }
    }
    expect(isPatternGameComplete(state)).toBe(true)
  })
})
