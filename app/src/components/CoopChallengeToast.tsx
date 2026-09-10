// Aviso de recompensa do desafio em dupla (lab-172, docs/market-metrics-engagement-backlog.md
// item 7 da ordem sugerida) — mesmo padrão visual de `DailyLoginToast.tsx` (reaproveita
// `.reward-modal`/`.reward-icon`/`.reward-line`, sem CSS novo). Só aparece depois que os DOIS
// participantes já confirmaram (ver `App.tsx`/`World3D.tsx`) — nunca por responder sozinho.
import { useModalA11y } from '../state/useModalA11y'

interface CoopChallengeToastProps {
  coins: number
  newBadge: boolean
  onContinue: () => void
}

export function CoopChallengeToast({ coins, newBadge, onContinue }: CoopChallengeToastProps) {
  const modalRef = useModalA11y(onContinue)
  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Desafio em dupla completo"
      ref={modalRef}
      tabIndex={-1}
    >
      <div className="modal reward-modal">
        <div className="reward-icon">🤝</div>
        <h2>Desafio em dupla completo!</h2>
        <p className="reward-line">Você e seu parceiro conseguiram juntos: 🪙 +{coins} moedas.</p>
        {newBadge && <p className="reward-line">Emblema novo: 🤝 Dupla Dinâmica!</p>}
        <button type="button" className="primary-button" onClick={onContinue}>
          Continuar
        </button>
      </div>
    </div>
  )
}
