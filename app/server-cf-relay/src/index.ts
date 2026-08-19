// Relay v2 (Cloudflare Workers + Durable Objects) — mesmo protocolo do relay v1
// (../server/relay.cjs, Node + ws, hospedado no Fly.io), reescrito pra rodar de graça no plano
// Free do Cloudflare Workers em vez de exigir cartão de crédito (ver labs/lab-54.../CONTEXT.md
// pro motivo da migração). Enquanto este v2 não estiver comprovadamente estável em produção, o
// v1 continua rodando — `VITE_RELAY_URL` só aponta pra cá depois de validado.
//
// Sem estado persistido: usa a WebSocket Hibernation API (`state.acceptWebSocket`) só pra poder
// hibernar o Durable Object entre mensagens sem perder as conexões — não porque precisamos
// lembrar de nada entre reinícios. O binding do Durable Object é SQLite-backed
// (`new_sqlite_classes` no wrangler.toml) porque é o único tipo disponível no plano Free; nunca
// usamos `state.storage` de verdade.

export interface Env {
  RELAY: DurableObjectNamespace
}

// Mesmo catálogo fechado de src/data/chatMessages.ts — cópia proposital, igual ao v1 (não dá pra
// importar TS do app num Worker separado sem acoplar os dois deploys; mantenha em sincronia).
// Requisito [MUST] de docs/prompts/01-seguranca.md §3: o relay nunca confia só na validação do
// client — mensagens de chat com `messageId` fora deste conjunto são descartadas aqui.
const QUICK_CHAT_IDS = new Set([
  'oi', 'legal', 'consegui', 'vamos', 'vem_aqui', 'espera', 'ajuda', 'combinado', 'adorei', 'tchau',
])

interface SocketAttachment {
  id: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('missao-aprender relay v2 (cloudflare) ok', { status: 200 })
    }
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
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('expected websocket', { status: 426 })
    }

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)

    const id = crypto.randomUUID().slice(0, 8)
    this.state.acceptWebSocket(server)
    server.serializeAttachment({ id } satisfies SocketAttachment)
    server.send(JSON.stringify({ type: 'welcome', id }))

    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const attachment = ws.deserializeAttachment() as SocketAttachment | null
    if (!attachment) return
    const { id } = attachment

    let msg: any
    try {
      msg = JSON.parse(typeof message === 'string' ? message : new TextDecoder().decode(message))
    } catch {
      return
    }

    if (msg.type === 'chat') {
      if (typeof msg.messageId !== 'string' || !QUICK_CHAT_IDS.has(msg.messageId)) return
      if (typeof msg.name !== 'string') return
      this.broadcast(ws, { type: 'chat', name: msg.name.slice(0, 40), messageId: msg.messageId, id })
      return
    }
    this.broadcast(ws, { ...msg, id })
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

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws)
  }

  private broadcast(sender: WebSocket, message: unknown): void {
    const raw = JSON.stringify(message)
    for (const ws of this.state.getWebSockets()) {
      if (ws === sender) continue
      try {
        ws.send(raw)
      } catch {
        // socket morto, ignora — webSocketClose cuida da limpeza
      }
    }
  }
}
