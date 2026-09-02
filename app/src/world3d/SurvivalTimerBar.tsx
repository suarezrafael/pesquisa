interface SurvivalTimerBarProps {
  timeLeft: number
  maxTime: number
  planetId: string
}

// Cronômetro de sobrevivência (lab-129, pedido do usuário: planetas de ambiente extremo como
// Mercúrio/Netuno) — mesmo padrão visual de `MarsHealthBar.tsx` (ícone + barra que esvazia), só
// que o ícone muda por planeta: calor escaldante em Mercúrio, frio extremo nos demais (hoje só
// Netuno, mas qualquer planeta futuro com `hasSurvivalTimer` cai no mesmo "frio" por padrão).
export function SurvivalTimerBar({ timeLeft, maxTime, planetId }: SurvivalTimerBarProps) {
  const pct = Math.max(0, Math.min(100, (timeLeft / maxTime) * 100))
  const low = pct <= 30
  const icon = planetId === 'mercurio' ? '🥵' : '🥶'
  return (
    <div className={`mars-health-bar${low ? ' mars-health-bar-low' : ''}`}>
      <span className="mars-health-icon">{icon}</span>
      <div className="mars-health-track">
        <div className="mars-health-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
