type Point3 = { x: number; y: number; z: number }

export function nearestInteraction<T extends string>(
  position: Point3,
  targets: Record<T, Point3>,
  ids: readonly T[],
  maxDistance: number,
): T | null {
  let nearest: T | null = null
  let bestDistanceSquared = maxDistance * maxDistance
  for (const id of ids) {
    const target = targets[id]
    const dx = position.x - target.x
    const dy = position.y - target.y
    const dz = position.z - target.z
    const distanceSquared = dx * dx + dy * dy + dz * dz
    if (distanceSquared < bestDistanceSquared) {
      nearest = id
      bestDistanceSquared = distanceSquared
    }
  }
  return nearest
}
