// Painel de conquistas (lab-93, pedido do usuário: "carteira de estudo em que o boneco pode
// sentar, acessar seu catálogo de conquistas") — mesma estrutura de `QuestListOverlay.tsx`,
// reaproveita as classes CSS `.quest-list`/`.quest-list-item` já existentes (o formato ícone +
// nome + descrição + status encaixa exatamente, sem precisar de CSS novo).
import { ACHIEVEMENT_CATALOG } from '../data/achievements'
import type { Progress } from '../types'

interface AchievementsPanelProps {
  progress: Progress
  onClose: () => void
}

export function AchievementsPanel({ progress, onClose }: AchievementsPanelProps) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Catálogo de conquistas">
      <div className="modal quest-list-modal">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
          ×
        </button>
        <h2>Catálogo de conquistas</h2>
        <p className="subtitle">Complete missões pra desbloquear cada uma.</p>

        <div className="quest-list">
          {ACHIEVEMENT_CATALOG.map((achievement) => {
            const earned = progress.badges.includes(achievement.id)
            return (
              <div key={achievement.id} className={`quest-list-item ${earned ? 'completed' : 'locked'}`}>
                <span className="quest-list-index" aria-hidden="true">
                  {achievement.emoji}
                </span>
                <div className="quest-list-info">
                  <span className="quest-list-title">{achievement.name}</span>
                  <span className="quest-list-type">{achievement.description}</span>
                </div>
                <span className="quest-list-status">{earned ? '✓' : '🔒'}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
