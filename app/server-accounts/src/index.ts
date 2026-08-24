// Worker de contas/pagamento (fase comercial) — ver ../../../docs/plano-comercial-backend.md.
//
// Fase A: health-check (Neon via driver HTTP, sem conexão TCP persistente).
// Fase B: nenhuma rota nova aqui — login/cadastro do responsável fala direto com o Neon Auth
// gerenciado (ver app/src/components/FamilyPortal.tsx), sem passar por este Worker.
// Fase C: checkout de assinatura + webhook do Stripe + status de assinatura. O Worker nunca vê
// e-mail/senha do responsável — só um JWT de curta duração (~15min) emitido pelo Neon Auth,
// verificado aqui via JWKS (chave pública, sem segredo compartilhado com o Neon).
// Fase D (esta): pareamento com o jogo. A criança NUNCA autentica com e-mail/senha — troca um
// código curto (gerado pelo responsável no portal) por um token de entitlement assinado por nós
// mesmos (HMAC, `ENTITLEMENT_SECRET`), guardado localmente no jogo e revalidado em background.

import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import { createRemoteJWKSet, jwtVerify, SignJWT } from 'jose'
import Stripe from 'stripe'

type Sql = NeonQueryFunction<false, false>

export interface Env {
  DATABASE_URL: string
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
  STRIPE_PRICE_ID: string
  ENTITLEMENT_SECRET: string
}

// Endpoint real descoberto testando ao vivo (ver labs/lab-79.../CONTEXT.md) — a documentação
// oficial do Neon Auth usa um domínio que não resolve.
const NEON_AUTH_JWKS_URL =
  'https://ep-cool-meadow-aclfdwm0.neonauth.sa-east-1.aws.neon.tech/neondb/auth/.well-known/jwks.json'

// `createRemoteJWKSet` cacheia as chaves em memória do próprio processo do Worker — módulo
// carregado uma vez por isolate, não por request.
const jwks = createRemoteJWKSet(new URL(NEON_AUTH_JWKS_URL))

async function requireUserId(request: Request): Promise<string | null> {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice('Bearer '.length)
  try {
    const { payload } = await jwtVerify(token, jwks)
    return typeof payload.sub === 'string' ? payload.sub : null
  } catch {
    return null
  }
}

// Cria a linha em `family_accounts` no primeiro acesso autenticado que precisa dela (checkout ou
// consulta de status) — ver decisão registrada em labs/lab-79.../CONTEXT.md de não criar essa
// linha no cadastro, por falta de consumidor até agora.
async function findOrCreateFamilyAccount(sql: Sql, ownerUserId: string): Promise<string> {
  const existing = (await sql`
    select id from family_accounts where owner_user_id = ${ownerUserId}
  `) as { id: string }[]
  if (existing.length > 0) return existing[0].id
  const created = (await sql`
    insert into family_accounts (owner_user_id) values (${ownerUserId})
    returning id
  `) as { id: string }[]
  return created[0].id
}

function stripeClient(env: Env) {
  return new Stripe(env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  })
}

async function handleCheckout(request: Request, env: Env): Promise<Response> {
  const userId = await requireUserId(request)
  if (!userId) return Response.json({ error: 'não autenticado' }, { status: 401 })

  const sql = neon(env.DATABASE_URL)
  const familyAccountId = await findOrCreateFamilyAccount(sql, userId)

  const origin = request.headers.get('origin') ?? 'https://app-two-flax-92.vercel.app'
  const stripe = stripeClient(env)
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
    client_reference_id: familyAccountId,
    success_url: `${origin}/familia?assinatura=sucesso`,
    cancel_url: `${origin}/familia?assinatura=cancelada`,
  })

  if (!session.url) return Response.json({ error: 'falha ao criar checkout' }, { status: 502 })
  return Response.json({ url: session.url })
}

async function handleSubscriptionStatus(request: Request, env: Env): Promise<Response> {
  const userId = await requireUserId(request)
  if (!userId) return Response.json({ error: 'não autenticado' }, { status: 401 })

  const sql = neon(env.DATABASE_URL)
  const rows = (await sql`
    select s.status, s.current_period_end
    from subscriptions s
    join family_accounts f on f.id = s.family_account_id
    where f.owner_user_id = ${userId}
    order by s.updated_at desc
    limit 1
  `) as { status: string; current_period_end: string | null }[]

  if (rows.length === 0) return Response.json({ status: 'none' })
  return Response.json({ status: rows[0].status, currentPeriodEnd: rows[0].current_period_end })
}

// Código de 6 dígitos, curto de propósito: é digitado à mão por uma criança pequena, num
// dispositivo que pode nem ter teclado físico. Não precisa ser críptico — a segurança real está
// na expiração curta (15min) e no uso único (`redeemed_at`), não no tamanho do espaço de busca.
function generatePairingCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

const PAIRING_CODE_TTL_MS = 15 * 60 * 1000

async function handlePairingGenerate(request: Request, env: Env): Promise<Response> {
  const userId = await requireUserId(request)
  if (!userId) return Response.json({ error: 'não autenticado' }, { status: 401 })

  const sql = neon(env.DATABASE_URL)
  const familyAccountId = await findOrCreateFamilyAccount(sql, userId)
  const expiresAt = new Date(Date.now() + PAIRING_CODE_TTL_MS).toISOString()

  // Colisão de código de 6 dígitos entre famílias diferentes é rara mas possível (`code` é a
  // chave primária da tabela); tenta algumas vezes em vez de assumir que nunca colide.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generatePairingCode()
    try {
      await sql`
        insert into pairing_codes (code, family_account_id, expires_at)
        values (${code}, ${familyAccountId}, ${expiresAt})
      `
      return Response.json({ code, expiresAt })
    } catch {
      // colisão de chave primária — tenta outro código
    }
  }
  return Response.json({ error: 'não foi possível gerar um código, tente de novo' }, { status: 500 })
}

async function handlePairingRedeem(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { code?: string } | null
  const code = body?.code?.trim()
  if (!code) return Response.json({ error: 'código obrigatório' }, { status: 400 })

  const sql = neon(env.DATABASE_URL)
  const rows = (await sql`
    select family_account_id, expires_at, redeemed_at from pairing_codes where code = ${code}
  `) as { family_account_id: string; expires_at: string; redeemed_at: string | null }[]

  const row = rows[0]
  if (!row || row.redeemed_at || new Date(row.expires_at).getTime() < Date.now()) {
    return Response.json({ error: 'código inválido ou expirado' }, { status: 400 })
  }

  await sql`update pairing_codes set redeemed_at = now() where code = ${code}`

  const secret = new TextEncoder().encode(env.ENTITLEMENT_SECRET)
  const token = await new SignJWT({ familyAccountId: row.family_account_id })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(row.family_account_id)
    .setIssuedAt()
    .setExpirationTime('180d')
    .sign(secret)

  return Response.json({ token })
}

async function handleEntitlement(request: Request, env: Env): Promise<Response> {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return Response.json({ active: false }, { status: 401 })

  let familyAccountId: string
  try {
    const secret = new TextEncoder().encode(env.ENTITLEMENT_SECRET)
    const { payload } = await jwtVerify(auth.slice('Bearer '.length), secret)
    if (typeof payload.sub !== 'string') return Response.json({ active: false }, { status: 401 })
    familyAccountId = payload.sub
  } catch {
    return Response.json({ active: false }, { status: 401 })
  }

  const sql = neon(env.DATABASE_URL)
  const rows = (await sql`
    select status, current_period_end from subscriptions
    where family_account_id = ${familyAccountId}
    order by updated_at desc
    limit 1
  `) as { status: string; current_period_end: string | null }[]

  const active = rows.length > 0 && (rows[0].status === 'active' || rows[0].status === 'trialing')
  return Response.json({ active, expiresAt: active ? rows[0].current_period_end : null })
}

// Upsert manual (sem constraint única em `family_account_id`, de propósito — uma família pode
// trocar de assinatura Stripe ao longo do tempo) em vez de `insert ... on conflict`: atualiza a
// linha mais recente se existir, senão insere.
async function upsertSubscription(
  sql: Sql,
  params: {
    familyAccountId: string
    stripeCustomerId: string
    stripeSubscriptionId: string
    status: string
    currentPeriodEnd: string | null
  },
) {
  const existing = (await sql`
    select id from subscriptions where stripe_subscription_id = ${params.stripeSubscriptionId}
  `) as { id: string }[]

  if (existing.length > 0) {
    await sql`
      update subscriptions
      set status = ${params.status},
          current_period_end = ${params.currentPeriodEnd},
          stripe_customer_id = ${params.stripeCustomerId},
          updated_at = now()
      where id = ${existing[0].id}
    `
  } else {
    await sql`
      insert into subscriptions
        (family_account_id, stripe_customer_id, stripe_subscription_id, status, current_period_end)
      values
        (${params.familyAccountId}, ${params.stripeCustomerId}, ${params.stripeSubscriptionId},
         ${params.status}, ${params.currentPeriodEnd})
    `
  }
}

function toIsoOrNull(unixSeconds: number | null | undefined): string | null {
  return typeof unixSeconds === 'number' ? new Date(unixSeconds * 1000).toISOString() : null
}

async function handleStripeWebhook(request: Request, env: Env): Promise<Response> {
  const signature = request.headers.get('stripe-signature')
  if (!signature) return new Response('sem assinatura', { status: 400 })

  const body = await request.text()
  const stripe = stripeClient(env)
  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    return new Response(`assinatura inválida: ${(err as Error).message}`, { status: 400 })
  }

  const sql = neon(env.DATABASE_URL)

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const familyAccountId = session.client_reference_id
    const subscriptionId = session.subscription
    const customerId = session.customer
    if (familyAccountId && typeof subscriptionId === 'string' && typeof customerId === 'string') {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      await upsertSubscription(sql, {
        familyAccountId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodEnd: toIsoOrNull(subscription.items.data[0]?.current_period_end),
      })
    }
  } else if (
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    const subscription = event.data.object as Stripe.Subscription
    const existing = (await sql`
      select family_account_id from subscriptions where stripe_subscription_id = ${subscription.id}
    `) as { family_account_id: string }[]
    if (existing.length > 0) {
      await upsertSubscription(sql, {
        familyAccountId: existing[0].family_account_id,
        stripeCustomerId:
          typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
        stripeSubscriptionId: subscription.id,
        status: event.type === 'customer.subscription.deleted' ? 'canceled' : subscription.status,
        currentPeriodEnd: toIsoOrNull(subscription.items.data[0]?.current_period_end),
      })
    }
  }

  return Response.json({ received: true })
}

// CORS liberado (`*`) em todas as rotas chamadas via `fetch` do navegador (portal do responsável
// OU o próprio jogo da criança) — todas autenticadas por Bearer token no header `Authorization`
// (Neon Auth JWT ou o token de entitlement, dependendo da rota), nunca por cookie, então não há
// superfície de CSRF em abrir a origem. `/webhooks/stripe` fica de fora: nunca é chamado por um
// navegador, é o Stripe chamando o Worker direto.
function withCors(response: Response): Response {
  const headers = new Headers(response.headers)
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  return new Response(response.body, { status: response.status, headers })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return withCors(new Response(null, { status: 204 }))
    }

    if (url.pathname === '/health') {
      try {
        const sql = neon(env.DATABASE_URL)
        const [{ family_count }] = (await sql`select count(*)::int as family_count from family_accounts`) as [
          { family_count: number },
        ]
        return Response.json({ ok: true, familyCount: family_count })
      } catch (err) {
        return Response.json({ ok: false, error: (err as Error).message }, { status: 500 })
      }
    }

    if (url.pathname === '/checkout' && request.method === 'POST') {
      return withCors(await handleCheckout(request, env))
    }

    if (url.pathname === '/subscription' && request.method === 'GET') {
      return withCors(await handleSubscriptionStatus(request, env))
    }

    if (url.pathname === '/pairing/generate' && request.method === 'POST') {
      return withCors(await handlePairingGenerate(request, env))
    }

    if (url.pathname === '/pairing/redeem' && request.method === 'POST') {
      return withCors(await handlePairingRedeem(request, env))
    }

    if (url.pathname === '/entitlement' && request.method === 'GET') {
      return withCors(await handleEntitlement(request, env))
    }

    if (url.pathname === '/webhooks/stripe' && request.method === 'POST') {
      return handleStripeWebhook(request, env)
    }

    return new Response('missao-aprender-accounts ok — ver /health', { status: 200 })
  },
}
