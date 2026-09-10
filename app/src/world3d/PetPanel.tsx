// Painel de pets adotáveis (lab-155) — item de maior alavancagem de engajamento encontrado na
// pesquisa de mercado desta sessão (relatório "Carta de Navegação"), o core loop do Adopt Me!.
// Reaproveita a MESMA grade/botões de `AvatarShop.tsx`/`MyHousePanel.tsx`
// (`.avatar-shop-grid`/`.avatar-shop-item`/`.avatar-shop-emoji`/`.avatar-shop-action`) — mesmo
// espírito de qualquer outro catálogo comprável com moeda, só com um eixo de "equipar" a mais
// (só UM pet segue o jogador pelo mundo por vez, mesmo padrão de chapéu/óculos).
import { PET_CATALOG } from '../data/pets'
import { petAgeYears, petLifecycleStage, petStageFor, type PetStage } from '../state/progression'
import { useModalA11y } from '../state/useModalA11y'
import type { Progress } from '../types'

interface PetPanelProps {
  progress: Progress
  onAdopt: (id: string) => void
  onEquip: (id: string) => void
  onFeed: () => void
  onClose: () => void
}

// lab-171 (achado do review automático do Copilot): `Record<string, string>` era permissivo
// demais — um typo ou um `PetStage` novo sem entrada aqui viraria `undefined` em runtime sem o
// TypeScript avisar. `Record<PetStage, string>` obriga cobrir todo estágio existente.
// Exportado pra `AchievementsPanel.tsx` reaproveitar o mesmo rótulo na nova seção de pets do
// álbum, em vez de duplicar o mapa.
export const STAGE_LABEL: Record<PetStage, string> = {
  filhote: '🍼 Filhote',
  jovem: '🌱 Jovem',
  adulto: '⭐ Adulto',
  // lab-169 — ciclo de vida (1 dia real = 1 "ano" de convivência). Nunca substitui/remove o pet:
  // é só um selo de carinho por tempo de companhia, ver `petLifecycleStage` (`progression.ts`).
  idoso: '🧓 Idoso',
}

// Comparação de calendário LOCAL, só pra decidir se mostra o botão "Alimentar" já desabilitado —
// a checagem de verdade (que decide se conta) é `feedPet` (`state/progression.ts`), por dia UTC.
// Uma pequena divergência na virada exata do dia é só cosmética aqui (o botão continuaria
// clicável até 1 chamada a mais, sem efeito nenhum já que `feedPet` recusa silenciosamente).
function fedToday(lastPetFeedAt: string | null): boolean {
  if (!lastPetFeedAt) return false
  const last = new Date(lastPetFeedAt)
  const now = new Date()
  return (
    last.getFullYear() === now.getFullYear() &&
    last.getMonth() === now.getMonth() &&
    last.getDate() === now.getDate()
  )
}

export function PetPanel({ progress, onAdopt, onEquip, onFeed, onClose }: PetPanelProps) {
  const modalRef = useModalA11y(onClose)
  const alreadyFedToday = fedToday(progress.lastPetFeedAt)
  // lab-169 — um só "agora" pra todo o painel (a idade muda no máximo 1x por dia real, não
  // precisa recalcular por pet nem se preocupar com o milissegundo exato do render).
  const nowIso = new Date().toISOString()

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Pets" ref={modalRef} tabIndex={-1}>
      <div className="modal quest-list-modal">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
          ×
        </button>
        <h2>🐾 Pets</h2>
        <p className="subtitle">
          Adote um companheiro com as moedas que você já ganhou nas missões. Alimente uma vez por
          dia pra ele crescer — filhote, depois jovem, depois adulto. Com o tempo de convivência,
          ele também fica um adulto idoso — mas continua com você pra sempre.
        </p>

        <div className="avatar-shop-grid">
          {PET_CATALOG.map((pet) => {
            const owned = progress.unlockedPetIds.includes(pet.id)
            const equipped = progress.equippedPetId === pet.id
            const affordable = progress.coins >= pet.cost
            const careStage = petStageFor(progress.petCareCounts[pet.id] ?? 0)
            const ageYears = petAgeYears(progress, pet.id, nowIso)
            const stage = petLifecycleStage(careStage, ageYears)

            return (
              <div key={pet.id} className={`avatar-shop-item ${equipped ? 'equipped' : ''}`}>
                <span className="avatar-shop-emoji">{pet.emoji}</span>
                <span className="avatar-shop-name">{pet.name}</span>

                {owned && <span className="avatar-shop-tag">{STAGE_LABEL[stage]}</span>}
                {owned && (
                  <span className="avatar-shop-tag">
                    {ageYears === 0 ? 'Recém-adotado' : ageYears === 1 ? '1 ano de convivência' : `${ageYears} anos de convivência`}
                  </span>
                )}

                {equipped ? (
                  <>
                    <span className="avatar-shop-tag">✓ Ativo</span>
                    <button type="button" className="avatar-shop-action" disabled={alreadyFedToday} onClick={onFeed}>
                      {alreadyFedToday ? '🍖 Já alimentado hoje' : '🍖 Alimentar'}
                    </button>
                  </>
                ) : owned ? (
                  <button type="button" className="avatar-shop-action" onClick={() => onEquip(pet.id)}>
                    Escolher
                  </button>
                ) : (
                  <button
                    type="button"
                    className="avatar-shop-action buy"
                    disabled={!affordable}
                    onClick={() => onAdopt(pet.id)}
                  >
                    🪙 {pet.cost}
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
