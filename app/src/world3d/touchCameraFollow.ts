export const TOUCH_CAMERA_FOLLOW_SHARE = 0.35

const FOLLOW_RESPONSE = 8
const FOLLOW_MAX_SPEED = 1.1 // rad/s; slower than the movement stick

export function touchCameraFollowStep(pendingAngle: number, dt: number): number {
  if (dt <= 0 || Math.abs(pendingAngle) < 0.0001) return 0
  const eased = pendingAngle * (1 - Math.exp(-FOLLOW_RESPONSE * dt))
  const limit = FOLLOW_MAX_SPEED * dt
  return Math.max(-limit, Math.min(limit, eased))
}
