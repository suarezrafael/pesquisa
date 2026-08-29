// Painel de "Minha Casa" (lab-105, primeira fatia de docs/plano-comercial-backend.md, Fase E —
// espaço pessoal GRATUITO pra todo jogador, nunca cosmético pago). lab-106 trocou o placeholder
// de mobília por compra de verdade com moeda — reaproveita a mesma grade/botões de
// `AvatarShop.tsx` (`.avatar-shop-grid`/`.avatar-shop-item`/`.avatar-shop-emoji`/
// `.avatar-shop-action`), sem eixo de "equipar" (a casa não é uma cena 3D navegável ainda — cada
// item é só possuído ou não). Os 2 conjuntos exclusivos de assinante ("Quarto Espacial", "Jardim
// Encantado") ficam pra um próximo laboratório.
import { FURNITURE_CATALOG } from '../data/furniture'
import type { Progress } from '../types'

interface MyHousePanelProps {
  progress: Progress
  onUnlockFurniture: (id: string) => void
  onClose: () => void
}

export function MyHousePanel({ progress, onUnlockFurniture, onClose }: MyHousePanelProps) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Minha Casa">
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
            const owned = progress.unlockedFurnitureIds.includes(item.id)
            const affordable = progress.coins >= item.cost
            return (
              <div key={item.id} className={`avatar-shop-item ${owned ? 'equipped' : ''}`}>
                <span className="avatar-shop-emoji">{item.emoji}</span>
                <span className="avatar-shop-name">{item.name}</span>

                {owned ? (
                  <span className="avatar-shop-tag">✓ Tem</span>
                ) : (
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
