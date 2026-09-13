// Painel do evento semanal (badge clicável em `HudHeader.tsx`) — mesmo padrão visual de
// `DailyLoginToast.tsx` (reaproveita `.reward-modal`/`.reward-icon`/`.reward-line`/
// `.reward-bonus-line`, sem CSS novo). Mostra o evento ativo, o objetivo educativo/ambiental (feito
// ou pendente) e a mensagem de que não há problema em perder — nunca soma XP/moeda por conta
// própria, só apresenta o que `progression.ts` já decidiu.
import type { Progress } from '../types'
import { useModalA11y } from '../state/useModalA11y'
import {
  getCurrentWeeklyEvent,
  WEEKLY_EVENT_NO_PRESSURE_MESSAGE,
  WEEKLY_EVENT_OBJECTIVE_DESCRIPTION,
  WEEKLY_EVENT_OBJECTIVE_REWARD_COINS,
} from '../data/weeklyEvents'
import { isWeeklyEventObjectiveDone } from '../state/progression'

interface WeeklyEventPanelProps {
  progress: Progress
  onClose: () => void
}

export function WeeklyEventPanel({ progress, onClose }: WeeklyEventPanelProps) {
  const modalRef = useModalA11y(onClose)
  const event = getCurrentWeeklyEvent()
  const objectiveDone = isWeeklyEventObjectiveDone(progress, new Date().toISOString())

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Evento da semana"
      ref={modalRef}
      tabIndex={-1}
    >
      <div className="modal reward-modal weekly-event-modal">
        <div className="reward-icon" aria-hidden="true">
          {event.emoji}
        </div>
        <h2>{event.name}</h2>
        <p className="reward-line">{event.description}</p>
        <p className="reward-bonus-line">
          {objectiveDone
            ? `✓ Objetivo da semana concluído! Você já ganhou 🪙 ${WEEKLY_EVENT_OBJECTIVE_REWARD_COINS} moedas grátis esta semana.`
            : `🌱 Objetivo da semana: ${WEEKLY_EVENT_OBJECTIVE_DESCRIPTION} Ganhe 🪙 ${WEEKLY_EVENT_OBJECTIVE_REWARD_COINS} moedas grátis!`}
        </p>
        <p className="reward-bonus-line">{WEEKLY_EVENT_NO_PRESSURE_MESSAGE}</p>
        <button type="button" className="primary-button" onClick={onClose}>
          Fechar
        </button>
      </div>
    </div>
  )
}
