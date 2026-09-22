export const SPHERICAL_CULL_HIDE_DEPTH = 0.8
export const SPHERICAL_CULL_SHOW_DEPTH = 0.4

interface Vector3Like {
  x: number
  y: number
  z: number
}

/** Profundidade com que o segmento camera-alvo atravessa a esfera; <= 0 significa linha livre. */
export function sphereOcclusionDepth(
  camera: Vector3Like,
  target: Vector3Like,
  sphereRadius: number,
): number {
  const dx = target.x - camera.x
  const dy = target.y - camera.y
  const dz = target.z - camera.z
  const segmentLengthSquared = dx * dx + dy * dy + dz * dz
  if (!Number.isFinite(segmentLengthSquared) || segmentLengthSquared < 1e-9) return Number.NEGATIVE_INFINITY

  const projection = -(camera.x * dx + camera.y * dy + camera.z * dz) / segmentLengthSquared
  if (projection <= 0 || projection >= 1) return Number.NEGATIVE_INFINITY

  const closestX = camera.x + dx * projection
  const closestY = camera.y + dy * projection
  const closestZ = camera.z + dz * projection
  const closestDistance = Math.hypot(closestX, closestY, closestZ)
  return sphereRadius - closestDistance
}

/**
 * Decide a visibilidade de um grupo sobre um mundo esferico.
 *
 * O intervalo entre os limites de profundidade preserva o estado atual e evita alternancia
 * quando a linha de visao tangencia o planeta. Valores invalidos falham abertos.
 */
export function shouldEnableSphericalObject(
  worldActive: boolean,
  currentlyEnabled: boolean,
  occlusionDepth: number,
  hideDepth = SPHERICAL_CULL_HIDE_DEPTH,
  showDepth = SPHERICAL_CULL_SHOW_DEPTH,
): boolean {
  if (!worldActive) return false
  if (!Number.isFinite(occlusionDepth)) return true
  return currentlyEnabled ? occlusionDepth <= hideDepth : occlusionDepth <= showDepth
}
