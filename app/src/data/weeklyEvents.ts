// Eventos semanais (lab-22) — catálogo fixo, sem servidor: o evento da semana atual é
// determinístico a partir da data real (número da semana ISO), então todo jogador que abrir o
// jogo na mesma semana vê o mesmo evento, sem precisar de conta/sincronização. Mesmo padrão de
// "desafio semanal" comum em jogos que não têm backend próprio ainda.
export interface WeeklyEvent {
  id: string
  name: string
  emoji: string
  description: string
  xpMultiplier: number
  coinMultiplier: number
}

const WEEKLY_EVENTS: WeeklyEvent[] = [
  {
    id: 'semana-normal',
    name: 'Semana Normal',
    emoji: '📅',
    description: 'Sem bônus especial esta semana — volte na próxima!',
    xpMultiplier: 1,
    coinMultiplier: 1,
  },
  {
    id: 'semana-dourada',
    name: 'Semana Dourada',
    emoji: '🪙',
    description: 'Moedas em dobro em toda missão concluída!',
    xpMultiplier: 1,
    coinMultiplier: 2,
  },
  {
    id: 'semana-sabio',
    name: 'Semana do Sábio',
    emoji: '🧠',
    description: 'XP em dobro em toda missão concluída!',
    xpMultiplier: 2,
    coinMultiplier: 1,
  },
  {
    id: 'semana-dupla',
    name: 'Semana da Recompensa Dupla',
    emoji: '✨',
    description: 'XP e moedas em dobro em toda missão concluída!',
    xpMultiplier: 2,
    coinMultiplier: 2,
  },
]

// Número da semana ISO 8601 (1–53) — mesma definição usada em calendários/planilhas, garante que
// a rotação de eventos mude toda segunda-feira e seja igual pra qualquer jogador no mesmo fuso.
function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  const diffMs = d.getTime() - firstThursday.getTime()
  return 1 + Math.round(diffMs / (7 * 24 * 3600 * 1000))
}

export function getCurrentWeeklyEvent(date: Date = new Date()): WeeklyEvent {
  const week = isoWeekNumber(date)
  return WEEKLY_EVENTS[week % WEEKLY_EVENTS.length]
}

// lab-157 (ranking local entre perfis do mesmo aparelho, Grupo A do backlog social do lab-154) —
// chave de semana estável ("2026-W23"), reaproveitando a MESMA definição ISO 8601 já usada pra
// girar o evento semanal (garante que "essa semana" signifique a mesma coisa nos dois lugares).
// Precisa do ANO-DA-SEMANA ISO (não `date.getFullYear()` puro — nos últimos/primeiros dias de
// dezembro/janeiro os dois podem divergir), por isso repete o mesmo ajuste de quinta-feira em vez
// de só reaproveitar `isoWeekNumber` sozinho.
export function isoWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - dayNum + 3)
  return `${d.getUTCFullYear()}-W${isoWeekNumber(date)}`
}
