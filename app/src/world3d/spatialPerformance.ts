export interface Point3Like {
  x: number
  y: number
  z: number
}

/** Compara proximidade sem a raiz quadrada e sem criar vetores temporarios. */
export function isWithinDistance(a: Point3Like, b: Point3Like, maxDistance: number): boolean {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return dx * dx + dy * dy + dz * dz < maxDistance * maxDistance
}

/** Distancia ao quadrado para casos com dois limiares, como histerese de entrada/saida. */
export function distanceSquared(a: Point3Like, b: Point3Like): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return dx * dx + dy * dy + dz * dz
}
