import { useEffect, useRef } from 'react'
import { loadPlayerId } from './storage'
import type { Profile, Progress } from '../types'

const ACCOUNTS_API_URL = import.meta.env.VITE_ACCOUNTS_API_URL as string
const HEARTBEAT_INTERVAL_MS = 60 * 1000

function equippedLookFrom(profile: Profile) {
  return {
    equippedHatId: profile.equippedHatId,
    equippedShirtColorId: profile.equippedShirtColorId,
    equippedPantsColorId: profile.equippedPantsColorId,
    equippedShoeColorId: profile.equippedShoeColorId,
    equippedBackpackColorId: profile.equippedBackpackColorId,
    equippedHairShapeId: profile.equippedHairShapeId,
    equippedGlassesId: profile.equippedGlassesId,
  }
}

// lab-162, Grupo B do backlog social (labs/lab-158-.../FEATURES.md) — mantém `last_seen_at`
// atualizado pra que os amigos vejam status online (`isOnlineNow`, server-accounts/src/domain.ts).
// Roda durante toda a sessão de jogo, não só com o painel de Amigos aberto (`FriendsPanel.tsx`) —
// por isso mora no componente raiz (`App.tsx`), montado uma vez só.
//
// lab-163: piggyback no mesmo tick pra sincronizar o snapshot usado por
// `GET /players/:id/public-profile` (avatar equipado + conquistas) — decisão registrada em
// `labs/lab-163-.../FEATURES.md`: evita criar um endpoint/intervalo novo só pra isso. `profile`/
// `progress` podem ser `null` (perfil ainda não criado) — o heartbeat sozinho não depende deles.
export function useHeartbeat(profile: Profile | null, progress: Progress | null): void {
  // Refs (não estado) de propósito: trocar de roupa não deve reiniciar o `setInterval` nem causar
  // um heartbeat fora de hora — o próximo tick já lê o valor mais recente sozinho, mesmo padrão já
  // usado aqui pra `loadPlayerId()`.
  const profileRef = useRef(profile)
  const progressRef = useRef(progress)
  profileRef.current = profile
  progressRef.current = progress

  useEffect(() => {
    // Lê `loadPlayerId()` A CADA tick, não uma vez só no mount: se o jogador abrir o painel de
    // Amigos pela primeira vez (registrando o `playerId`) DEPOIS deste hook já estar rodando, o
    // próximo heartbeat já pega o valor novo, sem precisar remontar nada.
    const interval = setInterval(() => {
      const playerId = loadPlayerId()
      if (!playerId) return
      const body: {
        playerId: string
        equippedLook?: unknown
        badges?: string[]
        houseFurnitureIds?: string[]
        housePlacements?: Record<string, { x: number; z: number; rotY: number }>
        houseVisible?: boolean
      } = { playerId }
      if (profileRef.current) body.equippedLook = equippedLookFrom(profileRef.current)
      if (progressRef.current) {
        body.badges = progressRef.current.badges
        // lab-175 ("Lab 171 - Casa visitável somente leitura") — envia o RAW
        // `unlockedFurnitureIds`/`housePlacements` (mesmo formato local, sem transformação): item
        // `subscriptionOnly` continua na lista se o dono comprou/ganhou, mas o Worker/client de
        // quem visita sempre trata esse tipo como 0 (`visitFurnitureQuantity`), nunca revelando
        // status de assinatura pra um amigo.
        body.houseFurnitureIds = progressRef.current.unlockedFurnitureIds
        body.housePlacements = progressRef.current.housePlacements
        body.houseVisible = progressRef.current.houseVisible
      }
      fetch(`${ACCOUNTS_API_URL}/players/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        keepalive: true,
      }).catch(() => {
        // Sem heartbeat de heartbeat — se falhar, só tenta de novo no próximo tick (mesmo
        // espírito de `productAnalytics.ts`: nunca interrompe o jogo pra criança por causa disto).
      })
    }, HEARTBEAT_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])
}
