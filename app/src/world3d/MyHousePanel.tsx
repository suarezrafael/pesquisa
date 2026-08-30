// Painel de "Minha Casa" (lab-105, primeira fatia de docs/plano-comercial-backend.md, Fase E —
// espaço pessoal GRATUITO pra todo jogador, nunca cosmético pago). lab-106 trocou o placeholder
// de mobília por compra de verdade com moeda — reaproveita a mesma grade/botões de
// `AvatarShop.tsx` (`.avatar-shop-grid`/`.avatar-shop-item`/`.avatar-shop-emoji`/
// `.avatar-shop-action`), sem eixo de "equipar" (a casa não é uma cena 3D navegável ainda — cada
// item é só possuído ou não). lab-107 acrescentou os 2 sets exclusivos de assinante ("Quarto
// Espacial", "Jardim Encantado") — mesma regra `usable = subscriptionOnly ? entitlementActive :
// owned` e tag "🔒 Assinantes" já usadas em `AvatarShop.tsx` pra chapéus/óculos exclusivos.
import { FURNITURE_CATALOG } from '../data/furniture'
import { useModalA11y } from '../state/useModalA11y'
import type { Progress } from '../types'

interface MyHousePanelProps {
  progress: Progress
  entitlementActive: boolean
  onUnlockFurniture: (id: string) => void
  onClose: () => void
}

export function MyHousePanel({ progress, entitlementActive, onUnlockFurniture, onClose }: MyHousePanelProps) {
  const modalRef = useModalA11y(onClose)
  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Minha Casa"
      ref={modalRef}
      tabIndex={-1}
    >
      <div className="modal quest-list-modal">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
          ×
        </button>
        <h2>🏠 Minha Casa</h2>
        <p className="subtitle">
          Seu espaço pessoal — grátis pra todo jogador, sempre. Compre móveis com as moedas que
          você já ganhou nas missões.
        </p>

        <div className="avatar-shop-grid">
          {FURNITURE_CATALOG.map((item) => {
            const usable = item.subscriptionOnly ? entitlementActive : progress.unlockedFurnitureIds.includes(item.id)
            const affordable = progress.coins >= item.cost

            return (
              <div key={item.id} className={`avatar-shop-item ${usable ? 'equipped' : ''}`}>
                <span className="avatar-shop-emoji">{item.emoji}</span>
                <span className="avatar-shop-name">
                  {item.name} {item.subscriptionOnly && '👑'}
                </span>

                {usable && <span className="avatar-shop-tag">✓ Tem</span>}

                {!usable && item.subscriptionOnly && (
                  <span className="avatar-shop-tag subscription-lock">🔒 Assinantes</span>
                )}

                {!usable && item.planetReward && (
                  <span className="avatar-shop-tag subscription-lock">🔒 Conquiste o planeta</span>
                )}

                {!usable && !item.subscriptionOnly && !item.planetReward && (
                  <button
                    type="button"
                    className="avatar-shop-action buy"
                    disabled={!affordable}
                    onClick={() => onUnlockFurniture(item.id)}
                  >
                    🪙 {item.cost}
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
