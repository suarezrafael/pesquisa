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

// lab-102, resto de G8: achado real ao construir a reconciliação — colunas `timestamptz` voltam do
// driver `@neondatabase/serverless` como objeto `Date` de verdade em tempo de execução, apesar do
// tipo declarado em todo o resto deste Worker ser `string | null` (inofensivo em todo outro lugar
// porque `Response.json`/`JSON.stringify` chama `.toJSON()` num `Date` automaticamente, produzindo
// ISO igual — só vira bug de verdade quando algo compara o valor por igualdade de string direto,
// como a reconciliação faz). Normaliza os dois lados (`Date` ou já-string) pro mesmo formato ISO
// antes de comparar.
export function toComparableIso(value: string | Date | null): string | null {
  if (value === null) return null
  return (value instanceof Date ? value : new Date(value)).toISOString()
}

// lab-103, resto de G11/`prompt.md` §12: NPS de pais/responsáveis.
export function isValidNpsScore(score: unknown): score is number {
  return typeof score === 'number' && Number.isInteger(score) && score >= 0 && score <= 10
}

// Não pergunta de novo antes do cooldown vencer — perguntar toda vez que o responsável abre o
// portal seria irritante. Decidido pelo servidor (não por `localStorage`) porque é sobre a
// FAMÍLIA, uma fonte de verdade única, não por aparelho/navegador.
export const NPS_COOLDOWN_DAYS = 90

export function shouldPromptForNps(lastSubmittedAt: string | Date | null, now: number = Date.now()): boolean {
  if (lastSubmittedAt === null) return true
  const lastSubmittedMs = (lastSubmittedAt instanceof Date ? lastSubmittedAt : new Date(lastSubmittedAt)).getTime()
  const cooldownMs = NPS_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
  return now - lastSubmittedMs >= cooldownMs
}

export interface NpsSummary {
  totalResponses: number
  promoters: number
  passives: number
  detractors: number
  // `null` sem nenhuma resposta ainda — evita dividir por zero e distingue de um score real 0.
  score: number | null
}

// Fórmula padrão de NPS: %promotores (score 9-10) − %detratores (score 0-6), em pontos
// percentuais (-100 a 100). Score 7-8 conta como neutro, não entra na conta.
export function calculateNpsScore(scores: number[]): NpsSummary {
  const totalResponses = scores.length
  const promoters = scores.filter((score) => score >= 9).length
  const detractors = scores.filter((score) => score <= 6).length
  const passives = totalResponses - promoters - detractors

  return {
    totalResponses,
    promoters,
    passives,
    detractors,
    score: totalResponses === 0 ? null : Math.round(((promoters - detractors) / totalResponses) * 100),
  }
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

// lab-119, Fase F: resumo MÍNIMO de progresso (nunca resposta de quest/apelido/avatar/horário de
// atividade — ver decisão registrada em labs/lab-119-.../FEATURES.md) que o jogo sincroniza pra
// viabilizar o relatório semanal por e-mail. Limites generosos mas finitos: nenhum jogador real
// chega perto disso em anos de uso normal — o objetivo é só rejeitar um payload malformado/
// malicioso antes de gravar, não modelar um teto de progressão de verdade.
export interface ProgressSummary {
  level: number
  totalXp: number
  coins: number
  questsCompleted: number
  badgesCount: number
}

function isPlausibleCount(value: unknown, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max
}

// Backup/restauração de progresso (lab-142, G6 de docs/prompts/05-escala-e-viabilidade.md: "todo
// o progresso pago mora só no aparelho — limpar dados apaga o que a família pagou, sem backup e
// sem restauração"). Diferente de `ProgressSummary` acima (5 números, validados campo a campo pra
// alimentar um e-mail), este payload é o `Profile`+`Progress` INTEIROS do jogo — este Worker é um
// pacote separado, sem import dos tipos do jogo (`app/src/types.ts`), e replicar campo a campo
// aqui criaria acoplamento de manutenção (toda vez que o jogo ganhasse um campo novo em
// `Progress`, este backend precisaria de outro deploy só pra aceitar o backup de novo). Em vez
// disso, validação ESTRUTURAL (são objetos de verdade, não array/string solta) + limite de
// tamanho no corpo da requisição (`index.ts`, `handleProgressBackupSave`) — o risco aqui é
// diferente do `ProgressSummary`: este dado nunca alimenta cálculo nenhum do servidor, só é
// guardado e devolvido pra MESMA família depois, então um payload malformado só prejudicaria quem
// mandou (não vira vetor de fraude/erro de negócio).
export interface ProgressBackupPayload {
  profile: Record<string, unknown>
  progress: Record<string, unknown>
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isValidProgressBackupPayload(payload: unknown): payload is ProgressBackupPayload {
  if (!isPlainObject(payload)) return false
  return isPlainObject(payload.profile) && isPlainObject(payload.progress)
}

export function isValidProgressSummary(payload: unknown): payload is ProgressSummary {
  if (!payload || typeof payload !== 'object') return false
  const { level, totalXp, coins, questsCompleted, badgesCount } = payload as Record<string, unknown>
  return (
    isPlausibleCount(level, 999) &&
    isPlausibleCount(totalXp, 1_000_000) &&
    isPlausibleCount(coins, 1_000_000) &&
    isPlausibleCount(questsCompleted, 10_000) &&
    isPlausibleCount(badgesCount, 100)
  )
}

// lab-119: monta o e-mail semanal a partir do resumo + nome do responsável (opcional — Neon Auth
// permite cadastro sem nome). Função pura (sem Resend/fetch) pra poder testar o TEXTO sem precisar
// de rede — o Worker só chama a API do Resend com o resultado disto.
export interface WeeklyProgressEmail {
  subject: string
  html: string
}

export function buildWeeklyProgressEmail(summary: ProgressSummary, responsibleName: string | null): WeeklyProgressEmail {
  const greeting = responsibleName ? `Oi, ${responsibleName}!` : 'Oi!'
  const questWord = summary.questsCompleted === 1 ? 'missão concluída' : 'missões concluídas'
  const badgeWord = summary.badgesCount === 1 ? 'emblema conquistado' : 'emblemas conquistados'
  return {
    subject: 'Resumo semanal do progresso — Missão Aprender',
    html: `
      <p>${greeting}</p>
      <p>Aqui está o resumo desta semana do progresso no Missão Aprender:</p>
      <ul>
        <li><strong>Nível ${summary.level}</strong> (${summary.totalXp} XP no total)</li>
        <li>${summary.questsCompleted} ${questWord}</li>
        <li>${summary.coins} moedas guardadas</li>
        <li>${summary.badgesCount} ${badgeWord}</li>
      </ul>
      <p>Continue incentivando a curiosidade dele(a)! Você recebe este e-mail porque tem uma
      assinatura ativa vinculada a esta conta.</p>
    `.trim(),
  }
}
