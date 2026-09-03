// Painel de "Minha Casa" (lab-105, primeira fatia de docs/plano-comercial-backend.md, Fase E —
// espaço pessoal GRATUITO pra todo jogador, nunca cosmético pago). lab-106 trocou o placeholder
// de mobília por compra de verdade com moeda — reaproveita a mesma grade/botões de
// `AvatarShop.tsx` (`.avatar-shop-grid`/`.avatar-shop-item`/`.avatar-shop-emoji`/
// `.avatar-shop-action`), sem eixo de "equipar" (a casa não é uma cena 3D navegável ainda — cada
// item é só possuído ou não). lab-107 acrescentou os 2 sets exclusivos de assinante ("Quarto
// Espacial", "Jardim Encantado") — mesma regra `usable = subscriptionOnly ? entitlementActive :
// owned` e tag "🔒 Assinantes" já usadas em `AvatarShop.tsx` pra chapéus/óculos exclusivos.
import { FURNITURE_CATALOG } from '../data/furniture'
import { furnitureQuantity } from '../state/progression'
import { useModalA11y } from '../state/useModalA11y'
import type { Progress } from '../types'

interface MyHousePanelProps {
  progress: Progress
  entitlementActive: boolean
  onUnlockFurniture: (id: string) => void
  // lab-136 (pedido do usuário: "tem que ter opção... de escolher em que posição da casa deve
  // ficar a peça... o ângulo e posição") — fecha este painel e entra no modo de posicionamento
  // dentro da cena 3D pra um item já possuído; só faz sentido enquanto dentro de casa (o botão só
  // aparece pra itens `usable`, e o próprio `World3D.tsx` ignora o pedido se o jogador não estiver
  // no interior no momento).
  onStartPlacing: (id: string) => void
  onClose: () => void
}

export function MyHousePanel({ progress, entitlementActive, onUnlockFurniture, onStartPlacing, onClose }: MyHousePanelProps) {
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
            // lab-138 (pedido do usuário: "tem que dar pra colocar mais de um item na casa do
            // mesmo, comprando outro, nao so um e poder mover") — item normal (nem `subscriptionOnly`
            // nem `planetReward`) pode ser comprado repetidas vezes; cada cópia vira uma peça
            // própria na sala 3D, com sua própria posição, movível independente das outras (ver
            // `furnitureQuantity`/`World3D.tsx`, que passaram a contar/construir por cópia).
            const quantity = furnitureQuantity(item, progress, entitlementActive)
            const owned = quantity > 0
            const affordable = progress.coins >= item.cost
            const canBuyMore = !item.subscriptionOnly && !item.planetReward

            return (
              <div key={item.id} className={`avatar-shop-item ${owned ? 'equipped' : ''}`}>
                <span className="avatar-shop-emoji">{item.emoji}</span>
                <span className="avatar-shop-name">
                  {item.name} {item.subscriptionOnly && '👑'}
                </span>

                {owned && (
                  <span className="avatar-shop-tag">✓ Tem{quantity > 1 ? ` (${quantity})` : ''}</span>
                )}

                {Array.from({ length: quantity }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    className="avatar-shop-action"
                    onClick={() => onStartPlacing(`${item.id}#${i}`)}
                  >
                    🖐️ Mover{quantity > 1 ? ` #${i + 1}` : ''}
                  </button>
                ))}

                {!owned && item.subscriptionOnly && (
                  <span className="avatar-shop-tag subscription-lock">🔒 Assinantes</span>
                )}

                {!owned && item.planetReward && (
                  <span className="avatar-shop-tag subscription-lock">🔒 Conquiste o planeta</span>
                )}

                {canBuyMore && (
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
