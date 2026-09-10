// Painel de conquistas (lab-93, pedido do usuário: "carteira de estudo em que o boneco pode
// sentar, acessar seu catálogo de conquistas") — mesma estrutura de `QuestListOverlay.tsx`,
// reaproveita as classes CSS `.quest-list`/`.quest-list-item` já existentes (o formato ícone +
// nome + descrição + status encaixa exatamente, sem precisar de CSS novo).
import { ACHIEVEMENT_CATALOG } from '../data/achievements'
import { POSTCARD_CATALOG } from '../data/postcards'
import { PET_CATALOG } from '../data/pets'
import { petAgeYears, petLifecycleStage, petStageFor } from '../state/progression'
import { useModalA11y } from '../state/useModalA11y'
import { STAGE_LABEL } from './PetPanel'
import type { Progress } from '../types'

interface AchievementsPanelProps {
  progress: Progress
  onClose: () => void
}

// lab-171 (docs/market-metrics-engagement-backlog.md §10, item 5, "álbum central de conquistas e
// coleções": "destacar próximos itens ganháveis grátis") — primeiro item AINDA bloqueado, em
// ordem de prioridade emblema → cartão-postal → pet (emblema é conquista pura, sem custo nem
// viagem; cartão-postal exige viajar; pet exige moeda — do "mais alcançável" pro "menos"). Função
// pura pequena e específica de apresentação, mesmo padrão de `fedToday` em `PetPanel.tsx` — não
// mora em `progression.ts` porque `data/achievements.ts` já importa DE lá (`BADGE_FIRST_QUEST`
// etc.); importar `ACHIEVEMENT_CATALOG` de volta em `progression.ts` criaria import circular.
function nextObjective(progress: Progress): { emoji: string; name: string; description: string } | null {
  const achievement = ACHIEVEMENT_CATALOG.find((a) => !progress.badges.includes(a.id))
  if (achievement) return achievement
  const postcard = POSTCARD_CATALOG.find((p) => !progress.collectedPostcardIds.includes(p.planetId))
  if (postcard) {
    const planetName = postcard.name.replace('Saudações de ', '')
    return { emoji: postcard.emoji, name: `Cartão de ${planetName}`, description: 'Pouse de verdade lá pra colecionar.' }
  }
  const pet = PET_CATALOG.find((p) => !progress.unlockedPetIds.includes(p.id))
  if (pet) return { emoji: pet.emoji, name: pet.name, description: `Adote por 🪙 ${pet.cost} moedas.` }
  return null
}

export function AchievementsPanel({ progress, onClose }: AchievementsPanelProps) {
  const modalRef = useModalA11y(onClose)
  const objective = nextObjective(progress)
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
        {objective && (
          <div className="next-objective-callout">
            <span className="next-objective-emoji" aria-hidden="true">
              {objective.emoji}
            </span>
            <div>
              <strong>🎯 Próximo objetivo: {objective.name}</strong>
              <p>{objective.description}</p>
            </div>
          </div>
        )}

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

        {/* lab-171 (docs/market-metrics-engagement-backlog.md §10, item 5, "álbum central de
            conquistas e coleções": "medalhas, pets, cosméticos... planetas visitados") — mesma
            estrutura de lista das outras duas seções acima; pet ainda não adotado usa "???",
            mesmo tratamento de cartão-postal não coletado. */}
        <h2>Pets</h2>
        <p className="subtitle">Adote com moedas ganhas nas missões pra ver cada um crescer.</p>
        <div className="quest-list">
          {PET_CATALOG.map((pet) => {
            const owned = progress.unlockedPetIds.includes(pet.id)
            const careStage = petStageFor(progress.petCareCounts[pet.id] ?? 0)
            const ageYears = petAgeYears(progress, pet.id, new Date().toISOString())
            const stage = petLifecycleStage(careStage, ageYears)
            return (
              <div key={pet.id} className={`quest-list-item ${owned ? 'completed' : 'locked'}`}>
                <span className="quest-list-index" aria-hidden="true">
                  {owned ? pet.emoji : '❓'}
                </span>
                <div className="quest-list-info">
                  <span className="quest-list-title">{owned ? pet.name : '???'}</span>
                  <span className="quest-list-type">{owned ? STAGE_LABEL[stage] : `Custa 🪙 ${pet.cost}`}</span>
                </div>
                <span className="quest-list-status">{owned ? '✓' : '🔒'}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
