import { useEffect, useState } from 'react'
import { clearEntitlement, loadEntitlement, saveEntitlement, type StoredEntitlement } from './entitlementStorage'

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
      // Erro de rede/servidor: mantém o cache local em vez de apagar — mesma filosofia "funciona
      // offline" já aplicada ao PWA do jogo. Só uma resposta explícita do servidor muda o estado.
      if (!res.ok) return
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

  async function redeemCode(code: string): Promise<boolean> {
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
        return false
      }
      const next: StoredEntitlement = { token: body.token, active: false, expiresAt: null }
      saveEntitlement(next)
      setEntitlement(next)
      await refresh(body.token)
      return true
    } catch {
      setRedeemError('Não foi possível conectar. Tente de novo.')
      return false
    } finally {
      setRedeeming(false)
    }
  }

  function unpair() {
    clearEntitlement()
    setEntitlement(null)
  }

  return { entitlement, redeemCode, redeeming, redeemError, refresh, unpair }
}
