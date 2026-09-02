import { describe, expect, it } from 'vitest'
import {
  RECONNECT_BASE_DELAY_MS,
  RECONNECT_MAX_ATTEMPTS,
  RECONNECT_MAX_DELAY_MS,
  computeReconnectDelayMs,
  sendAttack,
  sendChat,
  sendState,
  shouldGiveUpReconnecting,
} from './multiplayer'

// lab-85, docs/prompts/05-escala-e-viabilidade.md achado G2: reconexão sem backoff vira
// tempestade de reconexão contra um relay que já estourou a cota. Estes testes cobrem só a
// função pura de cálculo do atraso — o efeito colateral (agendar/cancelar timer, WebSocket real)
// não é testável sem um DOM completo, mas a lógica de "quanto esperar" é o que mais importa
// verificar sem depender de rede de verdade.
describe('computeReconnectDelayMs', () => {
  it('usa o atraso base na primeira tentativa, dentro da faixa de jitter (50%-100%)', () => {
    const delay = computeReconnectDelayMs(1, () => 0.5)
    expect(delay).toBe(RECONNECT_BASE_DELAY_MS * 0.75)
  })

  it('dobra o atraso exponencial a cada tentativa, antes do teto', () => {
    const fixedRandom = () => 1 // jitter no máximo — isola só o crescimento exponencial
    expect(computeReconnectDelayMs(1, fixedRandom)).toBe(1000)
    expect(computeReconnectDelayMs(2, fixedRandom)).toBe(2000)
    expect(computeReconnectDelayMs(3, fixedRandom)).toBe(4000)
    expect(computeReconnectDelayMs(4, fixedRandom)).toBe(8000)
  })

  it('nunca ultrapassa o teto de 60s mesmo em tentativas altas', () => {
    const delay = computeReconnectDelayMs(10, () => 1)
    expect(delay).toBe(RECONNECT_MAX_DELAY_MS)
  })

  it('o jitter nunca deixa o atraso cair abaixo de 50% do valor exponencial', () => {
    const delay = computeReconnectDelayMs(3, () => 0)
    expect(delay).toBe(4000 * 0.5)
  })

  it('duas tentativas com o mesmo número, mas seeds de jitter diferentes, dão atrasos diferentes', () => {
    const a = computeReconnectDelayMs(5, () => 0.1)
    const b = computeReconnectDelayMs(5, () => 0.9)
    expect(a).not.toBe(b)
  })
})

describe('shouldGiveUpReconnecting', () => {
  it('continua tentando enquanto não passou do limite', () => {
    expect(shouldGiveUpReconnecting(1)).toBe(false)
    expect(shouldGiveUpReconnecting(RECONNECT_MAX_ATTEMPTS)).toBe(false)
  })

  it('desiste em silêncio assim que passa do limite de tentativas por sessão', () => {
    expect(shouldGiveUpReconnecting(RECONNECT_MAX_ATTEMPTS + 1)).toBe(true)
  })
})

// "Modo solo é o padrão funcional" (05-escala-e-viabilidade.md seção 3): sem nunca chamar
// `connect()`, o módulo começa com `socket === null` — o mesmo estado em que fica depois de
// esgotar as tentativas de reconexão (`shouldGiveUpReconnecting`). Estas funções são chamadas
// direto do laço de jogo a cada quadro; se alguma lançasse exceção nesse estado, um relay fora do
// ar quebraria o jogo inteiro pra quem está jogando sozinho — o oposto do que o documento exige.
describe('envio de rede sem conexão (modo solo)', () => {
  it('sendState não lança quando nunca conectou / a conexão caiu', () => {
    expect(() =>
      sendState('Nome', '🦊', [0, 0, 0], [0, 0, 1], 0, 0, {
        hatId: null,
        hasSword: false,
        hasGun: false,
        shirtColorId: null,
        pantsColorId: null,
        shoeColorId: null,
        backpackColorId: null,
        hairShapeId: null,
        glassesId: null,
      }),
    ).not.toThrow()
  })

  it('sendAttack e sendChat também não lançam sem conexão', () => {
    expect(() => sendAttack('sword', 'et', [0, 0, 0], [1, 0, 0])).not.toThrow()
    expect(() => sendChat('Nome', 'oi')).not.toThrow()
  })
})
