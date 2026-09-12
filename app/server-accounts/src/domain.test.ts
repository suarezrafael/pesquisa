// Testes da lógica de domínio do Worker de contas — requisito [MUST] de
// docs/prompts/04-manutencao-clean-code.md §5, especificamente "regra de entitlement por
// assinatura": a checagem mais custosa de errar silenciosamente aqui é ou liberar o cosmético
// pago de graça, ou negar acesso a quem pagou. Primeiro teste automatizado deste Worker (lab-83).
import { describe, expect, it } from 'vitest'
import {
  buildWeeklyProgressEmail,
  calculateNpsScore,
  describeSkillFocus,
  friendResponseStatus,
  generatePairingCode,
  hasActiveFriendship,
  isAtDeviceLimit,
  isEntitlementActive,
  isEventNewerThan,
  isNicknameAllowed,
  isOnlineNow,
  isPairingCodeUsable,
  isPlausibleSessionDuration,
  isSelfFriendRequest,
  isTokenRevoked,
  isValidBadgeList,
  isValidHouseFurnitureIds,
  isValidHousePlacements,
  sanitizeHouseFurnitureIds,
  sanitizeHousePlacements,
  isValidEquippedLook,
  isValidIsoDateOnly,
  isValidNpsScore,
  isValidProductEventType,
  isValidProgressBackupPayload,
  isValidProgressSummary,
  isValidSubscriptionStatus,
  isValidUuid,
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
  it('aceita os tipos de evento conhecidos', () => {
    expect(isValidProductEventType('session_start')).toBe(true)
    expect(isValidProductEventType('session_end')).toBe(true)
    expect(isValidProductEventType('quest_completed')).toBe(true)
  })

  it('aceita os tipos de ativação do lab-164', () => {
    expect(isValidProductEventType('time_to_first_control')).toBe(true)
    expect(isValidProductEventType('time_to_first_learning_challenge')).toBe(true)
    expect(isValidProductEventType('time_to_first_reward')).toBe(true)
    expect(isValidProductEventType('activation_cycle_completed')).toBe(true)
  })

  it('aceita os tipos de conversão adulta do lab-166', () => {
    expect(isValidProductEventType('family_landing_viewed')).toBe(true)
    expect(isValidProductEventType('parent_signup_started')).toBe(true)
    expect(isValidProductEventType('checkout_started')).toBe(true)
  })

  it('aceita o preview do relatório semanal do lab-173', () => {
    expect(isValidProductEventType('weekly_report_preview_viewed')).toBe(true)
  })

  it('aceita a visita de casa do lab-175', () => {
    expect(isValidProductEventType('house_visited')).toBe(true)
  })

  it('rejeita um tipo desconhecido — nunca confia em input do client sem checar', () => {
    expect(isValidProductEventType('qualquer_coisa')).toBe(false)
    expect(isValidProductEventType('')).toBe(false)
  })

  it('aceita os eventos da home inicial dupla (lab-161)', () => {
    expect(isValidProductEventType('play_click')).toBe(true)
    expect(isValidProductEventType('parent_area_click')).toBe(true)
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

  it('lab-167: aceita sem os 3 campos de habilidade (cliente antigo, ainda não manda)', () => {
    expect(isValidProgressSummary(validSummary)).toBe(true)
  })

  it('lab-167: aceita com os 3 campos de habilidade plausíveis', () => {
    expect(
      isValidProgressSummary({ ...validSummary, logicaCompleted: 5, matematicaCompleted: 3, leituraCompleted: 4 }),
    ).toBe(true)
  })

  it('lab-167: rejeita campo de habilidade com tipo errado quando presente', () => {
    expect(isValidProgressSummary({ ...validSummary, logicaCompleted: 'cinco' })).toBe(false)
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

describe('describeSkillFocus — lab-167 (mapa de habilidades)', () => {
  it('devolve null quando algum campo está ausente (cliente antigo)', () => {
    expect(describeSkillFocus(undefined, 3, 4)).toBeNull()
    expect(describeSkillFocus(2, undefined, 4)).toBeNull()
    expect(describeSkillFocus(2, 3, undefined)).toBeNull()
  })

  it('devolve null quando as 3 habilidades estão empatadas (perfil zerado ou equilibrado)', () => {
    expect(describeSkillFocus(0, 0, 0)).toBeNull()
    expect(describeSkillFocus(4, 4, 4)).toBeNull()
  })

  it('identifica ponto forte e pra praticar mais quando há diferença real', () => {
    const focus = describeSkillFocus(8, 2, 5)
    expect(focus).not.toBeNull()
    expect(focus!.strongest).toBe('lógica')
    expect(focus!.weakest).toBe('matemática')
    expect(focus!.suggestion.length).toBeGreaterThan(0)
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

  it('lab-167: sem os 3 campos de habilidade, não mostra seção de ponto forte/praticar mais', () => {
    const email = buildWeeklyProgressEmail(summary, null)
    expect(email.html).not.toContain('Ponto forte')
    expect(email.html).not.toContain('Pra praticar mais')
  })

  it('lab-167: com diferença real entre habilidades, mostra ponto forte e sugestão', () => {
    const email = buildWeeklyProgressEmail(
      { ...summary, logicaCompleted: 8, matematicaCompleted: 2, leituraCompleted: 5 },
      null,
    )
    expect(email.html).toContain('Ponto forte da semana: <strong>lógica</strong>')
    expect(email.html).toContain('Pra praticar mais')
    expect(email.html).toContain('matemática')
  })

  it('lab-167: com as 3 habilidades empatadas, não mostra a seção (sem sinal real)', () => {
    const email = buildWeeklyProgressEmail(
      { ...summary, logicaCompleted: 3, matematicaCompleted: 3, leituraCompleted: 3 },
      null,
    )
    expect(email.html).not.toContain('Ponto forte')
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

describe('isNicknameAllowed (lab-159) — mesma cópia de app/src/data/nicknameFilter.ts', () => {
  it('aceita um nickname normal, só letras e espaço', () => {
    expect(isNicknameAllowed('Raposa Corajosa')).toBe(true)
  })

  it('recusa vazio ou só espaço', () => {
    expect(isNicknameAllowed('')).toBe(false)
    expect(isNicknameAllowed('   ')).toBe(false)
  })

  it('recusa número ou símbolo', () => {
    expect(isNicknameAllowed('Raposa123')).toBe(false)
    expect(isNicknameAllowed('Raposa!')).toBe(false)
  })

  it('recusa termo da lista de bloqueio, mesmo com acento/maiúscula', () => {
    expect(isNicknameAllowed('Idiota')).toBe(false)
    expect(isNicknameAllowed('ESTÚPIDO')).toBe(false)
  })

  it('recusa nickname absurdamente longo', () => {
    expect(isNicknameAllowed('a'.repeat(41))).toBe(false)
  })
})

describe('isValidUuid (lab-159)', () => {
  it('aceita um uuid v4 válido', () => {
    expect(isValidUuid('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d')).toBe(true)
  })

  it('recusa string vazia, texto arbitrário ou uuid malformado', () => {
    expect(isValidUuid('')).toBe(false)
    expect(isValidUuid('não sou um uuid')).toBe(false)
    expect(isValidUuid('9b1deb4d-3b7d-4bad-9bdd')).toBe(false)
  })
})

describe('isValidIsoDateOnly (lab-185)', () => {
  it('aceita uma data YYYY-MM-DD real', () => {
    expect(isValidIsoDateOnly('2026-02-14')).toBe(true)
    expect(isValidIsoDateOnly('2024-02-29')).toBe(true) // ano bissexto
  })

  it('recusa formato errado, string vazia ou texto arbitrário', () => {
    expect(isValidIsoDateOnly('')).toBe(false)
    expect(isValidIsoDateOnly('não sou uma data')).toBe(false)
    expect(isValidIsoDateOnly('2026-9-9')).toBe(false) // sem zero à esquerda
    expect(isValidIsoDateOnly('2026-09-09T00:00:00Z')).toBe(false) // com hora
  })

  it('recusa data que não existe no calendário mesmo com formato certo', () => {
    expect(isValidIsoDateOnly('2026-02-30')).toBe(false)
    expect(isValidIsoDateOnly('2026-13-01')).toBe(false)
    expect(isValidIsoDateOnly('2023-02-29')).toBe(false) // 2023 não é bissexto
  })
})

describe('isSelfFriendRequest (lab-160)', () => {
  it('detecta pedido pra si mesmo', () => {
    expect(isSelfFriendRequest('a', 'a')).toBe(true)
  })

  it('não acusa pedido entre jogadores diferentes', () => {
    expect(isSelfFriendRequest('a', 'b')).toBe(false)
  })
})

describe('hasActiveFriendship (lab-160)', () => {
  it('sem nenhuma linha, não há amizade ativa', () => {
    expect(hasActiveFriendship([])).toBe(false)
  })

  it('pending/accepted/declined contam como ativa (bloqueiam pedido novo)', () => {
    expect(hasActiveFriendship([{ status: 'pending' }])).toBe(true)
    expect(hasActiveFriendship([{ status: 'accepted' }])).toBe(true)
    expect(hasActiveFriendship([{ status: 'declined' }])).toBe(true)
  })

  it('só `removed` libera pedir de novo', () => {
    expect(hasActiveFriendship([{ status: 'removed' }])).toBe(false)
  })
})

describe('friendResponseStatus (lab-160)', () => {
  it('aceitar vira accepted, recusar vira declined', () => {
    expect(friendResponseStatus(true)).toBe('accepted')
    expect(friendResponseStatus(false)).toBe('declined')
  })
})

describe('isOnlineNow (lab-162)', () => {
  const now = new Date('2026-09-08T12:00:00.000Z').getTime()

  it('considera online um heartbeat de agora mesmo', () => {
    expect(isOnlineNow('2026-09-08T12:00:00.000Z', now)).toBe(true)
  })

  it('considera online um heartbeat dentro do limiar de 2 minutos', () => {
    expect(isOnlineNow('2026-09-08T11:58:30.000Z', now)).toBe(true)
  })

  it('considera offline um heartbeat mais antigo que 2 minutos', () => {
    expect(isOnlineNow('2026-09-08T11:57:00.000Z', now)).toBe(false)
  })

  it('considera offline uma data inválida em vez de lançar erro', () => {
    expect(isOnlineNow('não é uma data', now)).toBe(false)
  })
})

const VALID_EQUIPPED_LOOK = {
  equippedHatId: 'chapeu-pirata',
  equippedShirtColorId: null,
  equippedPantsColorId: 'calca-azul',
  equippedShoeColorId: null,
  equippedBackpackColorId: null,
  equippedHairShapeId: 'longo',
  equippedGlassesId: null,
}

describe('isValidEquippedLook (lab-163)', () => {
  it('aceita os 7 eixos conhecidos, cada um string ou null', () => {
    expect(isValidEquippedLook(VALID_EQUIPPED_LOOK)).toBe(true)
  })

  it('rejeita quando falta um eixo', () => {
    const { equippedGlassesId, ...rest } = VALID_EQUIPPED_LOOK
    expect(isValidEquippedLook(rest)).toBe(false)
  })

  it('rejeita campo extra desconhecido (não deixa o client gravar chave arbitrária no jsonb)', () => {
    expect(isValidEquippedLook({ ...VALID_EQUIPPED_LOOK, extra: 'x' })).toBe(false)
  })

  it('rejeita um eixo com tipo errado', () => {
    expect(isValidEquippedLook({ ...VALID_EQUIPPED_LOOK, equippedHatId: 42 })).toBe(false)
  })

  it('rejeita array, string e null no lugar de objeto', () => {
    expect(isValidEquippedLook([])).toBe(false)
    expect(isValidEquippedLook('nope')).toBe(false)
    expect(isValidEquippedLook(null)).toBe(false)
  })
})

describe('isValidBadgeList (lab-163)', () => {
  it('aceita uma lista de strings não vazias', () => {
    expect(isValidBadgeList(['Primeira Missão', 'Metade do Caminho'])).toBe(true)
  })

  it('aceita lista vazia (jogador sem conquista ainda)', () => {
    expect(isValidBadgeList([])).toBe(true)
  })

  it('rejeita item vazio ou não-string na lista', () => {
    expect(isValidBadgeList(['ok', ''])).toBe(false)
    expect(isValidBadgeList(['ok', 42])).toBe(false)
  })

  it('rejeita lista com mais de 50 itens (defesa contra payload abusivo)', () => {
    expect(isValidBadgeList(Array.from({ length: 51 }, (_, i) => `b${i}`))).toBe(false)
  })

  it('rejeita algo que não é array', () => {
    expect(isValidBadgeList('não é lista')).toBe(false)
    expect(isValidBadgeList(null)).toBe(false)
  })
})

describe('isValidHouseFurnitureIds (lab-175)', () => {
  it('aceita uma lista de ids, com repetição (uma cópia por entrada)', () => {
    expect(isValidHouseFurnitureIds(['sofa', 'sofa', 'cama'])).toBe(true)
  })

  it('aceita lista vazia (casa ainda sem mobília)', () => {
    expect(isValidHouseFurnitureIds([])).toBe(true)
  })

  it('rejeita item vazio ou não-string na lista', () => {
    expect(isValidHouseFurnitureIds(['sofa', ''])).toBe(false)
    expect(isValidHouseFurnitureIds(['sofa', 42])).toBe(false)
  })

  it('rejeita lista com mais de 300 itens (defesa contra payload abusivo)', () => {
    expect(isValidHouseFurnitureIds(Array.from({ length: 301 }, () => 'sofa'))).toBe(false)
  })

  it('rejeita algo que não é array', () => {
    expect(isValidHouseFurnitureIds('não é lista')).toBe(false)
    expect(isValidHouseFurnitureIds(null)).toBe(false)
  })
})

describe('isValidHousePlacements (lab-175)', () => {
  it('aceita um objeto vazio (nenhuma peça reposicionada manualmente)', () => {
    expect(isValidHousePlacements({})).toBe(true)
  })

  it('aceita chaves no formato "${id}#${índice}" com coordenadas numéricas', () => {
    expect(isValidHousePlacements({ 'sofa#0': { x: 1, z: -2.5, rotY: 0 }, 'cama#1': { x: 0, z: 0, rotY: 3.14 } })).toBe(
      true,
    )
  })

  it('rejeita chave fora do formato esperado', () => {
    expect(isValidHousePlacements({ sofa: { x: 1, z: 2, rotY: 0 } })).toBe(false)
    expect(isValidHousePlacements({ 'sofa#abc': { x: 1, z: 2, rotY: 0 } })).toBe(false)
  })

  it('rejeita valor com campo faltando, extra ou não-finito', () => {
    expect(isValidHousePlacements({ 'sofa#0': { x: 1, z: 2 } })).toBe(false)
    expect(isValidHousePlacements({ 'sofa#0': { x: 1, z: 2, rotY: 0, extra: 1 } })).toBe(false)
    expect(isValidHousePlacements({ 'sofa#0': { x: NaN, z: 2, rotY: 0 } })).toBe(false)
  })

  it('rejeita coordenada finita mas absurdamente fora dos limites da sala (achado do Copilot na 4ª rodada)', () => {
    expect(isValidHousePlacements({ 'sofa#0': { x: 1e308, z: 2, rotY: 0 } })).toBe(false)
    expect(isValidHousePlacements({ 'sofa#0': { x: 1, z: -1e10, rotY: 0 } })).toBe(false)
    expect(isValidHousePlacements({ 'sofa#0': { x: 1, z: 2, rotY: 1e10 } })).toBe(false)
  })

  it('rejeita x/z fora do limite real de posicionamento do próprio jogo (achado do Copilot na 6ª rodada: 4,8 = 5,5 de meia-sala menos a margem de 0,7)', () => {
    expect(isValidHousePlacements({ 'sofa#0': { x: 19, z: -19, rotY: 900 } })).toBe(false)
    expect(isValidHousePlacements({ 'sofa#0': { x: 4.9, z: 0, rotY: 0 } })).toBe(false)
  })

  it('aceita x/z dentro do limite real de posicionamento do próprio jogo (4,8)', () => {
    expect(isValidHousePlacements({ 'sofa#0': { x: 4.8, z: -4.8, rotY: 900 } })).toBe(true)
  })

  it('rejeita mais de 300 chaves (defesa contra payload abusivo)', () => {
    const big: Record<string, unknown> = {}
    for (let i = 0; i < 301; i++) big[`sofa#${i}`] = { x: 0, z: 0, rotY: 0 }
    expect(isValidHousePlacements(big)).toBe(false)
  })

  it('rejeita chave com id/índice absurdamente longo (achado do Copilot na 11ª rodada: nem o id nem o índice tinham teto de tamanho)', () => {
    expect(isValidHousePlacements({ [`${'a'.repeat(61)}#0`]: { x: 0, z: 0, rotY: 0 } })).toBe(false)
    expect(isValidHousePlacements({ [`sofa#${'1'.repeat(7)}`]: { x: 0, z: 0, rotY: 0 } })).toBe(false)
    expect(isValidHousePlacements({ [`${'a'.repeat(60)}#999999`]: { x: 0, z: 0, rotY: 0 } })).toBe(true)
  })

  it('rejeita algo que não é objeto', () => {
    expect(isValidHousePlacements('não é objeto')).toBe(false)
    expect(isValidHousePlacements(null)).toBe(false)
    expect(isValidHousePlacements([])).toBe(false)
  })
})

describe('sanitizeHouseFurnitureIds/sanitizeHousePlacements (lab-175, achado do Copilot no PR #49)', () => {
  it('remove ids de item subscriptionOnly, preservando os demais (com repetição)', () => {
    expect(sanitizeHouseFurnitureIds(['cama', 'cama_nave', 'cama', 'tapete'])).toEqual([
      'cama',
      'cama',
      'tapete',
    ])
  })

  it('não remove nada quando não há item subscriptionOnly', () => {
    expect(sanitizeHouseFurnitureIds(['cama', 'tapete'])).toEqual(['cama', 'tapete'])
  })

  it('remove placements cuja chave referencia um item subscriptionOnly', () => {
    const result = sanitizeHousePlacements({
      'cama#0': { x: 1, z: 2, rotY: 0 },
      'cama_nave#0': { x: 3, z: 4, rotY: 1 },
    })
    expect(result).toEqual({ 'cama#0': { x: 1, z: 2, rotY: 0 } })
  })

  it('descarta entrada com chave/valor inválido salva antes desta validação existir (achado do Copilot na 7ª rodada)', () => {
    const result = sanitizeHousePlacements({
      'cama#0': { x: 1, z: 2, rotY: 0 },
      cama: { x: 1, z: 2, rotY: 0 }, // chave sem "#índice", formato legado
      'tapete#0': { x: 999, z: 0, rotY: 0 }, // fora do limite real de 4,8
    } as Record<string, { x: number; z: number; rotY: number }>)
    expect(result).toEqual({ 'cama#0': { x: 1, z: 2, rotY: 0 } })
  })

  it('corta em 300 ids na LEITURA, não só na escrita (achado do Copilot na 9ª rodada: uma linha antiga sem esse teto materializava a resposta pública inteira)', () => {
    const result = sanitizeHouseFurnitureIds(Array.from({ length: 305 }, () => 'cama'))
    expect(result).toHaveLength(300)
  })

  it('descarta elemento não-string/vazio/absurdamente longo na LEITURA (achado do Copilot na 11ª rodada: um elemento corrompido dentro do array passava intacto)', () => {
    const result = sanitizeHouseFurnitureIds(['cama', null, 42, '', 'a'.repeat(61), 'tapete'] as unknown[])
    expect(result).toEqual(['cama', 'tapete'])
  })

  it('corta em 300 placements aceitos na LEITURA, não só na escrita (achado do Copilot na 9ª rodada)', () => {
    const manyPlacements = Object.fromEntries(
      Array.from({ length: 305 }, (_, i) => [`cama#${i}`, { x: 0, z: 0, rotY: 0 }]),
    )
    const result = sanitizeHousePlacements(manyPlacements)
    expect(Object.keys(result)).toHaveLength(300)
  })
})
