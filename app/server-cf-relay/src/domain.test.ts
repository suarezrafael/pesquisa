// Testes da lógica de domínio do relay — lab-98 (alarme de cota, parte de G11). Primeiro teste
// automatizado deste Worker (ver `package.json`, `test` novo).
import { describe, expect, it } from 'vitest'
import {
  CONNECTION_REQUEST_UNITS,
  crossedThreshold,
  DAILY_REQUEST_QUOTA,
  MESSAGE_REQUEST_UNITS,
  utcDateKey,
  WEBSOCKET_MESSAGE_BILLING_RATIO,
} from './domain'

describe('constantes de cota — batem com a matemática documentada no lab-86', () => {
  it('cota diária é 100.000 requests (Durable Objects, plano Free)', () => {
    expect(DAILY_REQUEST_QUOTA).toBe(100_000)
  })

  it('razão de cobrança de mensagens WebSocket é 20:1', () => {
    expect(WEBSOCKET_MESSAGE_BILLING_RATIO).toBe(20)
  })

  it('uma conexão nova soma 1 unidade de request cheia', () => {
    expect(CONNECTION_REQUEST_UNITS).toBe(1)
  })

  it('uma mensagem soma 1/20 de unidade de request (20 mensagens = 1 request)', () => {
    expect(MESSAGE_REQUEST_UNITS).toBeCloseTo(0.05)
    expect(MESSAGE_REQUEST_UNITS * 20).toBe(1)
  })
})

describe('crossedThreshold — decide quando logar o alarme de cota', () => {
  it('abaixo de todos os limiares: não cruzou nada', () => {
    expect(crossedThreshold(1000, null)).toBeNull() // 1% da cota
  })

  it('cruzou o limiar de 50% pela primeira vez', () => {
    expect(crossedThreshold(50_000, null)).toBe(0.5)
  })

  it('cruzou o limiar de 80%, já tinha alarmado 50% antes: devolve 80% (o novo limiar)', () => {
    expect(crossedThreshold(80_000, 0.5)).toBe(0.8)
  })

  it('continua nos mesmos 60%, já tinha alarmado 50%: não cruzou limiar NOVO nenhum', () => {
    expect(crossedThreshold(60_000, 0.5)).toBeNull()
  })

  it('pulou direto de "nada alarmado" pra 95% numa leitura só: alarma o MAIOR limiar cruzado (80%), não os dois separados', () => {
    expect(crossedThreshold(95_000, null)).toBe(0.8)
  })

  it('estourou a cota inteira (100%+): cruza o limiar de 1.0', () => {
    expect(crossedThreshold(100_000, 0.8)).toBe(1.0)
    expect(crossedThreshold(150_000, 0.8)).toBe(1.0)
  })

  it('já alarmou 100% hoje: não alarma de novo mesmo crescendo mais', () => {
    expect(crossedThreshold(200_000, 1.0)).toBeNull()
  })
})

describe('utcDateKey — chave de reset diário do contador', () => {
  it('formata como YYYY-MM-DD em UTC', () => {
    expect(utcDateKey(new Date('2026-08-26T23:59:59.000Z'))).toBe('2026-08-26')
  })

  it('datas diferentes (mesmo que perto da virada) geram chaves diferentes — reset natural sem job de limpeza', () => {
    const antesDaMeiaNoite = utcDateKey(new Date('2026-08-26T23:59:59.000Z'))
    const depoisDaMeiaNoite = utcDateKey(new Date('2026-08-27T00:00:01.000Z'))
    expect(antesDaMeiaNoite).not.toBe(depoisDaMeiaNoite)
  })
})
