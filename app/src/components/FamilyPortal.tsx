import { useEffect, useState } from 'react'
import { isAuthApiError } from '@neondatabase/neon-js/auth'
import { authClient } from '../auth/neonAuthClient'

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

type AuthMode = 'sign-in' | 'sign-up'

function LoginScreen({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    // O cliente do Neon Auth ora REJEITA a promise pra erros de autenticação (ex.: senha errada
    // — `AuthApiError`, confirmado ao vivo em produção), ora resolve com `{ error }` — trata os
    // dois casos, senão um login errado deixava o botão preso em "Um momento..." pra sempre (bug
    // real encontrado testando isto ao vivo antes de considerar a Fase B pronta).
    try {
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

  return (
    <div className="screen onboarding">
      <h1>{mode === 'sign-up' ? 'Criar conta de responsável' : 'Entrar'}</h1>
      <p className="subtitle">
        {mode === 'sign-up'
          ? 'Sua conta aqui é só pra gerenciar a assinatura da família — nada disso aparece pra criança.'
          : 'Entre com o e-mail e senha da sua conta de responsável.'}
      </p>
      <form onSubmit={handleSubmit}>
        {mode === 'sign-up' && (
          <label className="field">
            <span>Seu nome</span>
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </label>
        )}
        <label className="field">
          <span>E-mail</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
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
        {error && <p className="field-hint">{error}</p>}
        <button type="submit" className="primary-button" disabled={busy}>
          {busy ? 'Um momento…' : mode === 'sign-up' ? 'Criar conta' : 'Entrar'}
        </button>
      </form>
      <button
        type="button"
        className="nickname-generate-btn"
        onClick={() => setMode(mode === 'sign-up' ? 'sign-in' : 'sign-up')}
      >
        {mode === 'sign-up' ? 'Já tenho conta' : 'Ainda não tenho conta'}
      </button>
    </div>
  )
}

function Dashboard({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  return (
    <div className="screen onboarding">
      <h1>Olá, responsável!</h1>
      <p className="subtitle">Conta: {email}</p>
      <p>
        <strong>Assinatura:</strong> nenhuma ativa ainda — em breve esta tela vai mostrar o status
        de verdade e permitir assinar.
      </p>
      <button type="button" className="primary-button" onClick={onSignOut}>
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
