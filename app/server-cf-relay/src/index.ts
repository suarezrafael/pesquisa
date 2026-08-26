// Relay v2 (Cloudflare Workers + Durable Objects) — mesmo protocolo do relay v1
// (../server/relay.cjs, Node + ws, hospedado no Fly.io), reescrito pra rodar de graça no plano
// Free do Cloudflare Workers em vez de exigir cartão de crédito (ver labs/lab-54.../CONTEXT.md
// pro motivo da migração). Enquanto este v2 não estiver comprovadamente estável em produção, o
// v1 continua rodando — `VITE_RELAY_URL` só aponta pra cá depois de validado.
//
// Estado de CONEXÃO (quem está conectado agora) não é persistido: usa a WebSocket Hibernation API
// (`state.acceptWebSocket`) só pra poder hibernar o Durable Object entre mensagens sem perder as
// conexões — não porque precisamos lembrar de nada entre reinícios. O binding do Durable Object é
// SQLite-backed (`new_sqlite_classes` no wrangler.toml) porque é o único tipo disponível no plano
// Free. Desde o lab-98, `state.storage` passou a guardar UMA coisa de verdade: o contador diário
// de cota (ver `recordUsageAndMaybeAlarm` abaixo) — não guarda nada sobre conexões/jogadores.

import { CONNECTION_REQUEST_UNITS, crossedThreshold, DAILY_REQUEST_QUOTA, MESSAGE_REQUEST_UNITS, utcDateKey } from './domain'

export interface Env {
  RELAY: DurableObjectNamespace
  CONNECTION_LIMITER: RateLimit
}

// Achado ALTO da auditoria de segurança (lab-88, pedido do usuário: "o jogo precisa estar seguro
// com sobrecarga de servidor"): antes disto, qualquer um com a URL pública do relay (visível no
// bundle do jogo, `VITE_RELAY_URL`) conectava sem limite nenhum. Como é uma sala global única
// (um Durable Object só pra todo mundo), inundar com conexões degrada o jogo pra TODOS os
// jogadores reais ao mesmo tempo, não só pro atacante — o alvo mais direto de "sobrecarga de
// servidor" possível aqui.
const MAX_MESSAGE_BYTES = 4096
const MAX_MESSAGES_PER_WINDOW = 10
const MESSAGE_WINDOW_MS = 1000
// Teto de conexões SIMULTÂNEAS por IP (não é uma janela de tempo — é uma contagem de sockets já
// abertos agora). 15 em vez de um número menor de propósito: o caso legítimo mais exigente não é
// só "uma casa com vários dispositivos", é uma ESCOLA/sala de aula inteira atrás do mesmo NAT
// (público-alvo do jogo, ver prompt.md) — um valor baixo demais bloquearia crianças reais jogando
// juntas na mesma rede. A defesa que realmente importa contra um atacante é o limite de TAXA de
// mensagem por conexão (`MAX_MESSAGES_PER_WINDOW` abaixo), que se aplica em cima de CADA uma
// dessas conexões — mesmo 15 conexões maliciosas ficam limitadas a 15×10=150 msg/s no total,
// nem de longe o "sem limite nenhum" de antes deste laboratório.
const MAX_CONNECTIONS_PER_IP = 15

// Mesmo catálogo fechado de src/data/chatMessages.ts — cópia proposital, igual ao v1 (não dá pra
// importar TS do app num Worker separado sem acoplar os dois deploys; mantenha em sincronia).
// Requisito [MUST] de docs/prompts/01-seguranca.md §3: o relay nunca confia só na validação do
// client — mensagens de chat com `messageId` fora deste conjunto são descartadas aqui.
const QUICK_CHAT_IDS = new Set([
  'oi', 'bom_dia', 'boa_tarde', 'boa_noite', 'tchau', 'ate_mais', 'prazer',
  'legal', 'adorei', 'uau', 'haha', 'nossa', 'triste', 'surpresa',
  'vamos', 'vem_aqui', 'espera', 'ajuda', 'combinado', 'trocar', 'escolinha', 'explorar', 'sigam_me',
  'voce_demais', 'boa_ideia', 'muito_bem', 'roupa_legal', 'chapeu_legal', 'inteligente',
  'consegui', 'quase_la', 'tentar_de_novo', 'moeda', 'cuidado', 'missao_dificil', 'nivel_up',
])

// Achado G4 da auditoria de segurança (lab-88/lab-89): o apelido do jogador trafega cru em toda
// mensagem `chat` E `state` (não só chat) — sem checagem aqui, uma criança digitando o próprio
// nome real no cliente antigo (ou um cliente adulterado mandando qualquer string) chegava sem
// filtro em todo mundo conectado. Mesma cópia proposital de `src/data/nicknameFilter.ts` (não dá
// pra importar TS do app aqui, mesmo motivo do `QUICK_CHAT_IDS` acima) — mantenha em sincronia.
// Diferença de propósito: aqui SANITIZA em vez de recusar a mensagem inteira — um cliente antigo
// com um apelido salvo antes desta correção não pode ficar sem sincronizar posição/estado só por
// causa do nome; o pior caso vira o nome de exibição "Jogador", não uma conexão quebrada.
const NICKNAME_DISALLOWED_CHARS = /[^\p{L} ]/gu
const NICKNAME_BLOCKED_TERMS = [
  'idiota', 'estupido', 'estupida', 'imbecil', 'babaca', 'otario', 'otaria', 'retardado',
  'retardada', 'burro', 'burra', 'porra', 'merda', 'caralho', 'bosta', 'putaria', 'puta',
  'piranha', 'vagabundo', 'vagabunda', 'cacete', 'fdp', 'pqp', 'buceta', 'xoxota', 'viado',
  'veado', 'bicha', 'macaco', 'nazista', 'hitler', 'estuprador', 'estupradora', 'pedofilo',
  'pedofila', 'suicida', 'suicidio', 'estuprar', 'sexo', 'pornografia', 'foder', 'fudido',
  'desgraca', 'corno', 'corna',
]
const FALLBACK_NAME = 'Jogador'

function containsBlockedTerm(normalized: string): boolean {
  return NICKNAME_BLOCKED_TERMS.some((term) => normalized.includes(term))
}

// Nunca lança, nunca recusa a mensagem toda — só devolve um nome seguro pra usar no broadcast.
function sanitizedNameForBroadcast(rawName: unknown): string {
  if (typeof rawName !== 'string') return FALLBACK_NAME
  const cleaned = rawName.replace(NICKNAME_DISALLOWED_CHARS, '').trim().slice(0, 40)
  if (!cleaned) return FALLBACK_NAME
  const normalized = cleaned.normalize('NFD').toLowerCase().replace(/[^a-z]/g, '')
  return containsBlockedTerm(normalized) ? FALLBACK_NAME : cleaned
}

// Achado G5: `broadcast(ws, {...msg, id})` repassava qualquer `msg.type` desconhecido pra todo
// mundo, sem checagem — um canal arbitrário aberto entre clientes. Só estes três tipos são
// originados pelo cliente hoje (ver `src/world3d/multiplayer.ts`: `sendState`/`sendAttack`/
// `sendChat`); `welcome`/`leave` são gerados só pelo próprio relay, nunca esperados vindos de um
// cliente.
const ALLOWED_CLIENT_MESSAGE_TYPES = new Set(['state', 'attack', 'chat'])

function isVec3(v: unknown): v is [number, number, number] {
  return Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number' && Number.isFinite(n))
}

interface SocketAttachment {
  id: string
  // IP de quem abriu esta conexão (lab-88) — guardado aqui pra `Relay.fetch` conseguir contar
  // quantas conexões JÁ ABERTAS pertencem ao mesmo IP antes de aceitar mais uma, usando
  // `state.getWebSockets()` (que já lista todo socket vivo, hibernado ou não). Achado real
  // durante este laboratório: o binding nativo de Rate Limiting do Workers (usado numa primeira
  // versão desta correção) simulava certinho em `wrangler dev` local, mas testado ao vivo em
  // produção não bloqueou nenhuma de 30 conexões concorrentes contra um limite de 20/60s — motivo
  // não confirmado (não documentado pela Cloudflare se é limitação do plano Free ou bug da
  // plataforma). Contar conexões já abertas no próprio Durable Object não depende desse
  // mecanismo — é só ler o estado que a Hibernation API já mantém de qualquer forma.
  ip: string
  // Contador de taxa de mensagem (lab-88) por conexão — guardado no PRÓPRIO attachment (não num
  // Map em memória da instância) de propósito: a WebSocket Hibernation API pode descartar o
  // estado em memória do Durable Object entre mensagens (é o objetivo dela, permitir hibernar
  // sem perder conexões) e reconstruir a instância do zero ao acordar, mas o attachment de cada
  // WebSocket sobrevive a esse ciclo — um Map comum perderia a contagem bem no meio de uma
  // inundação real se o DO hibernasse e acordasse de novo.
  msgWindowStart: number
  msgCount: number
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // lab-98 (alarme de cota, parte de G11): rota de leitura do contador do dia — não é upgrade de
    // WebSocket, então precisa de um desvio explícito ANTES da checagem de `Upgrade` abaixo (que
    // devolveria 200 genérico e nunca chegaria no Durable Object onde o contador de verdade mora).
    // Sem autenticação de propósito — só números agregados do dia inteiro, nenhum dado de jogador.
    if (url.pathname === '/quota-status') {
      const id = env.RELAY.idFromName('global')
      const stub = env.RELAY.get(id)
      return stub.fetch(request)
    }

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('missao-aprender relay v2 (cloudflare) ok', { status: 200 })
    }

    // Binding nativo de Rate Limiting — mantido como camada extra barata (não faz mal), mas NÃO é
    // a defesa principal. Ver comentário em `SocketAttachment.ip` sobre por que não é confiável
    // em produção nesta conta; a defesa real é o teto de conexões simultâneas dentro do próprio
    // Durable Object, em `Relay.fetch` abaixo.
    const ip = request.headers.get('CF-Connecting-IP') ?? 'dev-local'
    const { success } = await env.CONNECTION_LIMITER.limit({ key: ip })
    if (!success) return new Response('muitas conexões, aguarde um pouco', { status: 429 })

    // Uma sala global só (mesmo comportamento do v1): todo mundo que conecta cai no mesmo
    // Durable Object, identificado por um nome fixo.
    const id = env.RELAY.idFromName('global')
    const stub = env.RELAY.get(id)
    return stub.fetch(request)
  },
}

export class Relay implements DurableObject {
  private state: DurableObjectState

  constructor(state: DurableObjectState) {
    this.state = state
  }

  async fetch(request: Request): Promise<Response> {
    // lab-98 (alarme de cota, parte de G11) — leitura do contador do dia atual, sem autenticação
    // (só números agregados). Tratado ANTES do 426 abaixo porque não é upgrade de WebSocket. Não
    // conta como "uso" pra não inflar o próprio contador que está sendo lido.
    const url = new URL(request.url)
    if (url.pathname === '/quota-status') {
      return this.handleQuotaStatus()
    }

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('expected websocket', { status: 426 })
    }

    // Defesa principal contra sobrecarga por conexão (lab-88) — conta quantos sockets JÁ
    // conectados agora pertencem ao mesmo IP (via `getWebSockets()`, que a Hibernation API já
    // mantém de qualquer forma) e recusa mais um se estourar o teto. Não depende do binding
    // nativo de Rate Limiting (achado desta auditoria: não confiável em produção nesta conta).
    const ip = request.headers.get('CF-Connecting-IP') ?? 'dev-local'
    const connectionsFromIp = this.state
      .getWebSockets()
      .filter((ws) => (ws.deserializeAttachment() as SocketAttachment | null)?.ip === ip).length
    if (connectionsFromIp >= MAX_CONNECTIONS_PER_IP) {
      return new Response('muitas conexões deste endereço', { status: 429 })
    }

    // lab-98: conta como 1 request cheio (ver `CONNECTION_REQUEST_UNITS`, `domain.ts`) — só as
    // conexões que passam pelos limites acima; uma conexão rejeitada por IP também consome 1
    // request de verdade na cobrança do Cloudflare, mas essa simplificação (não contar rejeições)
    // é aceitável porque o volume de rejeição é pequeno frente ao de mensagens legítimas, que é o
    // que realmente domina a cota no dia a dia.
    await this.recordUsageAndMaybeAlarm(CONNECTION_REQUEST_UNITS)

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)

    const id = crypto.randomUUID().slice(0, 8)
    this.state.acceptWebSocket(server)
    server.serializeAttachment({ id, ip, msgWindowStart: Date.now(), msgCount: 0 } satisfies SocketAttachment)
    server.send(JSON.stringify({ type: 'welcome', id }))

    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    // lab-98: conta TODA mensagem recebida (1/20 de request, ver `MESSAGE_REQUEST_UNITS`), antes
    // de qualquer checagem abaixo — o Cloudflare cobra pela mensagem RECEBIDA, não pela que a
    // gente decide processar; uma mensagem descartada por tamanho/taxa/tipo inválido ainda
    // consumiu a cota de verdade, então também precisa contar aqui.
    await this.recordUsageAndMaybeAlarm(MESSAGE_REQUEST_UNITS)

    const attachment = ws.deserializeAttachment() as SocketAttachment | null
    if (!attachment) return
    const { id, ip } = attachment

    // Achado da auditoria de segurança (lab-88): nenhum limite de tamanho de mensagem existia —
    // uma mensagem gigante era repassada pra TODOS os jogadores conectados (`broadcast` abaixo),
    // multiplicando o custo de banda por N jogadores a partir de uma única mensagem maliciosa.
    const byteLength = typeof message === 'string' ? new TextEncoder().encode(message).length : message.byteLength
    if (byteLength > MAX_MESSAGE_BYTES) return

    // Achado da auditoria: nenhum limite de TAXA de mensagem por conexão existia — um cliente mal
    // intencionado (conectando direto via WebSocket cru, sem passar pelo cliente oficial do jogo,
    // que já é comedido desde o lab-85) podia mandar mensagens o mais rápido que o socket
    // aguentasse, cada uma disparando um broadcast O(N). Janela fixa de 1s guardada no próprio
    // attachment (ver comentário em `SocketAttachment` — sobrevive a hibernação do DO).
    const now = Date.now()
    let { msgWindowStart, msgCount } = attachment
    if (now - msgWindowStart >= MESSAGE_WINDOW_MS) {
      msgWindowStart = now
      msgCount = 0
    }
    msgCount += 1
    ws.serializeAttachment({ id, ip, msgWindowStart, msgCount } satisfies SocketAttachment)
    if (msgCount > MAX_MESSAGES_PER_WINDOW) return

    let msg: any
    try {
      msg = JSON.parse(typeof message === 'string' ? message : new TextDecoder().decode(message))
    } catch {
      return
    }

    if (typeof msg.type !== 'string' || !ALLOWED_CLIENT_MESSAGE_TYPES.has(msg.type)) return

    try {
      if (msg.type === 'chat') {
        if (typeof msg.messageId !== 'string' || !QUICK_CHAT_IDS.has(msg.messageId)) return
        this.broadcast(ws, { type: 'chat', name: sanitizedNameForBroadcast(msg.name), messageId: msg.messageId, id })
        return
      }
      if (msg.type === 'state') {
        if (typeof msg.avatarEmoji !== 'string') return
        if (!isVec3(msg.position) || !isVec3(msg.facing)) return
        if (typeof msg.xp !== 'number' || typeof msg.coins !== 'number') return
        this.broadcast(ws, { ...msg, name: sanitizedNameForBroadcast(msg.name), id })
        return
      }
      if (msg.type === 'attack') {
        if (msg.kind !== 'sword' && msg.kind !== 'gun') return
        if (msg.enemyKind !== 'et' && msg.enemyKind !== 'robo') return
        if (!isVec3(msg.fromPos) || !isVec3(msg.toPos)) return
        this.broadcast(ws, { ...msg, id })
        return
      }
    } catch (err) {
      // lab-84: mesma filosofia de visibilidade do server-accounts — nunca deixa um erro aqui
      // desaparecer em silêncio, mas também nunca deixa ele derrubar a conexão do jogador.
      console.error('[relay-error]', JSON.stringify({ id, msgType: msg?.type, error: String(err) }))
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const attachment = ws.deserializeAttachment() as SocketAttachment | null
    if (attachment) this.broadcast(ws, { type: 'leave', id: attachment.id })
    try {
      ws.close()
    } catch {
      // já fechado
    }
  }

  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    const attachment = ws.deserializeAttachment() as SocketAttachment | null
    console.error('[relay-error]', JSON.stringify({ id: attachment?.id, error: String(error) }))
    await this.webSocketClose(ws)
  }

  private broadcast(sender: WebSocket, message: unknown): void {
    const raw = JSON.stringify(message)
    for (const ws of this.state.getWebSockets()) {
      if (ws === sender) continue
      try {
        ws.send(raw)
      } catch (err) {
        // socket morto — não é um erro real (webSocketClose cuida da limpeza), mas loga mesmo
        // assim porque em teoria também poderia ser payload inválido; barato de descartar depois.
        console.error('[relay-send-failed]', String(err))
      }
    }
  }

  // lab-98 (alarme de cota, parte de G11) — soma `units` ao contador do dia UTC atual em
  // `state.storage` (SQLite-backed, sobrevive a hibernação/reinício do Durable Object) e loga um
  // alarme visível (`wrangler tail`/painel de Logs, mesma filosofia do lab-84 — nenhum serviço de
  // terceiro novo) na primeira leitura que cruzar cada limiar em `QUOTA_ALARM_THRESHOLDS`. Chave
  // por dia (`utcDateKey`) reseta o contador sozinho a cada dia, sem job de limpeza.
  private async recordUsageAndMaybeAlarm(units: number): Promise<void> {
    const key = `quota:${utcDateKey()}`
    const current =
      (await this.state.storage.get<{ total: number; alarmedThreshold: number | null }>(key)) ?? {
        total: 0,
        alarmedThreshold: null,
      }
    const total = current.total + units
    const newlyCrossed = crossedThreshold(total, current.alarmedThreshold)
    await this.state.storage.put(key, {
      total,
      alarmedThreshold: newlyCrossed ?? current.alarmedThreshold,
    })
    if (newlyCrossed !== null) {
      console.error(
        '[quota-alarm]',
        JSON.stringify({
          threshold: `${Math.round(newlyCrossed * 100)}%`,
          totalUnits: Math.round(total),
          dailyQuota: DAILY_REQUEST_QUOTA,
          date: utcDateKey(),
        }),
      )
    }
  }

  private async handleQuotaStatus(): Promise<Response> {
    const key = `quota:${utcDateKey()}`
    const current = (await this.state.storage.get<{ total: number; alarmedThreshold: number | null }>(key)) ?? {
      total: 0,
      alarmedThreshold: null,
    }
    return Response.json({
      date: utcDateKey(),
      totalUnits: Math.round(current.total * 100) / 100,
      dailyQuota: DAILY_REQUEST_QUOTA,
      percentUsed: Math.round((current.total / DAILY_REQUEST_QUOTA) * 10000) / 100,
      alarmedThreshold: current.alarmedThreshold,
    })
  }
}
