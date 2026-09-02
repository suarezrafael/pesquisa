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
