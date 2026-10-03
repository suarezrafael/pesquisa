interface TapMesh {
  isEnabled(): boolean
  isVisible: boolean
  isPickable: boolean
  visibility: number
}

export type GameCenterTapTarget<PortalId extends string> =
  | { kind: 'arena'; index: number }
  | { kind: 'portal'; id: PortalId }

export function resolveGameCenterTap<T extends TapMesh, PortalId extends string>(
  mesh: T | null,
  portals: ReadonlyMap<T, PortalId>,
  activeTargets: readonly T[],
): GameCenterTapTarget<PortalId> | null {
  if (!mesh || !mesh.isEnabled() || !mesh.isVisible || !mesh.isPickable || mesh.visibility <= 0) return null
  const index = activeTargets.indexOf(mesh)
  if (index >= 0) return { kind: 'arena', index }
  const id = portals.get(mesh)
  return id === undefined ? null : { kind: 'portal', id }
}
