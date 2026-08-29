import { useState } from 'react'
import type { Quest } from '../types'
import { questTypeLabels } from '../data/quests'
import { useModalA11y } from '../state/useModalA11y'

interface QuestModalProps {
  quest: Quest
  onCorrect: () => void
  onClose: () => void
}

export function QuestModal({ quest, onCorrect, onClose }: QuestModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const modalRef = useModalA11y(onClose)

  function handleChoose(choiceId: string) {
    if (feedback === 'correct') return
    setSelectedId(choiceId)
    const isCorrect = choiceId === quest.correctChoiceId
    setFeedback(isCorrect ? 'correct' : 'wrong')
    if (isCorrect) {
      setTimeout(onCorrect, 700)
    }
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={quest.title}
      ref={modalRef}
      tabIndex={-1}
    >
      <div className="modal quest-modal">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
          ×
        </button>
        <span className="quest-type-tag">{questTypeLabels[quest.type]}</span>
        <h2>{quest.title}</h2>
        {quest.passage && <p className="quest-passage">{quest.passage}</p>}
        <p className="quest-prompt">{quest.prompt}</p>

        <div className="quest-choices">
          {quest.choices.map((choice) => {
            const isSelected = selectedId === choice.id
            const showCorrect = feedback === 'correct' && isSelected
            const showWrong = feedback === 'wrong' && isSelected
            return (
              <button
                type="button"
                key={choice.id}
                className={`quest-choice ${showCorrect ? 'correct' : ''} ${showWrong ? 'wrong' : ''}`}
                onClick={() => handleChoose(choice.id)}
                disabled={feedback === 'correct'}
              >
                {choice.label}
              </button>
            )
          })}
        </div>

        {feedback === 'wrong' && (
          <p className="quest-feedback wrong">Quase! Tente outra opção. 💪</p>
        )}
        {feedback === 'correct' && (
          <p className="quest-feedback correct">Isso aí! Preparando sua recompensa... ✨</p>
        )}
      </div>
    </div>
  )
}
