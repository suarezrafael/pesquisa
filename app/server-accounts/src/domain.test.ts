// Testes da lógica de domínio do Worker de contas — requisito [MUST] de
// docs/prompts/04-manutencao-clean-code.md §5, especificamente "regra de entitlement por
// assinatura": a checagem mais custosa de errar silenciosamente aqui é ou liberar o cosmético
// pago de graça, ou negar acesso a quem pagou. Primeiro teste automatizado deste Worker (lab-83).
import { describe, expect, it } from 'vitest'
import { generatePairingCode, isEntitlementActive, isPairingCodeUsable, toIsoOrNull } from './domain'

describe('isEntitlementActive — decide se o entitlement do jogo fica ligado', () => {
  it('conta "active" como entitlement ativo', () => {
    expect(isEntitlementActive('active')).toBe(true)
  })

  it('conta "trialing" como entitlement ativo', () => {
    expect(isEntitlementActive('trialing')).toBe(true)
  })

  it('NÃO conta "past_due" como ativo — cartão falhou, não deve liberar cosmético de graça', () => {
    expect(isEntitlementActive('past_due')).toBe(false)
  })

  it('NÃO conta "canceled" como ativo', () => {
    expect(isEntitlementActive('canceled')).toBe(false)
  })

  it('trata ausência de assinatura (undefined/null) como não ativo', () => {
    expect(isEntitlementActive(undefined)).toBe(false)
    expect(isEntitlementActive(null)).toBe(false)
  })

  it('não reconhece um status desconhecido/malformado como ativo (falha fechada, não aberta)', () => {
    expect(isEntitlementActive('ativo')).toBe(false)
    expect(isEntitlementActive('')).toBe(false)
  })
})

describe('isPairingCodeUsable — pareamento do entitlement com o jogo (Fase D)', () => {
  const AGORA = new Date('2026-08-24T12:00:00.000Z').getTime()

  it('código válido, não resgatado, dentro do prazo: pode usar', () => {
    const row = { redeemed_at: null, expires_at: '2026-08-24T12:10:00.000Z' }
    expect(isPairingCodeUsable(row, AGORA)).toBe(true)
  })

  it('código já resgatado: não pode usar de novo (uso único)', () => {
    const row = { redeemed_at: '2026-08-24T11:00:00.000Z', expires_at: '2026-08-24T12:10:00.000Z' }
    expect(isPairingCodeUsable(row, AGORA)).toBe(false)
  })

  it('código expirado: não pode usar mesmo que nunca tenha sido resgatado', () => {
    const row = { redeemed_at: null, expires_at: '2026-08-24T11:59:59.000Z' }
    expect(isPairingCodeUsable(row, AGORA)).toBe(false)
  })

  it('código no exato instante de expiração ainda é válido (limite inclusivo)', () => {
    const row = { redeemed_at: null, expires_at: '2026-08-24T12:00:00.000Z' }
    expect(isPairingCodeUsable(row, AGORA)).toBe(true)
  })

  it('código inexistente (linha não encontrada no banco): não pode usar', () => {
    expect(isPairingCodeUsable(undefined, AGORA)).toBe(false)
  })
})

describe('generatePairingCode', () => {
  it('sempre gera uma string de exatamente 6 dígitos numéricos', () => {
    for (let i = 0; i < 200; i++) {
      const code = generatePairingCode()
      expect(code).toMatch(/^\d{6}$/)
    }
  })
})

describe('toIsoOrNull', () => {
  it('converte segundos Unix (formato do Stripe) pra ISO 8601', () => {
    expect(toIsoOrNull(1787529590)).toBe(new Date(1787529590 * 1000).toISOString())
  })

  it('retorna null quando não há timestamp (assinatura sem período definido)', () => {
    expect(toIsoOrNull(null)).toBeNull()
    expect(toIsoOrNull(undefined)).toBeNull()
  })
})
