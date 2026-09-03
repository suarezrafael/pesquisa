import { useEffect, useState } from 'react'
import {
  clearEntitlement,
  loadEntitlement,
  saveEntitlement,
  shouldTrustCachedEntitlementOnFailure,
  type StoredEntitlement,
} from './entitlementStorage'
import { getLevel } from './progression'
import type { Profile, Progress } from '../types'

const ACCOUNTS_API_URL = import.meta.env.VITE_ACCOUNTS_API_URL as string

// Entitlement de assinatura no cliente da criança (Fase D, ver docs/plano-comercial-backend.md).
// A criança nunca autentica — troca um código curto gerado pelo responsável no portal `/familia`
// por este token, digitado uma única vez (`redeemCode`). Depois disso, `refresh` revalida em
// background (chamada silenciosa, sem bloquear o jogo) contra o status real da assinatura.
export function useEntitlement() {
  const [entitlement, setEntitlement] = useState<StoredEntitlement | null>(() => loadEntitlement())
  const [redeeming, setRedeeming] = useState(false)
  const [redeemError, setRedeemError] = useState<string | null>(null)

  async function refresh(tokenOverride?: string) {
    const token = tokenOverride ?? entitlement?.token
    if (!token) return
    try {
      const res = await fetch(`${ACCOUNTS_API_URL}/entitlement`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      // Erro de rede/servidor real: mantém o cache local em vez de apagar — mesma filosofia
      // "funciona offline" já aplicada ao PWA do jogo. Mas um 401 NÃO é uma falha de rede — é o
      // servidor recusando o token de forma explícita (lab-90, docs/prompts/
      // 05-escala-e-viabilidade.md G6): sem este `if`, um `active: true` editado direto no
      // `localStorage` sobrevivia pra sempre, porque a resposta correta do servidor era descartada
      // junto com as falhas de rede de verdade.
      if (!res.ok) {
        if (!shouldTrustCachedEntitlementOnFailure(res.status)) {
          const next: StoredEntitlement = { token, active: false, expiresAt: null }
          saveEntitlement(next)
          setEntitlement(next)
        }
        return
      }
      const body = (await res.json()) as { active: boolean; expiresAt: string | null }
      const next: StoredEntitlement = { token, active: body.active, expiresAt: body.expiresAt }
      saveEntitlement(next)
      setEntitlement(next)
    } catch {
      // offline — mantém o cache local
    }
  }

  useEffect(() => {
    if (entitlement?.token) refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // lab-142: devolve o TOKEN novo (não só `boolean`) — `PairingScreen.tsx` precisa dele pra
  // checar se existe um backup de progresso pra oferecer restaurar, sem esperar o próximo render
  // (`entitlement.token` só refletiria o valor novo depois de re-renderizar).
  async function redeemCode(code: string): Promise<string | null> {
    setRedeeming(true)
    setRedeemError(null)
    try {
      const res = await fetch(`${ACCOUNTS_API_URL}/pairing/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const body = (await res.json()) as { token?: string; error?: string }
      if (!res.ok || !body.token) {
        setRedeemError(body.error ?? 'Código inválido ou expirado.')
        return null
      }
      const next: StoredEntitlement = { token: body.token, active: false, expiresAt: null }
      saveEntitlement(next)
      setEntitlement(next)
      await refresh(body.token)
      return body.token
    } catch {
      setRedeemError('Não foi possível conectar. Tente de novo.')
      return null
    } finally {
      setRedeeming(false)
    }
  }

  function unpair() {
    clearEntitlement()
    setEntitlement(null)
  }

  // lab-119, Fase F: sincroniza um resumo MÍNIMO de progresso (nunca resposta de quest/apelido/
  // avatar/horário — ver decisão registrada em labs/lab-119-.../FEATURES.md) pra viabilizar o
  // relatório semanal por e-mail do responsável. Mesmo padrão de `productAnalytics.ts` (`fetch`
  // com `keepalive`, falha silenciosa, nunca trava o jogo da criança), mas autenticado com o
  // MESMO token de entitlement já usado por `refresh` — só funciona com uma família pareada, e só
  // deve ser chamado quando `entitlement.active` for `true` (quem chama decide isso, não esta
  // função, pra não duplicar a leitura de `entitlement` aqui).
  function syncProgressSummary(progress: Progress): void {
    const token = entitlement?.token
    if (!token) return
    fetch(`${ACCOUNTS_API_URL}/progress-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        level: getLevel(progress.xp),
        totalXp: progress.xp,
        coins: progress.coins,
        questsCompleted: progress.completedQuestIds.length + progress.completedPlanetQuestIds.length,
        badgesCount: progress.badges.length,
      }),
      keepalive: true,
    }).catch(() => {
      // offline/erro de rede — só tenta de novo na próxima sessão, sem incomodar a criança.
    })
  }

  // lab-142 (G6, docs/prompts/05-escala-e-viabilidade.md: "todo o progresso pago mora só no
  // aparelho — limpar dados apaga o que a família pagou, sem backup e sem restauração"). Diferente
  // de `syncProgressSummary` acima (resumo de 5 números pro e-mail), manda o `Profile`+`Progress`
  // INTEIROS — mesmo padrão de `fetch` com `keepalive`, falha silenciosa, nunca trava o jogo da
  // criança. Só deve ser chamado quando `entitlement.active` for `true` (mesma regra de
  // `syncProgressSummary`, decidida por quem chama, não por esta função).
  function syncProgressBackup(profile: Profile, progress: Progress): void {
    const token = entitlement?.token
    if (!token) return
    fetch(`${ACCOUNTS_API_URL}/progress-backup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ profile, progress }),
      keepalive: true,
    }).catch(() => {
      // offline/erro de rede — só tenta de novo na próxima sessão, sem incomodar a criança.
    })
  }

  // lab-142 — metade "restauração": chamada logo depois de um pareamento bem-sucedido
  // (`PairingScreen.tsx`), pra oferecer trazer de volta o progresso da família num aparelho
  // novo/dados limpos. `null` cobre TANTO "a família nunca sincronizou nada" (404) QUANTO
  // qualquer erro de rede — quem chama trata os dois casos como "nada pra restaurar", nunca
  // trava o fluxo de pareamento em si por causa disto.
  async function fetchProgressBackup(
    tokenOverride?: string,
  ): Promise<{ profile: Profile; progress: Progress } | null> {
    const token = tokenOverride ?? entitlement?.token
    if (!token) return null
    try {
      const res = await fetch(`${ACCOUNTS_API_URL}/progress-backup`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return null
      const body = (await res.json()) as { profile: Profile; progress: Progress }
      return { profile: body.profile, progress: body.progress }
    } catch {
      return null
    }
  }

  return {
    entitlement,
    redeemCode,
    redeeming,
    redeemError,
    refresh,
    unpair,
    syncProgressSummary,
    syncProgressBackup,
    fetchProgressBackup,
  }
}
