// Lógica de domínio pura do relay — sem import de `DurableObject`/`WebSocket`/etc, sem I/O,
// conforme docs/prompts/03-arquitetura-sistema.md §1. Extraída no lab-98 (alarme de cota, parte de
// G11) especificamente pra poder ter teste unitário — requisito [MUST] de
// docs/prompts/04-manutencao-clean-code.md §5.

// Cota gratuita de requests/dia dos Durable Objects no plano Free do Cloudflare, e a razão de
// cobrança de mensagens WebSocket recebidas (20:1) — citação exata da página oficial de preços,
// confirmada em duas consultas independentes (ver labs/lab-86-correcao-orcamento-cota/CONTEXT.md):
// "a 20:1 ratio is applied to incoming WebSocket messages... 100 WebSocket incoming messages would
// be charged as 5 requests". Uma nova conexão (fetch fazendo o upgrade) conta como 1 request cheio.
export const DAILY_REQUEST_QUOTA = 100_000
export const WEBSOCKET_MESSAGE_BILLING_RATIO = 20
export const CONNECTION_REQUEST_UNITS = 1
export const MESSAGE_REQUEST_UNITS = 1 / WEBSOCKET_MESSAGE_BILLING_RATIO

// Limiares em que o alarme dispara — cada um só uma vez por dia (ver `crossedThreshold` abaixo),
// não a cada mensagem depois de já ter cruzado.
export const QUOTA_ALARM_THRESHOLDS = [0.5, 0.8, 1.0]

// Dado o total acumulado de "unidades de request" no dia e o maior limiar já alarmado (ou `null`
// se nenhum ainda), decide se cruzou um limiar NOVO e devolve o maior limiar cruzado agora (nunca
// um limiar já alarmado antes) — `null` se nenhum limiar novo foi cruzado. Pega o MAIOR limiar
// cruzado de uma vez (não um por um) pra não logar 3 alarmes seguidos se o total pular de 40% pra
// 90% numa única leitura.
export function crossedThreshold(totalUnits: number, alreadyAlarmedThreshold: number | null): number | null {
  const dailyFraction = totalUnits / DAILY_REQUEST_QUOTA
  let highestCrossed: number | null = null
  for (const threshold of QUOTA_ALARM_THRESHOLDS) {
    if (dailyFraction >= threshold) highestCrossed = threshold
  }
  if (highestCrossed === null) return null
  if (alreadyAlarmedThreshold !== null && highestCrossed <= alreadyAlarmedThreshold) return null
  return highestCrossed
}

// Chave de armazenamento por dia UTC (`YYYY-MM-DD`) — reseta o contador naturalmente a cada dia
// sem precisar de nenhum job de limpeza (uma leitura num dia novo simplesmente não acha a chave de
// ontem, começa de zero).
export function utcDateKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10)
}
