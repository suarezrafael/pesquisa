import type { WeeklyEvent } from '../data/weeklyEvents'
import type { FurnitureOption } from '../data/furniture'
import { useModalA11y } from '../state/useModalA11y'

interface RewardToastProps {
  awardedXp: number
  awardedCoins: number
  newBadges: string[]
  // lab-150 (achado do review automático do Copilot no PR #2, nunca lido antes desta sessão): o
  // evento usado pra calcular `awardedXp`/`awardedCoins` (`CompletionResult.event`,
  // `progression.ts`) — recebido como prop em vez de chamar `getCurrentWeeklyEvent()` aqui dentro.
  // Sem isso, se a semana virasse (ou o relógio do aparelho mudasse) entre o cálculo da recompensa
  // e a renderização deste toast, a linha "Bônus de X aplicado!" podia divergir do evento
  // realmente usado pra calcular os números acima.
  event: WeeklyEvent
  // lab-126: bônus de moeda de assinante — linha independente da do evento semanal (as duas podem
  // aparecer juntas, cada uma clara sobre sua própria origem).
  entitlementActive: boolean
  // lab-130: só vem preenchido quando esta resposta completou as 6 escolinhas de um planeta e
  // concedeu o item de mobília exclusivo daquele planeta — anunciado na mesma tela da recompensa
  // da pergunta, sem precisar de um segundo modal.
  unlockedFurnitureItem?: FurnitureOption
  // Combo de respostas certas seguidas (lab-132) — `streakBonusCoins` só é maior que 0 quando esta
  // resposta atingiu um marco novo (`streakBonusFor`, progression.ts); diferente do bônus de
  // evento/assinante (já multiplicado dentro de `awardedCoins` acima), esta moeda é ADICIONAL e
  // não aparece na linha principal — por isso o valor exato precisa estar aqui, não só um aviso.
  currentStreak: number
  streakBonusCoins: number
  // Bônus por limpar um planeta inteiro (lab-133) — só vem preenchido quando esta resposta
  // completou as 6 escolinhas de um planeta (mesma condição de `unlockedFurnitureItem` acima),
  // além da recompensa da própria pergunta — moeda/XP ADICIONAL, não incluída em
  // `awardedXp`/`awardedCoins`.
  planetClearBonusXp?: number
  planetClearBonusCoins?: number
  onContinue: () => void
}

// XP/moedas mostrados aqui são o valor já creditado em `progress` (`awardedXp`/`awardedCoins`,
// calculado em `applyQuestCompletion`), não o valor base da missão — numa semana com evento
// bônus (lab-22) ou com assinatura ativa (lab-126) os dois precisam bater, senão o jogador vê um
// número diferente do que realmente recebeu.
export function RewardToast({
  awardedXp,
  awardedCoins,
  newBadges,
  entitlementActive,
  unlockedFurnitureItem,
  currentStreak,
  streakBonusCoins,
  planetClearBonusXp,
  planetClearBonusCoins,
  event,
  onContinue,
}: RewardToastProps) {
  const hasBonus = event.xpMultiplier > 1 || event.coinMultiplier > 1
  const modalRef = useModalA11y(onContinue)
  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Recompensa"
      ref={modalRef}
      tabIndex={-1}
    >
      <div className="modal reward-modal">
        <div className="reward-icon">🏆</div>
        <h2>Missão concluída!</h2>
        <p className="reward-line">
          +{awardedXp} XP · +{awardedCoins} moedas
        </p>
        {hasBonus && (
          <p className="reward-bonus-line">
            {event.emoji} Bônus de {event.name} aplicado!
          </p>
        )}
        {entitlementActive && (
          <p className="reward-bonus-line">👑 Bônus de moeda de assinante aplicado!</p>
        )}
        {unlockedFurnitureItem && (
          <p className="reward-bonus-line">
            🎉 Planeta conquistado! Novo item pra Minha Casa: {unlockedFurnitureItem.emoji}{' '}
            {unlockedFurnitureItem.name}!
          </p>
        )}
        {!!planetClearBonusCoins && (
          <p className="reward-bonus-line">
            🌟 Bônus por limpar o planeta! +{planetClearBonusXp} XP · +{planetClearBonusCoins} moedas!
          </p>
        )}
        {streakBonusCoins > 0 && (
          <p className="reward-bonus-line">
            🔥 Combo de {currentStreak} acertos seguidos! +{streakBonusCoins} moedas bônus!
          </p>
        )}
        {newBadges.length > 0 && (
          <div className="reward-badges">
            {newBadges.map((badge) => (
              <span key={badge} className="badge-pill">
                🎖️ {badge}
              </span>
            ))}
          </div>
        )}
        <button type="button" className="primary-button" onClick={onContinue}>
          Continuar explorando
        </button>
      </div>
    </div>
  )
}
