#!/usr/bin/env node
// Teste de carga sintético (lab-85, docs/prompts/05-escala-e-viabilidade.md seção 3, "Critério de
// aceite": "30 jogadores simultâneos por 30 minutos consumindo menos de 20% da cota diária").
//
// Conecta N clientes WebSocket falsos no relay e reproduz o MESMO algoritmo de envio do cliente
// real (`app/src/world3d/World3D.tsx`, constantes NET_SEND_CHECK_INTERVAL/NET_POSITION_EPSILON/
// NET_KEEPALIVE_INTERVAL_MS): a cada 0,5s, manda uma mensagem `state` se o jogador "andou" nesse
// intervalo, ou se o keepalive de 5s parado venceu — senão não manda nada. Cada cliente alterna
// entre andando/parado com uma probabilidade fixa (MOVE_FRACTION), simulando um padrão de jogo
// real (ninguém anda 100% do tempo) em vez do pior caso (que sozinho já estouraria a cota — ver
// README abaixo).
//
// Usa o `WebSocket` global do Node (disponível nativamente desde o Node 21+), sem dependência
// nova no package.json do Worker.
//
// Uso: node scripts/load-test.mjs [--players N] [--duration-s N] [--move-fraction 0-1] [--url wss://...]
// Exemplo (contra o relay ao vivo, 30 jogadores por 60s — ver README.md pra por que 60s em vez
// dos 30min do critério de aceite original):
//   node scripts/load-test.mjs --players 30 --duration-s 60

const args = process.argv.slice(2)
function argValue(flag, fallback) {
  const idx = args.indexOf(flag)
  if (idx === -1 || idx + 1 >= args.length) return fallback
  return args[idx + 1]
}

const PLAYERS = Number(argValue('--players', '30'))
const DURATION_S = Number(argValue('--duration-s', '60'))
const MOVE_FRACTION = Number(argValue('--move-fraction', '0.35'))
const RELAY_URL = argValue('--url', 'wss://missao-aprender-relay-v2.rafaelvs.workers.dev')

// Mesmas constantes de app/src/world3d/World3D.tsx (lab-85) — mantidas em sincronia manualmente,
// igual ao QUICK_CHAT_IDS do relay (não dá pra importar TS do app de dentro deste script sem
// acoplar os dois pacotes).
const NET_SEND_CHECK_INTERVAL_MS = 500
const NET_KEEPALIVE_INTERVAL_MS = 5000
const OLD_PROTOCOL_MSG_PER_S = 1 / 0.12 // ≈8,33 msg/s — o que cada jogador mandava antes do lab-85

function randomId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`
}

function spawnFakePlayer(index) {
  return new Promise((resolve) => {
    const id = randomId('loadtest')
    const stats = { id, sent: 0, received: 0, opened: false, error: null }
    let ws
    try {
      ws = new WebSocket(RELAY_URL)
    } catch (err) {
      stats.error = String(err)
      resolve(stats)
      return
    }

    let lastSendMs = 0
    let sendTimer = null

    ws.addEventListener('open', () => {
      stats.opened = true
      sendTimer = setInterval(() => {
        const now = Date.now()
        const moving = Math.random() < MOVE_FRACTION
        const dueForKeepalive = now - lastSendMs >= NET_KEEPALIVE_INTERVAL_MS
        if (!moving && !dueForKeepalive) return
        try {
          ws.send(
            JSON.stringify({
              type: 'state',
              name: `Bot${index}`,
              avatarEmoji: '🦊',
              position: [Math.random() * 10, 0, Math.random() * 10],
              facing: [0, 0, 1],
              xp: 0,
              coins: 0,
              hatId: null,
              hasSword: false,
              hasGun: false,
              shirtColorId: null,
              pantsColorId: null,
              shoeColorId: null,
              backpackColorId: null,
              hairShapeId: null,
            }),
          )
          stats.sent += 1
          lastSendMs = now
        } catch {
          // socket pode ter fechado entre o tick do timer e o send — ignora, a limpeza final
          // já vai contar isso como conexão encerrada.
        }
      }, NET_SEND_CHECK_INTERVAL_MS)
    })

    ws.addEventListener('message', () => {
      stats.received += 1
    })

    ws.addEventListener('error', (ev) => {
      stats.error = String(ev.message || ev)
      // lab-88: uma conexão REJEITADA na própria troca de protocolo (ex.: 429 do rate limit de
      // conexão) dispara 'error' mas pode nunca disparar 'close' na implementação de WebSocket
      // do Node — sem isso, o script travava pra sempre esperando um 'close' que não vinha,
      // achado testando o endurecimento do relay ao vivo (não é um bug do relay, é do script).
      if (!stats.opened) {
        if (sendTimer) clearInterval(sendTimer)
        resolve(stats)
      }
    })

    ws.addEventListener('close', () => {
      if (sendTimer) clearInterval(sendTimer)
      resolve(stats)
    })

    setTimeout(() => {
      try {
        ws.close()
      } catch {
        // já fechado
      }
    }, DURATION_S * 1000)
  })
}

async function main() {
  console.log(
    `[load-test] conectando ${PLAYERS} jogadores falsos em ${RELAY_URL}, por ${DURATION_S}s, ` +
      `${Math.round(MOVE_FRACTION * 100)}% do tempo "andando"...`,
  )
  const players = []
  for (let i = 0; i < PLAYERS; i++) {
    players.push(spawnFakePlayer(i))
    // escalona a entrada em vez de abrir tudo no mesmo milissegundo — mais parecido com jogadores
    // reais entrando aos poucos, e evita confundir um pico de conexão simultânea com o teste em si
    await new Promise((r) => setTimeout(r, 30))
  }

  const results = await Promise.all(players)
  const opened = results.filter((r) => r.opened)
  const failed = results.filter((r) => !r.opened)
  const totalSent = results.reduce((sum, r) => sum + r.sent, 0)
  const totalReceived = results.reduce((sum, r) => sum + r.received, 0)

  const msgPerSecond = totalSent / DURATION_S
  const projected30MinRequests = msgPerSecond * 60 * 30
  const pctOfDailyQuota = (projected30MinRequests / 100000) * 100

  const oldProtocolTotal = OLD_PROTOCOL_MSG_PER_S * PLAYERS * DURATION_S
  const reductionFactor = oldProtocolTotal / Math.max(totalSent, 1)

  console.log('')
  console.log('[load-test] resultado')
  console.log(`  jogadores conectados: ${opened.length}/${PLAYERS}${failed.length ? ` (${failed.length} falharam)` : ''}`)
  console.log(`  mensagens 'state' enviadas: ${totalSent} (${msgPerSecond.toFixed(2)} msg/s agregado)`)
  console.log(`  mensagens recebidas (broadcast de volta): ${totalReceived}`)
  console.log(
    `  projeção pra ${PLAYERS} jogadores por 30 min, extrapolando esta taxa medida: ` +
      `${Math.round(projected30MinRequests).toLocaleString('pt-BR')} requests ` +
      `(${pctOfDailyQuota.toFixed(1)}% da cota diária de 100.000)`,
  )
  console.log(
    `  comparado ao protocolo antigo (8,33 msg/s incondicional): ${Math.round(oldProtocolTotal).toLocaleString('pt-BR')} ` +
      `mensagens no mesmo período — redução de ${reductionFactor.toFixed(1)}x`,
  )
  if (failed.length) {
    console.log(`  erros: ${failed.map((f) => f.error).join('; ')}`)
  }
  console.log('')
  console.log(
    pctOfDailyQuota < 20
      ? '[load-test] OK — abaixo dos 20% da cota diária exigidos pelo critério de aceite.'
      : '[load-test] ATENÇÃO — acima dos 20% da cota diária; revisar antes de considerar o achado G1 resolvido.',
  )

  process.exit(pctOfDailyQuota < 20 && failed.length === 0 ? 0 : 1)
}

main()
