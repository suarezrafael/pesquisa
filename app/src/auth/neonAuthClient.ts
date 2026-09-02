// Cliente do Neon Auth (Managed Better Auth) — só usado pelo portal dos responsáveis
// (`FamilyPortal.tsx`). A criança nunca passa por aqui (ver docs/plano-comercial-backend.md,
// princípio "a criança continua anônima" — nenhum dado dela chega no Neon Auth).
import { createAuthClient } from '@neondatabase/neon-js/auth'

export const authClient = createAuthClient(import.meta.env.VITE_NEON_AUTH_URL as string)
