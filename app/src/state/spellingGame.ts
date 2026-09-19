// Lab 215 ("Mini-jogo de soletrar e leitura") — lógica pura, sem nenhuma dependência de Babylon
// (mesma separação de `progression.ts`/`memoryGame.ts`/`countingGame.ts`, ver
// `docs/prompts/03-arquitetura-sistema.md` §1). V1: uma palavra por tentativa, catálogo controlado
// e seguro (backlog explícito: "sem texto livre digitado pela criança no primeiro lab").

export interface SpellingWord {
  word: string
  hint: string
}

// Palavras curtas, seguras e com dica visual clara (emoji) — sem correção ortográfica aberta nem
// entrada de texto livre, conforme escopo do próprio Lab 215.
export const SPELLING_WORD_CATALOG: SpellingWord[] = [
  { word: 'SOL', hint: '☀️' },
  { word: 'LUA', hint: '🌙' },
  { word: 'MAR', hint: '🌊' },
  { word: 'GATO', hint: '🐱' },
  { word: 'PATO', hint: '🦆' },
  { word: 'BOLA', hint: '⚽' },
  { word: 'PEIXE', hint: '🐟' },
  { word: 'COELHO', hint: '🐰' },
]

export interface SpellingTile {
  id: number
  letter: string
  collected: boolean
}

export interface SpellingGameState {
  word: string
  hint: string
  tiles: SpellingTile[]
  collectedCount: number
}

function shuffleInPlace<T>(items: T[], random: () => number): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
}

// `random` é injetável só pros testes (determinismo), mesmo padrão de `createMemoryGame`/
// `createCountingRound`.
export function pickSpellingWord(random: () => number = Math.random): SpellingWord {
  const index = Math.floor(random() * SPELLING_WORD_CATALOG.length)
  return SPELLING_WORD_CATALOG[index]
}

export function createSpellingGame(random: () => number = Math.random): SpellingGameState {
  const { word, hint } = pickSpellingWord(random)
  const tiles = word.split('').map((letter, id) => ({ id, letter, collected: false }))
  // Embaralha só a posição VISUAL dos azulejos — a ordem exigida pra soletrar continua sendo a da
  // própria palavra (`word`), comparada por letra em `collectSpellingTile`, nunca pela posição
  // deste array.
  shuffleInPlace(tiles, random)
  return { word, hint, tiles, collectedCount: 0 }
}

// Coleta um azulejo pelo `id` (identidade estável, mesma convenção de `MemoryCard.id` —
// independente da posição embaralhada). Compara por LETRA contra a próxima esperada, não por
// posição/id: numa palavra com letra repetida, a criança não tem como distinguir visualmente qual
// ocorrência é "a certa", então qualquer azulejo ainda não coletado com a letra certa serve.
// Errar não perde progresso — `collectedCount` só avança em acerto.
export function collectSpellingTile(state: SpellingGameState, tileId: number): { state: SpellingGameState; correct: boolean } {
  const tile = state.tiles.find((t) => t.id === tileId)
  if (!tile || tile.collected) return { state, correct: false }
  const expectedLetter = state.word[state.collectedCount]
  if (tile.letter !== expectedLetter) return { state, correct: false }
  const tiles = state.tiles.map((t) => (t.id === tileId ? { ...t, collected: true } : t))
  return { state: { ...state, tiles, collectedCount: state.collectedCount + 1 }, correct: true }
}

export function isSpellingGameComplete(state: SpellingGameState): boolean {
  return state.collectedCount >= state.word.length
}

// Progresso visível sem vazar a resposta completa (ex.: "G A _ _" pra "GATO" com 2 letras
// coletadas) — usado no label de status da arena.
export function spellingProgressText(state: SpellingGameState): string {
  return state.word
    .split('')
    .map((letter, i) => (i < state.collectedCount ? letter : '_'))
    .join(' ')
}
