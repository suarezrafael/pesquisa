import { describe, expect, it } from 'vitest'
import { resolveGameCenterTap } from './gameCenterTap'

function mesh(enabled = true) {
  return { isEnabled: () => enabled, isVisible: true, isPickable: true, visibility: 1 }
}

describe('game center tap targets', () => {
  it('selects targets from the active registry, including combined memory pools', () => {
    const hiddenCards = Array.from({ length: 12 }, () => mesh(false))
    const pads = [mesh(), mesh(), mesh()]
    const targets = [...hiddenCards, ...pads]
    expect(resolveGameCenterTap(pads[1], new Map(), targets)).toEqual({ kind: 'arena', index: 13 })
    expect(resolveGameCenterTap(hiddenCards[0], new Map(), targets)).toBeNull()
  })

  it('ignores targets belonging to another arena and decorative meshes', () => {
    expect(resolveGameCenterTap(mesh(), new Map(), [mesh()])).toBeNull()
    expect(resolveGameCenterTap(null, new Map(), [mesh()])).toBeNull()
  })

  it('keeps portal selection available without active targets', () => {
    const portal = mesh()
    expect(resolveGameCenterTap(portal, new Map([[portal, 'memoria']]), [])).toEqual({ kind: 'portal', id: 'memoria' })
  })

  it('does not select invisible or non-pickable meshes even when registered', () => {
    for (const target of [
      { ...mesh(), isVisible: false },
      { ...mesh(), isPickable: false },
      { ...mesh(), visibility: 0 },
      mesh(false),
    ]) {
      expect(resolveGameCenterTap(target, new Map([[target, 'logica']]), [target])).toBeNull()
    }
  })

  it('gives an active answer precedence if a mesh is also registered as a portal', () => {
    const target = mesh()
    expect(resolveGameCenterTap(target, new Map([[target, 'logica']]), [target])).toEqual({ kind: 'arena', index: 0 })
  })
})
