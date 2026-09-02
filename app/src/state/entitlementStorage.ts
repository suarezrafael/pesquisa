// Guarda o token de entitlement (Fase D do plano comercial, ver docs/plano-comercial-backend.md)
// só localmente, no navegador da criança — nunca chega e-mail/senha/nome do responsável aqui,
// só um token opaco assinado pelo Worker de contas.

const ENTITLEMENT_KEY = 'jogo-educativo:entitlement'

export interface StoredEntitlement {
  token: string
  active: boolean
  expiresAt: string | null
}

export function loadEntitlement(): StoredEntitlement | null {
  const raw = localStorage.getItem(ENTITLEMENT_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredEntitlement
  } catch {
    return null
  }
}

export function saveEntitlement(entitlement: StoredEntitlement): void {
  localStorage.setItem(ENTITLEMENT_KEY, JSON.stringify(entitlement))
}

export function clearEntitlement(): void {
  localStorage.removeItem(ENTITLEMENT_KEY)
}

// lab-90 (docs/prompts/05-escala-e-viabilidade.md G6): `useEntitlement.refresh()` revalida o
// entitlement salvo a cada carregamento do jogo. Um `401` do `/entitlement` (JWT ausente/inválido
// — ver `server-accounts/src/index.ts:handleEntitlement`) é o servidor recusando o token de forma
// EXPLÍCITA e definitiva, diferente de uma falha de rede/servidor (offline, 5xx) — nesses casos
// sim faz sentido manter o cache local (mesma filosofia "funciona offline" do resto do jogo).
// Distinguir os dois é o que fecha o bug: sem isso, editar `localStorage` manualmente pra
// `active: true` com um token qualquer sobrevivia pra sempre, porque a resposta 401 (correta) era
// tratada como se fosse uma falha de rede e descartada em vez de aplicada.
export function shouldTrustCachedEntitlementOnFailure(status: number): boolean {
  return status !== 401
}
