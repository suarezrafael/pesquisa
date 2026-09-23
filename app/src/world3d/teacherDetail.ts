const DETAIL_DISTANCE = 25
const SIMPLIFY_DISTANCE = 30

export function shouldUseDetailedTeacher(distanceSquared: number, currentlyDetailed: boolean): boolean {
  const threshold = currentlyDetailed ? SIMPLIFY_DISTANCE : DETAIL_DISTANCE
  return distanceSquared < threshold * threshold
}
