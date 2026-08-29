import { lazy, Suspense, useState } from 'react'
import { AVATAR_CATALOG } from '../data/avatars'
import { HAT_CATALOG } from '../data/hats'
import { GLASSES_CATALOG } from '../data/glasses'
import {
  BACKPACK_COLOR_CATALOG,
  HAIR_SHAPE_CATALOG,
  PANTS_COLOR_CATALOG,
  SHIRT_COLOR_CATALOG,
  SHOE_COLOR_CATALOG,
  type ColorOption,
  type HairShapeOption,
} from '../data/customization'
import { useModalA11y } from '../state/useModalA11y'
import type { Profile, Progress } from '../types'

// Carregado sob demanda, não no bundle principal (mesmo raciocínio de `World3D`/`FamilyPortal`
// em App.tsx) — `AvatarPreview3D` importa `@babylonjs/core` pra desenhar o preview de verdade, e
// `AvatarShop.tsx` é importado direto (não via `lazy()`) por `App.tsx`. Sem isso, abrir /familia,
// /termos ou /privacidade baixaria o motor 3D à toa, só por `AvatarShop` existir no grafo de
// imports estático — quebraria o mesmo code-splitting que motivou `World3D` ser `lazy()` (ver
// docs/prompts/05-escala-e-viabilidade.md G12). Na prática quem abre a lojinha já carregou o
// mundo 3D de qualquer forma (só dá pra chegar nela jogando), então o custo real é baixo — o que
// importa aqui é não pagar esse custo em rotas que nunca precisam dele.
const AvatarPreview3D = lazy(() => import('./AvatarPreview3D').then((m) => ({ default: m.AvatarPreview3D })))

interface AvatarShopProps {
  profile: Profile
  progress: Progress
  // Fase E do plano comercial (ver docs/plano-comercial-backend.md) — itens `subscriptionOnly`
  // ficam disponíveis pra usar (não pra comprar com moeda) enquanto a assinatura da família
  // estiver ativa, sem precisar entrar em `unlockedXxxIds`. Vem de `useEntitlement()` (lab-81).
  entitlementActive: boolean
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
  onUnlockGlasses: (id: string) => void
  onEquipGlasses: (id: string | null) => void
  onClose: () => void
}

// Abas (lab-87, pedido do usuário: "se ficar muita opção, segmente por abas") — o catálogo
// cresceu de ~15 pra mais de 50 itens neste laboratório (mais cosméticos de assinante); uma lista
// só, rolando infinitamente, deixou de caber numa experiência boa pra criança escolher. Camisa/
// calça/sapato/mochila viram uma aba só ("Roupas") — são o mesmo tipo de escolha (cor de uma peça
// de roupa), separar em 4 abas ficaria fragmentado demais pro benefício de organização que dá.
type ShopTab = 'avatares' | 'chapeus' | 'oculos' | 'roupas' | 'cabelo'

const TABS: { id: ShopTab; label: string; emoji: string }[] = [
  { id: 'avatares', label: 'Avatares', emoji: '🐾' },
  { id: 'chapeus', label: 'Chapéus', emoji: '🎩' },
  { id: 'oculos', label: 'Óculos', emoji: '😎' },
  { id: 'roupas', label: 'Roupas', emoji: '👕' },
  { id: 'cabelo', label: 'Cabelo', emoji: '💇' },
]

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
  entitlementActive,
  onUnlock,
  onEquip,
}: {
  title: string
  catalog: ColorOption[]
  unlockedIds: string[]
  equippedId: string | null
  coins: number
  entitlementActive: boolean
  onUnlock: (id: string) => void
  onEquip: (id: string | null) => void
}) {
  return (
    <>
      <h2>{title}</h2>
      <div className="avatar-shop-grid">
        {catalog.map((opt) => {
          const usable = opt.subscriptionOnly ? entitlementActive : unlockedIds.includes(opt.id)
          // `cost === 0` também identifica os itens exclusivos de assinante (preço "N/A"), não só
          // o item padrão de cada catálogo — sem o `!opt.subscriptionOnly`, um item exclusivo
          // apareceria marcado "Em uso" só por ter custo 0, mesmo sem estar equipado de verdade.
          const equipped = equippedId === opt.id || (equippedId === null && opt.cost === 0 && !opt.subscriptionOnly)
          const affordable = coins >= opt.cost
          const [r, g, b] = opt.colorRgb.map((c) => Math.round(c * 255))

          return (
            <div key={opt.id} className={`avatar-shop-item ${equipped ? 'equipped' : ''} ${!usable ? 'locked' : ''}`}>
              <span className="avatar-shop-swatch" style={{ background: `rgb(${r}, ${g}, ${b})` }} />
              <span className="avatar-shop-name">
                {opt.name} {opt.subscriptionOnly && '👑'}
              </span>

              {equipped && <span className="avatar-shop-tag">Em uso</span>}

              {!equipped && usable && (
                <button type="button" className="avatar-shop-action" onClick={() => onEquip(opt.id)}>
                  Usar
                </button>
              )}

              {!equipped && !usable && opt.subscriptionOnly && (
                <span className="avatar-shop-tag subscription-lock">🔒 Assinantes</span>
              )}

              {!usable && !opt.subscriptionOnly && (
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
  entitlementActive,
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
  onUnlockGlasses,
  onEquipGlasses,
  onClose,
}: AvatarShopProps) {
  const [tab, setTab] = useState<ShopTab>('avatares')
  const modalRef = useModalA11y(onClose)

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Loja de avatares"
      ref={modalRef}
      tabIndex={-1}
    >
      <div className="modal avatar-shop-modal">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
          ×
        </button>
        <h2>Lojinha de avatares</h2>
        <p className="subtitle">
          Troque as moedas que você coletou por novos personagens. Itens com 👑 são exclusivos de
          assinantes — peça pra quem cuida de você conferir a área dos responsáveis.
        </p>

        {/* Preview 3D (lab-87, pedido do usuário: "mostrar um menu com um preview 3D do avatar e
            do boneco") — reflete a combinação EQUIPADA agora, atualiza sozinho assim que algo é
            trocado em qualquer aba (o motor 3D vive à parte, ver AvatarPreview3D.tsx). */}
        <div className="avatar-preview-3d-wrap">
          <Suspense fallback={<div className="avatar-preview-3d-canvas avatar-preview-3d-loading" />}>
            <AvatarPreview3D
              avatarEmoji={profile.avatarEmoji}
              hatId={profile.equippedHatId}
              shirtColorId={profile.equippedShirtColorId}
              pantsColorId={profile.equippedPantsColorId}
              shoeColorId={profile.equippedShoeColorId}
              backpackColorId={profile.equippedBackpackColorId}
              hairShapeId={profile.equippedHairShapeId}
              glassesId={profile.equippedGlassesId}
            />
          </Suspense>
        </div>

        <div className="hub-coins avatar-shop-balance">🪙 {progress.coins}</div>

        <div className="avatar-shop-tabs-wrap">
          <div className="avatar-shop-tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={`avatar-shop-tab ${tab === t.id ? 'active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                <span aria-hidden="true">{t.emoji}</span> {t.label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'avatares' && (
          <div className="avatar-shop-grid">
            {AVATAR_CATALOG.map((avatar) => {
              const usable = avatar.subscriptionOnly ? entitlementActive : progress.unlockedAvatarIds.includes(avatar.id)
              const equipped = profile.avatarEmoji === avatar.emoji
              const affordable = progress.coins >= avatar.cost

              return (
                <div
                  key={avatar.id}
                  className={`avatar-shop-item ${equipped ? 'equipped' : ''} ${!usable ? 'locked' : ''}`}
                >
                  <span className="avatar-shop-emoji">{avatar.emoji}</span>
                  <span className="avatar-shop-name">
                    {avatar.name} {avatar.subscriptionOnly && '👑'}
                  </span>

                  {equipped && <span className="avatar-shop-tag">Em uso</span>}

                  {!equipped && usable && (
                    <button type="button" className="avatar-shop-action" onClick={() => onEquip(avatar.emoji)}>
                      Usar
                    </button>
                  )}

                  {!equipped && !usable && avatar.subscriptionOnly && (
                    <span className="avatar-shop-tag subscription-lock">🔒 Assinantes</span>
                  )}

                  {!usable && !avatar.subscriptionOnly && (
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
        )}

        {tab === 'chapeus' && (
          <>
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
                const usable = hat.subscriptionOnly ? entitlementActive : progress.unlockedHatIds.includes(hat.id)
                const equipped = profile.equippedHatId === hat.id
                const affordable = progress.coins >= hat.cost

                return (
                  <div key={hat.id} className={`avatar-shop-item ${equipped ? 'equipped' : ''} ${!usable ? 'locked' : ''}`}>
                    <span className="avatar-shop-emoji">{hat.emoji}</span>
                    <span className="avatar-shop-name">
                      {hat.name} {hat.subscriptionOnly && '👑'} {hat.marsRewardOnly && '🪐'}
                    </span>

                    {equipped && <span className="avatar-shop-tag">Em uso</span>}

                    {!equipped && usable && (
                      <button type="button" className="avatar-shop-action" onClick={() => onEquipHat(hat.id)}>
                        Usar
                      </button>
                    )}

                    {!equipped && !usable && hat.subscriptionOnly && (
                      <span className="avatar-shop-tag subscription-lock">🔒 Assinantes</span>
                    )}

                    {/* lab-94: brinde exclusivo de Marte — nunca compra com moeda, mesma tag
                        visual do bloqueio de assinatura (`subscription-lock`), texto diferente. */}
                    {!equipped && !usable && hat.marsRewardOnly && (
                      <span className="avatar-shop-tag subscription-lock">🪐 Vença Marte</span>
                    )}

                    {!usable && !hat.subscriptionOnly && !hat.marsRewardOnly && (
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
          </>
        )}

        {tab === 'oculos' && (
          <>
            <p className="subtitle">Óculos são independentes do personagem e do chapéu.</p>

            <div className="avatar-shop-grid">
              <div className={`avatar-shop-item ${!profile.equippedGlassesId ? 'equipped' : ''}`}>
                <span className="avatar-shop-emoji">🚫</span>
                <span className="avatar-shop-name">Nenhum</span>
                {!profile.equippedGlassesId ? (
                  <span className="avatar-shop-tag">Em uso</span>
                ) : (
                  <button type="button" className="avatar-shop-action" onClick={() => onEquipGlasses(null)}>
                    Usar
                  </button>
                )}
              </div>

              {GLASSES_CATALOG.map((glasses) => {
                const usable = glasses.subscriptionOnly ? entitlementActive : progress.unlockedGlassesIds.includes(glasses.id)
                const equipped = profile.equippedGlassesId === glasses.id
                const affordable = progress.coins >= glasses.cost

                return (
                  <div key={glasses.id} className={`avatar-shop-item ${equipped ? 'equipped' : ''} ${!usable ? 'locked' : ''}`}>
                    <span className="avatar-shop-emoji">{glasses.emoji}</span>
                    <span className="avatar-shop-name">
                      {glasses.name} {glasses.subscriptionOnly && '👑'}
                    </span>

                    {equipped && <span className="avatar-shop-tag">Em uso</span>}

                    {!equipped && usable && (
                      <button type="button" className="avatar-shop-action" onClick={() => onEquipGlasses(glasses.id)}>
                        Usar
                      </button>
                    )}

                    {!equipped && !usable && glasses.subscriptionOnly && (
                      <span className="avatar-shop-tag subscription-lock">🔒 Assinantes</span>
                    )}

                    {!usable && !glasses.subscriptionOnly && (
                      <button
                        type="button"
                        className="avatar-shop-action buy"
                        disabled={!affordable}
                        onClick={() => onUnlockGlasses(glasses.id)}
                      >
                        🪙 {glasses.cost}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Personalização (lab-73, pedido do usuário: "dar pra escolher na lojinha a cor da
            camiseta e da mochila... a cor da calça, a cor do sapato, e o formato do cabelo") —
            cada eixo é independente dos outros e da criatura/chapéu escolhidos. */}
        {tab === 'roupas' && (
          <>
            <ColorSection
              title="Camisa"
              catalog={SHIRT_COLOR_CATALOG}
              unlockedIds={progress.unlockedShirtColorIds}
              equippedId={profile.equippedShirtColorId}
              coins={progress.coins}
              entitlementActive={entitlementActive}
              onUnlock={onUnlockShirtColor}
              onEquip={onEquipShirtColor}
            />
            <ColorSection
              title="Calça"
              catalog={PANTS_COLOR_CATALOG}
              unlockedIds={progress.unlockedPantsColorIds}
              equippedId={profile.equippedPantsColorId}
              coins={progress.coins}
              entitlementActive={entitlementActive}
              onUnlock={onUnlockPantsColor}
              onEquip={onEquipPantsColor}
            />
            <ColorSection
              title="Sapato"
              catalog={SHOE_COLOR_CATALOG}
              unlockedIds={progress.unlockedShoeColorIds}
              equippedId={profile.equippedShoeColorId}
              coins={progress.coins}
              entitlementActive={entitlementActive}
              onUnlock={onUnlockShoeColor}
              onEquip={onEquipShoeColor}
            />
            <ColorSection
              title="Mochila"
              catalog={BACKPACK_COLOR_CATALOG}
              unlockedIds={progress.unlockedBackpackColorIds}
              equippedId={profile.equippedBackpackColorId}
              coins={progress.coins}
              entitlementActive={entitlementActive}
              onUnlock={onUnlockBackpackColor}
              onEquip={onEquipBackpackColor}
            />
          </>
        )}

        {tab === 'cabelo' && (
          <HairShapeSection
            catalog={HAIR_SHAPE_CATALOG}
            unlockedIds={progress.unlockedHairShapeIds}
            equippedId={profile.equippedHairShapeId}
            coins={progress.coins}
            onUnlock={onUnlockHairShape}
            onEquip={onEquipHairShape}
          />
        )}
      </div>
    </div>
  )
}
