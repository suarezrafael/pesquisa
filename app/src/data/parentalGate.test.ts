import { describe, expect, it } from 'vitest'
import { generateGateChallenge, isGateAnswerCorrect } from './parentalGate'

describe('generateGateChallenge', () => {
  it('gera os dois fatores dentro da faixa 12-87 nos extremos do random', () => {
    expect(generateGateChallenge(() => 0)).toEqual({ a: 12, b: 12 })
    expect(generateGateChallenge(() => 0.999999)).toEqual({ a: 87, b: 87 })
  })
})

describe('isGateAnswerCorrect', () => {
  const challenge = { a: 23, b: 4 } // 92

  it('aceita a resposta certa', () => {
    expect(isGateAnswerCorrect(challenge, '92')).toBe(true)
  })

  it('aceita a resposta certa com espaços em volta', () => {
    expect(isGateAnswerCorrect(challenge, '  92  ')).toBe(true)
  })

  it('rejeita um número errado', () => {
    expect(isGateAnswerCorrect(challenge, '91')).toBe(false)
  })

  it('rejeita string vazia ou só espaço', () => {
    expect(isGateAnswerCorrect(challenge, '')).toBe(false)
    expect(isGateAnswerCorrect(challenge, '   ')).toBe(false)
  })

  it('rejeita texto não numérico', () => {
    expect(isGateAnswerCorrect(challenge, 'noventa e dois')).toBe(false)
  })
})
