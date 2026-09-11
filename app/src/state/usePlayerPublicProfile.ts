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

// lab-175 ("Lab 171 - Casa visitável somente leitura") — `null` quando o dono desligou a
// visibilidade (`MyHousePanel.tsx`) OU nunca sincronizou mobília nenhuma; a UI trata os dois casos
// do mesmo jeito ("casa não visitável agora"), nunca como erro.
export interface PublicHouseSnapshot {
  furnitureIds: string[]
  placements: Record<string, { x: number; z: number; rotY: number }>
}

export interface PlayerPublicProfile {
  nickname: string
  avatarEmoji: string
  equippedLook: PublicEquippedLook | null
  badges: string[]
  house: PublicHouseSnapshot | null
}

// lab-163, último item do Grupo B do backlog social (labs/lab-158-.../FEATURES.md) — avatar
// equipado + conquistas de UM jogador (nunca XP/moeda/progresso/família, regra decidida no
// lab-158). Mesmo formato de `usePlayerIdentity`/`useFriendRequests`: chamada direta ao Worker,
// sem autenticação — `playerId` não é uma credencial, é só um id opaco.
// `serverMessage` é o texto vindo do próprio Worker (`body.error`), quando existe — cada chamador
// decide o texto de FALLBACK apropriado ao seu contexto (carregar perfil vs. confirmar visita),
// por isso `reason` distingue "sem conexão" (exceção de rede) de "resposta ruim" (HTTP não-2xx ou
// corpo vazio/inválido) em vez de já embutir uma mensagem fixa aqui.
export type PlayerPublicProfileResult =
  | { reason: 'success'; profile: PlayerPublicProfile }
  | { reason: 'network' | 'bad-response'; serverMessage: string | null }

// lab-175 (achado do review automático do Copilot no PR #49, 15ª rodada): extraído da própria
// `usePlayerPublicProfile` pra `PlayerPublicProfileView.tsx` reaproveitar exatamente o mesmo
// fetch/DTO/tratamento de erro na revalidação de "Visitar casa", em vez de duplicar (achado
// anterior: os dois caminhos podiam divergir se o contrato da resposta mudasse). `cache:
// 'no-store'` é o que resolve o achado CRÍTICO desta rodada: sem isto, uma resposta em cache do
// navegador de ANTES do `Cache-Control: no-store` existir no servidor (ou de qualquer chamada
// anterior) podia satisfazer este fetch sem tocar o Worker, deixando a revalidação de "o dono
// desligou a casa enquanto o perfil estava aberto" passar com um snapshot velho e ainda visível.
export async function fetchPlayerPublicProfile(playerId: string): Promise<PlayerPublicProfileResult> {
  try {
    const res = await fetch(`${ACCOUNTS_API_URL}/players/${encodeURIComponent(playerId)}/public-profile`, {
      cache: 'no-store',
    })
    const body = (await res.json().catch(() => null)) as (PlayerPublicProfile & { error?: string }) | null
    // Achado do review do Copilot (PR #37): resposta 2xx com corpo vazio/inválido (`.catch`
    // acima devolve `null`) não pode virar "perfil carregado com sucesso, mas vazio" — sem
    // esta checagem a UI ficava sem dado nenhum e sem explicação do porquê.
    if (!res.ok || body === null) {
      return { reason: 'bad-response', serverMessage: body?.error ?? null }
    }
    return { reason: 'success', profile: body }
  } catch {
    return { reason: 'network', serverMessage: null }
  }
}

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
      const result = await fetchPlayerPublicProfile(playerId!)
      if (cancelled) return
      switch (result.reason) {
        case 'network':
          setError('sem conexão')
          break
        case 'bad-response':
          setError(result.serverMessage ?? 'não foi possível carregar o perfil agora')
          break
        case 'success':
          setProfile(result.profile)
          break
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [playerId])

  return { profile, loading, error }
}
