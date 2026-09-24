const TEACHER_HEIGHT = 1.2
const SIMPLIFY_BELOW_PX = 42
const DETAIL_ABOVE_PX = 50

export function teacherProjectedHeightScale(viewportHeight: number, verticalFov: number): number {
  return TEACHER_HEIGHT * viewportHeight / (2 * Math.tan(verticalFov / 2))
}

export function shouldUseDetailedTeacher(
  distanceSquared: number,
  currentlyDetailed: boolean,
  projectedHeightScale: number,
): boolean {
  const thresholdPx = currentlyDetailed ? SIMPLIFY_BELOW_PX : DETAIL_ABOVE_PX
  return distanceSquared * thresholdPx * thresholdPx < projectedHeightScale * projectedHeightScale
}
