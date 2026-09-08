// Painel de Amigos (lab-159, primeiro passo do Grupo B do backlog social, labs/lab-158-.../
// FEATURES.md) — por enquanto só busca por nickname; lista de amigos/pedidos vem no lab-160.
// Registra a identidade de jogador (`usePlayerIdentity.ensureRegistered`) na primeira vez que
// este painel abre, não no onboarding — evita registrar quem nunca usa a busca.
import { useEffect, useState } from 'react'
import { usePlayerIdentity } from '../state/usePlayerIdentity'
import { getOrCreateDeviceId } from '../state/storage'
import { useModalA11y } from '../state/useModalA11y'
import type { Profile } from '../types'

interface FriendsPanelProps {
  profile: Profile
  onClose: () => void
}

export function FriendsPanel({ profile, onClose }: FriendsPanelProps) {
  const modalRef = useModalA11y(onClose)
  const { registering, ensureRegistered, searching, searchError, searchResults, search } = usePlayerIdentity()
  const [query, setQuery] = useState('')

  useEffect(() => {
    ensureRegistered(profile.name, profile.avatarEmoji, getOrCreateDeviceId())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) search(query.trim())
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Amigos" ref={modalRef} tabIndex={-1}>
      <div className="modal">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
          ×
        </button>
        <h2>👥 Amigos</h2>
        <p>
          Busque um amigo pelo apelido dele no jogo. Pedir e aceitar amizade chega em breve — por
          enquanto só a busca já funciona.
        </p>

        <form onSubmit={handleSubmit}>
          <label className="field">
            <span>Apelido do jogador</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
          </label>
          <button type="submit" className="primary-button" disabled={registering || searching || !query.trim()}>
            {registering ? 'Um momento…' : searching ? 'Buscando…' : 'Buscar'}
          </button>
        </form>

        {searchError && <p className="field-hint">{searchError}</p>}

        {!searching && !searchError && searchResults.length === 0 && query.trim() && (
          <p className="chat-empty">Ninguém com esse apelido exato ainda.</p>
        )}

        <div className="chat-panel-messages">
          {searchResults.map((r) => (
            <p key={r.id} className="ranking-row">
              {r.avatarEmoji} <strong>{r.nickname}</strong> — <span title="Em breve">🔒 Adicionar (em breve)</span>
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}
