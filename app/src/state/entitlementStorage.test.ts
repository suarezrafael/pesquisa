// Teste de regressão do lab-90 (docs/prompts/05-escala-e-viabilidade.md G6): um `401` do
// `/entitlement` é o servidor recusando o token de forma explícita e definitiva, não uma falha de
// rede — precisa sobrescrever qualquer cache local (inclusive um `active: true` editado à mão no
// `localStorage`). Falhas de rede/servidor de verdade (offline, 5xx) continuam preservando o
// cache, pra não quebrar o uso legítimo offline do jogo.
import { describe, expect, it } from 'vitest'
import { shouldTrustCachedEntitlementOnFailure } from './entitlementStorage'

describe('shouldTrustCachedEntitlementOnFailure', () => {
  it('não confia no cache quando o servidor recusa o token com 401', () => {
    expect(shouldTrustCachedEntitlementOnFailure(401)).toBe(false)
  })

  it('confia no cache em erro de servidor (5xx) — não é uma rejeição do token', () => {
    expect(shouldTrustCachedEntitlementOnFailure(500)).toBe(true)
    expect(shouldTrustCachedEntitlementOnFailure(503)).toBe(true)
  })

  it('confia no cache em outros códigos que não sejam 401 (ex.: 404 de rota errada, 429)', () => {
    expect(shouldTrustCachedEntitlementOnFailure(404)).toBe(true)
    expect(shouldTrustCachedEntitlementOnFailure(429)).toBe(true)
  })
})
