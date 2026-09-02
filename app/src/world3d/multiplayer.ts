// Cliente de multiplayer — conecta no servidor de retransmissão (app/server/relay.cjs) via
// WebSocket. Em produção (hospedagem estática, ex. Vercel), o relé roda num serviço separado
// (Fly.io) e sua URL fixa vem de `VITE_RELAY_URL` (definida em tempo de build). Sem essa
// variável, cai de volta no comportamento original de rede local: assume que o servidor roda na
// mesma máquina que serve o jogo (mesmo hostname da página), porta fixa — é o que `npm run dev`
// usa pra multiplayer na mesma rede sem precisar configurar nada.

import { QUICK_CHAT_MESSAGES } from '../data/chatMessages'

export interface RemoteState {
  id: string
  name: string
  avatarEmoji: string
  position: [number, number, number]
  facing: [number, number, number]
  xp: number
  coins: number
  // Aparência visível pros outros jogadores (lab-73, pedido do usuário: "quando um outro usuario
  // multiplayer estiver usando chapeu personalizado o outro usuario deve poder enxergar esse
  // chapeu, se ele estiver segurando a espada ou a arma tbm"). `null` nos ids de cor/cabelo =
  // usa o visual padrão, mesmo significado de `Profile.equippedXxxId` (ver `types.ts`).
  hatId: string | null
  hasSword: boolean
  hasGun: boolean
  shirtColorId: string | null
  pantsColorId: string | null
  shoeColorId: string | null
  backpackColorId: string | null
  hairShapeId: string | null
  // Óculos (lab-92) — mesmo espírito do chapéu/cores acima.
  glassesId: string | null
}

// Efeito de combate transmitido pra todo mundo (lab-73, pedido do usuário: "o efeito de espada e
// arma deve ser visto por todos como num jogo multiplayer") — evento avulso, não um campo de
// `RemoteState` (o ataque é instantâneo, não um estado contínuo que precisa ficar sincronizado
// enquanto não muda, como posição/aparência). O relay já inclui o `id` de quem mandou em
// qualquer mensagem repassada (`broadcast(id, {...msg, id})`, ver `app/server/relay.cjs`), então
// não precisa vir aqui — quem recebe descobre de qual jogador remoto é o ataque puramente pelo
// `id` da mensagem.
export interface AttackEvent {
  id: string
  kind: 'sword' | 'gun'
  enemyKind: 'et' | 'robo'
  fromPos: [number, number, number]
  toPos: [number, number, number]
}

// Ranking local (lab-20): entrada derivada do próprio jogador + do `RemoteState` de cada peer
// conectado, não um tipo transmitido pela rede (é montado localmente em `World3D.tsx`).
export interface RankingEntry {
  id: string
  name: string
  avatarEmoji: string
  xp: number
  coins: number
  isSelf: boolean
}

export interface ChatMessage {
  id: string
  name: string
  // Chave de `QUICK_CHAT_MESSAGES` (src/data/chatMessages.ts) — nunca texto livre. Requisito
  // [MUST] de docs/prompts/01-seguranca.md §1 / prompt.md §11.
  messageId: string
  ts: number
}

type StateHandler = (state: RemoteState) => void
type LeaveHandler = (id: string) => void
type ChatHandler = (msg: ChatMessage) => void
type ConnectionHandler = (connected: boolean) => void
type AttackHandler = (attack: AttackEvent) => void

const RELAY_PORT = 3001

// Reconexão com backoff exponencial + jitter (lab-85, docs/prompts/05-escala-e-viabilidade.md
// achado G2) — antes, uma queda de conexão reconectava incondicionalmente a cada 3s pra sempre,
// sem limite. Se a queda for por estouro de cota do relay (o cenário mais provável, ver G1), isso
// vira uma tempestade de reconexão martelando um serviço que já está sem cota — o pior
// comportamento possível bem no momento de maior tráfego. Backoff exponencial (1s→2s→4s→…→60s)
// com "full jitter" (multiplica por um fator aleatório entre 0,5 e 1) espalha as tentativas no
// tempo em vez de todos os clientes baterem no mesmo instante; um limite de tentativas por sessão
// com desistência silenciosa (o jogo já funciona sozinho, ver "modo solo") evita insistir pra
// sempre contra um relay que não vai voltar tão cedo.
export const RECONNECT_BASE_DELAY_MS = 1000
export const RECONNECT_MAX_DELAY_MS = 60000
export const RECONNECT_MAX_ATTEMPTS = 10

export function computeReconnectDelayMs(attempt: number, random: () => number = Math.random): number {
  const exponential = Math.min(RECONNECT_MAX_DELAY_MS, RECONNECT_BASE_DELAY_MS * 2 ** (attempt - 1))
  return exponential * (0.5 + random() * 0.5)
}

let socket: WebSocket | null = null
let reconnectTimer: number | null = null
let reconnectAttempt = 0
let stateHandlers: StateHandler[] = []
let leaveHandlers: LeaveHandler[] = []
let chatHandlers: ChatHandler[] = []
let connectionHandlers: ConnectionHandler[] = []
let attackHandlers: AttackHandler[] = []

function relayUrl(): string {
  const configured = import.meta.env.VITE_RELAY_URL as string | undefined
  if (configured) return configured
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.hostname}:${RELAY_PORT}`
}

function notifyConnection(connected: boolean) {
  connectionHandlers.forEach((h) => h(connected))
}

// Extraída como função pura (sem `window`/timer de verdade) só pra ficar testável sem precisar
// simular um `WebSocket`/DOM inteiro — a decisão de "desistir ou não" é a parte que mais importa
// verificar automaticamente; agendar o `setTimeout` de fato é só encanamento em cima disso.
export function shouldGiveUpReconnecting(attempt: number): boolean {
  return attempt > RECONNECT_MAX_ATTEMPTS
}

// Agenda a próxima tentativa com backoff+jitter, ou desiste em silêncio se já estourou o limite
// de tentativas — o jogo continua 100% jogável sozinho (ver README/`05-escala-e-viabilidade.md`
// seção 3, "modo solo é o padrão funcional"), só para de tentar reconectar sozinho nesta sessão.
function scheduleReconnect(): void {
  reconnectAttempt += 1
  if (shouldGiveUpReconnecting(reconnectAttempt)) return
  reconnectTimer = window.setTimeout(connect, computeReconnectDelayMs(reconnectAttempt))
}

export function connect(): void {
  if (socket) return
  let ws: WebSocket
  try {
    ws = new WebSocket(relayUrl())
  } catch {
    scheduleReconnect()
    return
  }
  socket = ws

  ws.onopen = () => {
    // Conexão bem-sucedida — zera o contador pra uma futura queda (rede caiu de novo depois de
    // uma sessão longa e saudável, por exemplo) começar o backoff do zero, em vez de herdar um
    // contador quase esgotado de tentativas antigas já resolvidas.
    reconnectAttempt = 0
    notifyConnection(true)
  }

  ws.onmessage = (ev) => {
    let msg: any
    try {
      msg = JSON.parse(ev.data)
    } catch {
      return
    }
    if (msg.type === 'state') stateHandlers.forEach((h) => h(msg as RemoteState))
    else if (msg.type === 'attack') attackHandlers.forEach((h) => h(msg as AttackEvent))
    else if (msg.type === 'chat') {
      // Nunca confia em texto vindo da rede — só repassa se `messageId` bater com uma entrada
      // conhecida do catálogo (o relay já valida isso também, mas checar de novo aqui é
      // defesa em profundidade: um peer adulterado não deveria conseguir fazer nada renderizar
      // além do catálogo fechado, mesmo que o servidor mude).
      if (typeof msg.messageId === 'string' && QUICK_CHAT_MESSAGES.some((m) => m.id === msg.messageId)) {
        chatHandlers.forEach((h) => h({ ...msg, ts: Date.now() } as ChatMessage))
      }
    } else if (msg.type === 'leave') leaveHandlers.forEach((h) => h(msg.id))
  }

  ws.onclose = () => {
    socket = null
    notifyConnection(false)
    scheduleReconnect()
  }

  ws.onerror = () => {
    ws.close()
  }
}

export function disconnect(): void {
  if (reconnectTimer) {
    window.clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  reconnectAttempt = 0
  socket?.close()
  socket = null
}

export function sendState(
  name: string,
  avatarEmoji: string,
  position: [number, number, number],
  facing: [number, number, number],
  xp: number,
  coins: number,
  appearance: {
    hatId: string | null
    hasSword: boolean
    hasGun: boolean
    shirtColorId: string | null
    pantsColorId: string | null
    shoeColorId: string | null
    backpackColorId: string | null
    hairShapeId: string | null
    glassesId: string | null
  },
): void {
  if (!socket || socket.readyState !== WebSocket.OPEN) return
  socket.send(JSON.stringify({ type: 'state', name, avatarEmoji, position, facing, xp, coins, ...appearance }))
}

// Efeito de combate visto por todos (lab-73) — disparado uma vez só no momento do golpe/tiro,
// não repetido a cada quadro como `sendState`.
export function sendAttack(
  kind: 'sword' | 'gun',
  enemyKind: 'et' | 'robo',
  fromPos: [number, number, number],
  toPos: [number, number, number],
): void {
  if (!socket || socket.readyState !== WebSocket.OPEN) return
  socket.send(JSON.stringify({ type: 'attack', kind, enemyKind, fromPos, toPos }))
}

export function sendChat(name: string, messageId: string): void {
  if (!socket || socket.readyState !== WebSocket.OPEN) return
  if (!QUICK_CHAT_MESSAGES.some((m) => m.id === messageId)) return
  socket.send(JSON.stringify({ type: 'chat', name: name.slice(0, 40), messageId }))
}

export function onRemoteState(handler: StateHandler): () => void {
  stateHandlers.push(handler)
  return () => {
    stateHandlers = stateHandlers.filter((h) => h !== handler)
  }
}

export function onRemoteLeave(handler: LeaveHandler): () => void {
  leaveHandlers.push(handler)
  return () => {
    leaveHandlers = leaveHandlers.filter((h) => h !== handler)
  }
}

export function onChat(handler: ChatHandler): () => void {
  chatHandlers.push(handler)
  return () => {
    chatHandlers = chatHandlers.filter((h) => h !== handler)
  }
}

export function onRemoteAttack(handler: AttackHandler): () => void {
  attackHandlers.push(handler)
  return () => {
    attackHandlers = attackHandlers.filter((h) => h !== handler)
  }
}

export function onConnectionChange(handler: ConnectionHandler): () => void {
  connectionHandlers.push(handler)
  return () => {
    connectionHandlers = connectionHandlers.filter((h) => h !== handler)
  }
}

export function isConnected(): boolean {
  return !!socket && socket.readyState === WebSocket.OPEN
}
