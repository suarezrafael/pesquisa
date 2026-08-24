// Captura de erro do client (lab-84) — pedido do usuário: "profissionalizar o jogo como
// produto". Em vez de um serviço de terceiro tipo Sentry (exigiria criar conta nova em nome do
// usuário, algo que não posso fazer sozinho), reporta pro próprio Worker de contas
// (`POST /client-error`), que só loga via `console.error` — visível em `wrangler tail`/painel de
// Logs da Cloudflare, sem persistir em banco. Nunca interrompe o jogo pra criança: qualquer falha
// no próprio reporte é silenciosamente ignorada.
const ACCOUNTS_API_URL = import.meta.env.VITE_ACCOUNTS_API_URL as string

// Limite por sessão de aba — sem isso, um erro que acontece em loop (ex. dentro do laço de
// renderização do Babylon) spamaria o endpoint indefinidamente em vez de só avisar que algo
// quebrou.
const MAX_REPORTS_PER_SESSION = 5
let reportCount = 0

function report(message: string, stack: string | undefined, url: string): void {
  if (reportCount >= MAX_REPORTS_PER_SESSION) return
  reportCount++
  fetch(`${ACCOUNTS_API_URL}/client-error`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, stack, url, userAgent: navigator.userAgent }),
    // `keepalive` deixa a requisição sobreviver mesmo se o erro derrubar a página logo em
    // seguida (ex. um crash que dispara um reload) — o navegador entrega o beacon de qualquer
    // forma, em vez de cancelar por causa da navegação.
    keepalive: true,
  }).catch(() => {
    // Não há nada a fazer se o próprio reporte de erro falhar — não reporta esse erro de volta
    // (evitaria um loop).
  })
}

export function installErrorReporting(): void {
  window.addEventListener('error', (event) => {
    report(event.message, event.error?.stack, window.location.pathname)
  })
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    const message = reason instanceof Error ? reason.message : String(reason)
    const stack = reason instanceof Error ? reason.stack : undefined
    report(message, stack, window.location.pathname)
  })
}
