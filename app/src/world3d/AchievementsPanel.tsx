// Painel de conquistas (lab-93, pedido do usuário: "carteira de estudo em que o boneco pode
// sentar, acessar seu catálogo de conquistas") — mesma estrutura de `QuestListOverlay.tsx`,
// reaproveita as classes CSS `.quest-list`/`.quest-list-item` já existentes (o formato ícone +
// nome + descrição + status encaixa exatamente, sem precisar de CSS novo).
import { ACHIEVEMENT_CATALOG } from '../data/achievements'
import { POSTCARD_CATALOG } from '../data/postcards'
import { useModalA11y } from '../state/useModalA11y'
import type { Progress } from '../types'

interface AchievementsPanelProps {
  progress: Progress
  onClose: () => void
}

export function AchievementsPanel({ progress, onClose }: AchievementsPanelProps) {
  const modalRef = useModalA11y(onClose)
  // lab-149 (achado do review automático do Copilot no PR #12): o modal ganhou a seção de
  // cartões-postais (lab-141) mas o `aria-label` abaixo continuava descrevendo só conquistas —
  // nome acessível impreciso pra quem usa leitor de tela.
  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Catálogo de conquistas e cartões-postais"
      ref={modalRef}
      tabIndex={-1}
    >
      <div className="modal quest-list-modal">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
          ×
        </button>
        <h2>Catálogo de conquistas</h2>
        <p className="subtitle">Complete missões pra desbloquear cada uma.</p>

        <div className="quest-list">
          {ACHIEVEMENT_CATALOG.map((achievement) => {
            const earned = progress.badges.includes(achievement.id)
            return (
              <div key={achievement.id} className={`quest-list-item ${earned ? 'completed' : 'locked'}`}>
                <span className="quest-list-index" aria-hidden="true">
                  {achievement.emoji}
                </span>
                <div className="quest-list-info">
                  <span className="quest-list-title">{achievement.name}</span>
                  <span className="quest-list-type">{achievement.description}</span>
                </div>
                <span className="quest-list-status">{earned ? '✓' : '🔒'}</span>
              </div>
            )
          })}
        </div>

        {/* lab-141 (cartão-postal colecionável, item do backlog de engajamento discutido em chat,
            mesma lista de onde saiu o login diário do lab-138) — mesma estrutura de lista dos
            emblemas acima, dentro do MESMO painel (evita mais um ícone no HUD, que já tem 9
            botões) — as duas telas são "coleções", cabem bem juntas. */}
        <h2>Cartões-postais</h2>
        <p className="subtitle">Pouse de verdade em cada planeta pra colecionar o cartão dele.</p>
        <div className="quest-list">
          {POSTCARD_CATALOG.map((postcard) => {
            const collected = progress.collectedPostcardIds.includes(postcard.planetId)
            return (
              <div
                key={postcard.planetId}
                className={`quest-list-item ${collected ? 'completed' : 'locked'}`}
              >
                <span className="quest-list-index" aria-hidden="true">
                  {postcard.emoji}
                </span>
                <div className="quest-list-info">
                  <span className="quest-list-title">{collected ? postcard.name : '???'}</span>
                  <span className="quest-list-type">{collected ? postcard.description : 'Ainda não visitado'}</span>
                </div>
                <span className="quest-list-status">{collected ? '✓' : '🔒'}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
