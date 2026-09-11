import { useEffect, useRef } from 'react'
import { loadPlayerId } from './storage'
import { resolveHouseSyncSnapshot } from './progression'
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

type HeartbeatBody = {
  playerId: string
  equippedLook?: unknown
  badges?: string[]
  houseFurnitureIds?: string[]
  housePlacements?: Record<string, { x: number; z: number; rotY: number }>
  houseVisible?: boolean
}

function sendHeartbeat(body: HeartbeatBody): void {
  fetch(`${ACCOUNTS_API_URL}/players/heartbeat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {
    // Sem heartbeat de heartbeat — se falhar, só tenta de novo no próximo tick (mesmo
    // espírito de `productAnalytics.ts`: nunca interrompe o jogo pra criança por causa disto).
  })
}

// lab-175 (achado do review automático do Copilot no PR #49): o toggle de visibilidade em
// `MyHousePanel.tsx` só mudava o `progress` local — a mudança de verdade só chegava ao backend no
// próximo tick do heartbeat (até 60s depois), ou nunca, se o jogador fechasse o jogo antes disso.
// Como a promessa feita ao dono é "você controla quem visita AGORA", desligar a visibilidade
// precisa valer imediatamente — chamado direto de `App.tsx` no clique do toggle, sem esperar o
// tick periódico (que continua rodando normalmente pros outros campos).
//
// Segunda rodada do Copilot no mesmo PR: enviar SÓ `houseVisible` aqui deixava
// `houseFurnitureIds`/`housePlacements` presos no valor do ÚLTIMO tick periódico (`coalesce` no
// servidor preserva o que não veio no corpo) — se o dono mudasse a decoração enquanto a casa
// estava privada e reativasse a visibilidade antes do próximo tick, os amigos veriam a decoração
// ANTIGA por até 60s. Corrigido enviando o snapshot completo (mesmo formato do tick periódico),
// não só o booleano — recebe `progress` inteiro, não só o novo valor de `houseVisible`.
export function sendImmediateHouseVisibility(visible: boolean, progress: Progress): void {
  const playerId = loadPlayerId()
  if (!playerId) return
  const houseSnapshot = resolveHouseSyncSnapshot(progress)
  sendHeartbeat({
    playerId,
    houseFurnitureIds: houseSnapshot.furnitureIds,
    housePlacements: houseSnapshot.placements,
    houseVisible: visible,
  })
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
      const body: HeartbeatBody = { playerId }
      if (profileRef.current) body.equippedLook = equippedLookFrom(profileRef.current)
      if (progressRef.current) {
        body.badges = progressRef.current.badges
        // lab-175 ("Lab 171 - Casa visitável somente leitura") — `resolveHouseSyncSnapshot`
        // (achado do review automático do Copilot no PR #49) filtra item `subscriptionOnly` (nunca
        // sai do aparelho do dono, nem client nem servidor deveriam depender só um do outro pra
        // isso) e descarta qualquer chave de `housePlacements` fora do formato `${id}#${índice}`
        // (save legado de antes do lab-136 não pode fazer o heartbeat INTEIRO ser recusado).
        const houseSnapshot = resolveHouseSyncSnapshot(progressRef.current)
        body.houseFurnitureIds = houseSnapshot.furnitureIds
        body.housePlacements = houseSnapshot.placements
        // lab-175 (achado do review automático do Copilot no PR #49, 10ª rodada): `houseVisible`
        // também vem de JSON persistido sem validação — um save corrompido com `null`/string nesse
        // campo fazia o servidor recusar o heartbeat INTEIRO (400, "houseVisible inválido"),
        // travando até `badges`/`equippedLook`/`last_seen_at`. Normaliza pro default real
        // (`true`, mesmo de `storage.ts`) quando não é booleano, mesmo princípio já aplicado a
        // `housePlacements`/`unlockedFurnitureIds` em `resolveHouseSyncSnapshot`.
        body.houseVisible = typeof progressRef.current.houseVisible === 'boolean' ? progressRef.current.houseVisible : true
      }
      sendHeartbeat(body)
    }, HEARTBEAT_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])
}
