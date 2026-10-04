// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { planetQuests } from '../data/planetQuests'
import { quests } from '../data/quests'
import type { Quest } from '../types'
import { QuestModal } from './QuestModal'

function Harness({ onCorrect, quest = quests[0] }: { onCorrect: () => void; quest?: Quest }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Abrir pergunta</button>
      {open && <QuestModal quest={quest} onCorrect={onCorrect} onClose={() => setOpen(false)} />}
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

  function choiceButton(correct: boolean): HTMLButtonElement {
    const correctLabel = quests[0].choices.find((choice) => choice.id === quests[0].correctChoiceId)!.label
    return [...container.querySelectorAll<HTMLButtonElement>('.quest-choice')]
      .find((button) => (button.textContent === correctLabel) === correct)!
  }

  function answerCorrectly() {
    act(() => choiceButton(true).click())
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
    const initialOrder = [...container.querySelectorAll<HTMLButtonElement>('.quest-choice')]
      .map((button) => button.textContent)
    const wrong = choiceButton(false)
    act(() => wrong.click())
    expect(container.querySelector('.quest-feedback.wrong')).not.toBeNull()
    expect([...container.querySelectorAll<HTMLButtonElement>('.quest-choice')].map((button) => button.textContent))
      .toEqual(initialOrder)
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
    const choice = choiceButton(true)
    act(() => {
      choice.click()
      choice.click()
    })
    act(() => vi.advanceTimersByTime(700))
    expect(onCorrect).toHaveBeenCalledTimes(1)
  })

  it('actually reorders the rendered choices, not just by coincidence', () => {
    // Achado do review automático do Copilot (PR #150): o teste anterior escolhia o botão pelo
    // rótulo correto em qualquer posição, então passava mesmo se `QuestModal` parasse de chamar
    // `shuffleQuestChoices` e voltasse a renderizar `quest.choices` na ordem original do
    // catálogo. `planetQuests.mercurio[0]` tem a resposta certa ("Mercúrio") na posição 0 — forçar
    // `Math.random` a sempre devolver 0 produz uma permutação Fisher-Yates conhecida
    // (["Vênus", "Terra", "Mercúrio"]), diferente da ordem original, provando que a reordenação
    // de verdade aconteceu antes de clicar na resposta certa.
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    const planetQuest = planetQuests.mercurio[0]
    const originalOrder = planetQuest.choices.map((choice) => choice.label)
    act(() => root.render(<Harness onCorrect={onCorrect} quest={planetQuest} />))
    const renderedOrder = [...container.querySelectorAll<HTMLButtonElement>('.quest-choice')]
      .map((button) => button.textContent)
    expect(renderedOrder).toEqual(['Vênus', 'Terra', 'Mercúrio'])
    expect(renderedOrder).not.toEqual(originalOrder)
    randomSpy.mockRestore()

    const correctLabel = planetQuest.choices.find((choice) => choice.id === planetQuest.correctChoiceId)!.label
    const correct = [...container.querySelectorAll<HTMLButtonElement>('.quest-choice')]
      .find((button) => button.textContent === correctLabel)!
    act(() => correct.click())
    expect(container.querySelector('.quest-feedback.correct')).not.toBeNull()
    act(() => vi.advanceTimersByTime(700))
    expect(onCorrect).toHaveBeenCalledOnce()
  })
})

// Abrir um landmark novo pode substituir a tentativa ativa (quest+attemptId) em memória sem o
// `QuestModal` ser desmontado — sem uma `key` trocando junto, a instância React seria
// reaproveitada e `feedback`/`completionTimer` da tentativa antiga ficariam presos na nova,
// travando-a. Este harness reproduz esse padrão (key trocando junto da tentativa) pra garantir
// que a troca sempre reseta o estado e cancela o timer antigo.
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

// `quest.id` como `key` é a identidade de tentativa usada quando o chamador não tem um
// `attemptId` próprio. Este harness reproduz esse formato (`{quest && <QuestModal
// key={quest.id} quest={quest} ... />}`) pra garantir que trocar de missão sem desmontar
// explicitamente ainda reseta o estado e cancela o timer antigo — mesma garantia do
// `AttemptHarness` acima, mas com a chave de verdade usada em produção em vez de um id
// sintético.
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
