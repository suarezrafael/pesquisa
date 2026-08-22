import { AVATAR_CATALOG } from '../data/avatars'
import { HAT_CATALOG } from '../data/hats'
import {
  BACKPACK_COLOR_CATALOG,
  HAIR_SHAPE_CATALOG,
  PANTS_COLOR_CATALOG,
  SHIRT_COLOR_CATALOG,
  SHOE_COLOR_CATALOG,
  type ColorOption,
  type HairShapeOption,
} from '../data/customization'
import type { Profile, Progress } from '../types'

interface AvatarShopProps {
  profile: Profile
  progress: Progress
  onUnlock: (avatarId: string) => void
  onEquip: (avatarEmoji: string) => void
  onUnlockHat: (hatId: string) => void
  onEquipHat: (hatId: string | null) => void
  onUnlockShirtColor: (id: string) => void
  onEquipShirtColor: (id: string | null) => void
  onUnlockPantsColor: (id: string) => void
  onEquipPantsColor: (id: string | null) => void
  onUnlockShoeColor: (id: string) => void
  onEquipShoeColor: (id: string | null) => void
  onUnlockBackpackColor: (id: string) => void
  onEquipBackpackColor: (id: string | null) => void
  onUnlockHairShape: (id: string) => void
  onEquipHairShape: (id: string | null) => void
  onClose: () => void
}

// Seção de cor (lab-73) — os quatro eixos de cor (camisa/calça/sapato/mochila) têm exatamente a
// mesma estrutura (`ColorOption`), só o catálogo/título/callbacks mudam; extraído aqui em vez de
// repetir o mesmo bloco 4 vezes (a seção de chapéus acima já repete o padrão dos avatares uma
// vez — a partir da segunda repetição fica melhor virar uma função).
function ColorSection({
  title,
  catalog,
  unlockedIds,
  equippedId,
  coins,
  onUnlock,
  onEquip,
}: {
  title: string
  catalog: ColorOption[]
  unlockedIds: string[]
  equippedId: string | null
  coins: number
  onUnlock: (id: string) => void
  onEquip: (id: string | null) => void
}) {
  return (
    <>
      <h2>{title}</h2>
      <div className="avatar-shop-grid">
        {catalog.map((opt) => {
          const unlocked = unlockedIds.includes(opt.id)
          const equipped = equippedId === opt.id || (equippedId === null && opt.cost === 0)
          const affordable = coins >= opt.cost
          const [r, g, b] = opt.colorRgb.map((c) => Math.round(c * 255))

          return (
            <div key={opt.id} className={`avatar-shop-item ${equipped ? 'equipped' : ''} ${!unlocked ? 'locked' : ''}`}>
              <span className="avatar-shop-swatch" style={{ background: `rgb(${r}, ${g}, ${b})` }} />
              <span className="avatar-shop-name">{opt.name}</span>

              {equipped && <span className="avatar-shop-tag">Em uso</span>}

              {!equipped && unlocked && (
                <button type="button" className="avatar-shop-action" onClick={() => onEquip(opt.id)}>
                  Usar
                </button>
              )}

              {!unlocked && (
                <button
                  type="button"
                  className="avatar-shop-action buy"
                  disabled={!affordable}
                  onClick={() => onUnlock(opt.id)}
                >
                  🪙 {opt.cost}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

function HairShapeSection({
  catalog,
  unlockedIds,
  equippedId,
  coins,
  onUnlock,
  onEquip,
}: {
  catalog: HairShapeOption[]
  unlockedIds: string[]
  equippedId: string | null
  coins: number
  onUnlock: (id: string) => void
  onEquip: (id: string | null) => void
}) {
  return (
    <>
      <h2>Cabelo</h2>
      <div className="avatar-shop-grid">
        {catalog.map((opt) => {
          const unlocked = unlockedIds.includes(opt.id)
          const equipped = equippedId === opt.id || (equippedId === null && opt.cost === 0)
          const affordable = coins >= opt.cost

          return (
            <div key={opt.id} className={`avatar-shop-item ${equipped ? 'equipped' : ''} ${!unlocked ? 'locked' : ''}`}>
              <span className="avatar-shop-emoji">💇</span>
              <span className="avatar-shop-name">{opt.name}</span>

              {equipped && <span className="avatar-shop-tag">Em uso</span>}

              {!equipped && unlocked && (
                <button type="button" className="avatar-shop-action" onClick={() => onEquip(opt.id)}>
                  Usar
                </button>
              )}

              {!unlocked && (
                <button
                  type="button"
                  className="avatar-shop-action buy"
                  disabled={!affordable}
                  onClick={() => onUnlock(opt.id)}
                >
                  🪙 {opt.cost}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

export function AvatarShop({
  profile,
  progress,
  onUnlock,
  onEquip,
  onUnlockHat,
  onEquipHat,
  onUnlockShirtColor,
  onEquipShirtColor,
  onUnlockPantsColor,
  onEquipPantsColor,
  onUnlockShoeColor,
  onEquipShoeColor,
  onUnlockBackpackColor,
  onEquipBackpackColor,
  onUnlockHairShape,
  onEquipHairShape,
  onClose,
}: AvatarShopProps) {
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

        <h2>Chapéus</h2>
        <p className="subtitle">
          Chapéus são independentes do personagem — troque de bicho sem perder o chapéu.
        </p>

        <div className="avatar-shop-grid">
          <div className={`avatar-shop-item ${!profile.equippedHatId ? 'equipped' : ''}`}>
            <span className="avatar-shop-emoji">🚫</span>
            <span className="avatar-shop-name">Nenhum</span>
            {!profile.equippedHatId ? (
              <span className="avatar-shop-tag">Em uso</span>
            ) : (
              <button type="button" className="avatar-shop-action" onClick={() => onEquipHat(null)}>
                Usar
              </button>
            )}
          </div>

          {HAT_CATALOG.map((hat) => {
            const unlocked = progress.unlockedHatIds.includes(hat.id)
            const equipped = profile.equippedHatId === hat.id
            const affordable = progress.coins >= hat.cost

            return (
              <div key={hat.id} className={`avatar-shop-item ${equipped ? 'equipped' : ''} ${!unlocked ? 'locked' : ''}`}>
                <span className="avatar-shop-emoji">{hat.emoji}</span>
                <span className="avatar-shop-name">{hat.name}</span>

                {equipped && <span className="avatar-shop-tag">Em uso</span>}

                {!equipped && unlocked && (
                  <button type="button" className="avatar-shop-action" onClick={() => onEquipHat(hat.id)}>
                    Usar
                  </button>
                )}

                {!unlocked && (
                  <button
                    type="button"
                    className="avatar-shop-action buy"
                    disabled={!affordable}
                    onClick={() => onUnlockHat(hat.id)}
                  >
                    🪙 {hat.cost}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Personalização (lab-73, pedido do usuário: "dar pra escolher na lojinha a cor da
            camiseta e da mochila... a cor da calça, a cor do sapato, e o formato do cabelo") —
            cada eixo é independente dos outros e da criatura/chapéu escolhidos. */}
        <ColorSection
          title="Camisa"
          catalog={SHIRT_COLOR_CATALOG}
          unlockedIds={progress.unlockedShirtColorIds}
          equippedId={profile.equippedShirtColorId}
          coins={progress.coins}
          onUnlock={onUnlockShirtColor}
          onEquip={onEquipShirtColor}
        />
        <ColorSection
          title="Calça"
          catalog={PANTS_COLOR_CATALOG}
          unlockedIds={progress.unlockedPantsColorIds}
          equippedId={profile.equippedPantsColorId}
          coins={progress.coins}
          onUnlock={onUnlockPantsColor}
          onEquip={onEquipPantsColor}
        />
        <ColorSection
          title="Sapato"
          catalog={SHOE_COLOR_CATALOG}
          unlockedIds={progress.unlockedShoeColorIds}
          equippedId={profile.equippedShoeColorId}
          coins={progress.coins}
          onUnlock={onUnlockShoeColor}
          onEquip={onEquipShoeColor}
        />
        <ColorSection
          title="Mochila"
          catalog={BACKPACK_COLOR_CATALOG}
          unlockedIds={progress.unlockedBackpackColorIds}
          equippedId={profile.equippedBackpackColorId}
          coins={progress.coins}
          onUnlock={onUnlockBackpackColor}
          onEquip={onEquipBackpackColor}
        />
        <HairShapeSection
          catalog={HAIR_SHAPE_CATALOG}
          unlockedIds={progress.unlockedHairShapeIds}
          equippedId={profile.equippedHairShapeId}
          coins={progress.coins}
          onUnlock={onUnlockHairShape}
          onEquip={onEquipHairShape}
        />
      </div>
    </div>
  )
}
