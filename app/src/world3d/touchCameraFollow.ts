const FOLLOW_RESPONSE = 18

export function touchCameraFollowStep(pendingAngle: number, dt: number, maxTurnRate: number): number {
  if (dt <= 0 || Math.abs(pendingAngle) < 0.0001) return 0
  const eased = pendingAngle * (1 - Math.exp(-FOLLOW_RESPONSE * dt))
  const limit = maxTurnRate * dt
  return Math.max(-limit, Math.min(limit, eased))
}

export function pinchZoom(startZoom: number, startDistance: number, distance: number, min: number, max: number): number {
  if (startDistance <= 0 || distance <= 0) return startZoom
  return Math.max(min, Math.min(max, startZoom * startDistance / distance))
}
