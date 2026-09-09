import { useEffect, useState } from 'react'

const ACCOUNTS_API_URL = import.meta.env.VITE_ACCOUNTS_API_URL as string

export interface PublicEquippedLook {
  equippedHatId: string | null
  equippedShirtColorId: string | null
  equippedPantsColorId: string | null
  equippedShoeColorId: string | null
  equippedBackpackColorId: string | null
  equippedHairShapeId: string | null
  equippedGlassesId: string | null
}

export interface PlayerPublicProfile {
  nickname: string
  avatarEmoji: string
  equippedLook: PublicEquippedLook | null
  badges: string[]
}

// lab-163, último item do Grupo B do backlog social (labs/lab-158-.../FEATURES.md) — avatar
// equipado + conquistas de UM jogador (nunca XP/moeda/progresso/família, regra decidida no
// lab-158). Mesmo formato de `usePlayerIdentity`/`useFriendRequests`: chamada direta ao Worker,
// sem autenticação — `playerId` não é uma credencial, é só um id opaco.
export function usePlayerPublicProfile(playerId: string | null) {
  const [profile, setProfile] = useState<PlayerPublicProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!playerId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setProfile(null)

    async function load() {
      try {
        const res = await fetch(`${ACCOUNTS_API_URL}/players/${encodeURIComponent(playerId!)}/public-profile`)
        const body = (await res.json().catch(() => null)) as (PlayerPublicProfile & { error?: string }) | null
        if (cancelled) return
        // Achado do review do Copilot (PR #37): resposta 2xx com corpo vazio/inválido (`.catch`
        // acima devolve `null`) não pode virar "perfil carregado com sucesso, mas vazio" — sem
        // esta checagem a UI ficava sem dado nenhum e sem explicação do porquê.
        if (!res.ok || body === null) {
          setError(body?.error ?? 'não foi possível carregar o perfil agora')
          return
        }
        setProfile(body)
      } catch {
        if (!cancelled) setError('sem conexão')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [playerId])

  return { profile, loading, error }
}
