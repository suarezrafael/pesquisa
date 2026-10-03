import { describe, expect, it } from 'vitest'
import { ENTITLEMENT_REFRESH_INTERVAL_MS, shouldRevalidateOnResume } from './entitlementRefreshPolicy'

describe('shouldRevalidateOnResume', () => {
  it('checks immediately when the token has never been verified', () => {
    expect(shouldRevalidateOnResume(0, 100)).toBe(true)
  })

  it('does not repeat a recent check', () => {
    expect(shouldRevalidateOnResume(100, 100 + ENTITLEMENT_REFRESH_INTERVAL_MS - 1)).toBe(false)
  })

  it('checks again after five minutes', () => {
    expect(shouldRevalidateOnResume(100, 100 + ENTITLEMENT_REFRESH_INTERVAL_MS)).toBe(true)
  })
})
