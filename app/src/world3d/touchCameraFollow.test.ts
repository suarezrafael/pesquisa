import { describe, expect, it } from 'vitest'
import { TOUCH_CAMERA_FOLLOW_SHARE, touchCameraFollowStep } from './touchCameraFollow'

describe('touch camera follow', () => {
  it('turns the avatar only part of the camera drag', () => {
    expect(TOUCH_CAMERA_FOLLOW_SHARE).toBeGreaterThan(0)
    expect(TOUCH_CAMERA_FOLLOW_SHARE).toBeLessThan(1)
    const pending = 0.6 * TOUCH_CAMERA_FOLLOW_SHARE
    const step = touchCameraFollowStep(pending, 1 / 60)
    expect(step).toBeGreaterThan(0)
    expect(step).toBeLessThan(pending)
  })

  it('limits speed and preserves direction at low frame rates', () => {
    expect(touchCameraFollowStep(10, 1 / 60)).toBeCloseTo(1.1 / 60)
    expect(touchCameraFollowStep(-10, 1 / 15)).toBeCloseTo(-1.1 / 15)
    expect(touchCameraFollowStep(1, 0)).toBe(0)
  })

  it('settles without reversing or overshooting', () => {
    let pending = -0.35
    for (let i = 0; i < 180; i++) {
      const step = touchCameraFollowStep(pending, 1 / 60)
      expect(step).toBeLessThanOrEqual(0)
      pending -= step
    }
    expect(Math.abs(pending)).toBeLessThan(0.0001)
  })
})
