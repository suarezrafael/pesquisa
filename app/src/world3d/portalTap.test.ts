import { describe, expect, it } from 'vitest'
import { isStationaryPortalTap } from './portalTap'

describe('portal tap', () => {
  it('accepts a short tap including a little finger movement', () => {
    expect(isStationaryPortalTap(100, 200, 108, 207)).toBe(true)
    expect(isStationaryPortalTap(100, 200, 112, 200)).toBe(true)
  })

  it('rejects a camera drag', () => {
    expect(isStationaryPortalTap(100, 200, 113, 200)).toBe(false)
    expect(isStationaryPortalTap(100, 200, 100, 240)).toBe(false)
  })
})
