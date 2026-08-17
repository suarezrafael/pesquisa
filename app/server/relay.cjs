// Servidor de retransmissão WebSocket pra multiplayer local (mesma rede).
// Não guarda estado nenhum além da lista de conexões — só repassa o que um cliente manda
// (posição/orientação, chat) pros outros clientes conectados. Sem conta, sem nuvem: roda
// nesta máquina, acessível pelos outros aparelhos via IP da rede local.
//
// Uso: node server/relay.cjs
// Porta padrão 3001 (mesma porta que o cliente tenta por padrão em multiplayer.ts).

const { WebSocketServer } = require('ws')

// Mesmo catálogo fechado de mensagens de src/data/chatMessages.ts (não dá pra importar TS num
// script CommonJS simples, então é uma cópia — mantenha os dois em sincronia). Requisito [MUST]
// de docs/prompts/01-seguranca.md §3: nunca confiar só na validação do client — o relay é quem
// decide o que é repassado, então mensagens de chat com `messageId` fora deste conjunto são
// descartadas aqui, mesmo que um client adulterado tente mandar outra coisa.
const QUICK_CHAT_IDS = new Set([
  'oi', 'legal', 'consegui', 'vamos', 'vem_aqui', 'espera', 'ajuda', 'combinado', 'adorei', 'tchau',
])

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001
const wss = new WebSocketServer({ port: PORT, host: '0.0.0.0' })

const clients = new Map()

function broadcast(senderId, message) {
  const raw = JSON.stringify(message)
  for (const [id, socket] of clients) {
    if (id === senderId) continue
    if (socket.readyState === socket.OPEN) socket.send(raw)
  }
}

wss.on('connection', (socket) => {
  const id = Math.random().toString(36).slice(2, 10)
  clients.set(id, socket)
  socket.send(JSON.stringify({ type: 'welcome', id }))

  socket.on('message', (raw) => {
    let msg
    try {
      msg = JSON.parse(raw.toString())
    } catch {
      return
    }
    if (msg.type === 'chat') {
      if (typeof msg.messageId !== 'string' || !QUICK_CHAT_IDS.has(msg.messageId)) return
      if (typeof msg.name !== 'string') return
      broadcast(id, { type: 'chat', name: msg.name.slice(0, 40), messageId: msg.messageId, id })
      return
    }
    broadcast(id, { ...msg, id })
  })

  socket.on('close', () => {
    clients.delete(id)
    broadcast(id, { type: 'leave', id })
  })
})

console.log(`Servidor de multiplayer local rodando em ws://0.0.0.0:${PORT}`)
console.log('Outros aparelhos na mesma rede conectam via ws://<IP-desta-maquina>:' + PORT)
