export const ENTITLEMENT_REFRESH_INTERVAL_MS = 5 * 60 * 1000

export function shouldRevalidateOnResume(lastAttemptAt: number, now: number): boolean {
  return lastAttemptAt === 0 || now - lastAttemptAt >= ENTITLEMENT_REFRESH_INTERVAL_MS
}
