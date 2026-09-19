// Lab 214 ("Mini-jogo de contar e quantidade") — lógica pura, sem nenhuma dependência de Babylon
// (mesma separação de `progression.ts`/`memoryGame.ts`, ver `docs/prompts/03-arquitetura-sistema.md`
// §1). V1: contar um agrupamento de objetos e escolher o total certo entre 3 opções — comparação
// "mais/menos/igual" e sequências numéricas ficam pra uma iteração futura do próprio Lab 214.

export interface CountingRound {
  targetCount: number
  options: number[]
}

export interface CountingGameState {
  round: CountingRound
  roundsWon: number
}

const MIN_COUNT = 2
const MAX_COUNT = 6
export const COUNTING_ROUNDS_TO_WIN = 3

// `random` é injetável só pros testes (determinismo), mesmo padrão de `createMemoryGame`. As 2
// opções erradas vêm de um pool de tamanho fixo (embaralhado, não sorteado por tentativa-e-erro) —
// termina sempre em tempo constante mesmo com um `random` que sempre devolve o mesmo valor (um
// laço por-tentativa poderia nunca escapar de gerar sempre o mesmo candidato repetido).
export function createCountingRound(random: () => number = Math.random): CountingRound {
  const targetCount = MIN_COUNT + Math.floor(random() * (MAX_COUNT - MIN_COUNT + 1))

  const decoyPool: number[] = []
  for (let n = MIN_COUNT; n <= MAX_COUNT; n++) {
    if (n !== targetCount) decoyPool.push(n)
  }
  shuffleInPlace(decoyPool, random)

  const options = [targetCount, decoyPool[0], decoyPool[1]]
  shuffleInPlace(options, random)

  return { targetCount, options }
}

function shuffleInPlace(items: number[], random: () => number): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
}

export function createCountingGame(random: () => number = Math.random): CountingGameState {
  return { round: createCountingRound(random), roundsWon: 0 }
}

// Errar não perde progresso: a mesma rodada continua (`roundsWon` só sobe em acerto), quem chama
// mostra o feedback e deixa a criança escolher de novo. `correct` no retorno indica se ESTA escolha
// acertou, pra quem chama tocar um efeito sem precisar comparar estados.
export function answerCountingRound(
  state: CountingGameState,
  chosen: number,
  random: () => number = Math.random,
): { state: CountingGameState; correct: boolean } {
  if (chosen !== state.round.targetCount) {
    return { state, correct: false }
  }
  return {
    state: { round: createCountingRound(random), roundsWon: state.roundsWon + 1 },
    correct: true,
  }
}

export function isCountingGameComplete(state: CountingGameState): boolean {
  return state.roundsWon >= COUNTING_ROUNDS_TO_WIN
}
