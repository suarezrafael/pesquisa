import type { Quest } from '../types'

interface RewardToastProps {
  quest: Quest
  newBadges: string[]
  onContinue: () => void
}

export function RewardToast({ quest, newBadges, onContinue }: RewardToastProps) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Recompensa">
      <div className="modal reward-modal">
        <div className="reward-icon">🏆</div>
        <h2>Missão concluída!</h2>
        <p className="reward-line">
          +{quest.xpReward} XP · +{quest.coinReward} moedas
        </p>
        {newBadges.length > 0 && (
          <div className="reward-badges">
            {newBadges.map((badge) => (
              <span key={badge} className="badge-pill">
                🎖️ {badge}
              </span>
            ))}
          </div>
        )}
        <button type="button" className="primary-button" onClick={onContinue}>
          Continuar explorando
        </button>
      </div>
    </div>
  )
}
