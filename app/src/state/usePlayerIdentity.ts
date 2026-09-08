import { useRef, useState } from 'react'
import { loadPlayerId, savePlayerId } from './storage'

const ACCOUNTS_API_URL = import.meta.env.VITE_ACCOUNTS_API_URL as string

export interface PlayerSearchResult {
  id: string
  nickname: string
  avatarEmoji: string
}

// lab-159, Grupo B do backlog social (labs/lab-158-.../FEATURES.md) — identidade de jogador
// persistente por perfil + busca por nickname. Mesmo formato de `useEntitlement.ts` (chamada
// direta ao Worker, sem passar por autenticação nenhuma — mesma regra de `/events`: funciona pra
// QUALQUER jogador, pago ou não).
export function usePlayerIdentity() {
  const [playerId, setPlayerId] = useState<string | null>(() => loadPlayerId())
  const [registering, setRegistering] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<PlayerSearchResult[]>([])
  // Achado real testando ao vivo (lab-159): `FriendsPanel` chama `ensureRegistered` num
  // `useEffect([])` — em `StrictMode` (`main.tsx`), o React invoca esse efeito DUAS VEZES em
  // desenvolvimento; a checagem `if (playerId) return` sozinha não segura a segunda chamada
  // porque o `setPlayerId` da primeira ainda não comitou quando a segunda já começou (as duas
  // veem `playerId === null`) — resultado: dois jogadores registrados pro mesmo perfil.
  // `inFlightRef` é síncrono (não espera re-render nenhum) e cobre esse caso e qualquer outra
  // chamada dupla real (ex.: o painel remontando rápido), não só o StrictMode do dev.
  const inFlightRef = useRef(false)

  // Registra no máximo uma vez por perfil (idempotente do ponto de vista do chamador: se já
  // existe `playerId` guardado, devolve ele direto sem chamar o servidor de novo).
  async function ensureRegistered(nickname: string, avatarEmoji: string, deviceId: string): Promise<string | null> {
    if (playerId) return playerId
    if (inFlightRef.current) return null
    inFlightRef.current = true
    setRegistering(true)
    try {
      const res = await fetch(`${ACCOUNTS_API_URL}/players/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, avatarEmoji, deviceId }),
      })
      if (!res.ok) return null
      const body = (await res.json()) as { playerId: string }
      savePlayerId(body.playerId)
      setPlayerId(body.playerId)
      return body.playerId
    } catch {
      return null // offline — painel de Amigos mostra "sem conexão", mesmo espírito do multiplayer
    } finally {
      setRegistering(false)
      inFlightRef.current = false
    }
  }

  async function search(nickname: string): Promise<void> {
    setSearching(true)
    setSearchError(null)
    try {
      const res = await fetch(`${ACCOUNTS_API_URL}/players/search?nickname=${encodeURIComponent(nickname)}`)
      const body = (await res.json().catch(() => null)) as { results?: PlayerSearchResult[]; error?: string } | null
      if (!res.ok) {
        setSearchError(body?.error ?? 'não foi possível buscar agora')
        setSearchResults([])
        return
      }
      setSearchResults(body?.results ?? [])
    } catch {
      setSearchError('sem conexão')
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  return { playerId, registering, ensureRegistered, searching, searchError, searchResults, search }
}
