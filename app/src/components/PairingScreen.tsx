import { useEffect, useRef, useState } from 'react'
import { useModalA11y } from '../state/useModalA11y'
import { getLevel } from '../state/progression'
import type { Profile, Progress } from '../types'

interface PairingScreenProps {
  active: boolean
  redeeming: boolean
  redeemError: string | null
  onRedeem: (code: string) => Promise<string | null>
  // lab-142 (G6, docs/prompts/05-escala-e-viabilidade.md: "todo o progresso pago mora só no
  // aparelho — limpar dados apaga o que a família pagou, sem backup e sem restauração") — checado
  // logo depois de um pareamento bem-sucedido, com o token novo (`onRedeem` devolve o token, não
  // mais um `boolean`, exatamente pra viabilizar esta checagem sem esperar re-render nenhum).
  onFetchBackup: (token: string) => Promise<{ profile: Profile; progress: Progress } | null>
  onRestoreBackup: (profile: Profile, progress: Progress) => void
  onClose: () => void
}

// Tela de pareamento (Fase D do plano comercial, ver docs/plano-comercial-backend.md) — a
// criança digita aqui, UMA VEZ, o código gerado pelo responsável no portal `/familia`. Nunca
// pede e-mail/senha/nome: só o código de 6 dígitos, o mínimo pra vincular o entitlement da
// família sem a criança ter conta.
export function PairingScreen({
  active,
  redeeming,
  redeemError,
  onRedeem,
  onFetchBackup,
  onRestoreBackup,
  onClose,
}: PairingScreenProps) {
  const [code, setCode] = useState('')
  const [done, setDone] = useState(false)
  // lab-142 — `undefined` = ainda não checou; `null` = checou e não tem backup nenhum pra
  // oferecer; objeto = tem backup, mostrando a pergunta "quer restaurar?".
  const [backupOffer, setBackupOffer] = useState<{ profile: Profile; progress: Progress } | null | undefined>(
    undefined,
  )
  const [checkingBackup, setCheckingBackup] = useState(false)
  const modalRef = useModalA11y(onClose)

  // lab-149 (achado do review automático do Copilot no PR #13): `handleSubmit` faz dois `await`
  // seguidos (`onRedeem`/`onFetchBackup`) — se o modal for fechado (× ou Esc, via `useModalA11y`)
  // enquanto uma dessas chamadas ainda está em voo, os `setState` de depois disparariam num
  // componente já desmontado (warning do React, risco de leak). `mountedRef` é checado antes de
  // cada `setState` que vem depois de um `await`.
  const mountedRef = useRef(true)
  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const token = await onRedeem(code)
    if (!token || !mountedRef.current) return
    setCheckingBackup(true)
    const backup = await onFetchBackup(token)
    if (!mountedRef.current) return
    setCheckingBackup(false)
    if (backup) {
      setBackupOffer(backup)
    } else {
      setDone(true)
    }
  }

  function handleRestore() {
    if (!backupOffer) return
    onRestoreBackup(backupOffer.profile, backupOffer.progress)
    // `onRestoreBackup` recarrega a página (mesmo padrão de `switchActiveProfile` em outros
    // lugares do jogo) — não precisa fechar o modal nem trocar de estado aqui, o reload já cuida.
  }

  function handleSkipRestore() {
    setBackupOffer(null)
    setDone(true)
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Vincular assinatura da família"
      ref={modalRef}
      tabIndex={-1}
    >
      <div className="modal">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
          ×
        </button>

        {backupOffer ? (
          <>
            <h2>Achamos um progresso salvo! 📦</h2>
            <p>
              Essa família já tem um progresso salvo (Nível {getLevel(backupOffer.progress.xp)}, 🪙{' '}
              {backupOffer.progress.coins} moedas). Quer trazer ele de volta pra este aparelho? Isso
              substitui o progresso atual deste perfil.
            </p>
            <button type="button" className="primary-button" onClick={handleRestore}>
              Restaurar progresso salvo
            </button>
            <button type="button" className="nickname-generate-btn" onClick={handleSkipRestore}>
              Continuar sem restaurar
            </button>
          </>
        ) : active ? (
          <>
            <h2>Assinatura da família já vinculada! 🎉</h2>
            <p>Aproveite os itens exclusivos assim que eles chegarem na lojinha.</p>
            {/* lab-137 (backlog reportado na sequência do lab-133): o link pra `/familia` só
                existia na tela de ANTES de vincular — quem cuida da criança e já vinculou não
                tinha como voltar pra ver relatório/gerenciar assinatura de dentro do jogo. */}
            <a href="/familia" target="_blank" rel="noreferrer" className="nickname-generate-btn">
              Abrir área dos responsáveis
            </a>
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
            {/* Pedido do usuário (2026-08-24): não tinha nenhum link de verdade pra `/familia` em
                lugar nenhum do jogo, só esse texto — quem cuida da criança não tinha como achar a
                área dos responsáveis sem já saber o endereço de cor. */}
            <a href="/familia" target="_blank" rel="noreferrer" className="nickname-generate-btn">
              Abrir área dos responsáveis
            </a>
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
              <button type="submit" className="primary-button" disabled={redeeming || checkingBackup || code.length !== 6}>
                {redeeming ? 'Um momento…' : checkingBackup ? 'Verificando progresso salvo…' : 'Confirmar'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
