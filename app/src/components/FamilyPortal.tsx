import { useEffect, useState } from 'react'
import { isAuthApiError } from '@neondatabase/neon-js/auth'
import { authClient } from '../auth/neonAuthClient'
import { loadLastPlayedAt, loadProfile, loadProgress } from '../state/storage'
import { getLevel, xpIntoLevel } from '../state/progression'
import { quests } from '../data/quests'

const ACCOUNTS_API_URL = import.meta.env.VITE_ACCOUNTS_API_URL as string
const NEON_AUTH_URL = import.meta.env.VITE_NEON_AUTH_URL as string

type SubscriptionStatus = 'loading' | 'none' | 'trialing' | 'active' | 'past_due' | 'canceled'

// `authClient.token()` (plugin JWT do Better Auth) se mostrou não confiável nesta versão do SDK —
// testado ao vivo e retorna o formato de `getSession()` (`{session, user}`), não um JWT (bug real
// encontrado no lab-80, não suposição). Em vez disso, busca o JWT direto no endpoint gerenciado do
// Neon Auth (`GET /token`, confirmado ao vivo retornando `{ token: "..." }`), com a sessão via
// cookie (`credentials: 'include'`, necessário por ser um domínio diferente do jogo).
async function fetchJwt(): Promise<string | null> {
  const res = await fetch(`${NEON_AUTH_URL}/token`, { credentials: 'include' })
  if (!res.ok) return null
  const body = (await res.json()) as { token?: string }
  return body.token ?? null
}

// O Worker de contas (Fase C, ver docs/plano-comercial-backend.md) nunca vê e-mail/senha do
// responsável — só o JWT de curta duração (~15min) acima.
async function authorizedFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await fetchJwt()
  const headers = new Headers(init?.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return fetch(`${ACCOUNTS_API_URL}${path}`, { ...init, headers })
}

// Portal dos responsáveis (Fase B do plano comercial, ver docs/plano-comercial-backend.md) —
// rota separada (`/familia`, ver App.tsx) do jogo da criança, nunca alcançável pelo fluxo normal
// de jogo. Só o responsável faz login aqui; a criança nunca vê esta tela nem tem conta.
//
// Pedido do usuário (prompt.md §15.3.1): parental gate antes de qualquer coisa — uma pergunta de
// matemática simples que uma criança pequena dificilmente resolveria sozinha na hora, mas não é
// segurança de verdade (é só um filtro de "isso não foi clicado sem querer por uma criança").

function useParentalGate() {
  const [passed, setPassed] = useState(false)
  const [question] = useState(() => {
    const a = 2 + Math.floor(Math.random() * 8)
    const b = 2 + Math.floor(Math.random() * 8)
    return { a, b, answer: a * b }
  })
  const [input, setInput] = useState('')
  const [wrong, setWrong] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (Number(input) === question.answer) {
      setPassed(true)
    } else {
      setWrong(true)
      setInput('')
    }
  }

  return { passed, question, input, setInput, wrong, handleSubmit }
}

function ParentalGateScreen({ gate }: { gate: ReturnType<typeof useParentalGate> }) {
  return (
    <div className="screen onboarding">
      <h1>Área dos responsáveis</h1>
      <p className="subtitle">
        Essa parte é só pra quem cuida da criança. Responda a conta abaixo pra continuar.
      </p>
      <form onSubmit={gate.handleSubmit}>
        <label className="field">
          <span>
            Quanto é {gate.question.a} × {gate.question.b}?
          </span>
          <input
            value={gate.input}
            onChange={(e) => gate.setInput(e.target.value)}
            inputMode="numeric"
            autoFocus
          />
          {gate.wrong && <small className="field-hint">Não foi essa — tente de novo.</small>}
        </label>
        <button type="submit" className="primary-button">
          Continuar
        </button>
      </form>
    </div>
  )
}

type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password'

// "Esqueci minha senha" (lab-88, pedido do usuário: "quero o mecanismo... isso é básico"). O
// Neon Auth deste projeto tem o plugin de e-mail-OTP configurado no servidor (confirmado pelo
// tipo real do SDK — `authClient.forgetPassword` não é a função clássica de link mágico, é um
// objeto com só `emailOtp`), então o fluxo é: pede um código de 6 dígitos por e-mail
// (`forgetPassword.emailOtp`), depois troca o código + a senha nova numa chamada só
// (`emailOtp.resetPassword`) — tudo dentro da mesma página, sem depender de abrir um link de
// e-mail separado. O provedor de e-mail do Neon já está configurado (compartilhado,
// `auth@mail.myneon.app`), então o código é enviado de verdade, sem precisar configurar SMTP por
// conta própria.
type ForgotPasswordStep = 'request' | 'confirm'

function LoginScreen({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [forgotStep, setForgotStep] = useState<ForgotPasswordStep>('request')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [resetDone, setResetDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    // O cliente do Neon Auth ora REJEITA a promise pra erros de autenticação (ex.: senha errada
    // — `AuthApiError`, confirmado ao vivo em produção), ora resolve com `{ error }` — trata os
    // dois casos, senão um login errado deixava o botão preso em "Um momento..." pra sempre (bug
    // real encontrado testando isto ao vivo antes de considerar a Fase B pronta).
    try {
      if (mode === 'forgot-password') {
        if (forgotStep === 'request') {
          const result = await authClient.forgetPassword.emailOtp({ email })
          if (result.error) {
            setError(result.error.message ?? 'Não foi possível enviar o código. Confira o e-mail.')
            return
          }
          setForgotStep('confirm')
          return
        }
        const result = await authClient.emailOtp.resetPassword({ email, otp, password: newPassword })
        if (result.error) {
          setError(result.error.message ?? 'Código incorreto ou expirado — peça um código novo.')
          return
        }
        setResetDone(true)
        return
      }
      const result =
        mode === 'sign-up'
          ? await authClient.signUp.email({ name: name.trim() || email.split('@')[0], email, password })
          : await authClient.signIn.email({ email, password })
      if (result.error) {
        setError(result.error.message ?? 'Não foi possível continuar. Confira e-mail e senha.')
        return
      }
      onAuthenticated()
    } catch (err) {
      setError(isAuthApiError(err) ? err.message : 'Não foi possível continuar. Confira e-mail e senha.')
    } finally {
      setBusy(false)
    }
  }

  function backToSignIn() {
    setMode('sign-in')
    setForgotStep('request')
    setOtp('')
    setNewPassword('')
    setResetDone(false)
    setError(null)
  }

  if (mode === 'forgot-password' && resetDone) {
    return (
      <div className="screen onboarding">
        <h1>Senha alterada!</h1>
        <p className="subtitle">Agora é só entrar com a senha nova.</p>
        <button type="button" className="primary-button" onClick={backToSignIn}>
          Ir para o login
        </button>
      </div>
    )
  }

  return (
    <div className="screen onboarding">
      <h1>
        {mode === 'sign-up'
          ? 'Criar conta de responsável'
          : mode === 'forgot-password'
            ? 'Esqueci minha senha'
            : 'Entrar'}
      </h1>
      <p className="subtitle">
        {mode === 'sign-up'
          ? 'Sua conta aqui é só pra gerenciar a assinatura da família — nada disso aparece pra criança.'
          : mode === 'forgot-password'
            ? forgotStep === 'request'
              ? 'Digite o e-mail da sua conta — mandamos um código de 6 dígitos pra você trocar a senha.'
              : `Digite o código que mandamos pra ${email} e a senha nova.`
            : 'Entre com o e-mail e senha da sua conta de responsável.'}
      </p>
      <form onSubmit={handleSubmit}>
        {mode === 'sign-up' && (
          <label className="field">
            <span>Seu nome</span>
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </label>
        )}
        {!(mode === 'forgot-password' && forgotStep === 'confirm') && (
          <label className="field">
            <span>E-mail</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
        )}
        {mode === 'forgot-password' && forgotStep === 'confirm' && (
          <>
            <label className="field">
              <span>Código recebido por e-mail</span>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                inputMode="numeric"
                autoFocus
                required
              />
            </label>
            <label className="field">
              <span>Senha nova</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
              />
            </label>
          </>
        )}
        {mode !== 'forgot-password' && (
          <label className="field">
            <span>Senha</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </label>
        )}
        {error && <p className="field-hint">{error}</p>}
        {mode === 'sign-up' && (
          <p className="field-hint legal-consent-hint">
            Ao criar conta, você concorda com os{' '}
            <a href="/termos" target="_blank" rel="noreferrer">
              Termos de Uso
            </a>{' '}
            e a{' '}
            <a href="/privacidade" target="_blank" rel="noreferrer">
              Política de Privacidade
            </a>
            .
          </p>
        )}
        <button type="submit" className="primary-button" disabled={busy}>
          {busy
            ? 'Um momento…'
            : mode === 'sign-up'
              ? 'Criar conta'
              : mode === 'forgot-password'
                ? forgotStep === 'request'
                  ? 'Enviar código'
                  : 'Trocar senha'
                : 'Entrar'}
        </button>
      </form>
      {mode === 'forgot-password' && forgotStep === 'confirm' && (
        <button
          type="button"
          className="nickname-generate-btn"
          onClick={() => {
            setForgotStep('request')
            setError(null)
          }}
        >
          Pedir um código novo
        </button>
      )}
      {mode === 'sign-in' && (
        <button type="button" className="nickname-generate-btn" onClick={() => setMode('forgot-password')}>
          Esqueci minha senha
        </button>
      )}
      <button
        type="button"
        className="nickname-generate-btn"
        onClick={() => (mode === 'forgot-password' ? backToSignIn() : setMode(mode === 'sign-up' ? 'sign-in' : 'sign-up'))}
      >
        {mode === 'sign-up' ? 'Já tenho conta' : mode === 'forgot-password' ? 'Voltar pro login' : 'Ainda não tenho conta'}
      </button>
    </div>
  )
}

const STATUS_LABEL: Record<Exclude<SubscriptionStatus, 'loading'>, string> = {
  none: 'Nenhuma assinatura ativa',
  trialing: 'Assinatura em teste',
  active: 'Assinatura ativa',
  past_due: 'Pagamento pendente — verifique o cartão',
  canceled: 'Assinatura cancelada',
}

interface PairingCode {
  code: string
  expiresAt: string
}

// lab-100, resto de G7: um aparelho pareado, como devolvido por `GET /entitlement/devices`. Sem
// fingerprint/user-agent (fora de escopo desde o lab-97) — a única identificação é a data de
// pareamento.
interface PairedDevice {
  jti: string
  issuedAt: string
  revokedAt: string | null
}

// Gera o código de pareamento (Fase D, ver docs/plano-comercial-backend.md) — a criança digita
// esse código UMA VEZ no jogo pra vincular o entitlement da família, sem nunca precisar de
// e-mail/senha. Componente à parte pra isolar o `setInterval` da contagem regressiva do resto do
// Dashboard.
function PairingCodeGenerator() {
  const [pairing, setPairing] = useState<PairingCode | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  // lab-97, resto de G7 (docs/prompts/05-escala-e-viabilidade.md): válvula de segurança se o
  // código de pareamento vazar — corta o acesso de qualquer aparelho que tenha pego ele. Ação
  // destrutiva do ponto de vista da criança (perde o pareamento, precisa digitar um código novo),
  // por isso pede confirmação — dois cliques em vez de `window.confirm` nativo (mais consistente
  // com o resto do design deste portal).
  const [revokeConfirming, setRevokeConfirming] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [revokeMessage, setRevokeMessage] = useState<string | null>(null)

  // lab-100, resto de G7: lista de aparelhos pareados, pra revogar um específico em vez de todos
  // de uma vez. Mesmo padrão de confirmação em duas etapas do "revogar todos" acima, mas por item
  // (`confirmingJti` guarda qual aparelho está com a confirmação aberta no momento).
  const [devices, setDevices] = useState<PairedDevice[] | null>(null)
  const [confirmingJti, setConfirmingJti] = useState<string | null>(null)
  const [revokingJti, setRevokingJti] = useState<string | null>(null)
  const [deviceMessage, setDeviceMessage] = useState<string | null>(null)

  async function loadDevices() {
    try {
      const res = await authorizedFetch('/entitlement/devices')
      const body = (await res.json().catch(() => null)) as { devices?: PairedDevice[] } | null
      setDevices(res.ok && body?.devices ? body.devices : [])
    } catch {
      setDevices([])
    }
  }

  useEffect(() => {
    loadDevices()
  }, [])

  async function handleRevokeDevice(jti: string) {
    setRevokingJti(jti)
    setDeviceMessage(null)
    try {
      const res = await authorizedFetch('/entitlement/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jti }),
      })
      if (!res.ok) {
        setDeviceMessage('Não foi possível revogar esse aparelho. Tente novamente.')
        return
      }
      setDeviceMessage('Aparelho revogado.')
      await loadDevices()
    } catch {
      setDeviceMessage('Não foi possível revogar esse aparelho. Tente novamente.')
    } finally {
      setRevokingJti(null)
      setConfirmingJti(null)
    }
  }

  useEffect(() => {
    if (!pairing) return
    const tick = () => {
      const remaining = Math.max(0, Math.round((new Date(pairing.expiresAt).getTime() - Date.now()) / 1000))
      setSecondsLeft(remaining)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [pairing])

  async function handleGenerate() {
    setError(null)
    setBusy(true)
    try {
      const res = await authorizedFetch('/pairing/generate', { method: 'POST' })
      const body = (await res.json()) as { code?: string; expiresAt?: string; error?: string }
      if (!body.code || !body.expiresAt) {
        setError(body.error ?? 'Não foi possível gerar um código. Tente novamente.')
        return
      }
      setPairing({ code: body.code, expiresAt: body.expiresAt })
    } catch {
      setError('Não foi possível gerar um código. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRevokeAll() {
    setRevoking(true)
    setRevokeMessage(null)
    try {
      const res = await authorizedFetch('/entitlement/revoke-all', { method: 'POST' })
      const body = (await res.json().catch(() => null)) as { revokedCount?: number } | null
      if (!res.ok || body?.revokedCount === undefined) {
        setRevokeMessage('Não foi possível desvincular os aparelhos. Tente novamente.')
        return
      }
      setRevokeMessage(
        body.revokedCount > 0
          ? `${body.revokedCount} aparelho(s) desvinculado(s). A criança vai precisar de um código novo.`
          : 'Nenhum aparelho vinculado no momento.',
      )
      await loadDevices()
    } catch {
      setRevokeMessage('Não foi possível desvincular os aparelhos. Tente novamente.')
    } finally {
      setRevoking(false)
      setRevokeConfirming(false)
    }
  }

  const expired = pairing !== null && secondsLeft <= 0

  return (
    <div className="pairing-code-box">
      <h3>Vincular com o jogo</h3>
      <p className="subtitle">Gere um código e peça pra criança digitar ele uma vez no jogo.</p>
      {pairing && !expired ? (
        <>
          <p className="pairing-code">{pairing.code}</p>
          <p className="field-hint">Expira em {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}</p>
        </>
      ) : (
        <button type="button" className="primary-button" onClick={handleGenerate} disabled={busy}>
          {busy ? 'Um momento…' : expired ? 'Gerar novo código' : 'Gerar código'}
        </button>
      )}
      {error && <p className="field-hint">{error}</p>}

      {devices && devices.some((d) => !d.revokedAt) && (
        <div className="device-list">
          <h4>Aparelhos pareados</h4>
          <ul>
            {devices
              .filter((d) => !d.revokedAt)
              .map((device) => (
                <li key={device.jti} className="device-list-item">
                  <span>
                    Pareado em {new Date(device.issuedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                  {confirmingJti === device.jti ? (
                    <>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => handleRevokeDevice(device.jti)}
                        disabled={revokingJti === device.jti}
                      >
                        {revokingJti === device.jti ? 'Um momento…' : 'Confirmar revogação'}
                      </button>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => setConfirmingJti(null)}
                        disabled={revokingJti === device.jti}
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button type="button" className="text-button" onClick={() => setConfirmingJti(device.jti)}>
                      Revogar
                    </button>
                  )}
                </li>
              ))}
          </ul>
          {deviceMessage && <p className="field-hint">{deviceMessage}</p>}
        </div>
      )}

      <div className="pairing-revoke-all">
        {revokeConfirming ? (
          <>
            <p className="field-hint">
              Isso desvincula TODOS os aparelhos que já usaram um código desta família — a criança
              vai precisar de um código novo pra jogar de novo. Tem certeza?
            </p>
            <button type="button" className="secondary-button" onClick={handleRevokeAll} disabled={revoking}>
              {revoking ? 'Um momento…' : 'Sim, desvincular todos'}
            </button>
            <button type="button" className="text-button" onClick={() => setRevokeConfirming(false)} disabled={revoking}>
              Cancelar
            </button>
          </>
        ) : (
          <button type="button" className="text-button" onClick={() => setRevokeConfirming(true)}>
            Desvincular todos os aparelhos
          </button>
        )}
        {revokeMessage && <p className="field-hint">{revokeMessage}</p>}
      </div>
    </div>
  )
}

// lab-103, resto de G11/`prompt.md` §12: NPS de pais/responsáveis — diferente de
// `productAnalytics.ts` (100% anônimo, por dispositivo da criança), este é o RESPONSÁVEL já
// autenticado respondendo por conta própria, sem problema novo de privacidade infantil.
// `GET /nps/status` decide se pergunta (nunca respondeu, ou o cooldown de 90 dias já venceu) —
// decisão do servidor, não de `localStorage`, porque é sobre a FAMÍLIA, não o aparelho/navegador.
function NpsWidget() {
  const [shouldPrompt, setShouldPrompt] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [score, setScore] = useState('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    authorizedFetch('/nps/status')
      .then((res) => res.json())
      .then((body: { shouldPrompt?: boolean }) => setShouldPrompt(Boolean(body.shouldPrompt)))
      .catch(() => setShouldPrompt(false))
  }, [])

  async function handleSubmit() {
    setError(null)
    setSubmitting(true)
    try {
      const res = await authorizedFetch('/nps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: Number(score), comment: comment.trim() || undefined }),
      })
      if (!res.ok) {
        setError('Não foi possível enviar. Tente novamente.')
        return
      }
      setSubmitted(true)
    } catch {
      setError('Não foi possível enviar. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!shouldPrompt || dismissed) return null

  if (submitted) {
    return (
      <div className="pairing-code-box nps-widget">
        <p>Obrigado pelo feedback! 💜</p>
      </div>
    )
  }

  return (
    <div className="pairing-code-box nps-widget">
      <h3>De 0 a 10, o quanto você recomendaria o Missão Aprender pra outro responsável?</h3>
      <select className="nps-score-select" value={score} onChange={(e) => setScore(e.target.value)}>
        <option value="">Escolha uma nota</option>
        {Array.from({ length: 11 }, (_, n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      <textarea
        className="nps-comment"
        placeholder="Algum comentário? (opcional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={1000}
      />
      {error && <p className="field-hint">{error}</p>}
      <button type="button" className="primary-button" onClick={handleSubmit} disabled={submitting || score === ''}>
        {submitting ? 'Enviando…' : 'Enviar'}
      </button>
      <button type="button" className="text-button" onClick={() => setDismissed(true)} disabled={submitting}>
        Agora não
      </button>
    </div>
  )
}

// Painel de progresso (lab-91, pedido do usuário: "itens que ajudem o responsável a gerenciar o
// que a criança está fazendo no jogo" — prompt.md §15 já previa isso como parte do dashboard do
// responsável). O jogo não tem conta pra criança nem backend de gameplay (só `localStorage`, por
// desenho — ver CLAUDE.md/README.md), então este painel lê o MESMO `localStorage` da origem
// atual: só mostra algo quando `/familia` é aberto no mesmo navegador/aparelho que a criança usa
// pra jogar (o fluxo mais comum, já que o link "Abrir área dos responsáveis" da tela de
// pareamento abre nessa mesma aba/navegador). Sincronizar progresso entre aparelhos diferentes
// exigiria mandar dado de criança pro servidor — decisão de arquitetura maior, fora de escopo
// aqui (mesma categoria do que ficou de fora em G6 no lab-90).
function ChildProgressPanel() {
  const profile = loadProfile()

  if (!profile) {
    return (
      <div className="pairing-code-box progress-panel">
        <h3>Progresso da criança</h3>
        <p className="field-hint">
          Nenhum progresso encontrado neste aparelho. Este painel mostra o progresso salvo no
          mesmo navegador/aparelho que a criança usa pra jogar — abra esta página nele pra ver.
        </p>
      </div>
    )
  }

  const progress = loadProgress()
  const lastPlayedAt = loadLastPlayedAt()
  const level = getLevel(progress.xp)
  const { current, needed } = xpIntoLevel(progress.xp)

  return (
    <div className="pairing-code-box progress-panel">
      <h3>
        Progresso de {profile.avatarEmoji} {profile.name}
      </h3>
      <p className="field-hint">Progresso salvo neste aparelho — se a criança jogar em outro, veja de lá.</p>
      <div className="progress-panel-stats">
        <div className="progress-panel-stat">
          <strong>Nível {level}</strong>
          <span>{current} / {needed} XP</span>
        </div>
        <div className="progress-panel-stat">
          <strong>🪙 {progress.coins}</strong>
          <span>moedas</span>
        </div>
        <div className="progress-panel-stat">
          <strong>
            {progress.completedQuestIds.length} / {quests.length}
          </strong>
          <span>missões concluídas</span>
        </div>
      </div>
      {progress.badges.length > 0 && (
        <p className="progress-panel-badges">
          {progress.badges.map((badge) => (
            <span key={badge} className="progress-panel-badge">
              🏅 {badge}
            </span>
          ))}
        </p>
      )}
      <p className="field-hint">
        {lastPlayedAt
          ? `Última vez jogado: ${new Date(lastPlayedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`
          : 'Ainda não há registro de quando a criança jogou pela última vez.'}
      </p>
    </div>
  )
}

function Dashboard({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  const [status, setStatus] = useState<SubscriptionStatus>('loading')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function refreshStatus() {
    try {
      const res = await authorizedFetch('/subscription')
      const body = (await res.json()) as { status: SubscriptionStatus }
      setStatus(body.status)
    } catch {
      // Sem conexão com o Worker — trata como "sem assinatura" em vez de travar a tela pra
      // sempre (mesmo cuidado do bug corrigido em LoginScreen/refreshSession).
      setStatus('none')
    }
  }

  useEffect(() => {
    refreshStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubscribe() {
    setError(null)
    setBusy(true)
    try {
      const res = await authorizedFetch('/checkout', { method: 'POST' })
      const body = (await res.json()) as { url?: string; error?: string }
      if (!body.url) {
        setError(body.error ?? 'Não foi possível iniciar a assinatura. Tente novamente.')
        return
      }
      window.location.href = body.url
    } catch {
      setError('Não foi possível iniciar a assinatura. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  async function handleManageBilling() {
    setError(null)
    setBusy(true)
    try {
      const res = await authorizedFetch('/billing-portal', { method: 'POST' })
      const body = (await res.json()) as { url?: string; error?: string }
      if (!body.url) {
        setError(body.error ?? 'Não foi possível abrir o gerenciamento da assinatura.')
        return
      }
      window.location.href = body.url
    } catch {
      setError('Não foi possível abrir o gerenciamento da assinatura.')
    } finally {
      setBusy(false)
    }
  }

  const canSubscribe = status === 'none' || status === 'canceled'
  const canPair = status === 'active' || status === 'trialing'
  const canManageBilling = status !== 'none' && status !== 'loading'

  return (
    <div className="screen onboarding">
      <h1>Olá, responsável!</h1>
      <p className="subtitle">Conta: {email}</p>
      <ChildProgressPanel />
      <p>
        <strong>Assinatura:</strong>{' '}
        {status === 'loading' ? 'Verificando…' : STATUS_LABEL[status]}
      </p>
      {canSubscribe && (
        <button type="button" className="primary-button" onClick={handleSubscribe} disabled={busy}>
          {busy ? 'Um momento…' : 'Assinar por R$ 4,99/mês'}
        </button>
      )}
      {canManageBilling && (
        <button type="button" className="nickname-generate-btn" onClick={handleManageBilling} disabled={busy}>
          {busy ? 'Um momento…' : 'Gerenciar assinatura / cancelar'}
        </button>
      )}
      {error && <p className="field-hint">{error}</p>}
      {canPair && <PairingCodeGenerator />}
      {canManageBilling && <NpsWidget />}
      <button type="button" className="nickname-generate-btn" onClick={onSignOut}>
        Sair
      </button>
    </div>
  )
}

export function FamilyPortal() {
  const gate = useParentalGate()
  const [session, setSession] = useState<{ email: string } | null | 'loading'>('loading')

  async function refreshSession() {
    try {
      const result = await authClient.getSession()
      setSession(result.data?.user ? { email: result.data.user.email } : null)
    } catch {
      // Sem sessão válida (ou erro de rede) — trata como "não logado", não deixa preso em
      // 'loading' pra sempre (mesmo risco do bug corrigido em `LoginScreen` acima).
      setSession(null)
    }
  }

  useEffect(() => {
    if (gate.passed) refreshSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gate.passed])

  if (!gate.passed) return <ParentalGateScreen gate={gate} />
  if (session === 'loading') return <div className="screen onboarding" />
  if (!session) return <LoginScreen onAuthenticated={refreshSession} />

  return (
    <Dashboard
      email={session.email}
      onSignOut={async () => {
        await authClient.signOut()
        setSession(null)
      }}
    />
  )
}
