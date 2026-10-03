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

// Achado do review automático do Copilot (PR #135): App.tsx substituía
// `activeEnvironmentalChallenge` (quest+attemptId) em memória sem desmontar o `QuestModal`
// quando um landmark novo era aberto por cima de um já ativo. A instância React era reaproveitada
// — `feedback`/`completionTimer` da tentativa antiga (ex.: "correct", que desabilita as opções)
// ficavam presos na tentativa nova, travando-a. A correção usa `key={attemptId}` no chamador; este
// harness reproduz esse padrão (key trocando junto da tentativa) pra garantir que a troca sempre
// reseta o estado e cancela o timer antigo.
function AttemptHarness({ onCorrect }: { onCorrect: () => void }) {
  const [attempt, setAttempt] = useState<{ id: string; questIndex: 0 | 1 } | null>(null)
  return (
    <>
      <button type="button" onClick={() => setAttempt({ id: 'attempt-1', questIndex: 0 })}>
        Abrir pergunta
      </button>
      <button type="button" onClick={() => setAttempt({ id: 'attempt-2', questIndex: 1 })}>
        Abrir outro landmark
      </button>
      {attempt && (
        <QuestModal
          key={attempt.id}
          quest={quests[attempt.questIndex]}
          onCorrect={onCorrect}
          onClose={() => setAttempt(null)}
        />
      )}
    </>
  )
}

describe('QuestModal reset across attempt replacement', () => {
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
    act(() => root.render(<AttemptHarness onCorrect={onCorrect} />))
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('remounts with fresh state and cancels the stale timer when a new attempt replaces an open one', () => {
    act(() => container.querySelectorAll('button')[0].click())
    const firstChoices = container.querySelectorAll<HTMLButtonElement>('.quest-choice')
    const firstCorrectIndex = [...firstChoices].findIndex(
      (choice) => choice.textContent === quests[0].choices.find((c) => c.id === quests[0].correctChoiceId)?.label,
    )
    act(() => firstChoices[firstCorrectIndex].click())
    expect(container.querySelector('.quest-choice:disabled')).not.toBeNull()

    act(() => container.querySelectorAll('button')[1].click())

    const newChoices = container.querySelectorAll<HTMLButtonElement>('.quest-choice')
    expect(newChoices.length).toBe(quests[1].choices.length)
    expect(container.querySelector('.quest-choice:disabled')).toBeNull()
    expect(container.querySelector('.quest-feedback.correct')).toBeNull()

    act(() => vi.advanceTimersByTime(700))
    expect(onCorrect).not.toHaveBeenCalled()
  })
})

// Lab 247 — mesmo endurecimento preventivo aplicado aos outros 4 chamadores de `QuestModal`
// (`activeQuest`, `activeSurpriseQuiz`, `activePlanetQuest`, `activeCoopQuest`), nenhum dos quais
// tem um `attemptId` próprio: `quest.id` é a identidade de tentativa usada como `key` em App.tsx.
// Este harness reproduz o formato real desses 4 usos (`{quest && <QuestModal key={quest.id}
// quest={quest} ... />}`) pra garantir que trocar de missão sem desmontar explicitamente ainda
// reseta o estado e cancela o timer antigo — mesma garantia do `AttemptHarness` acima, mas com a
// chave de verdade usada em produção em vez de um id sintético.
function QuestIdKeyHarness({ onCorrect }: { onCorrect: () => void }) {
  const [quest, setQuest] = useState<typeof quests[number] | null>(null)
  return (
    <>
      <button type="button" onClick={() => setQuest(quests[0])}>Abrir pergunta</button>
      <button type="button" onClick={() => setQuest(quests[1])}>Abrir outra missao</button>
      {quest && (
        <QuestModal key={quest.id} quest={quest} onCorrect={onCorrect} onClose={() => setQuest(null)} />
      )}
    </>
  )
}

describe('QuestModal reset across quest.id key replacement (Lab 247)', () => {
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
    act(() => root.render(<QuestIdKeyHarness onCorrect={onCorrect} />))
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('remounts with fresh state and cancels the stale timer when quest.id changes without an explicit close', () => {
    act(() => container.querySelectorAll('button')[0].click())
    const firstChoices = container.querySelectorAll<HTMLButtonElement>('.quest-choice')
    const firstCorrectIndex = [...firstChoices].findIndex(
      (choice) => choice.textContent === quests[0].choices.find((c) => c.id === quests[0].correctChoiceId)?.label,
    )
    act(() => firstChoices[firstCorrectIndex].click())
    expect(container.querySelector('.quest-choice:disabled')).not.toBeNull()

    act(() => container.querySelectorAll('button')[1].click())

    const newChoices = container.querySelectorAll<HTMLButtonElement>('.quest-choice')
    expect(newChoices.length).toBe(quests[1].choices.length)
    expect(container.querySelector('.quest-choice:disabled')).toBeNull()
    expect(container.querySelector('.quest-feedback.correct')).toBeNull()

    act(() => vi.advanceTimersByTime(700))
    expect(onCorrect).not.toHaveBeenCalled()
  })
})
