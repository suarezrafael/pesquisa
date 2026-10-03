import { describe, expect, it } from 'vitest'
import {
  answerLogicRound,
  createLogicGame,
  currentLogicRound,
  isLogicGameComplete,
  LOGIC_ROUNDS_TO_WIN,
} from './logicGame'

describe('logic game', () => {
  it('offers three distinct rounds with one valid answer each', () => {
    for (const seed of [0, 0.2, 0.5, 0.99]) {
      const game = createLogicGame(() => seed)
      expect(game.rounds).toHaveLength(LOGIC_ROUNDS_TO_WIN)
      expect(new Set(game.rounds.map((round) => round.sequence.join(','))).size).toBe(LOGIC_ROUNDS_TO_WIN)
      for (const round of game.rounds) {
        expect(new Set(round.options).size).toBe(3)
        expect(round.options.filter((option) => option === round.answer)).toHaveLength(1)
      }
      expect(game.rounds.map((round) => round.options.indexOf(round.answer)).sort()).toEqual([0, 1, 2])
    }
  })

  it('varies answer placement between attempts without mutating the catalog', () => {
    const first = createLogicGame(() => 0)
    let calls = 0
    const second = createLogicGame(() => calls++ === 0 ? 0 : 0.99)
    expect(first.rounds.map((round) => round.options.indexOf(round.answer)))
      .not.toEqual(second.rounds.map((round) => round.options.indexOf(round.answer)))
    expect(second.rounds.map((round) => round.sequence)).toEqual(first.rounds.map((round) => round.sequence))
    expect(createLogicGame(() => 0).rounds).toEqual(first.rounds)
  })

  it('cannot be completed by choosing the same plate in every round', () => {
    const game = createLogicGame(() => 0)
    for (const plate of [0, 1, 2]) {
      let state = game
      for (let attempt = 0; attempt < LOGIC_ROUNDS_TO_WIN; attempt++) {
        const round = currentLogicRound(state)!
        state = answerLogicRound(state, round.options[plate]).state
      }
      expect(isLogicGameComplete(state)).toBe(false)
    }
  })

  it('keeps the current round on error and completes only after three correct choices', () => {
    let game = createLogicGame(() => 0)
    for (let i = 0; i < LOGIC_ROUNDS_TO_WIN; i++) {
      const round = currentLogicRound(game)!
      const wrong = round.options.find((option) => option !== round.answer)!
      const error = answerLogicRound(game, wrong)
      expect(error.correct).toBe(false)
      expect(error.state).toBe(game)
      expect(isLogicGameComplete(game)).toBe(false)
      const result = answerLogicRound(game, round.answer)
      expect(result.correct).toBe(true)
      game = result.state
      expect(game.roundsWon).toBe(i + 1)
    }
    expect(isLogicGameComplete(game)).toBe(true)
    expect(currentLogicRound(game)).toBeNull()
    expect(answerLogicRound(game, 8).correct).toBe(false)
  })
})
