import { describe, expect, it } from 'vitest'
import { createMemoryGame, flipMemoryCard, isMemoryGameComplete } from './memoryGame'

describe('createMemoryGame', () => {
  it('cria 2 cartas por símbolo, nenhuma virada nem casada', () => {
    const game = createMemoryGame(['🍎', '🍌', '🍇'])
    expect(game.cards).toHaveLength(6)
    expect(game.cards.filter((c) => c.symbol === '🍎')).toHaveLength(2)
    expect(game.cards.every((c) => !c.matched)).toBe(true)
    expect(game.revealedIds).toEqual([])
    expect(game.moves).toBe(0)
  })

  it('usa o `random` injetado (determinismo pra teste) em vez de Math.random real', () => {
    // mesma função `random` sempre produz o mesmo embaralhamento — sem isso, um teste que
    // dependesse de Math.random real seria inerentemente inconsistente (flaky por design).
    const gameA = createMemoryGame(['🍎', '🍌', '🍇'], () => 0.42)
    const gameB = createMemoryGame(['🍎', '🍌', '🍇'], () => 0.42)
    expect(gameA.cards.map((c) => c.symbol)).toEqual(gameB.cards.map((c) => c.symbol))
  })
})

describe('flipMemoryCard', () => {
  it('revela a primeira carta sem formar par', () => {
    const game = createMemoryGame(['🍎', '🍌'], () => 0)
    const { state, matched } = flipMemoryCard(game, 0)
    expect(matched).toBe(false)
    expect(state.revealedIds).toEqual([0])
  })

  it('par certo marca as duas cartas como casadas e limpa reveladas', () => {
    const game = createMemoryGame(['🍎', '🍌'], () => 0) // ordem real com este `random`: 🍌,🍎,🍌,🍎 (verificado rodando o teste)
    const first = flipMemoryCard(game, 0)
    const second = flipMemoryCard(first.state, 2) // mesmo símbolo (🍌)
    expect(second.matched).toBe(true)
    expect(second.state.revealedIds).toEqual([])
    expect(second.state.cards[0].matched).toBe(true)
    expect(second.state.cards[2].matched).toBe(true)
    expect(second.state.moves).toBe(1)
  })

  it('par errado mantém as duas reveladas (sem marcar casado) até a próxima jogada', () => {
    const game = createMemoryGame(['🍎', '🍌'], () => 0) // ordem real com este `random`: 🍌,🍎,🍌,🍎 (verificado rodando o teste)
    const first = flipMemoryCard(game, 0)
    const second = flipMemoryCard(first.state, 1) // símbolo diferente
    expect(second.matched).toBe(false)
    expect(second.state.revealedIds).toEqual([0, 1])
    expect(second.state.cards.every((c) => !c.matched)).toBe(true)
  })

  it('jogada seguinte a um par errado esconde o par antes de revelar a nova carta', () => {
    const game = createMemoryGame(['🍎', '🍌', '🍇'], () => 0)
    const afterWrongPair = flipMemoryCard(flipMemoryCard(game, 0).state, 1).state
    expect(afterWrongPair.revealedIds).toEqual([0, 1])
    const { state } = flipMemoryCard(afterWrongPair, 4)
    expect(state.revealedIds).toEqual([4])
  })

  it('ignora virar uma carta já revelada ou já casada', () => {
    const game = createMemoryGame(['🍎', '🍌'], () => 0)
    const revealed = flipMemoryCard(game, 0).state
    const sameCardAgain = flipMemoryCard(revealed, 0)
    expect(sameCardAgain.state).toBe(revealed)

    const matchedState = flipMemoryCard(revealed, 2).state
    const flipMatchedAgain = flipMemoryCard(matchedState, 0)
    expect(flipMatchedAgain.state).toBe(matchedState)
  })
})

describe('isMemoryGameComplete', () => {
  it('falso enquanto sobrar par não casado, verdadeiro quando todos casarem', () => {
    const game = createMemoryGame(['🍎'], () => 0)
    expect(isMemoryGameComplete(game)).toBe(false)
    const { state } = flipMemoryCard(flipMemoryCard(game, 0).state, 1)
    expect(isMemoryGameComplete(state)).toBe(true)
  })
})
