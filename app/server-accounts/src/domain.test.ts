// Testes da lógica de domínio do Worker de contas — requisito [MUST] de
// docs/prompts/04-manutencao-clean-code.md §5, especificamente "regra de entitlement por
// assinatura": a checagem mais custosa de errar silenciosamente aqui é ou liberar o cosmético
// pago de graça, ou negar acesso a quem pagou. Primeiro teste automatizado deste Worker (lab-83).
import { describe, expect, it } from 'vitest'
import {
  generatePairingCode,
  isAtDeviceLimit,
  isEntitlementActive,
  isEventNewerThan,
  isPairingCodeUsable,
  isPlausibleSessionDuration,
  isTokenRevoked,
  isValidProductEventType,
  isValidSubscriptionStatus,
  MAX_ACTIVE_DEVICES_PER_FAMILY,
  toComparableIso,
  toIsoOrNull,
} from './domain'

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

describe('toComparableIso — lab-102, resto de G8', () => {
  it('converte um objeto Date (formato real devolvido pelo driver do Neon) pra ISO 8601', () => {
    const date = new Date('2026-09-24T00:33:15.000Z')
    expect(toComparableIso(date)).toBe('2026-09-24T00:33:15.000Z')
  })

  it('converte uma string de data já existente pro mesmo formato ISO', () => {
    expect(toComparableIso('2026-09-24T00:33:15.000Z')).toBe('2026-09-24T00:33:15.000Z')
  })

  it('trata um Date e uma string representando o mesmo instante como iguais', () => {
    const date = new Date('2026-09-24T00:33:15.000Z')
    expect(toComparableIso(date)).toBe(toComparableIso('2026-09-23T21:33:15.000-03:00'))
  })

  it('retorna null quando não há período definido', () => {
    expect(toComparableIso(null)).toBeNull()
  })
})

describe('isValidSubscriptionStatus — lab-96, G8', () => {
  it('aceita os 4 status originais', () => {
    expect(isValidSubscriptionStatus('trialing')).toBe(true)
    expect(isValidSubscriptionStatus('active')).toBe(true)
    expect(isValidSubscriptionStatus('past_due')).toBe(true)
    expect(isValidSubscriptionStatus('canceled')).toBe(true)
  })

  it('aceita os 4 status que o Stripe emite e o schema antigo rejeitava (Pix/boleto nasce incomplete)', () => {
    expect(isValidSubscriptionStatus('incomplete')).toBe(true)
    expect(isValidSubscriptionStatus('incomplete_expired')).toBe(true)
    expect(isValidSubscriptionStatus('unpaid')).toBe(true)
    expect(isValidSubscriptionStatus('paused')).toBe(true)
  })

  it('rejeita um status desconhecido/malformado (falha fechada — vira "ignora e loga", não 500)', () => {
    expect(isValidSubscriptionStatus('ativo')).toBe(false)
    expect(isValidSubscriptionStatus('')).toBe(false)
  })
})

describe('isEventNewerThan — lab-96, G8 (proteção contra webhook fora de ordem)', () => {
  it('sem evento anterior registrado, qualquer evento conta como mais novo', () => {
    expect(isEventNewerThan('2026-08-25T12:00:00.000Z', null)).toBe(true)
    expect(isEventNewerThan('2026-08-25T12:00:00.000Z', undefined)).toBe(true)
  })

  it('evento mais recente que o último aplicado: conta como mais novo', () => {
    expect(isEventNewerThan('2026-08-25T12:00:01.000Z', '2026-08-25T12:00:00.000Z')).toBe(true)
  })

  it('evento MAIS ANTIGO que o já aplicado (reentrega atrasada): NÃO conta como mais novo', () => {
    expect(isEventNewerThan('2026-08-25T11:59:59.000Z', '2026-08-25T12:00:00.000Z')).toBe(false)
  })

  it('mesmo timestamp exato: conta como mais novo (limite inclusivo, reaplica sem risco)', () => {
    expect(isEventNewerThan('2026-08-25T12:00:00.000Z', '2026-08-25T12:00:00.000Z')).toBe(true)
  })
})

describe('isTokenRevoked — lab-97, resto de G7', () => {
  it('token SEM jti (emitido antes deste laboratório): nunca conta como revogado (compatibilidade retroativa)', () => {
    expect(isTokenRevoked(undefined, undefined)).toBe(false)
    expect(isTokenRevoked(undefined, { revoked_at: '2026-08-25T12:00:00.000Z' })).toBe(false)
  })

  it('token COM jti e linha correspondente não revogada: entitlement continua ativo', () => {
    expect(isTokenRevoked('jti-123', { revoked_at: null })).toBe(false)
  })

  it('token COM jti e linha marcada como revogada: entitlement fica inativo', () => {
    expect(isTokenRevoked('jti-123', { revoked_at: '2026-08-25T12:00:00.000Z' })).toBe(true)
  })

  it('token COM jti mas SEM linha correspondente no banco: falha fechada, trata como revogado', () => {
    expect(isTokenRevoked('jti-123', undefined)).toBe(true)
  })
})

describe('isAtDeviceLimit — lab-97, resto de G7 (limite de 3 aparelhos por família)', () => {
  it(`o limite configurado é ${MAX_ACTIVE_DEVICES_PER_FAMILY}`, () => {
    expect(MAX_ACTIVE_DEVICES_PER_FAMILY).toBe(3)
  })

  it('abaixo do limite: não está no limite, pode emitir um token novo sem revogar nada', () => {
    expect(isAtDeviceLimit(0)).toBe(false)
    expect(isAtDeviceLimit(2)).toBe(false)
  })

  it('exatamente no limite: já deve revogar o mais antigo antes de emitir um token novo', () => {
    expect(isAtDeviceLimit(3)).toBe(true)
  })

  it('acima do limite (não deveria acontecer, mas por segurança): também conta como no limite', () => {
    expect(isAtDeviceLimit(4)).toBe(true)
  })
})

describe('isValidProductEventType — lab-99, resto de G11', () => {
  it('aceita os 3 tipos de evento conhecidos', () => {
    expect(isValidProductEventType('session_start')).toBe(true)
    expect(isValidProductEventType('session_end')).toBe(true)
    expect(isValidProductEventType('quest_completed')).toBe(true)
  })

  it('rejeita um tipo desconhecido — nunca confia em input do client sem checar', () => {
    expect(isValidProductEventType('qualquer_coisa')).toBe(false)
    expect(isValidProductEventType('')).toBe(false)
  })
})

describe('isPlausibleSessionDuration — lab-99, resto de G11', () => {
  it('aceita uma duração positiva razoável (ex.: 10 minutos)', () => {
    expect(isPlausibleSessionDuration(10 * 60 * 1000)).toBe(true)
  })

  it('rejeita zero ou negativo (relógio de aparelho errado, ou bug)', () => {
    expect(isPlausibleSessionDuration(0)).toBe(false)
    expect(isPlausibleSessionDuration(-1000)).toBe(false)
  })

  it('rejeita acima de 4 horas (teto de sanidade)', () => {
    expect(isPlausibleSessionDuration(5 * 60 * 60 * 1000)).toBe(false)
  })

  it('aceita bem no limite de 4 horas', () => {
    expect(isPlausibleSessionDuration(4 * 60 * 60 * 1000)).toBe(true)
  })

  it('rejeita valores que não são número (NaN, string, undefined)', () => {
    expect(isPlausibleSessionDuration(Number.NaN)).toBe(false)
    expect(isPlausibleSessionDuration('1000')).toBe(false)
    expect(isPlausibleSessionDuration(undefined)).toBe(false)
  })
})
