// @vitest-environment jsdom
// Achado do review automático do Copilot: `useHeartbeat.test.ts` cobria só a função pura
// `effectiveLookHeartbeatBody`, nunca o efeito que decide QUANDO enviar o look efetivo
// (transição de `entitlementActive`, não toda renderização). Monta o hook de verdade pra provar
// isso: só dispara nas transições false->true e true->false, nunca em renderizações sem mudança.
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import type { Profile } from '../types'
import { useHeartbeat } from './useHeartbeat'

vi.mock('./storage', () => ({
  loadPlayerId: () => 'player-1',
  loadPlayerSecret: () => 'secret-1',
}))

const profile: Profile = {
  name: 'Jogadora',
  avatarEmoji: '🦊',
  createdAt: '2026-09-24T00:00:00.000Z',
  nicknameChangedAt: null,
  equippedHatId: null,
  equippedShirtColorId: 'camiseta_azul',
  equippedPantsColorId: null,
  equippedShoeColorId: null,
  equippedBackpackColorId: null,
  equippedHairShapeId: null,
  equippedGlassesId: null,
}

function Harness({ active }: { active: boolean }) {
  useHeartbeat(profile, null, active)
  return null
}

describe('useHeartbeat entitlement transition', () => {
  let container: HTMLDivElement
  let root: Root
  let fetchMock: Mock

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    vi.useFakeTimers()
    fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('does not send on mount or on unchanged rerenders', () => {
    act(() => root.render(<Harness active={false} />))
    expect(fetchMock).not.toHaveBeenCalled()
    act(() => root.render(<Harness active={false} />))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sends the effective look exactly once when entitlement becomes active', () => {
    act(() => root.render(<Harness active={false} />))
    act(() => root.render(<Harness active={true} />))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, options] = fetchMock.mock.calls[0]
    expect(JSON.parse(options.body as string)).toMatchObject({
      playerId: 'player-1',
      avatarEmoji: '🦊',
      secret: 'secret-1',
    })
    act(() => root.render(<Harness active={true} />))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('sends again when entitlement becomes inactive', () => {
    act(() => root.render(<Harness active={true} />))
    act(() => root.render(<Harness active={false} />))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
