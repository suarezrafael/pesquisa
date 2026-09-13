// Painel do evento semanal (badge clicável em `HudHeader.tsx`) — mesmo padrão visual de
// `DailyLoginToast.tsx` (reaproveita `.reward-modal`/`.reward-icon`/`.reward-line`/
// `.reward-bonus-line`; `.weekly-event-modal`, `index.css`, é a única classe nova, pra permitir
// scroll em telas curtas). Mostra o evento ativo, o objetivo educativo/ambiental (feito ou
// pendente) e a mensagem de que não há problema em perder — nunca soma XP/moeda por conta própria,
// só apresenta o que `progression.ts` já decidiu.
import { useModalA11y } from '../state/useModalA11y'
import {
  WEEKLY_EVENT_NO_PRESSURE_MESSAGE,
  WEEKLY_EVENT_OBJECTIVE_DESCRIPTION,
  WEEKLY_EVENT_OBJECTIVE_REWARD_COINS,
  type WeeklyEvent,
} from '../data/weeklyEvents'

interface WeeklyEventPanelProps {
  // Calculados uma vez em `App.tsx` e recebidos prontos — este painel NUNCA chama
  // `getCurrentWeeklyEvent()`/`wouldGrantWeeklyEventObjectiveReward()` por conta própria, pra
  // sempre bater com o badge que o abriu (`HudHeader.tsx`, mesmo valor via props também).
  event: WeeklyEvent
  objectiveDone: boolean
  onClose: () => void
}

const TITLE_ID = 'weekly-event-panel-title'

export function WeeklyEventPanel({ event, objectiveDone, onClose }: WeeklyEventPanelProps) {
  const modalRef = useModalA11y(onClose)

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={TITLE_ID}
      ref={modalRef}
      tabIndex={-1}
    >
      <div className="modal reward-modal weekly-event-modal">
        <div className="reward-icon" aria-hidden="true">
          {event.emoji}
        </div>
        <h2 id={TITLE_ID}>{event.name}</h2>
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
