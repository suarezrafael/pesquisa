// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { quests } from '../data/quests'
import { QuestModal } from './QuestModal'

function Harness({ onCorrect }: { onCorrect: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Abrir pergunta</button>
      {open && <QuestModal quest={quests[0]} onCorrect={onCorrect} onClose={() => setOpen(false)} />}
    </>
  )
}

describe('QuestModal pending completion', () => {
  let container: HTMLDivElement
  let root: Root
  let onCorrect: Mock<() => void>

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    onCorrect = vi.fn()
    act(() => root.render(<Harness onCorrect={onCorrect} />))
    act(() => {
      const opener = container.querySelector('button')!
      opener.focus()
      opener.click()
    })
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  function answerCorrectly() {
    const choice = container.querySelectorAll<HTMLButtonElement>('.quest-choice')[1]
    act(() => choice.click())
  }

  it('does not complete after the player closes a correctly answered question', () => {
    answerCorrectly()
    act(() => container.querySelector<HTMLButtonElement>('.modal-close')!.click())
    expect(container.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(container.querySelector('button'))
    act(() => vi.advanceTimersByTime(700))
    expect(onCorrect).not.toHaveBeenCalled()
  })

  it('does not complete after the parent unmounts the question', () => {
    answerCorrectly()
    act(() => root.render(null))
    act(() => vi.advanceTimersByTime(700))
    expect(onCorrect).not.toHaveBeenCalled()
  })

  it('cancels completion when Escape closes the question', () => {
    answerCorrectly()
    act(() => document.activeElement?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    ))
    expect(container.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(container.querySelector('button'))
    act(() => vi.advanceTimersByTime(700))
    expect(onCorrect).not.toHaveBeenCalled()
  })

  it('allows a wrong answer before completing a later correct answer', () => {
    const wrong = container.querySelectorAll<HTMLButtonElement>('.quest-choice')[0]
    act(() => wrong.click())
    expect(container.querySelector('.quest-feedback.wrong')).not.toBeNull()
    act(() => vi.advanceTimersByTime(700))
    expect(onCorrect).not.toHaveBeenCalled()
    answerCorrectly()
    act(() => vi.advanceTimersByTime(700))
    expect(onCorrect).toHaveBeenCalledTimes(1)
  })

  it('completes once after the feedback delay while the question stays open', () => {
    answerCorrectly()
    expect(container.querySelector('.quest-feedback.correct')).not.toBeNull()
    act(() => vi.advanceTimersByTime(699))
    expect(onCorrect).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(onCorrect).toHaveBeenCalledTimes(1)
  })

  it('does not schedule duplicate completion on rapid repeated activation', () => {
    const choice = container.querySelectorAll<HTMLButtonElement>('.quest-choice')[1]
    act(() => {
      choice.click()
      choice.click()
    })
    act(() => vi.advanceTimersByTime(700))
    expect(onCorrect).toHaveBeenCalledTimes(1)
  })
})
