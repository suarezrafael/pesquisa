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
import {
  generatePairingCode,
  isAtDeviceLimit,
  isEntitlementActive,
  isEventNewerThan,
  isPlausibleSessionDuration,
  isTokenRevoked,
  isValidProductEventType,
  isValidSubscriptionStatus,
  toIsoOrNull,
} from './domain'

type Sql = NeonQueryFunction<false, false>

export interface Env {
  DATABASE_URL: string
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
  STRIPE_PRICE_ID: string
  ENTITLEMENT_SECRET: string
  // lab-99, resto de G11: segredo compartilhado pra proteger `GET /admin/metrics` — não é dado de
  // nenhuma família específica, mas ainda é métrica de negócio agregada, não fica público.
  // `wrangler secret put ADMIN_METRICS_SECRET` em produção, `.dev.vars` localmente.
  ADMIN_METRICS_SECRET: string
  // Rate limiting nativo do Workers (lab-88, pedido do usuário: "o jogo precisa estar seguro com
  // sobrecarga de servidor") — um namespace por rota sensível, configurado em wrangler.toml.
  PAIRING_REDEEM_LIMITER: RateLimit
  HEALTH_LIMITER: RateLimit
  CLIENT_ERROR_LIMITER: RateLimit
  EVENTS_LIMITER: RateLimit
  CHECKOUT_LIMITER: RateLimit
  PAIRING_GENERATE_LIMITER: RateLimit
}

// IP real do cliente — Cloudflare sempre preenche esse header nos Workers (não é confiável vindo
// de fora da rede deles, mas aqui é a própria Cloudflare quem está setando, então é seguro usar
// como chave de rate limit). Sem IP (ex.: `wrangler dev` local), cai num valor fixo — rate limit
// vira "por processo local" em vez de "por IP", suficiente pra não travar o desenvolvimento.
function clientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') ?? 'dev-local'
}

// `RateLimit.limit()` conta a chamada mesmo quando o resultado é "estourou" — chamar de novo pra
// "descontar" a tentativa bloqueada só inflaria a contagem à toa; só chama uma vez e devolve
// `null` (segue o fluxo normal) ou a `Response` 429 já pronta pra devolver.
async function rateLimited(limiter: RateLimit, key: string): Promise<Response | null> {
  const { success } = await limiter.limit({ key })
  if (success) return null
  return Response.json({ error: 'muitas tentativas, aguarde um pouco e tente de novo' }, { status: 429 })
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

  const limited = await rateLimited(env.CHECKOUT_LIMITER, clientIp(request))
  if (limited) return limited

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

// Profissionalização do produto (pedido do usuário em 2026-08-24): sem isso, cancelar a
// assinatura exigia contato manual com suporte — inaceitável pra um produto que cobra
// recorrência de pais de verdade, e uma exigência de fato do CDC (cancelamento tem que ser tão
// fácil quanto a contratação). Devolve a URL do Customer Portal hospedado pelo próprio Stripe
// (gerencia forma de pagamento, histórico de fatura e cancelamento sem nenhum código nosso).
async function handleBillingPortal(request: Request, env: Env): Promise<Response> {
  const userId = await requireUserId(request)
  if (!userId) return Response.json({ error: 'não autenticado' }, { status: 401 })

  const sql = neon(env.DATABASE_URL)
  const rows = (await sql`
    select s.stripe_customer_id
    from subscriptions s
    join family_accounts f on f.id = s.family_account_id
    where f.owner_user_id = ${userId}
    order by s.updated_at desc
    limit 1
  `) as { stripe_customer_id: string }[]

  if (rows.length === 0) {
    return Response.json({ error: 'nenhuma assinatura encontrada' }, { status: 404 })
  }

  const origin = request.headers.get('origin') ?? 'https://app-two-flax-92.vercel.app'
  const stripe = stripeClient(env)
  const session = await stripe.billingPortal.sessions.create({
    customer: rows[0].stripe_customer_id,
    return_url: `${origin}/familia`,
  })

  return Response.json({ url: session.url })
}

// Captura de erro do client (lab-84) — em vez de um serviço de terceiro (exigiria criar conta
// nova, ver labs/lab-84-.../CONTEXT.md), loga via `console.error` — visível em `wrangler tail` e
// no painel de Logs da Cloudflare (mesma conta que já hospeda este Worker). Sem autenticação de
// propósito (o erro pode acontecer antes do jogo saber se há sessão), sem persistir em banco
// (não é dado que precise de retenção/gestão própria) e sem nenhum dado pessoal da criança —
// só mensagem/stack/URL/user-agent do navegador.
async function handleClientError(request: Request, env: Env): Promise<Response> {
  const limited = await rateLimited(env.CLIENT_ERROR_LIMITER, clientIp(request))
  if (limited) return limited

  const body = await request.text()
  if (body.length > 8000) return new Response(null, { status: 413 })

  let payload: unknown
  try {
    payload = JSON.parse(body)
  } catch {
    return new Response(null, { status: 400 })
  }
  if (!payload || typeof payload !== 'object') return new Response(null, { status: 400 })

  const { message, stack, url, userAgent } = payload as Record<string, unknown>
  console.error(
    '[client-error]',
    JSON.stringify({
      message: typeof message === 'string' ? message.slice(0, 2000) : undefined,
      stack: typeof stack === 'string' ? stack.slice(0, 4000) : undefined,
      url: typeof url === 'string' ? url.slice(0, 500) : undefined,
      userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 300) : undefined,
    }),
  )
  return new Response(null, { status: 204 })
}

// lab-99, resto de G11 (prompt.md §12) — evento de produto ANÔNIMO (`deviceId` é um
// `crypto.randomUUID()` sem vínculo nenhum com nome/e-mail/apelido/família, gerado e guardado só
// no `localStorage` do aparelho da criança). Sem autenticação de propósito, mesmo padrão de
// `handleClientError` acima — mas com allowlist de tipo (`isValidProductEventType`) porque, ao
// contrário de um erro (que só é logado, nunca alimenta uma métrica agregada), um evento errado
// aqui enviesaria D1/D7/duração de sessão pra sempre sem nenhum aviso.
async function handleTrackEvent(request: Request, env: Env): Promise<Response> {
  const limited = await rateLimited(env.EVENTS_LIMITER, clientIp(request))
  if (limited) return limited

  const body = await request.text()
  if (body.length > 4000) return new Response(null, { status: 413 })

  let payload: unknown
  try {
    payload = JSON.parse(body)
  } catch {
    return new Response(null, { status: 400 })
  }
  if (!payload || typeof payload !== 'object') return new Response(null, { status: 400 })

  const { deviceId, type, occurredAt, meta } = payload as Record<string, unknown>
  if (typeof deviceId !== 'string' || typeof type !== 'string' || typeof occurredAt !== 'string') {
    return new Response(null, { status: 400 })
  }
  if (!isValidProductEventType(type)) return new Response(null, { status: 400 })

  // `session_end` é o único tipo com um campo de `meta` que a gente realmente confia pra cálculo
  // (duração) — os outros podem mandar `meta` livre, mas ele só é gravado como está (nunca lido de
  // volta em cálculo nenhum), então não precisa de validação própria.
  let safeMeta: unknown = null
  if (meta && typeof meta === 'object') {
    const metaObj = meta as Record<string, unknown>
    if (type === 'session_end' && !isPlausibleSessionDuration(metaObj.durationMs)) {
      safeMeta = null // descarta um durationMs implausível em vez de recusar o evento inteiro
    } else {
      safeMeta = metaObj
    }
  }

  const sql = neon(env.DATABASE_URL)
  try {
    await sql`
      insert into product_events (device_id, event_type, occurred_at, meta)
      values (${deviceId}, ${type}, ${occurredAt}, ${safeMeta ? JSON.stringify(safeMeta) : null})
    `
  } catch (err) {
    // `device_id` inválido (não é um UUID de verdade) bate na checagem de tipo da coluna e lança
    // aqui — não é um erro de servidor de verdade, é input malformado; loga mas ainda devolve
    // sucesso pro client (não há nada que ele possa fazer a respeito, e não vale a pena o client
    // ficar tentando de novo).
    console.error('[track-event-invalid]', String(err))
  }
  return new Response(null, { status: 204 })
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

const PAIRING_CODE_TTL_MS = 15 * 60 * 1000

async function handlePairingGenerate(request: Request, env: Env): Promise<Response> {
  const userId = await requireUserId(request)
  if (!userId) return Response.json({ error: 'não autenticado' }, { status: 401 })

  const limited = await rateLimited(env.PAIRING_GENERATE_LIMITER, clientIp(request))
  if (limited) return limited

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

const PAIRING_REDEEM_ATTEMPT_LIMIT = 8
const PAIRING_REDEEM_WINDOW_MS = 60 * 1000

// Rate limit de verdade pra `/pairing/redeem`, guardado no Postgres (lab-88). Achado real
// durante este laboratório: o binding nativo de Rate Limiting do Workers (`PAIRING_REDEEM_LIMITER`
// abaixo) simula corretamente em `wrangler dev` local (bloqueia exatamente no limite configurado,
// testado ao vivo), mas em PRODUÇÃO não bloqueou nenhuma de 100 chamadas concorrentes contra um
// limite de 20/60s — motivo não confirmado (não documentado pela Cloudflare se é limitação do
// plano Free ou bug da plataforma). Esta é a rota mais crítica da auditoria (sem limite de
// tentativas, força bruta do código de 6 dígitos é praticamente garantida dentro da janela de
// validade), então a defesa principal não pode depender de um mecanismo não verificado em
// produção — um UPSERT atômico no Postgres (já a peça de infra comprovadamente confiável deste
// Worker) implementa o mesmo limite sem essa incerteza. O binding nativo continua chamado logo
// abaixo como camada extra, sem custo real de manter.
async function checkPairingRedeemAttempts(sql: Sql, ip: string): Promise<boolean> {
  const now = new Date()
  const windowCutoff = new Date(now.getTime() - PAIRING_REDEEM_WINDOW_MS)
  const rows = (await sql`
    insert into pairing_redeem_attempts (ip, window_start, count)
    values (${ip}, ${now.toISOString()}, 1)
    on conflict (ip) do update set
      count = case
        when pairing_redeem_attempts.window_start < ${windowCutoff.toISOString()} then 1
        else pairing_redeem_attempts.count + 1
      end,
      window_start = case
        when pairing_redeem_attempts.window_start < ${windowCutoff.toISOString()} then ${now.toISOString()}
        else pairing_redeem_attempts.window_start
      end
    returning count
  `) as { count: number }[]
  return rows[0].count <= PAIRING_REDEEM_ATTEMPT_LIMIT
}

async function handlePairingRedeem(request: Request, env: Env): Promise<Response> {
  // Achado crítico da auditoria de segurança (lab-88): sem isso, um único script conseguia
  // tentar as ~900.000 combinações do código de 6 dígitos dentro da janela de validade de 15 min
  // (900.000 ÷ 900s = só 1.000 tentativas/s, trivial de sustentar) — sequestrar a assinatura de
  // qualquer família enquanto o código dela estivesse ativo era praticamente garantido.
  const ip = clientIp(request)
  // Binding nativo primeiro (barato, sem tocar o banco quando funciona) — ver comentário acima
  // sobre por que não é a defesa principal.
  const limited = await rateLimited(env.PAIRING_REDEEM_LIMITER, ip)
  if (limited) return limited

  const sql = neon(env.DATABASE_URL)
  const withinLimit = await checkPairingRedeemAttempts(sql, ip)
  if (!withinLimit) {
    return Response.json({ error: 'muitas tentativas, aguarde um pouco e tente de novo' }, { status: 429 })
  }

  const body = (await request.json().catch(() => null)) as { code?: string } | null
  const code = body?.code?.trim()
  if (!code) return Response.json({ error: 'código obrigatório' }, { status: 400 })
  // UPDATE atômico com a condição de validade embutida no WHERE, em vez de `select` + `update`
  // separados (achado da auditoria: duas chamadas simultâneas com o mesmo código conseguiam
  // resgatar o mesmo código duas vezes, gerando dois tokens de 180 dias). Uma linha só volta se
  // o código existir, não tiver sido resgatado ainda E estiver dentro da validade — a mesma
  // checagem de `isPairingCodeUsable`, só que expressa como condição SQL pra ser atômica.
  const rows = (await sql`
    update pairing_codes
    set redeemed_at = now()
    where code = ${code} and redeemed_at is null and expires_at >= now()
    returning family_account_id
  `) as { family_account_id: string }[]

  if (rows.length === 0) {
    return Response.json({ error: 'código inválido ou expirado' }, { status: 400 })
  }
  const row = rows[0]

  // lab-97, resto de G7: limite de aparelhos por família (não de aparelho de verdade — contagem
  // de tokens emitidos e ainda não revogados, ver `docs/prompts/05-escala-e-viabilidade.md`).
  // Revoga o mais antigo pra abrir espaço em vez de recusar o pareamento novo — zero fricção
  // quando a criança troca de aparelho, sem precisar de uma tela de "gerenciar aparelhos".
  const activeTokens = (await sql`
    select jti from entitlement_tokens
    where family_account_id = ${row.family_account_id} and revoked_at is null
    order by issued_at asc
  `) as { jti: string }[]
  if (isAtDeviceLimit(activeTokens.length)) {
    await sql`update entitlement_tokens set revoked_at = now() where jti = ${activeTokens[0].jti}`
  }

  const jti = crypto.randomUUID()
  await sql`insert into entitlement_tokens (jti, family_account_id) values (${jti}, ${row.family_account_id})`

  const secret = new TextEncoder().encode(env.ENTITLEMENT_SECRET)
  const token = await new SignJWT({ familyAccountId: row.family_account_id })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(row.family_account_id)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime('180d')
    .sign(secret)

  return Response.json({ token })
}

async function handleEntitlement(request: Request, env: Env): Promise<Response> {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return Response.json({ active: false }, { status: 401 })

  let familyAccountId: string
  let jti: string | undefined
  try {
    const secret = new TextEncoder().encode(env.ENTITLEMENT_SECRET)
    const { payload } = await jwtVerify(auth.slice('Bearer '.length), secret)
    if (typeof payload.sub !== 'string') return Response.json({ active: false }, { status: 401 })
    familyAccountId = payload.sub
    jti = payload.jti
  } catch {
    return Response.json({ active: false }, { status: 401 })
  }

  const sql = neon(env.DATABASE_URL)

  // lab-97, resto de G7: token sem `jti` (emitido antes deste laboratório) mantém o comportamento
  // de sempre (confia só na assinatura/expiração) — `isTokenRevoked` já cobre essa compatibilidade
  // retroativa. Só consulta `entitlement_tokens` quando o JWT TEM `jti` de verdade.
  if (jti) {
    const tokenRows = (await sql`
      select revoked_at from entitlement_tokens where jti = ${jti}
    `) as { revoked_at: string | null }[]
    if (isTokenRevoked(jti, tokenRows[0])) {
      return Response.json({ active: false }, { status: 401 })
    }
  }

  const rows = (await sql`
    select status, current_period_end from subscriptions
    where family_account_id = ${familyAccountId}
    order by updated_at desc
    limit 1
  `) as { status: string; current_period_end: string | null }[]

  const active = rows.length > 0 && isEntitlementActive(rows[0].status)
  return Response.json({ active, expiresAt: active ? rows[0].current_period_end : null })
}

// lab-97, resto de G7: válvula de segurança pro responsável — "vazei meu código de pareamento,
// quero cortar o acesso de todo mundo que possa ter pego ele". Autenticado como o RESPONSÁVEL
// (`requireUserId`, JWT do Neon Auth), nunca pelo token de entitlement da criança — o mesmo padrão
// já usado em `/pairing/generate`/`/checkout`. Revoga TODOS os aparelhos de uma vez (v1 simples,
// sem lista granular de aparelhos — ver "Fora de escopo" em FEATURES.md) — a criança perde acesso
// e precisa parear de novo com um código novo.
async function handleRevokeAllDevices(request: Request, env: Env): Promise<Response> {
  const userId = await requireUserId(request)
  if (!userId) return Response.json({ error: 'não autenticado' }, { status: 401 })

  const sql = neon(env.DATABASE_URL)
  const familyAccountId = await findOrCreateFamilyAccount(sql, userId)
  const revoked = (await sql`
    update entitlement_tokens
    set revoked_at = now()
    where family_account_id = ${familyAccountId} and revoked_at is null
    returning jti
  `) as { jti: string }[]

  return Response.json({ revokedCount: revoked.length })
}

// lab-100, resto de G7: lista os aparelhos pareados da família de quem chama, pra alimentar a UI
// de revogação individual (até aqui só existia "revogar todos"). Sem fingerprint/user-agent (fora
// de escopo desde o lab-97) — a única identificação de cada aparelho é a data de pareamento.
async function handleListDevices(request: Request, env: Env): Promise<Response> {
  const userId = await requireUserId(request)
  if (!userId) return Response.json({ error: 'não autenticado' }, { status: 401 })

  const sql = neon(env.DATABASE_URL)
  const familyAccountId = await findOrCreateFamilyAccount(sql, userId)
  const rows = (await sql`
    select jti, issued_at, revoked_at
    from entitlement_tokens
    where family_account_id = ${familyAccountId}
    order by issued_at desc
  `) as { jti: string; issued_at: string; revoked_at: string | null }[]

  return Response.json({
    devices: rows.map((row) => ({
      jti: row.jti,
      issuedAt: row.issued_at,
      revokedAt: row.revoked_at,
    })),
  })
}

// lab-100, resto de G7: revoga UM aparelho específico (em vez de todos, `handleRevokeAllDevices`
// acima). A checagem `family_account_id = ...` na mesma query é o que impede um responsável de
// revogar o `jti` de OUTRA família — 404 genérico tanto pra "não existe" quanto pra "não é seu",
// pra não vazar se um `jti` alheio existe.
async function handleRevokeDevice(request: Request, env: Env): Promise<Response> {
  const userId = await requireUserId(request)
  if (!userId) return Response.json({ error: 'não autenticado' }, { status: 401 })

  const body = (await request.json().catch(() => null)) as { jti?: string } | null
  if (!body?.jti) return Response.json({ error: 'jti obrigatório' }, { status: 400 })

  const sql = neon(env.DATABASE_URL)
  const familyAccountId = await findOrCreateFamilyAccount(sql, userId)
  const revoked = (await sql`
    update entitlement_tokens
    set revoked_at = now()
    where jti = ${body.jti} and family_account_id = ${familyAccountId} and revoked_at is null
    returning jti
  `) as { jti: string }[]

  if (revoked.length === 0) return Response.json({ error: 'aparelho não encontrado' }, { status: 404 })
  return Response.json({ revoked: true })
}

// lab-99, resto de G11 (prompt.md §12) — métricas de product-market fit, calculadas sob demanda a
// partir de `product_events` (nenhuma tabela de agregado pré-computado ainda; volume baixo o
// bastante hoje pra isso não importar). Protegido por segredo compartilhado no header (não é dado
// de família nenhuma específica, mas ainda é métrica de negócio agregada — não fica público).
async function handleAdminMetrics(request: Request, env: Env): Promise<Response> {
  const secret = request.headers.get('x-admin-secret')
  if (!secret || secret !== env.ADMIN_METRICS_SECRET) {
    return Response.json({ error: 'não autorizado' }, { status: 401 })
  }

  const sql = neon(env.DATABASE_URL)

  // D1/D7 retention: de todo dispositivo cujo PRIMEIRO evento foi há pelo menos 1 (ou 7) dias,
  // qual fração teve QUALQUER evento novo exatamente 1 (ou 7) dias depois desse primeiro dia.
  const [retention] = (await sql`
    with first_seen as (
      select device_id, min(occurred_at)::date as day0
      from product_events
      group by device_id
    ),
    d1_eligible as (
      select device_id, day0 from first_seen where day0 <= current_date - 1
    ),
    d1_returned as (
      select distinct fs.device_id
      from d1_eligible fs
      join product_events pe on pe.device_id = fs.device_id and pe.occurred_at::date = fs.day0 + 1
    ),
    d7_eligible as (
      select device_id, day0 from first_seen where day0 <= current_date - 7
    ),
    d7_returned as (
      select distinct fs.device_id
      from d7_eligible fs
      join product_events pe on pe.device_id = fs.device_id and pe.occurred_at::date = fs.day0 + 7
    )
    select
      (select count(*) from d1_eligible) as d1_eligible,
      (select count(*) from d1_returned) as d1_returned,
      (select count(*) from d7_eligible) as d7_eligible,
      (select count(*) from d7_returned) as d7_returned
  `) as { d1_eligible: string; d1_returned: string; d7_eligible: string; d7_returned: string }[]

  const [session] = (await sql`
    select avg((meta->>'durationMs')::numeric) as avg_duration_ms, count(*) as sample_size
    from product_events
    where event_type = 'session_end' and meta ? 'durationMs'
  `) as { avg_duration_ms: string | null; sample_size: string }[]

  const [quests] = (await sql`
    with per_device as (
      select device_id, count(*) as quest_count
      from product_events
      where event_type = 'quest_completed'
      group by device_id
    )
    select avg(quest_count) as avg_quests_per_device, count(*) as devices_with_quest
    from per_device
  `) as { avg_quests_per_device: string | null; devices_with_quest: string }[]

  const [devices] = (await sql`
    select count(distinct device_id) as total_devices from product_events
  `) as { total_devices: string }[]

  const d1Eligible = Number(retention.d1_eligible)
  const d1Returned = Number(retention.d1_returned)
  const d7Eligible = Number(retention.d7_eligible)
  const d7Returned = Number(retention.d7_returned)

  return Response.json({
    totalDevices: Number(devices.total_devices),
    d1Retention: {
      eligibleDevices: d1Eligible,
      returnedDevices: d1Returned,
      percent: d1Eligible > 0 ? Math.round((d1Returned / d1Eligible) * 10000) / 100 : null,
    },
    d7Retention: {
      eligibleDevices: d7Eligible,
      returnedDevices: d7Returned,
      percent: d7Eligible > 0 ? Math.round((d7Returned / d7Eligible) * 10000) / 100 : null,
    },
    avgSessionDurationMs: session.avg_duration_ms ? Math.round(Number(session.avg_duration_ms)) : null,
    sessionSampleSize: Number(session.sample_size),
    avgQuestsCompletedPerDevice: quests.avg_quests_per_device
      ? Math.round(Number(quests.avg_quests_per_device) * 100) / 100
      : null,
    devicesWithAtLeastOneQuest: Number(quests.devices_with_quest),
  })
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
    // lab-96, G8: `created` do evento do Stripe (não de quando o Worker processou) — usado pra
    // recusar um evento que chegue fora de ordem, ver `isEventNewerThan` (`domain.ts`).
    eventCreatedAt: string
  },
) {
  // lab-96, G8: falha fechada — um status que o Stripe emita e ainda não previmos vira "ignora e
  // loga" aqui, não um 500 que bateria na *check constraint* do banco e geraria reentrega infinita.
  if (!isValidSubscriptionStatus(params.status)) {
    console.error(`status de assinatura desconhecido do Stripe, ignorando: "${params.status}"`)
    return
  }

  const existing = (await sql`
    select id, last_event_created_at from subscriptions where stripe_subscription_id = ${params.stripeSubscriptionId}
  `) as { id: string; last_event_created_at: string | null }[]

  if (existing.length > 0) {
    // lab-96, G8: o Stripe não garante ordem de entrega — um evento mais antigo chegando depois de
    // um mais novo já aplicado não deve reverter o estado (ex.: voltar "cancelado" pra "ativo").
    if (!isEventNewerThan(params.eventCreatedAt, existing[0].last_event_created_at)) return
    await sql`
      update subscriptions
      set status = ${params.status},
          current_period_end = ${params.currentPeriodEnd},
          stripe_customer_id = ${params.stripeCustomerId},
          last_event_created_at = ${params.eventCreatedAt},
          updated_at = now()
      where id = ${existing[0].id}
    `
  } else {
    await sql`
      insert into subscriptions
        (family_account_id, stripe_customer_id, stripe_subscription_id, status, current_period_end,
         last_event_created_at)
      values
        (${params.familyAccountId}, ${params.stripeCustomerId}, ${params.stripeSubscriptionId},
         ${params.status}, ${params.currentPeriodEnd}, ${params.eventCreatedAt})
    `
  }
}

// lab-96, G8: a partir da versão da API usada por este SDK (`stripe` 22.x), a fatura não tem mais
// um campo `subscription` no nível raiz — a referência mudou pra
// `parent.subscription_details.subscription` (confirmado em node_modules/stripe/.../Invoices.d.ts,
// não suposição).
function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const subscription = invoice.parent?.subscription_details?.subscription
  if (!subscription) return null
  return typeof subscription === 'string' ? subscription : subscription.id
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

  // lab-96, G8: idempotência de verdade — o Stripe reenvia um evento sempre que não recebe 2xx a
  // tempo, inclusive por instabilidade transitória sem relação nenhuma com o evento em si. Checado
  // logo aqui, antes de qualquer efeito colateral (era o gap principal do G8: sem isso, reentrega
  // podia reaplicar a mesma mudança, e duas entregas concorrentes do MESMO evento podiam processar
  // em paralelo).
  const alreadyProcessed = (await sql`
    select 1 from stripe_webhook_events where event_id = ${event.id}
  `) as unknown[]
  if (alreadyProcessed.length > 0) {
    return Response.json({ received: true, deduped: true })
  }

  const eventCreatedAt = toIsoOrNull(event.created) ?? new Date().toISOString()

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
        eventCreatedAt,
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
        eventCreatedAt,
      })
    }
  } else if (event.type === 'invoice.payment_failed') {
    // lab-96, G8: nenhum handler existia pra este tipo de evento antes — sem reagir, nosso banco só
    // ficava sabendo de uma falha de pagamento se/quando um `customer.subscription.updated`
    // separado também chegasse (o Stripe costuma emitir os dois, mas não é garantido). Busca o
    // estado VERDADEIRO direto do Stripe (mesmo padrão já usado em `checkout.session.completed`)
    // em vez de tentar inferir o novo status a partir da fatura.
    const invoice = event.data.object as Stripe.Invoice
    const subscriptionId = invoiceSubscriptionId(invoice)
    if (subscriptionId) {
      const existing = (await sql`
        select family_account_id from subscriptions where stripe_subscription_id = ${subscriptionId}
      `) as { family_account_id: string }[]
      if (existing.length > 0) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        await upsertSubscription(sql, {
          familyAccountId: existing[0].family_account_id,
          stripeCustomerId:
            typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          currentPeriodEnd: toIsoOrNull(subscription.items.data[0]?.current_period_end),
          eventCreatedAt,
        })
      }
    }
  }

  // lab-96, G8: gravado por ÚLTIMO, só depois de processar com sucesso — se algo acima lançar, o
  // evento fica de fora desta tabela e uma reentrega do Stripe tenta de novo, em vez de marcar
  // "processado" um evento que na real falhou no meio do caminho.
  await sql`
    insert into stripe_webhook_events (event_id, event_type) values (${event.id}, ${event.type})
    on conflict do nothing
  `

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
      // Achado da auditoria de segurança (lab-88, `docs/prompts/05-escala-e-viabilidade.md` G9):
      // isto consultava o Neon a cada chamada — um monitor de disponibilidade normal (batendo a
      // cada minuto, uso completamente legítimo) já bastava pra impedir o compute do Neon de
      // suspender (scale-to-zero), queimando a cota gratuita de 100 CU-horas/mês e podendo
      // derrubar assinaturas pagas de verdade no meio do mês. `/health` público precisa ser
      // barato/estático por definição — prova que o Worker está de pé, não que o banco está
      // acessível. Rate limit aqui é defesa em profundidade (mesmo uma resposta estática ainda
      // consome a cota de requests do Worker se inundada) — best-effort: ver nota em
      // `checkPairingRedeemAttempts` sobre o binding nativo não bloquear nada em produção nesta
      // conta; aceitável aqui porque `/health` não toca banco nem faz nada custoso, diferente de
      // `/pairing/redeem`.
      const limited = await rateLimited(env.HEALTH_LIMITER, clientIp(request))
      if (limited) return limited
      return Response.json({ ok: true })
    }

    if (url.pathname === '/client-error' && request.method === 'POST') {
      return withCors(await handleClientError(request, env))
    }

    if (url.pathname === '/events' && request.method === 'POST') {
      return withCors(await handleTrackEvent(request, env))
    }

    if (url.pathname === '/admin/metrics' && request.method === 'GET') {
      return withCors(await handleAdminMetrics(request, env))
    }

    if (url.pathname === '/checkout' && request.method === 'POST') {
      return withCors(await handleCheckout(request, env))
    }

    if (url.pathname === '/subscription' && request.method === 'GET') {
      return withCors(await handleSubscriptionStatus(request, env))
    }

    if (url.pathname === '/billing-portal' && request.method === 'POST') {
      return withCors(await handleBillingPortal(request, env))
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

    if (url.pathname === '/entitlement/revoke-all' && request.method === 'POST') {
      return withCors(await handleRevokeAllDevices(request, env))
    }

    if (url.pathname === '/entitlement/devices' && request.method === 'GET') {
      return withCors(await handleListDevices(request, env))
    }

    if (url.pathname === '/entitlement/revoke' && request.method === 'POST') {
      return withCors(await handleRevokeDevice(request, env))
    }

    if (url.pathname === '/webhooks/stripe' && request.method === 'POST') {
      return handleStripeWebhook(request, env)
    }

    return new Response('missao-aprender-accounts ok — ver /health', { status: 200 })
  },
}
