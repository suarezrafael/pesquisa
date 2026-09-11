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
// lab-161 (home inicial dupla criança/responsável): `play_click`/`parent_area_click` medem se os
// dois CTAs da `TitleScreen` convencem cada público — sem meta (nenhum dado além do tipo/hora).
const PRODUCT_EVENT_TYPES = new Set([
  'session_start',
  'session_end',
  'quest_completed',
  'play_click',
  'parent_area_click',
  // lab-164 (docs/market-metrics-engagement-backlog.md §4) — instrumentação fina da jornada de
  // ativação de 10 minutos, ver `app/src/productAnalytics.ts`.
  'time_to_first_control',
  'time_to_first_learning_challenge',
  'time_to_first_reward',
  'activation_cycle_completed',
  // lab-166 — funil de conversão adulta (pendência registrada em docs/event-catalog.md no lab-165).
  'family_landing_viewed',
  'parent_signup_started',
  'checkout_started',
  // lab-173 (docs/market-metrics-engagement-backlog.md §10, item 8) — mede interesse real no
  // preview do relatório semanal, ver app/src/productAnalytics.ts.
  'weekly_report_preview_viewed',
  // lab-175 ("Lab 171 - Casa visitável somente leitura") — mede "visitas por criança" (métrica
  // esperada citada no documento), ver app/src/productAnalytics.ts.
  'house_visited',
])

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
  // lab-167 (docs/market-metrics-engagement-backlog.md §6, "Lab 166" no documento) — mapa de
  // habilidades: contagem das missões do PLANETA PRINCIPAL concluídas por tipo (`data/quests.ts`
  // do client, `skillBreakdown`), nunca as perguntas de astronomia dos outros planetas (essas não
  // têm habilidade real distinta, ver comentário em `skillBreakdown`). Opcionais — clientes
  // antigos (antes deste lab) continuam mandando o resumo sem eles.
  logicaCompleted?: number
  matematicaCompleted?: number
  leituraCompleted?: number
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

// lab-167 — os 3 campos de habilidade são OPCIONAIS de propósito: um cliente já em produção antes
// deste deploy ainda manda o resumo sem eles por um tempo (até recarregar a página), e isso não
// pode virar 400 nem perder o resto do resumo — só omite a seção de habilidades do e-mail quando
// ausentes (ver `buildWeeklyProgressEmail`). Quando presentes, ainda validados como qualquer
// contagem — nunca confia no client sem checar (docs/prompts/01-seguranca.md §3).
function isPlausibleOptionalCount(value: unknown, max: number): boolean {
  return value === undefined || isPlausibleCount(value, max)
}

export function isValidProgressSummary(payload: unknown): payload is ProgressSummary {
  if (!payload || typeof payload !== 'object') return false
  const { level, totalXp, coins, questsCompleted, badgesCount, logicaCompleted, matematicaCompleted, leituraCompleted } =
    payload as Record<string, unknown>
  return (
    isPlausibleCount(level, 999) &&
    isPlausibleCount(totalXp, 1_000_000) &&
    isPlausibleCount(coins, 1_000_000) &&
    isPlausibleCount(questsCompleted, 10_000) &&
    isPlausibleCount(badgesCount, 100) &&
    isPlausibleOptionalCount(logicaCompleted, 10_000) &&
    isPlausibleOptionalCount(matematicaCompleted, 10_000) &&
    isPlausibleOptionalCount(leituraCompleted, 10_000)
  )
}

// lab-119: monta o e-mail semanal a partir do resumo + nome do responsável (opcional — Neon Auth
// permite cadastro sem nome). Função pura (sem Resend/fetch) pra poder testar o TEXTO sem precisar
// de rede — o Worker só chama a API do Resend com o resultado disto.
export interface WeeklyProgressEmail {
  subject: string
  html: string
}

// lab-167 (docs/market-metrics-engagement-backlog.md §6, "Lab 166" no documento) — mapa de
// habilidades. Tom deliberadamente de incentivo, nunca de avaliação escolar (achado do "Riscos"
// citado no documento: "parecer avaliação escolar formal"): "ponto forte"/"pra praticar mais" em
// vez de "nota"/"fraco em"; nunca promete melhoria acadêmica garantida.
export type SkillName = 'lógica' | 'matemática' | 'leitura'

const SKILL_ACTIVITY_SUGGESTION: Record<SkillName, string> = {
  lógica: 'um desafio de sequência ou padrão',
  matemática: 'uma missão de contas ou problemas',
  leitura: 'uma missão de interpretação de texto',
}

export interface SkillFocus {
  strongest: SkillName
  weakest: SkillName
  suggestion: string
}

// Devolve `null` quando não há sinal suficiente pra dizer algo útil: cliente ainda não manda os 3
// campos (versão antiga do jogo, ver `ProgressSummary`), ou as 3 habilidades estão empatadas (nem
// "ponto forte" nem "pra praticar mais" fariam sentido sem alguma diferença real entre elas —
// mesmo cuidado do "Riscos" do documento: "dados insuficientes para inferências fortes").
export function describeSkillFocus(
  logicaCompleted: number | undefined,
  matematicaCompleted: number | undefined,
  leituraCompleted: number | undefined,
): SkillFocus | null {
  if (logicaCompleted === undefined || matematicaCompleted === undefined || leituraCompleted === undefined) {
    return null
  }
  const entries: { name: SkillName; count: number }[] = [
    { name: 'lógica', count: logicaCompleted },
    { name: 'matemática', count: matematicaCompleted },
    { name: 'leitura', count: leituraCompleted },
  ]
  const strongest = entries.reduce((a, b) => (b.count > a.count ? b : a))
  const weakest = entries.reduce((a, b) => (b.count < a.count ? b : a))
  if (strongest.count === weakest.count) return null
  return { strongest: strongest.name, weakest: weakest.name, suggestion: SKILL_ACTIVITY_SUGGESTION[weakest.name] }
}

export function buildWeeklyProgressEmail(summary: ProgressSummary, responsibleName: string | null): WeeklyProgressEmail {
  const greeting = responsibleName ? `Oi, ${responsibleName}!` : 'Oi!'
  const questWord = summary.questsCompleted === 1 ? 'missão concluída' : 'missões concluídas'
  const badgeWord = summary.badgesCount === 1 ? 'emblema conquistado' : 'emblemas conquistados'
  const skillFocus = describeSkillFocus(summary.logicaCompleted, summary.matematicaCompleted, summary.leituraCompleted)
  const skillSection = skillFocus
    ? `<p>Ponto forte da semana: <strong>${skillFocus.strongest}</strong>. Pra praticar mais:
      <strong>${skillFocus.weakest}</strong> — que tal ${skillFocus.suggestion} na próxima sessão?</p>`
    : ''
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
      ${skillSection}
      <p>Continue incentivando a curiosidade dele(a)! Você recebe este e-mail porque tem uma
      assinatura ativa vinculada a esta conta.</p>
    `.trim(),
  }
}

// lab-147 (achado do review automático do Copilot no PR #16): o header `Origin` é controlado
// pelo CLIENTE — usá-lo sem checagem pra montar `success_url`/`cancel_url` do Stripe permite
// redirecionar quem acabou de pagar pra um domínio arbitrário (risco de phishing: uma chamada
// direta à API, fora do navegador, pode mandar qualquer `Origin`; o header não é algo que só o
// front-end de verdade consiga enviar). Só aceita um `Origin` que já está numa lista conhecida de
// domínios confiáveis; qualquer outro (ou nenhum) cai no `defaultOrigin` configurado.
export function resolveTrustedOrigin(
  originHeader: string | null,
  allowedOriginsCsv: string,
  defaultOrigin: string,
): string {
  const allowed = allowedOriginsCsv
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  if (originHeader && allowed.includes(originHeader)) return originHeader
  return defaultOrigin
}

// lab-159 (Grupo B do backlog social, labs/lab-158-.../FEATURES.md) — mesma cópia proposital de
// `app/src/data/nicknameFilter.ts`/`server-cf-relay/src/index.ts` (não dá pra importar entre os
// três pacotes deployáveis, cada um publica separado). Valida o nickname no REGISTRO da
// identidade de jogador — nunca deixa entrar no diretório buscável (`player_identities`) um
// apelido que o client já bloquearia, mesma defesa em profundidade de "nunca confiar só na
// validação do lado do cliente" (docs/prompts/01-seguranca.md §3).
const NICKNAME_CHAR_PATTERN = /^[\p{L} ]+$/u
const NICKNAME_BLOCKED_TERMS = [
  'idiota', 'estupido', 'estupida', 'imbecil', 'babaca', 'otario', 'otaria', 'retardado',
  'retardada', 'burro', 'burra', 'porra', 'merda', 'caralho', 'bosta', 'putaria', 'puta',
  'piranha', 'vagabundo', 'vagabunda', 'cacete', 'fdp', 'pqp', 'buceta', 'xoxota', 'viado',
  'veado', 'bicha', 'macaco', 'nazista', 'hitler', 'estuprador', 'estupradora', 'pedofilo',
  'pedofila', 'suicida', 'suicidio', 'estuprar', 'sexo', 'pornografia', 'foder', 'fudido',
  'desgraca', 'corno', 'corna',
]

function normalizeForBlocklist(input: string): string {
  return input.normalize('NFD').toLowerCase().replace(/[^a-z]/g, '')
}

export function isNicknameAllowed(name: string): boolean {
  const trimmed = name.trim()
  if (!trimmed || trimmed.length > 40) return false
  if (!NICKNAME_CHAR_PATTERN.test(trimmed)) return false
  const normalized = normalizeForBlocklist(trimmed)
  return !NICKNAME_BLOCKED_TERMS.some((term) => normalized.includes(term))
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isValidUuid(value: string): boolean {
  return UUID_PATTERN.test(value)
}

// lab-160 — um jogador não pode pedir amizade pra si mesmo (o `playerId` guardado localmente é
// único por perfil, então `fromId === toId` só acontece por bug de client ou tentativa deliberada).
export function isSelfFriendRequest(fromId: string, toId: string): boolean {
  return fromId === toId
}

// lab-160 — só bloqueia um pedido novo se já existe uma relação ATIVA entre os dois jogadores em
// qualquer sentido (`pending`/`accepted`/`declined`); uma amizade `removed` (desfeita antes) libera
// pedir de novo. `declined` também bloqueia de propósito — evita reenvio repetido logo após recusa.
export function hasActiveFriendship(rows: { status: string }[]): boolean {
  return rows.some((row) => row.status !== 'removed')
}

export type FriendRequestResponseStatus = 'accepted' | 'declined'

export function friendResponseStatus(accept: boolean): FriendRequestResponseStatus {
  return accept ? 'accepted' : 'declined'
}

// lab-162, Grupo B do backlog social — "online agora" é derivado do heartbeat
// (`POST /players/heartbeat`, chamado a cada ~60s pelo client), não de presença de WebSocket do
// relay de multiplayer (mais simples, e continua funcionando mesmo se o relay cair — mesmo
// raciocínio já registrado no plano do lab-158). Limiar de 2 minutos: folgado o bastante pra
// cobrir uma falha isolada de heartbeat (rede instável, aba em segundo plano por um instante) sem
// mostrar "offline" errado, apertado o bastante pra não mostrar "online" muito depois de a criança
// ter saído do jogo.
const ONLINE_THRESHOLD_MS = 2 * 60 * 1000

export function isOnlineNow(lastSeenAtIso: string, now: number = Date.now()): boolean {
  const lastSeenAtMs = new Date(lastSeenAtIso).getTime()
  if (!Number.isFinite(lastSeenAtMs)) return false
  return now - lastSeenAtMs <= ONLINE_THRESHOLD_MS
}

// lab-163, último item do Grupo B do backlog social — snapshot do visual equipado
// (`Profile.equipped*` no client), sincronizado via `POST /players/heartbeat` (piggyback no
// mecanismo já existente do lab-162, sem endpoint/intervalo novo) e devolvido por
// `GET /players/:id/public-profile`. Espelha exatamente os 7 eixos de customização do client —
// nunca `avatarEmoji` (esse já mora em `player_identities.avatar_emoji` desde o lab-159).
export interface EquippedLook {
  equippedHatId: string | null
  equippedShirtColorId: string | null
  equippedPantsColorId: string | null
  equippedShoeColorId: string | null
  equippedBackpackColorId: string | null
  equippedHairShapeId: string | null
  equippedGlassesId: string | null
}

const EQUIPPED_LOOK_KEYS: (keyof EquippedLook)[] = [
  'equippedHatId',
  'equippedShirtColorId',
  'equippedPantsColorId',
  'equippedShoeColorId',
  'equippedBackpackColorId',
  'equippedHairShapeId',
  'equippedGlassesId',
]

// Ids de catálogo (hats.ts/customization.ts/glasses.ts) são sempre curtos e kebab-case — este
// teto é só uma defesa generosa contra payload de heartbeat malformado/abusivo, não uma regra de
// negócio real (mesmo espírito de `isNicknameAllowed` limitando tamanho antes de checar conteúdo).
const EQUIPPED_ID_MAX_LENGTH = 60

function isValidEquippedId(value: unknown): value is string | null {
  return value === null || (typeof value === 'string' && value.length > 0 && value.length <= EQUIPPED_ID_MAX_LENGTH)
}

// `POST /players/heartbeat` recebe `equippedLook` de input público — mesmo raciocínio do achado
// do Copilot no PR #35 pro `playerId` (lab-162): nunca confia no formato antes de gravar no banco.
// Exige EXATAMENTE os 7 eixos conhecidos, nem a mais nem a menos, pra não deixar o client gravar
// campos arbitrários dentro do jsonb.
export function isValidEquippedLook(value: unknown): value is EquippedLook {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  const keys = Object.keys(record)
  if (keys.length !== EQUIPPED_LOOK_KEYS.length) return false
  return EQUIPPED_LOOK_KEYS.every((key) => key in record && isValidEquippedId(record[key]))
}

// `Progress.badges` de hoje tem só 3 ids possíveis (`ACHIEVEMENT_CATALOG`) — os limites abaixo são
// generosos de propósito (catálogo pode crescer) sem abrir espaço pra um heartbeat malicioso
// inflar o jsonb guardado por jogador.
const BADGE_MAX_COUNT = 50
const BADGE_MAX_LENGTH = 60

export function isValidBadgeList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= BADGE_MAX_COUNT &&
    value.every((badge) => typeof badge === 'string' && badge.length > 0 && badge.length <= BADGE_MAX_LENGTH)
  )
}

// lab-175 ("Lab 171 - Casa visitável somente leitura") — mobília da casa sincronizada via
// heartbeat pra um amigo poder visitar (mesmo mecanismo de `equippedLook`/`badges` acima).
// `houseFurnitureIds` é o array COM REPETIÇÃO de `Progress.unlockedFurnitureIds` (uma entrada por
// cópia possuída) — tetos generosos (não regra de negócio real), mesmo espírito de
// `BADGE_MAX_COUNT`/`EQUIPPED_ID_MAX_LENGTH`.
const HOUSE_FURNITURE_MAX_COUNT = 300
const HOUSE_FURNITURE_ID_MAX_LENGTH = 60

export function isValidHouseFurnitureIds(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= HOUSE_FURNITURE_MAX_COUNT &&
    value.every((id) => typeof id === 'string' && id.length > 0 && id.length <= HOUSE_FURNITURE_ID_MAX_LENGTH)
  )
}

// Chave no formato `${itemId}#${índice}` (mesmo formato de `Progress.housePlacements` do client,
// `state/types.ts`) — valida o formato da chave também, não só o valor, pra nunca gravar uma chave
// arbitrária vinda de um heartbeat malicioso dentro do jsonb.
const HOUSE_PLACEMENTS_MAX_KEYS = 300
const HOUSE_PLACEMENT_KEY_PATTERN = /^[a-z0-9_]+#\d+$/

function isValidHousePlacementValue(value: unknown): value is { x: number; z: number; rotY: number } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return (
    Object.keys(record).length === 3 &&
    Number.isFinite(record.x) &&
    Number.isFinite(record.z) &&
    Number.isFinite(record.rotY)
  )
}

export function isValidHousePlacements(
  value: unknown,
): value is Record<string, { x: number; z: number; rotY: number }> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  const keys = Object.keys(record)
  if (keys.length > HOUSE_PLACEMENTS_MAX_KEYS) return false
  return keys.every((key) => HOUSE_PLACEMENT_KEY_PATTERN.test(key) && isValidHousePlacementValue(record[key]))
}

// lab-175 (achado do review automático do Copilot no PR #49): o client já filtra item
// `subscriptionOnly` antes de ENVIAR (`useHeartbeat.ts`, `resolveHouseSyncSnapshot`), mas
// `GET /players/:id/public-profile` devolvia `house_furniture_ids`/`house_placements` crus —
// um client modificado (ou um heartbeat antigo já salvo antes desta correção) podia deixar um id
// pago vazar pro visitante, revelando o status de assinatura do anfitrião. Filtra de novo aqui,
// no SERVIDOR, antes de responder — defesa em profundidade, não depende só do client se comportar.
// Lista pequena e duplicada de propósito (mesmo espírito de `EQUIPPED_LOOK_KEYS`): o catálogo de
// verdade mora em `app/src/data/furniture.ts` (client), que este Worker nunca importa; atualizar
// os dois lados junto se um item `subscriptionOnly` novo for adicionado ao catálogo.
const SUBSCRIPTION_ONLY_FURNITURE_IDS = new Set([
  'cama_nave',
  'luminaria_planeta',
  'tapete_estrelas',
  'grama_florida',
  'banco_madeira',
  'borboletas_animadas',
])

export function sanitizeHouseFurnitureIds(furnitureIds: string[]): string[] {
  return furnitureIds.filter((id) => !SUBSCRIPTION_ONLY_FURNITURE_IDS.has(id))
}

export function sanitizeHousePlacements(
  placements: Record<string, { x: number; z: number; rotY: number }>,
): Record<string, { x: number; z: number; rotY: number }> {
  const result: Record<string, { x: number; z: number; rotY: number }> = {}
  for (const [key, value] of Object.entries(placements)) {
    const id = key.split('#')[0]
    if (SUBSCRIPTION_ONLY_FURNITURE_IDS.has(id)) continue
    result[key] = value
  }
  return result
}
