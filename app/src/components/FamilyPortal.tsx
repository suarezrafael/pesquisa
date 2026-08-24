import { useEffect, useState } from 'react'
import { isAuthApiError } from '@neondatabase/neon-js/auth'
import { authClient } from '../auth/neonAuthClient'

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

// Gera o código de pareamento (Fase D, ver docs/plano-comercial-backend.md) — a criança digita
// esse código UMA VEZ no jogo pra vincular o entitlement da família, sem nunca precisar de
// e-mail/senha. Componente à parte pra isolar o `setInterval` da contagem regressiva do resto do
// Dashboard.
function PairingCodeGenerator() {
  const [pairing, setPairing] = useState<PairingCode | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)

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
