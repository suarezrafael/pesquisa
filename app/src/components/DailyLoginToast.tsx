// Aviso de recompensa de login diário (lab-138, item do backlog de engajamento) — mesmo padrão
// visual de `MarsRewardToast.tsx` (reaproveita `.reward-modal`/`.reward-icon`/`.reward-line`, sem
// CSS novo). Componente à parte (não generaliza `RewardToast`) pelo mesmo motivo do brinde de
// Marte: copy bem diferente ("Você voltou!" vs. "Missão concluída!"), sem XP/badges pra mostrar.
import { useModalA11y } from '../state/useModalA11y'

interface DailyLoginToastProps {
  streak: number
  coins: number
  onContinue: () => void
}

export function DailyLoginToast({ streak, coins, onContinue }: DailyLoginToastProps) {
  const modalRef = useModalA11y(onContinue)
  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Recompensa de login diário"
      ref={modalRef}
      tabIndex={-1}
    >
      <div className="modal reward-modal">
        <div className="reward-icon">📅</div>
        <h2>Você voltou! Dia {streak} seguido 🔥</h2>
        <p className="reward-line">
          Só por abrir o jogo hoje: 🪙 +{coins} moedas. Volte amanhã pra continuar a sequência!
        </p>
        <button type="button" className="primary-button" onClick={onContinue}>
          Continuar
        </button>
      </div>
    </div>
  )
}
