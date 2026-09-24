import { describe, expect, it } from 'vitest'
import { pinchZoom, touchCameraFollowStep } from './touchCameraFollow'

describe('touch camera follow', () => {
  it('turns the avatar through the entire camera drag', () => {
    const pending = 0.6
    const step = touchCameraFollowStep(pending, 1 / 60, 2.6)
    expect(step).toBeGreaterThan(0)
    expect(step).toBeLessThan(pending)
    let remaining = pending
    for (let i = 0; i < 120; i++) remaining -= touchCameraFollowStep(remaining, 1 / 60, 2.6)
    expect(Math.abs(remaining)).toBeLessThan(0.0001)
  })

  it('limits speed to the same turn rate as the left stick at low frame rates', () => {
    expect(touchCameraFollowStep(10, 1 / 60, 2.6)).toBeCloseTo(2.6 / 60)
    expect(touchCameraFollowStep(-10, 1 / 15, 2.6)).toBeCloseTo(-2.6 / 15)
    expect(touchCameraFollowStep(1, 0, 2.6)).toBe(0)
  })

  it('settles without reversing or overshooting', () => {
    let pending = -0.35
    for (let i = 0; i < 180; i++) {
      const step = touchCameraFollowStep(pending, 1 / 60, 2.6)
      expect(step).toBeLessThanOrEqual(0)
      pending -= step
    }
    expect(Math.abs(pending)).toBeLessThan(0.0001)
  })

  it('pinch spreads to zoom in and closes to zoom out within scene limits', () => {
    expect(pinchZoom(1, 100, 200, 0.6, 1.8)).toBe(0.6)
    expect(pinchZoom(1, 100, 50, 0.6, 1.8)).toBe(1.8)
    expect(pinchZoom(1, 100, 100, 0.6, 1.8)).toBe(1)
    expect(pinchZoom(1, 0, 200, 0.6, 1.8)).toBe(1)
  })
})
