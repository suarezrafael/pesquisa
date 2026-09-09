// Teste da única lógica pura extraível de `useFriendRequests.ts` — o resto do módulo é I/O
// (fetch), não testável de forma isolada sem mockar rede. `formatLastSeen` só formata texto de
// exibição; a regra de "está online ou não" vive no servidor (`isOnlineNow`, server-accounts).
import { describe, expect, it } from 'vitest'
import { formatLastSeen } from './useFriendRequests'

describe('formatLastSeen (lab-162)', () => {
  const now = new Date('2026-09-08T12:00:00.000Z').getTime()

  it('formata minutos quando faz menos de 1 hora', () => {
    expect(formatLastSeen('2026-09-08T11:45:00.000Z', now)).toBe('há 15 min')
  })

  it('arredonda pra baixo de 1 minuto pra "há 1 min", nunca "há 0 min"', () => {
    expect(formatLastSeen('2026-09-08T11:59:30.000Z', now)).toBe('há 1 min')
  })

  it('formata horas quando faz mais de 1 hora e menos de 1 dia', () => {
    expect(formatLastSeen('2026-09-08T09:00:00.000Z', now)).toBe('há 3h')
  })

  it('formata dias quando faz 1 dia ou mais', () => {
    expect(formatLastSeen('2026-09-06T12:00:00.000Z', now)).toBe('há 2d')
  })

  it('achado do review do Copilot (PR #35): data inválida não vira "há NaNd"', () => {
    expect(formatLastSeen('não é uma data', now)).toBe('há um tempo')
    expect(formatLastSeen('', now)).toBe('há um tempo')
  })
})
