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
