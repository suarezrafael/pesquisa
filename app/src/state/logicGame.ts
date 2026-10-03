export const LOGIC_ROUNDS_TO_WIN = 3

export interface LogicRound {
  sequence: readonly [number, number, number]
  options: readonly [number, number, number]
  answer: number
}

export interface LogicGameState {
  rounds: readonly LogicRound[]
  roundsWon: number
}

const LOGIC_ROUNDS: readonly LogicRound[] = [
  { sequence: [2, 4, 6], options: [7, 8, 10], answer: 8 },
  { sequence: [1, 3, 5], options: [6, 7, 9], answer: 7 },
  { sequence: [3, 6, 9], options: [11, 12, 15], answer: 12 },
  { sequence: [10, 9, 8], options: [6, 7, 8], answer: 7 },
  { sequence: [1, 2, 4], options: [6, 8, 10], answer: 8 },
  { sequence: [4, 7, 10], options: [12, 13, 14], answer: 13 },
]

export function createLogicGame(random: () => number = Math.random): LogicGameState {
  const offset = Math.min(Math.max(Math.floor(random() * LOGIC_ROUNDS.length), 0), LOGIC_ROUNDS.length - 1)
  return {
    rounds: Array.from({ length: LOGIC_ROUNDS_TO_WIN }, (_, index) => LOGIC_ROUNDS[(offset + index) % LOGIC_ROUNDS.length]),
    roundsWon: 0,
  }
}

export function currentLogicRound(state: LogicGameState): LogicRound | null {
  return state.rounds[state.roundsWon] ?? null
}

export function answerLogicRound(state: LogicGameState, choice: number): { state: LogicGameState; correct: boolean } {
  const round = currentLogicRound(state)
  if (!round || choice !== round.answer) return { state, correct: false }
  return { state: { ...state, roundsWon: state.roundsWon + 1 }, correct: true }
}

export function isLogicGameComplete(state: LogicGameState): boolean {
  return state.roundsWon >= LOGIC_ROUNDS_TO_WIN
}
