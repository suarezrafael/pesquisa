import { describe, expect, it } from 'vitest'
import {
  SPELLING_WORD_CATALOG,
  collectSpellingTile,
  createSpellingGame,
  isSpellingGameComplete,
  pickSpellingWord,
  spellingProgressText,
} from './spellingGame'

describe('pickSpellingWord', () => {
  it('sempre devolve uma palavra do catálogo', () => {
    const picked = pickSpellingWord(() => 0.99)
    expect(SPELLING_WORD_CATALOG).toContainEqual(picked)
  })
})

describe('createSpellingGame', () => {
  it('cria um azulejo por letra da palavra, nenhum coletado', () => {
    const game = createSpellingGame(() => 0.5)
    expect(game.tiles).toHaveLength(game.word.length)
    expect(game.tiles.every((t) => !t.collected)).toBe(true)
    expect(new Set(game.tiles.map((t) => t.id)).size).toBe(game.word.length)
    expect(game.collectedCount).toBe(0)
  })

  it('usa o `random` injetado (determinismo pra teste) em vez de Math.random real', () => {
    const gameA = createSpellingGame(() => 0.33)
    const gameB = createSpellingGame(() => 0.33)
    expect(gameA).toEqual(gameB)
  })
})

describe('collectSpellingTile', () => {
  it('coletar a letra certa (pelo id do azulejo que tem essa letra) avança o progresso', () => {
    const game = createSpellingGame(() => 0)
    const firstLetter = game.word[0]
    const tile = game.tiles.find((t) => t.letter === firstLetter)!
    const { state, correct } = collectSpellingTile(game, tile.id)
    expect(correct).toBe(true)
    expect(state.collectedCount).toBe(1)
    expect(state.tiles.find((t) => t.id === tile.id)!.collected).toBe(true)
  })

  it('coletar a letra errada não perde progresso (estado igual, exceto correct=false)', () => {
    const game = createSpellingGame(() => 0)
    const firstLetter = game.word[0]
    const wrongTile = game.tiles.find((t) => t.letter !== firstLetter)
    if (!wrongTile) return // palavra de 1 letra só (não existe no catálogo, guarda por segurança)
    const { state, correct } = collectSpellingTile(game, wrongTile.id)
    expect(correct).toBe(false)
    expect(state).toEqual(game)
  })

  it('ignora coletar um azulejo já coletado', () => {
    const game = createSpellingGame(() => 0)
    const firstLetter = game.word[0]
    const tile = game.tiles.find((t) => t.letter === firstLetter)!
    const afterFirst = collectSpellingTile(game, tile.id).state
    const again = collectSpellingTile(afterFirst, tile.id)
    expect(again.correct).toBe(false)
    expect(again.state).toEqual(afterFirst)
  })

  it('letra repetida: qualquer azulejo ainda não coletado com a letra certa serve', () => {
    // "BOLA" não tem letra repetida — monta um estado sintético com "L" duas vezes pra testar o
    // caso de letra repetida sem depender do catálogo real.
    const game = {
      word: 'LOLO',
      hint: '🔁',
      tiles: [
        { id: 0, letter: 'L', collected: false },
        { id: 1, letter: 'O', collected: false },
        { id: 2, letter: 'L', collected: false },
        { id: 3, letter: 'O', collected: false },
      ],
      collectedCount: 0,
    }
    // Primeira letra esperada é "L" (índice 0 de "LOLO") — coletar o azulejo id=2 (também "L",
    // mesmo não sendo o id "correspondente" à posição 0) tem que funcionar igual.
    const { state, correct } = collectSpellingTile(game, 2)
    expect(correct).toBe(true)
    expect(state.collectedCount).toBe(1)
    expect(state.tiles.find((t) => t.id === 2)!.collected).toBe(true)
    expect(state.tiles.find((t) => t.id === 0)!.collected).toBe(false)
  })
})

describe('isSpellingGameComplete', () => {
  it('falso até coletar todas as letras, verdadeiro quando completo', () => {
    let game = createSpellingGame(() => 0)
    for (let i = 0; i < game.word.length; i++) {
      expect(isSpellingGameComplete(game)).toBe(false)
      const nextLetter = game.word[game.collectedCount]
      const tile = game.tiles.find((t) => t.letter === nextLetter && !t.collected)!
      game = collectSpellingTile(game, tile.id).state
    }
    expect(isSpellingGameComplete(game)).toBe(true)
  })
})

describe('spellingProgressText', () => {
  it('mostra letras coletadas e "_" pras restantes, sem vazar a palavra inteira', () => {
    const game = createSpellingGame(() => 0)
    expect(spellingProgressText(game)).toBe(game.word.split('').map(() => '_').join(' '))
    const firstLetter = game.word[0]
    const tile = game.tiles.find((t) => t.letter === firstLetter)!
    const afterFirst = collectSpellingTile(game, tile.id).state
    const expected = game.word
      .split('')
      .map((letter, i) => (i === 0 ? letter : '_'))
      .join(' ')
    expect(spellingProgressText(afterFirst)).toBe(expected)
  })
})
