interface MarsHealthBarProps {
  health: number
  maxHealth: number
}

// Barra de vida em Marte (lab-60, pedido do usuário: "nós temos que ter uma barra de vida") — só
// renderizada enquanto o jogador está em Marte (ver `onMarsCombatZone` em World3D.tsx), não faz
// sentido no planeta principal, que não tem inimigo nenhum.
export function MarsHealthBar({ health, maxHealth }: MarsHealthBarProps) {
  const pct = Math.max(0, Math.min(100, (health / maxHealth) * 100))
  const low = pct <= 30
  return (
    <div className={`mars-health-bar${low ? ' mars-health-bar-low' : ''}`}>
      <span className="mars-health-icon">❤️</span>
      <div className="mars-health-track">
        <div className="mars-health-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
