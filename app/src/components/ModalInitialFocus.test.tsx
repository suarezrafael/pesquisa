// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { quests } from '../data/quests'
import { useModalFocusHistory } from '../state/useModalA11y'
import { ParentalGateModal } from './ParentalGateModal'
import { QuestModal } from './QuestModal'

function Harness({ kind, onAuthorize, onCorrect }: {
  kind: 'parental' | 'quest'
  onAuthorize: () => void
  onCorrect: () => void
}) {
  useModalFocusHistory()
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Abrir</button>
      {open && (kind === 'parental'
        ? <ParentalGateModal onAuthorize={onAuthorize} onCancel={() => setOpen(false)} />
        : <QuestModal quest={quests[2]} onCorrect={onCorrect} onClose={() => setOpen(false)} />)}
    </>
  )
}

describe('initial reading focus in long dialogs', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
  })

  function open(kind: 'parental' | 'quest', onAuthorize = vi.fn(), onCorrect = vi.fn()) {
    act(() => root.render(<Harness kind={kind} onAuthorize={onAuthorize} onCorrect={onCorrect} />))
    const opener = container.querySelector('button')!
    act(() => {
      opener.focus()
      opener.click()
    })
    return opener
  }

  it('starts the parental gate at its title and restores the opener without authorizing', () => {
    const onAuthorize = vi.fn()
    const opener = open('parental', onAuthorize)
    const title = container.querySelector('h2')!
    expect(document.activeElement).toBe(title)
    expect(title.tabIndex).toBe(-1)
    expect(container.querySelector('input')?.hasAttribute('autofocus')).toBe(false)
    act(() => title.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    expect(container.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(opener)
    expect(onAuthorize).not.toHaveBeenCalled()
  })

  it('starts a reading quest at its title and keeps answer selection working', () => {
    const onCorrect = vi.fn()
    const opener = open('quest', vi.fn(), onCorrect)
    expect(document.activeElement).toBe(container.querySelector('h2'))
    expect(container.querySelector('.quest-passage')).not.toBeNull()
    const wrong = container.querySelector<HTMLButtonElement>('.quest-choice')!
    act(() => wrong.click())
    expect(container.querySelector('.quest-feedback.wrong')).not.toBeNull()
    expect(onCorrect).not.toHaveBeenCalled()
    const close = container.querySelector<HTMLButtonElement>('.modal-close')!
    act(() => close.click())
    expect(document.activeElement).toBe(opener)
  })
})
