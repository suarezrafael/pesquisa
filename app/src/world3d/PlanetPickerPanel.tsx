// Seletor de planeta-destino (lab-110, pedido do usuário: "ampliar o mundo do jogo... ter os
// planetas do sistema solar... ao entrar no foguete temos que escolher o planetinha") — aberto ao
// embarcar no foguete do planeta principal (nunca na volta, que só tem um destino possível: casa).
// Reaproveita `.modal-overlay`/`.modal quest-list-modal` (mesmo padrão de `MyHousePanel.tsx`) e a
// grade `.avatar-shop-*` (mesmo padrão de `AvatarShop.tsx`) — zero CSS novo, incluindo a tag de
// bloqueio (lab-115), que reaproveita a MESMA `.avatar-shop-tag.subscription-lock` já usada pros
// itens exclusivos de assinante em `AvatarShop.tsx` (mesmo espaço visual do botão, sem clique).
interface PlanetOption {
  id: string
  name: string
  emoji: string
  requiredLevel?: number
}

interface PlanetPickerPanelProps {
  planets: PlanetOption[]
  currentLevel: number
  onChoose: (id: string) => void
  onClose: () => void
}

export function PlanetPickerPanel({ planets, currentLevel, onChoose, onClose }: PlanetPickerPanelProps) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Escolher planeta">
      <div className="modal quest-list-modal">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
          ×
        </button>
        <h2>🚀 Pra onde vamos?</h2>
        <p className="subtitle">Escolha um planeta pra visitar.</p>

        <div className="avatar-shop-grid">
          {planets.map((planet) => {
            const requiredLevel = planet.requiredLevel ?? 1
            const locked = currentLevel < requiredLevel
            return (
              <div key={planet.id} className="avatar-shop-item">
                <span className="avatar-shop-emoji">{planet.emoji}</span>
                <span className="avatar-shop-name">{planet.name}</span>
                {locked ? (
                  <span className="avatar-shop-tag subscription-lock">🔒 Nível {requiredLevel}</span>
                ) : (
                  <button type="button" className="avatar-shop-action" onClick={() => onChoose(planet.id)}>
                    Viajar
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
