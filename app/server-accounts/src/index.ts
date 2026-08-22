// Worker de contas/pagamento (fase comercial) — ver ../../../docs/plano-comercial-backend.md.
// Fase A (fundação): só um health-check que prova que o runtime de borda (Workers) consegue
// falar com o Neon via driver HTTP (`@neondatabase/serverless`, desenhado pra edge — sem conexão
// TCP persistente). As rotas reais (auth, checkout, pareamento, entitlement) chegam nas fases
// B-D; nenhuma delas existe ainda de propósito.

import { neon } from '@neondatabase/serverless'

export interface Env {
  DATABASE_URL: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname !== '/health') {
      return new Response('missao-aprender-accounts ok — ver /health', { status: 200 })
    }
    try {
      const sql = neon(env.DATABASE_URL)
      const [{ family_count }] = (await sql`select count(*)::int as family_count from family_accounts`) as [
        { family_count: number },
      ]
      return Response.json({ ok: true, familyCount: family_count })
    } catch (err) {
      return Response.json({ ok: false, error: (err as Error).message }, { status: 500 })
    }
  },
}
