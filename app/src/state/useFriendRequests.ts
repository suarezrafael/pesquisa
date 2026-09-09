import { useState } from 'react'

const ACCOUNTS_API_URL = import.meta.env.VITE_ACCOUNTS_API_URL as string

export interface FriendSummaryItem {
  friendshipId: string
  playerId: string
  nickname: string
  avatarEmoji: string
  // lab-162 — só presentes nos itens de `friends` (amizade já aceita); `received`/`sent` nunca
  // carregam status online, já que ainda não são amigos de verdade.
  lastSeenAt?: string
  online?: boolean
}

interface FriendSummary {
  received: FriendSummaryItem[]
  sent: FriendSummaryItem[]
  friends: FriendSummaryItem[]
}

const EMPTY_SUMMARY: FriendSummary = { received: [], sent: [], friends: [] }

// lab-162 — rótulo curto pra "última vez visto" quando o amigo não está online agora
// (`FriendSummaryItem.online === false`). Só usado na exibição, nunca na regra de "está online ou
// não" — essa regra vive só no servidor (`isOnlineNow`, server-accounts/src/domain.ts), evitando
// duas fontes de verdade divergentes sobre o mesmo limiar de 2 minutos.
export function formatLastSeen(lastSeenAtIso: string, now: number = Date.now()): string {
  const lastSeenAtMs = new Date(lastSeenAtIso).getTime()
  // Achado do review do Copilot (PR #35): sem esta checagem, uma data inválida (resposta
  // inesperada, dado antigo em cache) propagava `NaN` até o texto final ("há NaNd" na UI).
  if (!Number.isFinite(lastSeenAtMs)) return 'há um tempo'
  const diffMs = now - lastSeenAtMs
  const diffMinutes = Math.floor(diffMs / (60 * 1000))
  if (diffMinutes < 60) return `há ${Math.max(diffMinutes, 1)} min`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `há ${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  return `há ${diffDays}d`
}

// lab-160, Grupo B do backlog social (labs/lab-158-.../FEATURES.md) — pedido/aceite/recusa de
// amizade + remover amizade já aceita. Mesmo formato de `usePlayerIdentity.ts` (chamada direta ao
// Worker, sem autenticação — `playerId` é um id opaco guardado localmente, não uma credencial).
export function useFriendRequests(playerId: string | null) {
  const [summary, setSummary] = useState<FriendSummary>(EMPTY_SUMMARY)
  const [loading, setLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  async function refresh(): Promise<void> {
    if (!playerId) return
    setLoading(true)
    setActionError(null)
    try {
      const res = await fetch(`${ACCOUNTS_API_URL}/players/friend-summary?playerId=${encodeURIComponent(playerId)}`)
      if (!res.ok) {
        // Achado do review do Copilot (PR #31): antes ignorava silenciosamente qualquer erro
        // (ex.: 429 do rate limit) — o painel ficava com a lista desatualizada sem explicação.
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        setActionError(body?.error ?? 'não foi possível atualizar agora')
        return
      }
      const body = (await res.json()) as FriendSummary
      setSummary(body)
    } catch {
      setActionError('sem conexão') // painel mantém o último resultado conhecido, mesmo espírito de `search`
    } finally {
      setLoading(false)
    }
  }

  async function sendRequest(toId: string): Promise<boolean> {
    if (!playerId) return false
    setActionError(null)
    try {
      const res = await fetch(`${ACCOUNTS_API_URL}/players/friend-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromId: playerId, toId }),
      })
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      if (!res.ok) {
        setActionError(body?.error ?? 'não foi possível enviar o pedido agora')
        return false
      }
      await refresh()
      return true
    } catch {
      setActionError('sem conexão')
      return false
    }
  }

  async function respond(requestId: string, accept: boolean): Promise<void> {
    if (!playerId) return
    setActionError(null)
    try {
      const res = await fetch(`${ACCOUNTS_API_URL}/players/friend-request/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, playerId, accept }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        setActionError(body?.error ?? 'não foi possível responder agora')
        return
      }
      await refresh()
    } catch {
      setActionError('sem conexão')
    }
  }

  async function removeFriend(friendshipId: string): Promise<void> {
    if (!playerId) return
    setActionError(null)
    try {
      const res = await fetch(`${ACCOUNTS_API_URL}/players/friend-request/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, friendshipId }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        setActionError(body?.error ?? 'não foi possível remover agora')
        return
      }
      await refresh()
    } catch {
      setActionError('sem conexão')
    }
  }

  return { summary, loading, actionError, refresh, sendRequest, respond, removeFriend }
}
