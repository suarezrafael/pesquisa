// Painel de conquistas (lab-93, pedido do usuário: "carteira de estudo em que o boneco pode
// sentar, acessar seu catálogo de conquistas") — mesma estrutura de `QuestListOverlay.tsx`,
// reaproveita as classes CSS `.quest-list`/`.quest-list-item` já existentes (o formato ícone +
// nome + descrição + status encaixa exatamente, sem precisar de CSS novo).
import { useState } from 'react'
import { ACHIEVEMENT_CATALOG } from '../data/achievements'
import { POSTCARD_CATALOG } from '../data/postcards'
import { PET_CATALOG } from '../data/pets'
import {
  nextPlanetDiscovery,
  petAgeYears,
  petLifecycleStage,
  petStageFor,
  planetDiscoverySlots,
  type PlanetDiscoveryKind,
} from '../state/progression'
import { useModalA11y } from '../state/useModalA11y'
import { trackAlbumPlanetOpened } from '../productAnalytics'
import { STAGE_LABEL } from './PetPanel'
import type { Progress } from '../types'

// Legenda curta pro tipo de slot dentro da lista expandida de cada planeta; os nomes já vêm de
// `planetDiscoverySlots` (mais específicos, "Baú de tesouro"/"Escolinha de astronomia"/etc.), isto
// é só o rótulo genérico de categoria.
const DISCOVERY_KIND_LABEL: Record<PlanetDiscoveryKind, string> = {
  collectible: 'Colecionável',
  actionable_object: 'Objeto especial',
  educational_quiz: 'Escolinha',
  visual_secret: 'Segredo escondido',
}

interface AchievementsPanelProps {
  progress: Progress
  onClose: () => void
}

// lab-171 (docs/market-metrics-engagement-backlog.md §10, item 5, "álbum central de conquistas e
// coleções": "destacar próximos itens ganháveis grátis") — primeiro item AINDA bloqueado, em
// ordem de prioridade emblema → cartão-postal → pet (emblema é conquista pura, sem custo nem
// viagem; cartão-postal exige viajar; pet exige moeda — do "mais alcançável" pro "menos"). Função
// pura pequena e específica de apresentação, mesmo padrão de `doneToday` em `PetPanel.tsx` — não
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
  const planetDiscovery = nextPlanetDiscovery(progress)
  // Qual planeta está expandido na lista abaixo (mostrando os 3 slots individuais em vez de só a
  // fração "2/3"). `null` = nenhum expandido, mostra só as linhas colapsadas.
  const [expandedPlanetId, setExpandedPlanetId] = useState<string | null>(null)
  function togglePlanet(planetId: string) {
    const opening = expandedPlanetId !== planetId
    setExpandedPlanetId(opening ? planetId : null)
    // Dispara só ao ABRIR (não ao fechar) — sinal de interesse real num planeta específico, não
    // de "abriu o painel inteiro" (isso já não tem evento próprio, mesmo padrão do resto do HUD).
    if (opening) trackAlbumPlanetOpened(planetId)
  }
  // lab-171 (achado do review automático do Copilot): calculado uma vez aqui em vez de dentro do
  // laço de pets abaixo — evita trabalho repetido a cada item E timestamps ligeiramente
  // diferentes dentro do mesmo painel se a virada de dia acontecesse no meio do render.
  const nowIso = new Date().toISOString()
  // lab-149 (achado do review automático do Copilot no PR #12): o modal ganhou a seção de
  // cartões-postais (lab-141) mas o `aria-label` abaixo continuava descrevendo só conquistas —
  // nome acessível impreciso pra quem usa leitor de tela.
  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Catálogo de conquistas, cartões-postais, pets e planetas"
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
            const ageYears = petAgeYears(progress, pet.id, nowIso)
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

        {/* Visão POR PLANETA do que já foi descoberto/falta, diferente das 3 seções acima (listas
            planas por categoria). Cada linha é um planeta colapsado ("2/3"); tocar expande os 3
            slots individuais — evita uma lista grande demais de cara (7 planetas × 3 slots = 21
            linhas se tudo viesse expandido de uma vez). Reaproveita as MESMAS classes
            `.quest-list*` das 3 seções acima. */}
        <h2>Planetas</h2>
        <p className="subtitle">Toque num planeta pra ver o que já descobriu e o que falta.</p>
        {planetDiscovery && (
          <div className="next-objective-callout">
            <span className="next-objective-emoji" aria-hidden="true">
              🎯
            </span>
            <div>
              <strong>Próxima descoberta: {planetDiscovery.slot.name}</strong>
              <p>
                {DISCOVERY_KIND_LABEL[planetDiscovery.slot.kind]} em{' '}
                {POSTCARD_CATALOG.find((p) => p.planetId === planetDiscovery.planetId)?.name.replace('Saudações de ', '')}{' '}
                — sempre grátis, nunca precisa de assinatura.
              </p>
            </div>
          </div>
        )}
        <div className="quest-list">
          {POSTCARD_CATALOG.map((planet) => {
            const slots = planetDiscoverySlots(planet.planetId, progress)
            const discoveredCount = slots.filter((s) => s.discovered).length
            const complete = discoveredCount === slots.length
            const expanded = expandedPlanetId === planet.planetId
            return (
              <div key={planet.planetId}>
                <button
                  type="button"
                  className={`quest-list-item planet-toggle ${complete ? 'completed' : ''}`}
                  onClick={() => togglePlanet(planet.planetId)}
                  aria-expanded={expanded}
                >
                  <span className="quest-list-index" aria-hidden="true">
                    {planet.emoji}
                  </span>
                  <span className="quest-list-info">
                    <span className="quest-list-title">{planet.name.replace('Saudações de ', '')}</span>
                    <span className="quest-list-type">
                      {discoveredCount}/{slots.length} descobertas
                    </span>
                  </span>
                  <span className="quest-list-status" aria-hidden="true">
                    {expanded ? '▲' : '▼'}
                  </span>
                </button>
                {expanded && (
                  <div className="quest-list quest-list-nested">
                    {slots.map((slot) => (
                      <div
                        key={slot.kind}
                        className={`quest-list-item ${slot.discovered ? 'completed' : 'locked'}`}
                      >
                        <span className="quest-list-index" aria-hidden="true">
                          {slot.discovered ? slot.emoji : '❓'}
                        </span>
                        <div className="quest-list-info">
                          <span className="quest-list-title">{slot.discovered ? slot.name : '???'}</span>
                          <span className="quest-list-type">{DISCOVERY_KIND_LABEL[slot.kind]}</span>
                        </div>
                        <span className="quest-list-status">{slot.discovered ? '✓' : '🔒'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
