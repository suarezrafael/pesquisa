// Lab 216 ("Mini-jogo de memória e padrões") — lógica pura, sem nenhuma dependência de Babylon
// (mesma separação de `progression.ts`/`memoryGame.ts`/`countingGame.ts`, ver
// `docs/prompts/03-arquitetura-sistema.md` §1). Modo "sequência" (tipo Genius/Simon): repetir uma
// sequência de luzes que cresce 1 posição por rodada. Sem punição — errar no meio da sequência só
// repete a MESMA rodada (mesmo comprimento), nunca reinicia a dificuldade já conquistada.

export const PATTERN_PAD_COUNT = 4
export const PATTERN_START_LENGTH = 3
export const PATTERN_ROUNDS_TO_WIN = 5

export interface PatternGameState {
  sequence: number[]
  playerProgress: number
  round: number
}

function randomPad(random: () => number): number {
  return Math.floor(random() * PATTERN_PAD_COUNT)
}

// `random` é injetável só pros testes (determinismo), mesmo padrão de `createMemoryGame`/
// `createCountingRound`.
export function createPatternGame(random: () => number = Math.random): PatternGameState {
  const sequence: number[] = []
  for (let i = 0; i < PATTERN_START_LENGTH; i++) sequence.push(randomPad(random))
  return { sequence, playerProgress: 0, round: 1 }
}

// Aperta o pad `padIndex`. `correct` indica se ESTE aperto bateu com a próxima posição esperada da
// sequência; `roundComplete` indica se a sequência INTEIRA da rodada atual acabou de ser repetida
// certa (a rodada avança e uma posição nova é sorteada). Errar não perde as rodadas já ganhas — só
// zera `playerProgress` pra tentar a MESMA sequência de novo.
export function pressPatternPad(
  state: PatternGameState,
  padIndex: number,
  random: () => number = Math.random,
): { state: PatternGameState; correct: boolean; roundComplete: boolean } {
  const expected = state.sequence[state.playerProgress]
  if (padIndex !== expected) {
    return { state: { ...state, playerProgress: 0 }, correct: false, roundComplete: false }
  }

  const playerProgress = state.playerProgress + 1
  if (playerProgress < state.sequence.length) {
    return { state: { ...state, playerProgress }, correct: true, roundComplete: false }
  }

  const sequence = [...state.sequence, randomPad(random)]
  return { state: { sequence, playerProgress: 0, round: state.round + 1 }, correct: true, roundComplete: true }
}

export function isPatternGameComplete(state: PatternGameState): boolean {
  return state.round > PATTERN_ROUNDS_TO_WIN
}
