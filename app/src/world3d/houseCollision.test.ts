import { describe, expect, it } from 'vitest'
import { collisionRadiusForKind, isFurniturePositionValid } from './houseCollision'

describe('collisionRadiusForKind (lab-140)', () => {
  it('devolve o raio cadastrado pro tipo', () => {
    expect(collisionRadiusForKind('bed')).toBe(1.0)
    expect(collisionRadiusForKind('rug')).toBe(0.15)
  })

  it('devolve o padrão pra tipo desconhecido ou ausente', () => {
    expect(collisionRadiusForKind('algo-que-nao-existe')).toBe(0.6)
    expect(collisionRadiusForKind(undefined)).toBe(0.6)
  })
})

describe('isFurniturePositionValid (lab-140)', () => {
  it('posição longe de qualquer obstáculo é válida', () => {
    expect(isFurniturePositionValid(5, 5, 0.5, [{ x: 0, z: 0, radius: 0.9 }])).toBe(true)
  })

  it('posição em cima de um obstáculo é inválida', () => {
    expect(isFurniturePositionValid(0, 0, 0.5, [{ x: 0, z: 0, radius: 0.9 }])).toBe(false)
  })

  it('círculos que só se tocam na borda (soma dos raios == distância) contam como válido', () => {
    // distância exata 1.4 == 0.5 + 0.9 — a checagem usa "<", não "<=", então encostar não conta
    // como sobrepor.
    expect(isFurniturePositionValid(1.4, 0, 0.5, [{ x: 0, z: 0, radius: 0.9 }])).toBe(true)
  })

  it('sem obstáculo nenhum, qualquer posição é válida', () => {
    expect(isFurniturePositionValid(0, 0, 0.5, [])).toBe(true)
  })

  it('inválida se esbarrar em QUALQUER um dos vários obstáculos, não só o mais próximo', () => {
    const obstacles = [
      { x: 5, z: 5, radius: 0.5 },
      { x: 0, z: 0, radius: 0.5 },
      { x: -5, z: -5, radius: 0.5 },
    ]
    expect(isFurniturePositionValid(0.3, 0, 0.5, obstacles)).toBe(false)
  })
})
