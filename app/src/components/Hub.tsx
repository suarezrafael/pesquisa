import type { Profile, Progress } from '../types'
import { quests, questTypeLabels } from '../data/quests'
import { getLevel, xpIntoLevel, isQuestUnlocked } from '../state/progression'

interface HubProps {
  profile: Profile
  progress: Progress
  onSelectQuest: (questId: string) => void
}

export function Hub({ profile, progress, onSelectQuest }: HubProps) {
  const level = getLevel(progress.xp)
  const { current, needed } = xpIntoLevel(progress.xp)
  const percent = Math.min(100, Math.round((current / needed) * 100))

  return (
    <div className="screen hub">
      <header className="hub-header">
        <div className="hub-avatar">{profile.avatarEmoji}</div>
        <div className="hub-header-info">
          <h1>{profile.name}</h1>
          <div className="xp-bar" aria-label={`Nível ${level}, ${current} de ${needed} XP`}>
            <div className="xp-bar-fill" style={{ width: `${percent}%` }} />
          </div>
          <span className="hub-level">Nível {level}</span>
        </div>
        <div className="hub-coins">🪙 {progress.coins}</div>
      </header>

      {progress.badges.length > 0 && (
        <div className="badge-row">
          {progress.badges.map((badge) => (
            <span key={badge} className="badge-pill">
              🎖️ {badge}
            </span>
          ))}
        </div>
      )}

      <p className="hub-subtitle">Explore o mapa e complete as missões em ordem:</p>

      <div className="quest-map">
        {quests.map((quest, index) => {
          const unlocked = isQuestUnlocked(progress, index)
          const completed = progress.completedQuestIds.includes(quest.id)
          return (
            <button
              type="button"
              key={quest.id}
              className={`quest-node ${completed ? 'completed' : ''} ${!unlocked ? 'locked' : ''}`}
              onClick={() => unlocked && onSelectQuest(quest.id)}
              disabled={!unlocked}
            >
              <span className="quest-node-index">{index + 1}</span>
              <span className="quest-node-title">{quest.title}</span>
              <span className="quest-node-type">{questTypeLabels[quest.type]}</span>
              {completed && <span className="quest-node-check">✓</span>}
              {!unlocked && <span className="quest-node-lock">🔒</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
