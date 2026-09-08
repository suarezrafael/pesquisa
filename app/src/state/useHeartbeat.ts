import { useEffect } from 'react'
import { loadPlayerId } from './storage'

const ACCOUNTS_API_URL = import.meta.env.VITE_ACCOUNTS_API_URL as string
const HEARTBEAT_INTERVAL_MS = 60 * 1000

// lab-162, Grupo B do backlog social (labs/lab-158-.../FEATURES.md) — mantém `last_seen_at`
// atualizado pra que os amigos vejam status online (`isOnlineNow`, server-accounts/src/domain.ts).
// Roda durante toda a sessão de jogo, não só com o painel de Amigos aberto (`FriendsPanel.tsx`) —
// por isso mora no componente raiz (`App.tsx`), montado uma vez só.
export function useHeartbeat(): void {
  useEffect(() => {
    // Lê `loadPlayerId()` A CADA tick, não uma vez só no mount: se o jogador abrir o painel de
    // Amigos pela primeira vez (registrando o `playerId`) DEPOIS deste hook já estar rodando, o
    // próximo heartbeat já pega o valor novo, sem precisar remontar nada.
    const interval = setInterval(() => {
      const playerId = loadPlayerId()
      if (!playerId) return
      fetch(`${ACCOUNTS_API_URL}/players/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
        keepalive: true,
      }).catch(() => {
        // Sem heartbeat de heartbeat — se falhar, só tenta de novo no próximo tick (mesmo
        // espírito de `productAnalytics.ts`: nunca interrompe o jogo pra criança por causa disto).
      })
    }, HEARTBEAT_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])
}
