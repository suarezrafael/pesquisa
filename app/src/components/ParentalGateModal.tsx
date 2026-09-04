import { useState } from 'react'
import { generateGateChallenge, isGateAnswerCorrect } from '../data/parentalGate'
import { useModalA11y } from '../state/useModalA11y'

interface ParentalGateModalProps {
  onAuthorize: () => void
  onCancel: () => void
}

// G13 (docs/prompts/05-escala-e-viabilidade.md) — consentimento parental antes da primeira
// conexão ao multiplayer. Mostrado no PRÓPRIO jogo (não só via `/familia`) porque a maioria das
// famílias nunca cria conta nenhuma (jogo é local-only pra quem não assina) — exigir o portal dos
// responsáveis bloquearia multiplayer pra quem não paga, o que fere a regra de nunca gatear
// cooperação atrás de assinatura (`docs/prompts/03-arquitetura-sistema.md`).
export function ParentalGateModal({ onAuthorize, onCancel }: ParentalGateModalProps) {
  const [challenge] = useState(() => generateGateChallenge())
  const [answer, setAnswer] = useState('')
  const [showError, setShowError] = useState(false)
  const modalRef = useModalA11y(onCancel)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isGateAnswerCorrect(challenge, answer)) {
      onAuthorize()
    } else {
      setShowError(true)
    }
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Portão dos responsáveis — multiplayer"
      ref={modalRef}
      tabIndex={-1}
    >
      <div className="modal">
        <button type="button" className="modal-close" onClick={onCancel} aria-label="Fechar">
          ×
        </button>
        <h2>🔒 Portão dos responsáveis</h2>
        <p>
          O multiplayer conecta seu filho(a) com OUTRAS crianças jogando ao mesmo tempo, em
          qualquer lugar (não só na mesma rede) — elas podem se ver e trocar só mensagens de uma
          lista fixa e pré-aprovada (sem digitar texto livre, sem trocar nome real, e-mail ou
          qualquer outro dado pessoal).
        </p>
        <p>Se você é o responsável e autoriza, resolva a conta abaixo pra confirmar:</p>
        <form onSubmit={handleSubmit}>
          <label className="field">
            <span>
              {challenge.a} × {challenge.b} = ?
            </span>
            <input
              value={answer}
              onChange={(e) => {
                setAnswer(e.target.value)
                setShowError(false)
              }}
              inputMode="numeric"
              autoFocus
            />
            {showError && <small className="field-hint">Resposta incorreta, tente de novo.</small>}
          </label>
          <button type="submit" className="primary-button">
            Autorizar multiplayer
          </button>
          <button type="button" className="nickname-generate-btn" onClick={onCancel}>
            Agora não
          </button>
        </form>
      </div>
    </div>
  )
}
