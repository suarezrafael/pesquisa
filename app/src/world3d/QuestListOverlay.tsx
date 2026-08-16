import { quests, questTypeLabels } from '../data/quests'
import { isQuestUnlocked } from '../state/progression'
import type { Progress } from '../types'

interface QuestListOverlayProps {
  progress: Progress
  onClose: () => void
}

export function QuestListOverlay({ progress, onClose }: QuestListOverlayProps) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Missões do planeta">
      <div className="modal quest-list-modal">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
          ×
        </button>
        <h2>Missões do planeta</h2>
        <p className="subtitle">Role até o portal com o mesmo número pra tentar cada uma.</p>

        <div className="quest-list">
          {quests.map((quest, index) => {
            const unlocked = isQuestUnlocked(progress, index)
            const completed = progress.completedQuestIds.includes(quest.id)
            return (
              <div key={quest.id} className={`quest-list-item ${completed ? 'completed' : ''} ${!unlocked ? 'locked' : ''}`}>
                <span className="quest-list-index">{index + 1}</span>
                <div className="quest-list-info">
                  <span className="quest-list-title">{completed || unlocked ? quest.title : '???'}</span>
                  <span className="quest-list-type">{questTypeLabels[quest.type]}</span>
                </div>
                <span className="quest-list-status">
                  {completed ? '✓' : unlocked ? '✨' : '🔒'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
