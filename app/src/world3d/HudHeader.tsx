import type { Profile, Progress } from '../types'
import { getLevel, xpIntoLevel } from '../state/progression'
import { getCurrentWeeklyEvent } from '../data/weeklyEvents'

interface HudHeaderProps {
  profile: Profile
  progress: Progress
  onOpenHelp: () => void
  onOpenQuestList: () => void
  onOpenShop: () => void
  muted: boolean
  onToggleMute: () => void
  onOpenChat: () => void
  onOpenRanking: () => void
  showBag: boolean
  onOpenBag: () => void
  onOpenPairing: () => void
  onSwitchProfile: () => void
  // lab-121: true enquanto qualquer painel/modal (de App.tsx ou interno do World3D) está aberto
  // por cima do HUD — tira os 9 botões da ordem de tabulação, senão um usuário de teclado consegue
  // dar Tab por dentro de um modal visualmente aberto e cair nos botões escondidos atrás dele.
  inert?: boolean
}

export function HudHeader({
  profile,
  progress,
  onOpenHelp,
  onOpenQuestList,
  onOpenShop,
  muted,
  onToggleMute,
  onOpenChat,
  onOpenRanking,
  showBag,
  onOpenBag,
  onOpenPairing,
  onSwitchProfile,
  inert,
}: HudHeaderProps) {
  const level = getLevel(progress.xp)
  const { current, needed } = xpIntoLevel(progress.xp)
  const percent = Math.min(100, Math.round((current / needed) * 100))
  const weeklyEvent = getCurrentWeeklyEvent()

  return (
    <div className="hud-overlay" inert={inert}>
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
        <button type="button" className="help-button" onClick={onOpenShop} aria-label="Loja de avatares">
          🎭
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
        <button type="button" className="help-button" onClick={onOpenRanking} aria-label="Ver ranking">
          🏆
        </button>
        {showBag && (
          <button type="button" className="help-button" onClick={onOpenBag} aria-label="Ver mochila">
            🎒
          </button>
        )}
        <button type="button" className="help-button" onClick={onOpenHelp} aria-label="Como jogar">
          ?
        </button>
        <button
          type="button"
          className="help-button"
          onClick={onOpenPairing}
          aria-label="Vincular assinatura da família"
        >
          🔗
        </button>
        <button type="button" className="help-button" onClick={onSwitchProfile} aria-label="Trocar perfil">
          🔁
        </button>
      </div>

      <div className="badge-row">
        <span className="weekly-event-badge" title={weeklyEvent.description}>
          {weeklyEvent.emoji} {weeklyEvent.name}
        </span>
        {progress.badges.map((badge) => (
          <span key={badge} className="badge-pill">
            🎖️ {badge}
          </span>
        ))}
      </div>
    </div>
  )
}
