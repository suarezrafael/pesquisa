import { useEffect, useRef, useState } from 'react'
import type { Profile, Progress } from '../types'
import { getLevel, seriesForLevel, xpIntoLevel, type PlayerSeries } from '../state/progression'
import type { WeeklyEvent } from '../data/weeklyEvents'

// lab-156 — emblema/rótulo por série, só apresentação (a regra de qual nível vira qual série
// mora em `seriesForLevel`, `state/progression.ts`).
const SERIES_BADGE: Record<PlayerSeries, { emoji: string; label: string }> = {
  bronze: { emoji: '🥉', label: 'Bronze' },
  prata: { emoji: '🥈', label: 'Prata' },
  ouro: { emoji: '🥇', label: 'Ouro' },
  diamante: { emoji: '💎', label: 'Diamante' },
}

// Backlog "Lab 198" — "pulso de recompensa": devolve uma CHAVE que muda a cada aumento genuíno de
// `value` (nunca ao cair — trocar de perfil pra um com menos moedas/XP não deve "pulsar"). `prevRef`
// nasce com o próprio `value` inicial, então a 1ª renderização nunca pulsa sozinha.
//
// Achado do review automático do Copilot: a 1ª versão usava um booleano (`pulsing`) ligado/
// desligado por `setTimeout` — 2 recompensas em sequência rápida (a 2ª chegando ANTES do timeout
// da 1ª zerar `pulsing`) faziam `setPulsing(true)` de novo sobre um valor JÁ `true`, que o React
// não re-renderiza (mesmo valor) — a classe CSS nunca saía e voltava do DOM, então a animação
// (já em andamento) não reiniciava, e a 2ª recompensa não pulsava visualmente. Trocar a `key` do
// elemento força o React a REMONTAR o nó (não só re-renderizar) — único jeito confiável de
// reiniciar uma animação CSS já em andamento a partir do zero, em qualquer intervalo entre
// recompensas. Uma vez tocada, a animação (`animation-iteration-count` padrão, 1x) fica parada no
// quadro final — idêntico ao estado de repouso — então a classe pode ficar aplicada pra sempre
// depois do 1º pulso, sem precisar de nenhum "desligar" por timeout.
function usePulseKey(value: number): number {
  const [pulseKey, setPulseKey] = useState(0)
  const prevRef = useRef(value)
  useEffect(() => {
    if (value > prevRef.current) setPulseKey((k) => k + 1)
    prevRef.current = value
  }, [value])
  return pulseKey
}

interface HudHeaderProps {
  profile: Profile
  progress: Progress
  onOpenHelp: () => void
  onOpenQuestList: () => void
  onOpenShop: () => void
  onOpenPets: () => void
  onOpenFriends: () => void
  onOpenNicknamePanel: () => void
  muted: boolean
  onToggleMute: () => void
  onOpenChat: () => void
  onOpenRanking: () => void
  showBag: boolean
  onOpenBag: () => void
  onOpenPairing: () => void
  onSwitchProfile: () => void
  onOpenWeeklyEvent: () => void
  // Calculado uma vez em `App.tsx` e repassado por props — se este componente chamasse
  // `getCurrentWeeklyEvent()` por conta própria, bem na virada exata de semana ISO o badge podia
  // mostrar um evento diferente do `WeeklyEventPanel` aberto a partir dele (que recebe o MESMO
  // valor via prop também).
  weeklyEvent: WeeklyEvent
  // lab-121: true enquanto qualquer painel/modal (de App.tsx ou interno do World3D) está aberto
  // por cima do HUD — tira os 9 botões da ordem de tabulação, senão um usuário de teclado consegue
  // dar Tab por dentro de um modal visualmente aberto e cair nos botões escondidos atrás dele.
  inert?: boolean
}

export function HudHeader({
  profile,
  progress,
  onOpenHelp,
  onOpenQuestList,
  onOpenShop,
  onOpenPets,
  onOpenFriends,
  onOpenNicknamePanel,
  muted,
  onToggleMute,
  onOpenChat,
  onOpenRanking,
  showBag,
  onOpenBag,
  onOpenPairing,
  onSwitchProfile,
  onOpenWeeklyEvent,
  weeklyEvent,
  inert,
}: HudHeaderProps) {
  const level = getLevel(progress.xp)
  const { current, needed } = xpIntoLevel(progress.xp)
  const percent = Math.min(100, Math.round((current / needed) * 100))
  const series = SERIES_BADGE[seriesForLevel(level)]
  const xpPulseKey = usePulseKey(progress.xp)
  const coinsPulseKey = usePulseKey(progress.coins)

  return (
    <div className="hud-overlay" inert={inert}>
      <div className="hud-top-row">
        <header className="hub-header">
          <div className="hub-avatar">{profile.avatarEmoji}</div>
          <div className="hub-header-info">
            <h1>{profile.name}</h1>
            {/* `key`/`.reward-pulse` no WRAPPER, não no `.xp-bar` em si — remontar `.xp-bar-fill`
                direto perderia a transição suave de largura já existente (`transition: width`)
                bem no momento que ela mais importa (o próprio ganho de XP). O wrapper remonta
                (reiniciando o pulso), o preenchimento por dentro continua intacto. */}
            <div key={xpPulseKey} className={xpPulseKey > 0 ? 'reward-pulse' : undefined}>
              <div className="xp-bar" aria-label={`Nível ${level}, ${current} de ${needed} XP`}>
                <div className="xp-bar-fill" style={{ width: `${percent}%` }} />
              </div>
            </div>
            <span className="hub-level">
              Nível {level} ·{' '}
              <span title={`Série ${series.label}`}>
                <span aria-hidden="true">{series.emoji}</span> {series.label}
              </span>
            </span>
          </div>
          <div key={coinsPulseKey} className={`hub-coins${coinsPulseKey > 0 ? ' reward-pulse' : ''}`}>
            🪙 {progress.coins}
          </div>
        </header>

        <button type="button" className="help-button" onClick={onOpenQuestList} aria-label="Ver missões">
          🗺️
        </button>
        <button type="button" className="help-button" onClick={onOpenShop} aria-label="Loja de avatares">
          🎭
        </button>
        <button type="button" className="help-button" onClick={onOpenPets} aria-label="Ver pets">
          🐾
        </button>
        <button type="button" className="help-button" onClick={onOpenFriends} aria-label="Ver amigos">
          👥
        </button>
        <button
          type="button"
          className="help-button"
          onClick={onToggleMute}
          aria-label={muted ? 'Ativar som' : 'Silenciar som'}
        >
          {muted ? '🔇' : '🔊'}
        </button>
        <button type="button" className="help-button" onClick={onOpenChat} aria-label="Abrir chat">
          💬
        </button>
        <button type="button" className="help-button" onClick={onOpenRanking} aria-label="Ver ranking">
          🏆
        </button>
        {showBag && (
          <button type="button" className="help-button" onClick={onOpenBag} aria-label="Ver mochila">
            🎒
          </button>
        )}
        <button type="button" className="help-button" onClick={onOpenHelp} aria-label="Como jogar">
          ?
        </button>
        <button
          type="button"
          className="help-button"
          onClick={onOpenPairing}
          aria-label="Vincular assinatura da família"
        >
          🔗
        </button>
        <button type="button" className="help-button" onClick={onOpenNicknamePanel} aria-label="Trocar apelido">
          ✏️
        </button>
        <button type="button" className="help-button" onClick={onSwitchProfile} aria-label="Trocar perfil">
          🔁
        </button>
      </div>

      <div className="badge-row">
        <button
          type="button"
          className="weekly-event-badge"
          title={weeklyEvent.description}
          onClick={onOpenWeeklyEvent}
        >
          {weeklyEvent.emoji} {weeklyEvent.name}
        </button>
        {progress.badges.map((badge) => (
          <span key={badge} className="badge-pill">
            🎖️ {badge}
          </span>
        ))}
      </div>
    </div>
  )
}
