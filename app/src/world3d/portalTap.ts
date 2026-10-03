export function isStationaryPortalTap(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  maxTravelPx = 12,
): boolean {
  const dx = endX - startX
  const dy = endY - startY
  return dx * dx + dy * dy <= maxTravelPx * maxTravelPx
}
