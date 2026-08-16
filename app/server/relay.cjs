// Servidor de retransmissão WebSocket pra multiplayer local (mesma rede).
// Não guarda estado nenhum além da lista de conexões — só repassa o que um cliente manda
// (posição/orientação, chat) pros outros clientes conectados. Sem conta, sem nuvem: roda
// nesta máquina, acessível pelos outros aparelhos via IP da rede local.
//
// Uso: node server/relay.cjs
// Porta padrão 3001 (mesma porta que o cliente tenta por padrão em multiplayer.ts).

const { WebSocketServer } = require('ws')

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
    broadcast(id, { ...msg, id })
  })

  socket.on('close', () => {
    clients.delete(id)
    broadcast(id, { type: 'leave', id })
  })
})

console.log(`Servidor de multiplayer local rodando em ws://0.0.0.0:${PORT}`)
console.log('Outros aparelhos na mesma rede conectam via ws://<IP-desta-maquina>:' + PORT)
