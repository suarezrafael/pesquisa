// Painel de pets adotáveis (lab-155) — item de maior alavancagem de engajamento encontrado na
// pesquisa de mercado desta sessão (relatório "Carta de Navegação"), o core loop do Adopt Me!.
// Reaproveita a MESMA grade/botões de `AvatarShop.tsx`/`MyHousePanel.tsx`
// (`.avatar-shop-grid`/`.avatar-shop-item`/`.avatar-shop-emoji`/`.avatar-shop-action`) — mesmo
// espírito de qualquer outro catálogo comprável com moeda, só com um eixo de "equipar" a mais
// (só UM pet segue o jogador pelo mundo por vez, mesmo padrão de chapéu/óculos).
import { lazy, Suspense, useMemo, useState } from 'react'
import { findPetById, PET_CATALOG } from '../data/pets'
import {
  findPetAccessoryById,
  PET_ACCESSORY_CATALOG,
  type PetAccessorySlot,
} from '../data/petAccessories'
import { quests } from '../data/quests'
import { petAgeYears, petLifecycleStage, petStageFor, utcDayNumber, type PetStage } from '../state/progression'
import { useModalA11y } from '../state/useModalA11y'
import type { Progress, Quest } from '../types'

// Carregado sob demanda, não no bundle principal — mesmo raciocínio de `AvatarPreview3D` em
// `AvatarShop.tsx`: `PetPanel.tsx` é importado direto (não via `lazy()`) por `App.tsx`, então sem
// isso abrir /familia, /termos ou /privacidade baixaria `@babylonjs/core` à toa, só por
// `PetPreview3D` existir no grafo de imports estático.
const PetPreview3D = lazy(() => import('./PetPreview3D').then((m) => ({ default: m.PetPreview3D })))

interface PetPanelProps {
  progress: Progress
  onAdopt: (id: string) => void
  onEquip: (id: string) => void
  onUnlockAccessory: (id: string) => void
  onEquipAccessory: (slot: PetAccessorySlot, id: string | null) => void
  onFeed: () => void
  // lab-174 (achado do review automático do Copilot no PR #48): devolve se a recompensa foi
  // REALMENTE concedida (`applyPetDailyChallengeCompleted.rewarded`) — sem isso, a UI só sabia se
  // a resposta escolhida batia com `correctChoiceId`, e podia mostrar "acertou! +5 moedas" mesmo
  // quando o domínio recusa (já recompensado no dia UTC atual, `dayGap < 1`, ou carimbo salvo
  // corrompido/inválido).
  onChallengeCorrect: () => boolean
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

// lab-174 (achado do review automático do Copilot no PR #48): antes comparava calendário LOCAL
// (`getFullYear`/`getMonth`/`getDate`), um critério de "dia" DIFERENTE do usado pelas regras de
// domínio (`feedPet`/`applyPetDailyChallengeCompleted`, por dia UTC via `utcDayNumber`) — em
// fusos à FRENTE de UTC, o dia local vira antes do dia UTC, deixando a UI habilitar o botão horas
// antes do domínio realmente aceitar a ação. Reaproveitar `utcDayNumber` elimina a divergência de
// raiz, em vez de só documentá-la como aceitável.
function doneToday(lastActionAt: string | null, nowIso: string): boolean {
  if (!lastActionAt) return false
  return utcDayNumber(lastActionAt) === utcDayNumber(nowIso)
}

function pickRandomQuest(): Quest {
  return quests[Math.floor(Math.random() * quests.length)]
}

export function PetPanel({
  progress,
  onAdopt,
  onEquip,
  onUnlockAccessory,
  onEquipAccessory,
  onFeed,
  onChallengeCorrect,
  onClose,
}: PetPanelProps) {
  const modalRef = useModalA11y(onClose)
  const [tab, setTab] = useState<'companheiros' | 'acessorios'>('companheiros')
  const [previewPetId, setPreviewPetId] = useState(progress.equippedPetId ?? PET_CATALOG[0].id)
  const [previewAccessoryId, setPreviewAccessoryId] = useState<string | null>(null)
  // lab-169 — um só "agora" pra todo o painel (a idade muda no máximo 1x por dia real, não
  // precisa recalcular por pet nem se preocupar com o milissegundo exato do render).
  const nowIso = new Date().toISOString()
  const alreadyFedToday = doneToday(progress.lastPetFeedAt, nowIso)
  // Mesmo cálculo de estágio já feito por item da grade abaixo, uma vez só pro pet EQUIPADO — o
  // preview mostra o mesmo pet que a criança já vê seguindo ela no mundo, não uma seleção à parte.
  // `findPetById` confere que o id persistido ainda resolve pra um pet real do catálogo antes de
  // decidir montar o preview — um `equippedPetId` inválido/corrompido (nunca deveria acontecer no
  // fluxo normal, mas `Progress` salvo é só validado em formato, não em conteúdo,
  // `state/storage.ts`) cai no mesmo placeholder de "nenhum pet equipado", em vez de montar
  // `PetPreview3D` só pra ele desistir de construir a malha e deixar um canvas vazio.
  const previewPet = findPetById(previewPetId) ?? PET_CATALOG[0]
  const previewStage = petLifecycleStage(
    petStageFor(progress.petCareCounts[previewPet.id] ?? 0),
    petAgeYears(progress, previewPet.id, nowIso),
  )
  const previewAccessoryIds = useMemo(() => {
    const selected = previewAccessoryId ? findPetAccessoryById(previewAccessoryId) : undefined
    const equipped = Object.entries(progress.equippedPetAccessoryIds)
      .map(([slot, id]) => {
        if (!id || !progress.unlockedPetAccessoryIds.includes(id)) return null
        const item = findPetAccessoryById(id)
        return item?.slot === slot ? item : null
      })
      .filter((item) => item !== null)
    return [
      ...equipped.filter((item) => !selected || item.slot !== selected.slot).map((item) => item.id),
      ...(selected ? [selected.id] : []),
    ]
  }, [previewAccessoryId, progress.equippedPetAccessoryIds, progress.unlockedPetAccessoryIds])
  // lab-174 (desafio educativo leve, docs/market-metrics-engagement-backlog.md item 6 da ordem
  // sugerida) — sorteado uma vez por abertura do painel, do mesmo banco de `data/quests.ts` já
  // usado pelo desafio cooperativo (lab-172), sem catálogo novo. Responder errado nunca bloqueia
  // nem reduz a recompensa (documento proíbe qualquer punição na rotina do pet) — só convite pra
  // tentar de novo, sem limite de tentativas.
  const [challengeQuest] = useState<Quest>(pickRandomQuest)
  const [challengeOpen, setChallengeOpen] = useState(false)
  const [challengeChoiceId, setChallengeChoiceId] = useState<string | null>(null)
  const [challengeFeedback, setChallengeFeedback] = useState<'correct' | 'wrong' | 'already-done' | null>(null)
  const alreadyChallengedToday = doneToday(progress.lastPetChallengeAt, nowIso)

  function handleChooseChallenge(choiceId: string) {
    if (challengeFeedback === 'correct' || challengeFeedback === 'already-done') return
    setChallengeChoiceId(choiceId)
    const isCorrect = choiceId === challengeQuest.correctChoiceId
    if (!isCorrect) {
      setChallengeFeedback('wrong')
      return
    }
    // lab-174 (achado do review automático do Copilot no PR #48): só sela a UI como "acertou" se
    // `onChallengeCorrect` confirmar que a recompensa foi REALMENTE concedida — senão a criança
    // veria "Isso aí! +5 moedas" sem receber nada e ficaria travada sem poder tentar de novo.
    const rewarded = onChallengeCorrect()
    setChallengeFeedback(rewarded ? 'correct' : 'already-done')
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Pets" ref={modalRef} tabIndex={-1}>
      <div className="modal quest-list-modal pet-panel-modal">
        <div className="avatar-shop-close-anchor">
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>
        <h2>🐾 Pets</h2>
        <p className="subtitle">
          Adote um companheiro com as moedas que você já ganhou nas missões. Alimente uma vez por
          dia pra ele crescer — filhote, depois jovem, depois adulto. Com o tempo de convivência,
          ele também fica um adulto idoso — mas continua com você pra sempre.
        </p>

        <div className="pet-panel-sticky-header">
          <div className="pet-preview-3d-wrap">
            <Suspense fallback={<div className="pet-preview-3d-canvas pet-preview-3d-loading" />}>
              <PetPreview3D petId={previewPet.id} stage={previewStage} accessoryIds={previewAccessoryIds} />
            </Suspense>
          </div>
          <div className="hub-coins avatar-shop-balance">🪙 {progress.coins}</div>
          <div className="avatar-shop-tabs-wrap">
            <div className="avatar-shop-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'companheiros'}
                className={`avatar-shop-tab ${tab === 'companheiros' ? 'active' : ''}`}
                onClick={() => setTab('companheiros')}
              >
                🐾 Companheiros
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'acessorios'}
                className={`avatar-shop-tab ${tab === 'acessorios' ? 'active' : ''}`}
                onClick={() => setTab('acessorios')}
              >
                🎭 Acessorios
              </button>
            </div>
          </div>
        </div>

        {tab === 'companheiros' && <div className="avatar-shop-grid">
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
                {previewPet.id !== pet.id && (
                  <button type="button" className="avatar-shop-action secondary" onClick={() => setPreviewPetId(pet.id)}>
                    Ver
                  </button>
                )}

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
                    <button
                      type="button"
                      className="avatar-shop-action"
                      disabled={alreadyChallengedToday}
                      onClick={() => setChallengeOpen(true)}
                    >
                      {alreadyChallengedToday ? '🎓 Desafio feito hoje' : '🎓 Desafio rápido do dia'}
                    </button>
                  </>
                ) : owned ? (
                  <button type="button" className="avatar-shop-action" onClick={() => { setPreviewPetId(pet.id); onEquip(pet.id) }}>
                    Escolher
                  </button>
                ) : (
                  <button
                    type="button"
                    className="avatar-shop-action buy"
                    disabled={!affordable}
                    onClick={() => { setPreviewPetId(pet.id); onAdopt(pet.id) }}
                  >
                    🪙 {pet.cost}
                  </button>
                )}
              </div>
            )
          })}
        </div>}

        {tab === 'acessorios' && (
          <>
            <p className="subtitle pet-accessory-note">
              Experimente no seu companheiro. Acessorios sao so visuais e nao mudam poderes ou recompensas.
            </p>
            <div className="avatar-shop-grid">
              {PET_ACCESSORY_CATALOG.map((item) => {
                const owned = progress.unlockedPetAccessoryIds.includes(item.id)
                const equipped = progress.equippedPetAccessoryIds[item.slot] === item.id
                const previewing = previewAccessoryId === item.id
                const affordable = progress.coins >= item.cost
                const [r, g, b] = item.colorRgb.map((channel) => Math.round(channel * 255))
                return (
                  <div key={item.id} className={`avatar-shop-item ${equipped ? 'equipped' : ''} ${previewing ? 'previewing' : ''}`}>
                    <span
                      className="avatar-shop-swatch pet-accessory-swatch"
                      style={{ background: `rgb(${r}, ${g}, ${b})` }}
                      aria-hidden="true"
                    />
                    <span className="avatar-shop-name">{item.emoji} {item.name}</span>
                    <span className="avatar-shop-tag">{item.slot === 'neck' ? 'Pescoco' : 'Rosto'}</span>
                    {!previewing && (
                      <button type="button" className="avatar-shop-action secondary" onClick={() => setPreviewAccessoryId(item.id)}>
                        Experimentar
                      </button>
                    )}
                    {previewing && <span className="avatar-shop-tag">No preview</span>}
                    {equipped ? (
                      <button type="button" className="avatar-shop-action" onClick={() => onEquipAccessory(item.slot, null)}>
                        Tirar
                      </button>
                    ) : owned ? (
                      <button type="button" className="avatar-shop-action" onClick={() => onEquipAccessory(item.slot, item.id)}>
                        Usar
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="avatar-shop-action buy"
                        disabled={!affordable}
                        onClick={() => onUnlockAccessory(item.id)}
                      >
                        🪙 {item.cost}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* `challengeFeedback !== null` mantém o cartão visível depois de responder, mesmo que
            `alreadyChallengedToday` vire `true` no re-render seguinte (progress atualizado com a
            recompensa) — sem isso, a mensagem "Isso aí! +5 moedas" nunca chegava a aparecer, o
            cartão sumia no mesmo instante em que a recompensa era concedida. */}
        {challengeOpen && (!alreadyChallengedToday || challengeFeedback !== null) && (
          <div className="pet-challenge-card">
            {challengeQuest.passage && <p className="quest-passage">{challengeQuest.passage}</p>}
            <p className="quest-prompt">{challengeQuest.prompt}</p>
            <div className="quest-choices">
              {challengeQuest.choices.map((choice) => {
                const isSelected = challengeChoiceId === choice.id
                const showCorrect = challengeFeedback === 'correct' && isSelected
                const showWrong = challengeFeedback === 'wrong' && isSelected
                return (
                  <button
                    type="button"
                    key={choice.id}
                    className={`quest-choice ${showCorrect ? 'correct' : ''} ${showWrong ? 'wrong' : ''}`}
                    onClick={() => handleChooseChallenge(choice.id)}
                    disabled={challengeFeedback === 'correct' || challengeFeedback === 'already-done'}
                  >
                    {choice.label}
                  </button>
                )
              })}
            </div>
            {challengeFeedback === 'wrong' && (
              <p className="quest-feedback wrong">Quase! Tente outra opção. 💪</p>
            )}
            {challengeFeedback === 'already-done' && (
              <p className="quest-feedback correct">Você já fez o desafio de hoje! Volte amanhã. 🎉</p>
            )}
            {challengeFeedback === 'correct' && (
              <p className="quest-feedback correct">Isso aí! 🪙 +5 moedas pro cuidado de hoje.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
