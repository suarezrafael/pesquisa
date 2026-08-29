// Painel de "Minha Casa" (lab-105, primeira fatia de docs/plano-comercial-backend.md, Fase E —
// espaço pessoal GRATUITO pra todo jogador, nunca cosmético pago). Mesma estrutura de
// `AchievementsPanel.tsx`/`QuestListOverlay.tsx`, reaproveita `.quest-list`/`.quest-list-item`.
// Mobília comprável/posicionável e os 2 conjuntos exclusivos de assinante ("Quarto Espacial",
// "Jardim Encantado") ficam pra um próximo laboratório — aqui é só o placeholder da casa base.
interface MyHousePanelProps {
  onClose: () => void
}

const PLACEHOLDER_FURNITURE = [
  { emoji: '🛏️', name: 'Cama', description: 'Chega em um próximo laboratório.' },
  { emoji: '🪑', name: 'Mesa e cadeira', description: 'Chega em um próximo laboratório.' },
  { emoji: '🪴', name: 'Planta', description: 'Chega em um próximo laboratório.' },
]

export function MyHousePanel({ onClose }: MyHousePanelProps) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Minha Casa">
      <div className="modal quest-list-modal">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
          ×
        </button>
        <h2>🏠 Minha Casa</h2>
        <p className="subtitle">
          Seu espaço pessoal — grátis pra todo jogador, sempre. Em breve você vai poder comprar
          móveis com moeda e decorar do seu jeito.
        </p>

        <div className="quest-list">
          {PLACEHOLDER_FURNITURE.map((item) => (
            <div key={item.name} className="quest-list-item locked">
              <span className="quest-list-index" aria-hidden="true">
                {item.emoji}
              </span>
              <div className="quest-list-info">
                <span className="quest-list-title">{item.name}</span>
                <span className="quest-list-type">{item.description}</span>
              </div>
              <span className="quest-list-status">🔜</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
