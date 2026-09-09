// Telemetria de produto (lab-99, resto de G11 — prompt.md §12: D1/D7 retention, tempo médio por
// sessão, quests concluídas por usuário). Mesmo padrão de `errorReporting.ts` (lab-84): reporta
// pro próprio Worker de contas, não um serviço de terceiro; `fetch` com `keepalive: true`; falha
// silenciosamente, nunca interrompe o jogo pra criança. Diferença central de privacidade: todo
// evento carrega só `getOrCreateDeviceId()` (`storage.ts`) — um `crypto.randomUUID()` sem NENHUM
// vínculo com nome/apelido/e-mail/família, nunca o perfil/progresso da criança.
import { getOrCreateDeviceId } from './state/storage'

const ACCOUNTS_API_URL = import.meta.env.VITE_ACCOUNTS_API_URL as string

function trackEvent(type: string, meta?: Record<string, unknown>): void {
  fetch(`${ACCOUNTS_API_URL}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceId: getOrCreateDeviceId(),
      type,
      occurredAt: new Date().toISOString(),
      meta,
    }),
    // Mesmo motivo do `errorReporting.ts`: `session_end` dispara no `pagehide`, bem no momento em
    // que a aba pode estar fechando — sem `keepalive`, o navegador cancelaria a requisição no meio.
    keepalive: true,
  }).catch(() => {
    // Sem telemetria de telemetria — se o próprio evento falhar em enviar, só descarta.
  })
}

// Chamado uma vez, no topo de `main.tsx` — dispara `session_start` já no carregamento e registra
// `session_end` (com a duração da sessão) pra quando a aba fechar/for pra segundo plano.
// `pagehide` em vez de `beforeunload`: mais confiável em mobile/PWA (Safari/Chrome no Android não
// garantem `beforeunload` de forma consistente quando o app vai pra segundo plano, que é o caso
// comum de "fechar" um PWA — trocar de app ou apagar da lista de recentes, não uma navegação de
// verdade).
export function installProductAnalytics(): void {
  const sessionStartedAt = performance.now()
  sessionStartedAtMs = sessionStartedAt
  trackEvent('session_start')
  window.addEventListener('pagehide', () => {
    trackEvent('session_end', { durationMs: Math.round(performance.now() - sessionStartedAt) })
  })
}

// Exportado à parte (não só usado internamente) pra `useProgress.ts` disparar `quest_completed`
// sem precisar reimplementar o `fetch`/`keepalive`/tratamento de erro acima.
export function trackQuestCompleted(questId: string): void {
  trackEvent('quest_completed', { questId })
}

// lab-161 (home inicial dupla criança/responsável, docs/business-analyst-prompt-backlog.md §4
// P0 item 1): os dois cliques que decidem se a primeira impressão convenceu cada público —
// "Jogar" (criança) e "Área dos responsáveis" (adulto). Sem isso, não dá pra medir se a proposta
// dupla da `TitleScreen` está funcionando, só especular.
export function trackPlayClick(): void {
  trackEvent('play_click')
}

export function trackParentAreaClick(): void {
  trackEvent('parent_area_click')
}

// lab-164 (docs/market-metrics-engagement-backlog.md §4, "Métricas de apoio") — instrumentação
// fina da jornada de ativação de 10 minutos. Cada evento dispara no máximo uma vez POR SESSÃO
// (flag em memória, não `localStorage`): mede fricção/desempenho de carregamento a cada sessão,
// não só a ativação de um perfil novo — um jogador veterano reabrindo o jogo também gera esses
// eventos de novo, o que é o comportamento certo (senão nunca saberíamos se o carregamento
// piorou pra quem já joga há meses).
let sessionStartedAtMs: number | null = null
let firstControlSent = false
let firstLearningChallengeSent = false
let firstRewardSent = false

// Perfis novos completam o ciclo "jogar + aprender + recompensa" dentro desta janela ou não
// contam como ativados (docs/market-metrics-engagement-backlog.md §4, North Star).
const ACTIVATION_WINDOW_MS = 10 * 60 * 1000

function elapsedSinceSessionStartMs(): number | null {
  if (sessionStartedAtMs === null) return null
  return Math.round(performance.now() - sessionStartedAtMs)
}

// Chamado pelo movimento do avatar (teclado/joystick combinados, `world3d/World3D.tsx`) — sinal
// de "conseguiu controlar o personagem", citado literalmente na definição da métrica no documento.
export function trackFirstControl(): void {
  if (firstControlSent) return
  firstControlSent = true
  const durationMs = elapsedSinceSessionStartMs()
  if (durationMs !== null) trackEvent('time_to_first_control', { durationMs })
}

// Chamado quando a criança abre a PRIMEIRA missão da sessão (`App.tsx`, `handleSelectQuest`) —
// nunca em toda abertura de missão, senão a métrica deixaria de significar "primeira vez".
export function trackFirstLearningChallenge(): void {
  if (firstLearningChallengeSent) return
  firstLearningChallengeSent = true
  const durationMs = elapsedSinceSessionStartMs()
  if (durationMs !== null) trackEvent('time_to_first_learning_challenge', { durationMs })
}

// Chamado pela PRIMEIRA conclusão genuína de missão da sessão (`state/useProgress.ts`,
// `completeQuest`, mesmo guard de `wasAlreadyCompleted` que já protege `trackQuestCompleted`
// contra reprise inflar a métrica). `isFirstQuestEver` vem de fora porque só quem chama sabe se
// `completedQuestIds` estava vazio ANTES desta conclusão — só nesse caso, e só dentro da janela
// de 10 minutos, o "ciclo de ativação" (jogar + aprender + recompensa) conta como fechado; um
// jogador veterano completando sua próxima missão do dia gera `time_to_first_reward` (útil pra
// medir desempenho da sessão) mas nunca `activation_cycle_completed`.
export function trackFirstReward(isFirstQuestEver: boolean): void {
  if (firstRewardSent) return
  firstRewardSent = true
  const durationMs = elapsedSinceSessionStartMs()
  if (durationMs === null) return
  trackEvent('time_to_first_reward', { durationMs })
  if (isFirstQuestEver && durationMs <= ACTIVATION_WINDOW_MS) {
    trackEvent('activation_cycle_completed', { durationMs })
  }
}
