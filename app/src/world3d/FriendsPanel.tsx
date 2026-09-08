// Painel de Amigos (lab-159: só busca; lab-160: pedido/aceite/recusa/remover amizade, labs/
// lab-158-.../FEATURES.md). Registra a identidade de jogador (`usePlayerIdentity.ensureRegistered`)
// na primeira vez que este painel abre, não no onboarding — evita registrar quem nunca usa a busca.
// Status online/último acesso fica pro lab-161 — a aba "Amigos" aqui só lista quem já foi aceito.
import { useEffect, useState } from 'react'
import { usePlayerIdentity } from '../state/usePlayerIdentity'
import { useFriendRequests, type FriendSummaryItem } from '../state/useFriendRequests'
import { getOrCreateDeviceId } from '../state/storage'
import { useModalA11y } from '../state/useModalA11y'
import type { Profile } from '../types'

interface FriendsPanelProps {
  profile: Profile
  onClose: () => void
}

type FriendsTab = 'search' | 'requests' | 'friends'

export function FriendsPanel({ profile, onClose }: FriendsPanelProps) {
  const modalRef = useModalA11y(onClose)
  const { playerId, registering, ensureRegistered, searching, searchError, searchResults, search } =
    usePlayerIdentity()
  const { summary, actionError, refresh, sendRequest, respond, removeFriend } = useFriendRequests(playerId)
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<FriendsTab>('search')
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null)

  useEffect(() => {
    ensureRegistered(profile.name, profile.avatarEmoji, getOrCreateDeviceId())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (playerId) refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) search(query.trim())
  }

  function handleRemoveClick(item: FriendSummaryItem) {
    if (confirmingRemoveId === item.friendshipId) {
      removeFriend(item.friendshipId)
      setConfirmingRemoveId(null)
    } else {
      setConfirmingRemoveId(item.friendshipId)
    }
  }

  const pendingCount = summary.received.length

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Amigos" ref={modalRef} tabIndex={-1}>
      <div className="modal">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
          ×
        </button>
        <h2>👥 Amigos</h2>

        <div className="chat-panel-categories">
          <button type="button" className={`chat-category-btn ${tab === 'search' ? 'active' : ''}`} onClick={() => setTab('search')}>
            🔎 Buscar
          </button>
          <button type="button" className={`chat-category-btn ${tab === 'requests' ? 'active' : ''}`} onClick={() => setTab('requests')}>
            📨 Pedidos{pendingCount > 0 ? ` (${pendingCount})` : ''}
          </button>
          <button type="button" className={`chat-category-btn ${tab === 'friends' ? 'active' : ''}`} onClick={() => setTab('friends')}>
            🧑‍🤝‍🧑 Amigos{summary.friends.length > 0 ? ` (${summary.friends.length})` : ''}
          </button>
        </div>

        {actionError && <p className="field-hint">{actionError}</p>}

        {tab === 'search' && (
          <>
            <p>Busque um amigo pelo apelido dele no jogo.</p>
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
              {searchResults.map((r) => {
                const alreadyFriend = summary.friends.some((f) => f.playerId === r.id)
                const alreadySent = summary.sent.some((s) => s.playerId === r.id)
                return (
                  <p key={r.id} className="ranking-row">
                    {r.avatarEmoji} <strong>{r.nickname}</strong> —{' '}
                    {alreadyFriend ? (
                      <span>✓ já é seu amigo</span>
                    ) : alreadySent ? (
                      <span>⏳ pedido enviado</span>
                    ) : (
                      <button type="button" className="chat-category-btn" onClick={() => sendRequest(r.id)}>
                        Adicionar
                      </button>
                    )}
                  </p>
                )
              })}
            </div>
          </>
        )}

        {tab === 'requests' && (
          <div className="chat-panel-messages">
            <h3>Recebidos</h3>
            {summary.received.length === 0 && <p className="chat-empty">Nenhum pedido novo.</p>}
            {summary.received.map((r) => (
              <p key={r.friendshipId} className="ranking-row">
                {r.avatarEmoji} <strong>{r.nickname}</strong> —{' '}
                <button type="button" className="chat-category-btn" onClick={() => respond(r.friendshipId, true)}>
                  Aceitar
                </button>{' '}
                <button type="button" className="chat-category-btn" onClick={() => respond(r.friendshipId, false)}>
                  Recusar
                </button>
              </p>
            ))}

            <h3>Enviados</h3>
            {summary.sent.length === 0 && <p className="chat-empty">Nenhum pedido aguardando resposta.</p>}
            {summary.sent.map((r) => (
              <p key={r.friendshipId} className="ranking-row">
                {r.avatarEmoji} <strong>{r.nickname}</strong> — ⏳ aguardando
              </p>
            ))}
          </div>
        )}

        {tab === 'friends' && (
          <div className="chat-panel-messages">
            {summary.friends.length === 0 && <p className="chat-empty">Você ainda não tem amigos adicionados.</p>}
            {summary.friends.map((f) => (
              <p key={f.friendshipId} className="ranking-row">
                {f.avatarEmoji} <strong>{f.nickname}</strong> —{' '}
                <button type="button" className="chat-category-btn" onClick={() => handleRemoveClick(f)}>
                  {confirmingRemoveId === f.friendshipId ? 'Confirmar remoção?' : 'Remover'}
                </button>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
