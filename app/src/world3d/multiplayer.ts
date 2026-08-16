// Cliente de multiplayer local (mesma rede) — conecta no servidor de retransmissão
// (app/server/relay.cjs) via WebSocket. Sem conta, sem nuvem: assume que o servidor roda na
// mesma máquina que serve o jogo (mesmo hostname da página), porta fixa.

export interface RemoteState {
  id: string
  name: string
  avatarEmoji: string
  position: [number, number, number]
  facing: [number, number, number]
}

export interface ChatMessage {
  id: string
  name: string
  text: string
  ts: number
}

type StateHandler = (state: RemoteState) => void
type LeaveHandler = (id: string) => void
type ChatHandler = (msg: ChatMessage) => void
type ConnectionHandler = (connected: boolean) => void

const RELAY_PORT = 3001

let socket: WebSocket | null = null
let reconnectTimer: number | null = null
let stateHandlers: StateHandler[] = []
let leaveHandlers: LeaveHandler[] = []
let chatHandlers: ChatHandler[] = []
let connectionHandlers: ConnectionHandler[] = []

function relayUrl(): string {
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
    else if (msg.type === 'chat') chatHandlers.forEach((h) => h({ ...msg, ts: Date.now() } as ChatMessage))
    else if (msg.type === 'leave') leaveHandlers.forEach((h) => h(msg.id))
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
): void {
  if (!socket || socket.readyState !== WebSocket.OPEN) return
  socket.send(JSON.stringify({ type: 'state', name, avatarEmoji, position, facing }))
}

export function sendChat(name: string, text: string): void {
  if (!socket || socket.readyState !== WebSocket.OPEN) return
  const trimmed = text.trim().slice(0, 140)
  if (!trimmed) return
  socket.send(JSON.stringify({ type: 'chat', name, text: trimmed }))
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

export function onConnectionChange(handler: ConnectionHandler): () => void {
  connectionHandlers.push(handler)
  return () => {
    connectionHandlers = connectionHandlers.filter((h) => h !== handler)
  }
}

export function isConnected(): boolean {
  return !!socket && socket.readyState === WebSocket.OPEN
}
