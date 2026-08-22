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

let socket: WebSocket | null = null
let reconnectTimer: number | null = null
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

export function connect(): void {
  if (socket) return
  let ws: WebSocket
  try {
    ws = new WebSocket(relayUrl())
  } catch {
    reconnectTimer = window.setTimeout(connect, 4000)
    return
  }
  socket = ws

  ws.onopen = () => notifyConnection(true)

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
    reconnectTimer = window.setTimeout(connect, 3000)
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
