// Troca de apelido depois do onboarding ("Lab 207 - Troca segura de nickname" do backlog) —
// mesmo gerador/filtro do onboarding (`Onboarding.tsx`), só que reaproveitados aqui pra edição em
// vez de criação. Cooldown de `NICKNAME_CHANGE_COOLDOWN_DAYS` (`state/progression.ts`) checado
// localmente pra feedback instantâneo, mas a decisão de verdade é do servidor (`onSave`, ver
// `App.tsx`) — nunca confia só na checagem otimista daqui.
import { useState } from 'react'
import { generateNickname } from '../data/nicknames'
import { isNicknameAllowed, sanitizeNicknameChars } from '../data/nicknameFilter'
import { canChangeNickname, NICKNAME_CHANGE_COOLDOWN_DAYS } from '../state/progression'
import { useModalA11y } from '../state/useModalA11y'
import type { Profile } from '../types'

interface NicknamePanelProps {
  profile: Profile
  onSave: (name: string) => Promise<{ ok: boolean; error?: string }>
  onClose: () => void
}

const TITLE_ID = 'nickname-panel-title'

function daysRemaining(nicknameChangedAt: string, nowIso: string): number {
  const elapsedMs = new Date(nowIso).getTime() - new Date(nicknameChangedAt).getTime()
  const remainingMs = NICKNAME_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000 - elapsedMs
  return Math.max(1, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)))
}

export function NicknamePanel({ profile, onSave, onClose }: NicknamePanelProps) {
  const modalRef = useModalA11y(onClose)
  const [name, setName] = useState(profile.name)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nowIso = new Date().toISOString()
  const onCooldown = !canChangeNickname(profile.nicknameChangedAt, nowIso)
  const trimmedName = name.trim()
  const nicknameBlocked = trimmedName.length > 0 && !isNicknameAllowed(trimmedName)
  const unchanged = trimmedName === profile.name.trim()

  async function handleSave() {
    if (!trimmedName || nicknameBlocked || onCooldown || unchanged) return
    setSaving(true)
    setError(null)
    const result = await onSave(trimmedName)
    setSaving(false)
    if (result.ok) {
      onClose()
    } else {
      setError(result.error ?? 'não foi possível trocar agora')
    }
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={TITLE_ID}
      ref={modalRef}
      tabIndex={-1}
    >
      <div className="modal">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
          ×
        </button>
        <h2 id={TITLE_ID}>Trocar apelido</h2>

        {onCooldown && profile.nicknameChangedAt ? (
          <p className="field-hint field-hint-error">
            Você já trocou de apelido recentemente — pode trocar de novo em{' '}
            {daysRemaining(profile.nicknameChangedAt, nowIso)} dia(s).
          </p>
        ) : (
          <p className="subtitle">
            Use um apelido, não seu nome real — outros jogadores podem ver! Só letras, sem número ou
            símbolo.
          </p>
        )}

        <label className="field">
          <span>Novo apelido</span>
          <div className="nickname-row">
            <input
              value={name}
              onChange={(e) => setName(sanitizeNicknameChars(e.target.value).slice(0, 20))}
              maxLength={20}
              disabled={onCooldown}
              autoFocus
            />
            <button
              type="button"
              className="nickname-generate-btn"
              onClick={() => setName(generateNickname())}
              aria-label="Gerar apelido aleatório"
              disabled={onCooldown}
            >
              🎲 Gerar
            </button>
          </div>
          {nicknameBlocked && (
            <small className="field-hint field-hint-error">Esse apelido não pode ser usado — tente outro.</small>
          )}
          {error && <small className="field-hint field-hint-error">{error}</small>}
        </label>

        <button
          type="button"
          className="primary-button"
          onClick={handleSave}
          disabled={!trimmedName || nicknameBlocked || onCooldown || unchanged || saving}
        >
          {saving ? 'Salvando…' : 'Salvar novo apelido'}
        </button>
      </div>
    </div>
  )
}
