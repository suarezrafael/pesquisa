// Testes da lógica de domínio do Worker de contas — requisito [MUST] de
// docs/prompts/04-manutencao-clean-code.md §5, especificamente "regra de entitlement por
// assinatura": a checagem mais custosa de errar silenciosamente aqui é ou liberar o cosmético
// pago de graça, ou negar acesso a quem pagou. Primeiro teste automatizado deste Worker (lab-83).
import { describe, expect, it } from 'vitest'
import {
  buildWeeklyProgressEmail,
  calculateNpsScore,
  generatePairingCode,
  isAtDeviceLimit,
  isEntitlementActive,
  isEventNewerThan,
  isPairingCodeUsable,
  isPlausibleSessionDuration,
  isTokenRevoked,
  isValidNpsScore,
  isValidProductEventType,
  isValidProgressBackupPayload,
  isValidProgressSummary,
  isValidSubscriptionStatus,
  MAX_ACTIVE_DEVICES_PER_FAMILY,
  NPS_COOLDOWN_DAYS,
  resolveTrustedOrigin,
  shouldPromptForNps,
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

describe('isValidNpsScore — lab-103', () => {
  it('aceita inteiros de 0 a 10', () => {
    expect(isValidNpsScore(0)).toBe(true)
    expect(isValidNpsScore(7)).toBe(true)
    expect(isValidNpsScore(10)).toBe(true)
  })

  it('rejeita fora do intervalo', () => {
    expect(isValidNpsScore(-1)).toBe(false)
    expect(isValidNpsScore(11)).toBe(false)
  })

  it('rejeita não-inteiro e tipo errado', () => {
    expect(isValidNpsScore(7.5)).toBe(false)
    expect(isValidNpsScore('7')).toBe(false)
    expect(isValidNpsScore(undefined)).toBe(false)
    expect(isValidNpsScore(null)).toBe(false)
  })
})

describe('shouldPromptForNps — lab-103', () => {
  const now = new Date('2026-08-27T12:00:00.000Z').getTime()

  it('pergunta se nunca respondeu antes', () => {
    expect(shouldPromptForNps(null, now)).toBe(true)
  })

  it('não pergunta de novo dentro do cooldown', () => {
    const tenDaysAgo = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString()
    expect(shouldPromptForNps(tenDaysAgo, now)).toBe(false)
  })

  it('pergunta de novo depois do cooldown vencer', () => {
    const justPastCooldown = new Date(now - (NPS_COOLDOWN_DAYS * 24 * 60 * 60 * 1000 + 1000)).toISOString()
    expect(shouldPromptForNps(justPastCooldown, now)).toBe(true)
  })

  it('aceita um Date além de string (mesmo achado do lab-102 sobre o driver do Neon)', () => {
    const tenDaysAgo = new Date(now - 10 * 24 * 60 * 60 * 1000)
    expect(shouldPromptForNps(tenDaysAgo, now)).toBe(false)
  })
})

describe('calculateNpsScore — lab-103', () => {
  it('retorna score null sem nenhuma resposta (evita dividir por zero)', () => {
    expect(calculateNpsScore([])).toEqual({
      totalResponses: 0,
      promoters: 0,
      passives: 0,
      detractors: 0,
      score: null,
    })
  })

  it('classifica promotores (9-10), neutros (7-8) e detratores (0-6) corretamente', () => {
    const summary = calculateNpsScore([10, 9, 8, 7, 6, 0])
    expect(summary.promoters).toBe(2)
    expect(summary.passives).toBe(2)
    expect(summary.detractors).toBe(2)
    expect(summary.totalResponses).toBe(6)
  })

  it('calcula o score como %promotores − %detratores, em pontos percentuais', () => {
    // 2 promotores, 2 detratores, 6 total: (2-2)/6 = 0
    expect(calculateNpsScore([10, 9, 8, 7, 6, 0]).score).toBe(0)
    // 3 promotores, 0 detratores, 3 total: (3-0)/3 = 100
    expect(calculateNpsScore([9, 10, 10]).score).toBe(100)
    // 0 promotores, 3 detratores, 3 total: (0-3)/3 = -100
    expect(calculateNpsScore([0, 1, 6]).score).toBe(-100)
  })
})

describe('isValidProgressSummary — lab-119, Fase F', () => {
  const validSummary = { level: 5, totalXp: 320, coins: 154, questsCompleted: 12, badgesCount: 2 }

  it('aceita um resumo com os 5 números plausíveis', () => {
    expect(isValidProgressSummary(validSummary)).toBe(true)
  })

  it('rejeita payload que não é objeto', () => {
    expect(isValidProgressSummary(null)).toBe(false)
    expect(isValidProgressSummary('nada')).toBe(false)
    expect(isValidProgressSummary(42)).toBe(false)
  })

  it('rejeita quando falta algum campo', () => {
    const { level: _level, ...rest } = validSummary
    expect(isValidProgressSummary(rest)).toBe(false)
  })

  it('rejeita número negativo, fracionário ou acima do teto plausível', () => {
    expect(isValidProgressSummary({ ...validSummary, level: -1 })).toBe(false)
    expect(isValidProgressSummary({ ...validSummary, coins: 1.5 })).toBe(false)
    expect(isValidProgressSummary({ ...validSummary, totalXp: 10_000_000 })).toBe(false)
  })

  it('rejeita campo com tipo errado (ex.: string em vez de número)', () => {
    expect(isValidProgressSummary({ ...validSummary, badgesCount: '2' })).toBe(false)
  })
})

describe('isValidProgressBackupPayload — lab-142 (backup/restauração de progresso, G6)', () => {
  it('aceita profile/progress como objetos, com qualquer campo dentro (validação estrutural, não campo a campo)', () => {
    expect(
      isValidProgressBackupPayload({
        profile: { name: 'Ana', avatarEmoji: '🦊' },
        progress: { xp: 100, coins: 20, unlockedHatIds: ['coroa'] },
      }),
    ).toBe(true)
  })

  it('aceita profile/progress vazios (objetos, só sem campos)', () => {
    expect(isValidProgressBackupPayload({ profile: {}, progress: {} })).toBe(true)
  })

  it('rejeita payload que não é objeto', () => {
    expect(isValidProgressBackupPayload(null)).toBe(false)
    expect(isValidProgressBackupPayload('nada')).toBe(false)
    expect(isValidProgressBackupPayload(42)).toBe(false)
    expect(isValidProgressBackupPayload([])).toBe(false)
  })

  it('rejeita quando falta profile ou progress', () => {
    expect(isValidProgressBackupPayload({ profile: {} })).toBe(false)
    expect(isValidProgressBackupPayload({ progress: {} })).toBe(false)
  })

  it('rejeita profile/progress que não são objetos de verdade (array, string, número)', () => {
    expect(isValidProgressBackupPayload({ profile: [], progress: {} })).toBe(false)
    expect(isValidProgressBackupPayload({ profile: {}, progress: 'nada' })).toBe(false)
    expect(isValidProgressBackupPayload({ profile: {}, progress: 42 })).toBe(false)
    expect(isValidProgressBackupPayload({ profile: null, progress: {} })).toBe(false)
  })
})

describe('buildWeeklyProgressEmail — lab-119, Fase F', () => {
  const summary = { level: 5, totalXp: 320, coins: 154, questsCompleted: 1, badgesCount: 1 }

  it('nunca inclui resposta de quest/apelido/avatar — só os 5 números do resumo', () => {
    const email = buildWeeklyProgressEmail(summary, 'Ana')
    expect(email.html).toContain('Nível 5')
    expect(email.html).toContain('320 XP')
    expect(email.html).toContain('154 moedas')
  })

  it('usa singular/plural corretos pra 1 missão/emblema', () => {
    const email = buildWeeklyProgressEmail(summary, null)
    expect(email.html).toContain('1 missão concluída')
    expect(email.html).toContain('1 emblema conquistado')
    expect(email.html).not.toContain('missões concluídas')
  })

  it('usa plural corretos pra mais de 1 missão/emblema', () => {
    const email = buildWeeklyProgressEmail({ ...summary, questsCompleted: 3, badgesCount: 4 }, null)
    expect(email.html).toContain('3 missões concluídas')
    expect(email.html).toContain('4 emblemas conquistados')
  })

  it('cumprimenta pelo nome quando disponível, genérico quando não', () => {
    expect(buildWeeklyProgressEmail(summary, 'Ana').html).toContain('Oi, Ana!')
    expect(buildWeeklyProgressEmail(summary, null).html).toContain('Oi!')
  })
})

describe('resolveTrustedOrigin — lab-147 (achado do Copilot: Origin do header é do cliente)', () => {
  const allowlist = 'https://missaoaprendizado.com,https://app-two-flax-92.vercel.app'

  it('aceita um Origin que está na lista permitida', () => {
    expect(resolveTrustedOrigin('https://missaoaprendizado.com', allowlist, 'https://default.example')).toBe(
      'https://missaoaprendizado.com',
    )
  })

  it('cai no default quando o Origin não está na lista (possível domínio malicioso)', () => {
    expect(resolveTrustedOrigin('https://evil.example', allowlist, 'https://default.example')).toBe(
      'https://default.example',
    )
  })

  it('cai no default quando não há header Origin nenhum', () => {
    expect(resolveTrustedOrigin(null, allowlist, 'https://default.example')).toBe('https://default.example')
  })

  it('ignora espaço em branco entre os itens da lista', () => {
    expect(resolveTrustedOrigin('https://b.example', ' https://a.example , https://b.example ', 'https://default.example')).toBe(
      'https://b.example',
    )
  })
})
