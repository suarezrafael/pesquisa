// Aviso de brinde exclusivo (lab-94, pedido do usuário: "ao vencer os ETs e o robô você
// desbloqueia um brinde") — reaproveita as mesmas classes CSS de `RewardToast.tsx`
// (`.reward-modal`/`.reward-icon`/`.reward-line`), sem CSS novo. Componente à parte (não
// generaliza `RewardToast`) porque a copiagem é bem diferente ("Marte limpo!" vs. "Missão
// concluída!") e este não tem XP/moedas/lista de badges pra mostrar, só o item ganho.
interface MarsRewardToastProps {
  onContinue: () => void
}

export function MarsRewardToast({ onContinue }: MarsRewardToastProps) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Brinde de Marte">
      <div className="modal reward-modal">
        <div className="reward-icon">🪐</div>
        <h2>Marte limpo!</h2>
        <p className="reward-line">
          Você derrotou todos os inimigos de Marte e ganhou um brinde exclusivo: Coroa de Herói de
          Marte 🪐 — já está na lojinha, na aba Chapéus.
        </p>
        <button type="button" className="primary-button" onClick={onContinue}>
          Continuar explorando
        </button>
      </div>
    </div>
  )
}
