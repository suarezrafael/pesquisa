import { useEffect, useRef } from 'react'
import { loadPlayerId, loadPlayerSecret } from './storage'
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
  nickname?: string
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

// Troca segura de nickname depois do onboarding — diferente das outras chamadas imediatas desta
// função, o painel de troca precisa de uma resposta de verdade (não fire-and-forget): o servidor
// pode recusar por cooldown (defesa real, não só a checagem otimista da UI —
// docs/prompts/01-seguranca.md §3) e o painel precisa mostrar isso pra criança. Sem `playerId`
// (perfil nunca abriu o painel de Amigos) não há nada pra sincronizar agora — a troca local já
// aconteceu, e o próximo `ensureRegistered` vai registrar com o nome já atualizado.
//
// Manda `secret` junto (`loadPlayerSecret`) — prova de posse checada no servidor contra
// `player_identities.player_secret`, nunca exposto por nenhuma outra rota. Sem isso, qualquer
// jogador que descobrisse o `playerId` de outra criança via busca por nickname (rota pública)
// poderia renomear o perfil dela — o `playerId` sozinho não prova posse, só identifica QUAL linha
// mudar. `getOrCreateDeviceId()` NÃO serve pra isso: é por APARELHO, compartilhado por todos os
// perfis do mesmo tablet (lab-108), não isolaria dois irmãos jogando no mesmo aparelho.
// Perfil registrado ANTES deste segredo existir (sem `loadPlayerSecret()` salvo localmente) cai no
// mesmo caminho de "nada pra sincronizar agora" — a troca fica só local até uma tentativa futura,
// mesma postura de degradação graciosa já aceita em outros pontos deste app.
// `changed` distingue uma troca de verdade de um no-op (o servidor já tinha exatamente esse
// nickname salvo — alcançável se outra aba/sessão do MESMO perfil já tivesse trocado antes). Sem
// essa distinção, gravar um `nicknameChangedAt` novo local num no-op destrancaria um cooldown que o
// servidor não consumiu de verdade. `nickname`/`nicknameChangedAt` vêm JUNTO nos dois casos — são a
// linha de verdade do banco, não o que esta aba mandou — pra reconciliar o estado local mesmo no
// no-op (sem isso, o HUD desta aba ficava preso no nome antigo mesmo com o servidor já correto).
export async function sendImmediateNicknameChange(
  nickname: string,
): Promise<{ ok: boolean; changed?: boolean; nickname?: string; nicknameChangedAt?: string | null; error?: string }> {
  const playerId = loadPlayerId()
  const secret = loadPlayerSecret()
  // `nicknameChangedAt: new Date().toISOString()` aqui, NUNCA `null` — sem servidor pra reconciliar
  // (perfil ainda não abriu Amigos, ou identidade legada sem segredo), o cooldown de 7 dias
  // continua sendo aplicado só localmente (`canChangeNickname`, `NicknamePanel.tsx`); devolver
  // `null` reiniciaria `profile.nicknameChangedAt` pra "nunca trocou" A CADA troca bem-sucedida,
  // destrancando o painel imediatamente de novo — um jeito real de contornar o limite de frequência
  // simplesmente nunca abrindo o painel de Amigos.
  if (!playerId || !secret) return { ok: true, changed: true, nickname, nicknameChangedAt: new Date().toISOString() }
  try {
    const res = await fetch(`${ACCOUNTS_API_URL}/players/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, nickname, secret }),
    })
    if (res.ok) {
      const body = (await res.json().catch(() => null)) as
        | { changed?: boolean; nickname?: string; nicknameChangedAt?: string | null }
        | null
      // `changed` precisa vir explícito no corpo — nunca assume sucesso quando ambíguo. Um Worker
      // ANTIGO durante um rollout (backend ainda sem suporte a `nickname`) ignora esse campo e
      // devolve um 204 comum (sem corpo algum), que passaria por `res.ok` mas nunca de fato mudou o
      // nickname no banco; tratar isso como sucesso gravaria um nome/cooldown local que diverge de
      // vez do que está salvo de verdade.
      // O contrato do servidor manda `nicknameChangedAt` nos dois ramos (`changed: true` e
      // `changed: false`, ver `handleHeartbeat`) — nunca omite o campo. `undefined` (ausente)
      // não é tratado como equivalente a `null` (presente, mas "nunca trocou"): uma resposta
      // parcial que tenha `changed`/`nickname` mas OMITA este campo é tratada como malformada,
      // não como "sem troca anterior" — a diferença importa porque aceitar `undefined` apagaria o
      // cooldown local com uma resposta incompleta.
      const nicknameChangedAt = body?.nicknameChangedAt
      const nicknameChangedAtValid =
        nicknameChangedAt === null ||
        (typeof nicknameChangedAt === 'string' && !Number.isNaN(new Date(nicknameChangedAt).getTime()))
      if (typeof body?.changed !== 'boolean' || typeof body.nickname !== 'string' || !nicknameChangedAtValid) {
        return { ok: false, error: 'não foi possível confirmar a troca — tente de novo' }
      }
      return { ok: true, changed: body.changed, nickname: body.nickname, nicknameChangedAt }
    }
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    return { ok: false, error: body?.error ?? 'não foi possível trocar agora' }
  } catch {
    return { ok: false, error: 'sem conexão' }
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
