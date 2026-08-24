import { useState } from 'react'

interface PairingScreenProps {
  active: boolean
  redeeming: boolean
  redeemError: string | null
  onRedeem: (code: string) => Promise<boolean>
  onClose: () => void
}

// Tela de pareamento (Fase D do plano comercial, ver docs/plano-comercial-backend.md) — a
// criança digita aqui, UMA VEZ, o código gerado pelo responsável no portal `/familia`. Nunca
// pede e-mail/senha/nome: só o código de 6 dígitos, o mínimo pra vincular o entitlement da
// família sem a criança ter conta.
export function PairingScreen({ active, redeeming, redeemError, onRedeem, onClose }: PairingScreenProps) {
  const [code, setCode] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const ok = await onRedeem(code)
    if (ok) setDone(true)
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Vincular assinatura da família">
      <div className="modal">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
          ×
        </button>

        {active ? (
          <>
            <h2>Assinatura da família já vinculada! 🎉</h2>
            <p>Aproveite os itens exclusivos assim que eles chegarem na lojinha.</p>
          </>
        ) : done ? (
          <>
            <h2>Código aceito! ✅</h2>
            <p>Sua família fica vinculada por aqui a partir de agora.</p>
          </>
        ) : (
          <>
            <h2>Digite o código da família</h2>
            <p>
              Peça pra quem cuida de você abrir a área dos responsáveis e gerar um código. Digite
              esse código aqui, uma única vez.
            </p>
            <form onSubmit={handleSubmit}>
              <label className="field">
                <span>Código de 6 dígitos</span>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                />
                {redeemError && <small className="field-hint">{redeemError}</small>}
              </label>
              <button type="submit" className="primary-button" disabled={redeeming || code.length !== 6}>
                {redeeming ? 'Um momento…' : 'Confirmar'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
