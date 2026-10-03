// @vitest-environment jsdom
import { act, StrictMode, useRef, useState, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useModalA11y, useModalFocusHistory } from './useModalA11y'

function TestModal({ name, autoFocus, onClose, onOpenSecond, onCloseFirst }: {
  name: string
  autoFocus: boolean
  onClose: () => void
  onOpenSecond?: () => void
  onCloseFirst?: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const ref = useModalA11y(onClose, autoFocus ? inputRef : undefined)
  return (
    <div role="dialog" aria-label={name} ref={ref} tabIndex={-1}>
      <button data-testid={`${name}-close`} onClick={onClose}>Fechar</button>
      {autoFocus && <input ref={inputRef} aria-label={`${name}-input`} autoFocus />}
      {onOpenSecond && <button data-testid="open-second" onClick={onOpenSecond}>Outro painel</button>}
      {onCloseFirst && <button data-testid="close-first" onClick={onCloseFirst}>Fechar primeiro</button>}
      <button data-testid={`${name}-last`}>Ultima acao</button>
    </div>
  )
}

function FocusHistory({ children }: { children: ReactNode }) {
  useModalFocusHistory()
  return children
}

function Harness({ autoFocus = true, secondAutoFocus = false, showOpener = true, onFirstClose = () => {} }: {
  autoFocus?: boolean
  secondAutoFocus?: boolean
  showOpener?: boolean
  onFirstClose?: () => void
}) {
  const [first, setFirst] = useState(false)
  const [second, setSecond] = useState(false)
  function closeFirst() {
    onFirstClose()
    setFirst(false)
  }
  return (
    <>
      {showOpener && <button data-testid="opener" onClick={() => setFirst(true)}>Abrir</button>}
      <button data-testid="outside">Fora do painel</button>
      {first && <TestModal name="first" autoFocus={autoFocus} onClose={closeFirst}
        onOpenSecond={() => setSecond(true)} />}
      {second && <TestModal name="second" autoFocus={secondAutoFocus} onClose={() => setSecond(false)}
        onCloseFirst={closeFirst} />}
    </>
  )
}

describe('useModalA11y focus lifecycle', () => {
  let container: HTMLDivElement
  let root: Root
  let mounted: boolean

  function element(selector: string): HTMLElement {
    const target = container.querySelector<HTMLElement>(selector)
    if (!target) throw new Error(`Missing test element: ${selector}`)
    return target
  }
  function control(id: string) { return element(`[data-testid="${id}"]`) }
  function click(id: string) {
    act(() => {
      const target = control(id)
      target.focus()
      target.click()
    })
  }
  function key(key: string, shiftKey = false) {
    act(() => document.activeElement?.dispatchEvent(
      new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true }),
    ))
  }
  function render(props: Parameters<typeof Harness>[0] = {}, strict = false, rememberFocus = true) {
    const content = rememberFocus ? <FocusHistory><Harness {...props} /></FocusHistory> : <Harness {...props} />
    act(() => root.render(strict ? <StrictMode>{content}</StrictMode> : content))
  }

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    mounted = true
  })
  afterEach(() => {
    if (mounted) act(() => root.unmount())
    container.remove()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('keeps autofocus and restores the opener after clicking close', () => {
    render()
    click('opener')
    expect(document.activeElement).toBe(element('input'))
    click('first-close')
    expect(document.activeElement).toBe(control('opener'))
  })

  it('restores the opener on Escape without autofocus', () => {
    render({ autoFocus: false })
    click('opener')
    expect(document.activeElement).toBe(element('[role="dialog"]'))
    key('Escape')
    expect(document.activeElement).toBe(control('opener'))
  })

  it('remembers the opener even when focus becomes body before mounting', () => {
    render()
    const opener = control('opener')
    act(() => {
      opener.focus()
      opener.blur()
      opener.click()
    })
    expect(document.activeElement).toBe(element('input'))
    key('Escape')
    expect(document.activeElement).toBe(opener)
  })

  it('wraps Tab and Shift+Tab including initial focus on the root', () => {
    render({ autoFocus: false })
    click('opener')
    key('Tab', true)
    expect(document.activeElement).toBe(control('first-last'))
    key('Tab')
    expect(document.activeElement).toBe(control('first-close'))
    key('Tab', true)
    expect(document.activeElement).toBe(control('first-last'))
  })

  it('redirects escaped focus without replacing the remembered opener', () => {
    render()
    click('opener')
    act(() => control('outside').focus())
    expect(document.activeElement).toBe(element('[role="dialog"]'))
    key('Escape')
    expect(document.activeElement).toBe(control('opener'))
  })

  it('returns to the remaining panel, then to the original opener', () => {
    render()
    click('opener')
    click('open-second')
    key('Escape')
    expect(document.activeElement).toBe(element('[aria-label="first"]'))
    expect(container.querySelector('[aria-label="second"]')).toBeNull()
    key('Escape')
    expect(document.activeElement).toBe(control('opener'))
  })

  it('preserves the origin when panels close out of LIFO order', () => {
    render()
    click('opener')
    click('open-second')
    click('close-first')
    expect(container.querySelector('[aria-label="first"]')).toBeNull()
    expect(document.activeElement).toBe(element('[aria-label="second"]'))
    key('Escape')
    expect(document.activeElement).toBe(control('opener'))
  })

  it('focuses the requested input after registering a nested dialog', () => {
    render({ secondAutoFocus: true }, true)
    click('opener')
    click('open-second')
    expect(document.activeElement).toBe(element('[aria-label="second-input"]'))
    key('Escape')
    expect(document.activeElement).toBe(element('[aria-label="first"]'))
    key('Escape')
    expect(document.activeElement).toBe(control('opener'))
  })

  it('closes the focused panel only, even if it is below another', () => {
    render()
    click('opener')
    click('open-second')
    act(() => control('first-last').focus())
    key('Escape')
    expect(container.querySelector('[aria-label="first"]')).toBeNull()
    expect(document.activeElement).toBe(element('[aria-label="second"]'))
  })

  it('reads the latest onClose callback', () => {
    const original = vi.fn()
    const latest = vi.fn()
    render({ onFirstClose: original })
    click('opener')
    render({ onFirstClose: latest })
    key('Escape')
    expect(original).not.toHaveBeenCalled()
    expect(latest).toHaveBeenCalledOnce()
  })

  it('does not focus a removed opener', () => {
    render()
    click('opener')
    const opener = control('opener')
    const focus = vi.spyOn(opener, 'focus')
    render({ showOpener: false })
    key('Escape')
    expect(focus).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(document.body)
  })

  it.each(['disabled', 'hidden', 'inert'])('does not restore an unavailable opener (%s)', (attribute) => {
    render()
    click('opener')
    const opener = control('opener')
    const focus = vi.spyOn(opener, 'focus')
    opener.setAttribute(attribute, '')
    key('Escape')
    expect(focus).not.toHaveBeenCalled()
  })

  it('restores focus without scrolling the page', () => {
    render()
    click('opener')
    const focus = vi.spyOn(control('opener'), 'focus')
    key('Escape')
    expect(focus).toHaveBeenCalledWith({ preventScroll: true })
  })

  it('survives repeated open/close cycles in StrictMode', () => {
    render({}, true)
    for (let cycle = 0; cycle < 3; cycle++) {
      click('opener')
      expect(document.activeElement).toBe(element('input'))
      key('Escape')
      expect(document.activeElement).toBe(control('opener'))
    }
  })

  it('keeps the original focus across StrictMode replay without a history owner', () => {
    render({ autoFocus: false }, true, false)
    click('opener')
    key('Escape')
    expect(document.activeElement).toBe(control('opener'))
  })

  it('cleans up every shared/history/keyboard listener on unmount', () => {
    const add = vi.spyOn(window, 'addEventListener')
    const remove = vi.spyOn(window, 'removeEventListener')
    render({}, true)
    click('opener')
    click('open-second')
    act(() => root.unmount())
    mounted = false
    for (const [type, listener] of add.mock.calls) {
      if (type === 'focusin' || type === 'keydown') {
        expect(remove.mock.calls.some(([removedType, removedListener]) =>
          removedType === type && removedListener === listener,
        )).toBe(true)
      }
    }
  })
})
