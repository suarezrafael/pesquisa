// Lab 213 ("Template de arena educativa reutilizável") — lógica pura do jogo da memória, sem
// nenhuma dependência de Babylon (mesma separação de `progression.ts`, ver
// `docs/prompts/03-arquitetura-sistema.md` §1). Prova de conceito do template: uma versão simples
// de verdade do jogo de memória, não a versão polida/final (lab-216).

export interface MemoryCard {
  id: number
  symbol: string
  matched: boolean
}

export interface MemoryGameState {
  cards: MemoryCard[]
  revealedIds: number[]
  moves: number
}

// `random` é injetável só pros testes (determinismo) — produção usa `Math.random` por padrão,
// mesmo padrão já estabelecido em `selectEnvironmentalChallengeQuest` (`progression.ts`).
export function createMemoryGame(symbols: string[], random: () => number = Math.random): MemoryGameState {
  const deck = [...symbols, ...symbols]
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return {
    cards: deck.map((symbol, id) => ({ id, symbol, matched: false })),
    revealedIds: [],
    moves: 0,
  }
}

// Vira uma carta. Regras: virar uma carta já virada/já casada não faz nada; com 2 cartas já
// reveladas (um par sem match do turno anterior), a próxima interação primeiro esconde esse par
// antes de revelar a nova carta — mesmo ritmo de um jogo de memória físico (olhar o par errado,
// depois virar de novo pra tentar a próxima). `matched` no retorno indica se ESTA jogada formou um
// par certo, pra quem chama tocar um efeito/registrar progresso sem precisar comparar estados.
export function flipMemoryCard(state: MemoryGameState, id: number): { state: MemoryGameState; matched: boolean } {
  const card = state.cards.find((c) => c.id === id)
  if (!card || card.matched || state.revealedIds.includes(id)) return { state, matched: false }

  const clearedState = state.revealedIds.length >= 2 ? { ...state, revealedIds: [] } : state

  if (clearedState.revealedIds.length === 0) {
    return { state: { ...clearedState, revealedIds: [id] }, matched: false }
  }

  const otherId = clearedState.revealedIds[0]
  const other = clearedState.cards.find((c) => c.id === otherId)!
  const moves = clearedState.moves + 1
  if (other.symbol === card.symbol) {
    const cards = clearedState.cards.map((c) => (c.id === id || c.id === otherId ? { ...c, matched: true } : c))
    return { state: { cards, revealedIds: [], moves }, matched: true }
  }
  return { state: { ...clearedState, revealedIds: [otherId, id], moves }, matched: false }
}

export function isMemoryGameComplete(state: MemoryGameState): boolean {
  return state.cards.every((c) => c.matched)
}
