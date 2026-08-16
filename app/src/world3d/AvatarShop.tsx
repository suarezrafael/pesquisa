import { AVATAR_CATALOG } from '../data/avatars'
import type { Profile, Progress } from '../types'

interface AvatarShopProps {
  profile: Profile
  progress: Progress
  onUnlock: (avatarId: string) => void
  onEquip: (avatarEmoji: string) => void
  onClose: () => void
}

export function AvatarShop({ profile, progress, onUnlock, onEquip, onClose }: AvatarShopProps) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Loja de avatares">
      <div className="modal avatar-shop-modal">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
          ×
        </button>
        <h2>Lojinha de avatares</h2>
        <p className="subtitle">Troque as moedas que você coletou por novos personagens.</p>
        <div className="hub-coins avatar-shop-balance">🪙 {progress.coins}</div>

        <div className="avatar-shop-grid">
          {AVATAR_CATALOG.map((avatar) => {
            const unlocked = progress.unlockedAvatarIds.includes(avatar.id)
            const equipped = profile.avatarEmoji === avatar.emoji
            const affordable = progress.coins >= avatar.cost

            return (
              <div
                key={avatar.id}
                className={`avatar-shop-item ${equipped ? 'equipped' : ''} ${!unlocked ? 'locked' : ''}`}
              >
                <span className="avatar-shop-emoji">{avatar.emoji}</span>
                <span className="avatar-shop-name">{avatar.name}</span>

                {equipped && <span className="avatar-shop-tag">Em uso</span>}

                {!equipped && unlocked && (
                  <button type="button" className="avatar-shop-action" onClick={() => onEquip(avatar.emoji)}>
                    Usar
                  </button>
                )}

                {!unlocked && (
                  <button
                    type="button"
                    className="avatar-shop-action buy"
                    disabled={!affordable}
                    onClick={() => onUnlock(avatar.id)}
                  >
                    🪙 {avatar.cost}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
