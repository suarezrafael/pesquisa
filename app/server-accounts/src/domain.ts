// Lógica de domínio pura do Worker de contas — sem import de `neon`/`Stripe`/`jose`, sem I/O,
// conforme docs/prompts/03-arquitetura-sistema.md §1 (mantém a regra de negócio separada do
// código que fala com banco/rede). Extraído no lab-83 especificamente pra poder ter teste
// unitário — requisito [MUST] de docs/prompts/04-manutencao-clean-code.md §5 pra "regra de
// entitlement por assinatura", a lógica mais custosa de errar silenciosamente aqui (liberar
// acesso pago de graça, ou negar acesso de quem pagou).

// Status do Stripe que contam como "assinatura ativa" pro entitlement do jogo. `trialing` conta
// porque hoje não existe período de teste configurado no Checkout, mas se um dia existir, a
// família já deve ter acesso durante o trial.
export function isEntitlementActive(status: string | undefined | null): boolean {
  return status === 'active' || status === 'trialing'
}

export interface PairingCodeRow {
  redeemed_at: string | null
  expires_at: string
}

// Um código só pode ser resgatado uma vez (`redeemed_at` ainda nulo) e dentro da janela de
// validade — as duas checagens que impedem um código de pareamento vazado/reaproveitado.
export function isPairingCodeUsable(row: PairingCodeRow | undefined, now: number = Date.now()): boolean {
  if (!row) return false
  if (row.redeemed_at) return false
  return new Date(row.expires_at).getTime() >= now
}

// Código de 6 dígitos, curto de propósito: é digitado à mão por uma criança pequena, num
// dispositivo que pode nem ter teclado físico. A segurança real está no rate limit de
// `/pairing/redeem` (lab-88) e na expiração curta (15min) + uso único (`redeemed_at`), não no
// tamanho do espaço de busca — mas gerar com `Math.random()` (não criptográfico, previsível em
// teoria a partir de amostras suficientes) era uma fraqueza desnecessária fácil de evitar.
// `crypto.getRandomValues` está disponível no runtime do Workers (Web Crypto API), sem
// dependência nova.
export function generatePairingCode(): string {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return (100000 + (buf[0] % 900000)).toString()
}

export function toIsoOrNull(unixSeconds: number | null | undefined): string | null {
  return typeof unixSeconds === 'number' ? new Date(unixSeconds * 1000).toISOString() : null
}

// lab-96, G8 (docs/prompts/05-escala-e-viabilidade.md): `schema.sql` antes só aceitava
// ('trialing','active','past_due','canceled'), mas o Stripe emite também estes quatro — Pix/boleto
// no Brasil com frequência nasce `incomplete` (o pagamento ainda não confirmou), e um evento nesse
// estado batia direto na *check constraint* do banco, o Worker devolvia 500, e o Stripe reenviava
// pra sempre. Mantido em JS (não só no banco) pra poder recusar um status desconhecido ANTES de
// tentar escrever — se o Stripe um dia emitir um valor novo que ainda não previmos, isso vira um
// "ignora e loga" em vez de um 500 que gera reentrega infinita.
const VALID_SUBSCRIPTION_STATUSES = new Set([
  'trialing',
  'active',
  'past_due',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'unpaid',
  'paused',
])

export function isValidSubscriptionStatus(status: string): boolean {
  return VALID_SUBSCRIPTION_STATUSES.has(status)
}

// lab-96, G8: o Stripe não garante ordem de entrega dos webhooks (retries de rede podem fazer um
// evento MAIS ANTIGO chegar DEPOIS de um mais novo já processado). Sem isso, um `updated` atrasado
// podia sobrescrever o estado de um `updated`/`deleted` mais recente já aplicado — voltando uma
// assinatura cancelada pra "ativa", por exemplo. Compara o `created` (Unix seconds, vem direto do
// evento do Stripe) do evento novo contra o do último evento realmente aplicado àquela assinatura;
// sem registro anterior, qualquer evento conta como mais novo.
export function isEventNewerThan(eventCreatedAtIso: string, lastAppliedIso: string | null | undefined): boolean {
  if (!lastAppliedIso) return true
  return new Date(eventCreatedAtIso).getTime() >= new Date(lastAppliedIso).getTime()
}

// lab-97, resto de G7 (docs/prompts/05-escala-e-viabilidade.md): decide se um token de entitlement
// deve ser tratado como revogado. Compatibilidade retroativa é o ponto central aqui — tokens
// emitidos ANTES deste laboratório (até 180 dias de famílias pagantes de verdade) não têm `jti` no
// JWT nem linha nenhuma em `entitlement_tokens`; tratar a AUSÊNCIA de `jti` como revogado
// invalidaria de uma vez só todo entitlement já emitido. Só um `jti` PRESENTE ativa a checagem de
// verdade contra o banco — falha fechada nesse caso (sem linha correspondente = revogado, nunca
// deveria acontecer na prática, mas não é motivo pra liberar acesso).
export function isTokenRevoked(
  jti: string | undefined,
  tokenRow: { revoked_at: string | null } | undefined,
): boolean {
  if (!jti) return false
  if (!tokenRow) return true
  return tokenRow.revoked_at !== null
}

// lab-97, resto de G7: limite de aparelhos (tokens não revogados) simultâneos por família,
// confirmado com o usuário — grande o bastante pra cobrir famílias com mais de um filho/aparelho
// sem fricção, pequeno o bastante pra limitar o estrago de um código vazado.
export const MAX_ACTIVE_DEVICES_PER_FAMILY = 3

export function isAtDeviceLimit(activeTokenCount: number): boolean {
  return activeTokenCount >= MAX_ACTIVE_DEVICES_PER_FAMILY
}

// lab-99, resto de G11 (prompt.md §12): allowlist fechada de eventos de produto aceitos por
// `POST /events` — mesma filosofia de "nunca confiar em input do client sem checar" já usada em
// `ALLOWED_CLIENT_MESSAGE_TYPES` do relay (server-cf-relay). Um tipo fora desta lista é
// silenciosamente recusado, não vira uma linha nova e imprevista na tabela de eventos.
const PRODUCT_EVENT_TYPES = new Set(['session_start', 'session_end', 'quest_completed'])

export function isValidProductEventType(type: string): boolean {
  return PRODUCT_EVENT_TYPES.has(type)
}

// lab-99: `session_end` carrega `durationMs` em `meta` — sanidade contra relógio de aparelho
// errado ou um bug futuro que mande um valor absurdo (isso já aconteceria por acidente e
// silenciosamente enviesaria a média de duração de sessão pra sempre, sem nenhum aviso). Teto de
// 4 horas: bem mais que qualquer sessão real de jogo esperada, mas ainda generoso o bastante pra
// não descartar sessão longa de verdade por engano.
const MAX_PLAUSIBLE_SESSION_DURATION_MS = 4 * 60 * 60 * 1000

export function isPlausibleSessionDuration(durationMs: unknown): durationMs is number {
  return typeof durationMs === 'number' && Number.isFinite(durationMs) && durationMs > 0 && durationMs <= MAX_PLAUSIBLE_SESSION_DURATION_MS
}
