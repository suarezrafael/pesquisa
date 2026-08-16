import type { Profile, Progress } from '../types'
import { getLevel, xpIntoLevel } from '../state/progression'

interface HudHeaderProps {
  profile: Profile
  progress: Progress
  onOpenHelp: () => void
  onOpenQuestList: () => void
  muted: boolean
  onToggleMute: () => void
  onOpenChat: () => void
}

export function HudHeader({
  profile,
  progress,
  onOpenHelp,
  onOpenQuestList,
  muted,
  onToggleMute,
  onOpenChat,
}: HudHeaderProps) {
  const level = getLevel(progress.xp)
  const { current, needed } = xpIntoLevel(progress.xp)
  const percent = Math.min(100, Math.round((current / needed) * 100))

  return (
    <div className="hud-overlay">
      <div className="hud-top-row">
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

        <button type="button" className="help-button" onClick={onOpenQuestList} aria-label="Ver missões">
          🗺️
        </button>
        <button
          type="button"
          className="help-button"
          onClick={onToggleMute}
          aria-label={muted ? 'Ativar som' : 'Silenciar som'}
        >
          {muted ? '🔇' : '🔊'}
        </button>
        <button type="button" className="help-button" onClick={onOpenChat} aria-label="Abrir chat">
          💬
        </button>
        <button type="button" className="help-button" onClick={onOpenHelp} aria-label="Como jogar">
          ?
        </button>
      </div>

      {progress.badges.length > 0 && (
        <div className="badge-row">
          {progress.badges.map((badge) => (
            <span key={badge} className="badge-pill">
              🎖️ {badge}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
