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
