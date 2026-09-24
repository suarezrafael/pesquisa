import { useState } from 'react'

interface TutorialProps {
  onDone: () => void
  quickStart?: boolean
}

const STEPS = [
  {
    emoji: '🪐',
    title: 'Bem-vindo ao seu mini-planeta!',
    text: 'Você é um estudante explorando a superfície de um planeta pequeno. Por ser redondo, dá pra caminhar por cima dele inteiro sem cair!',
  },
  {
    emoji: '🕹️',
    title: 'Como se mover',
    text: 'No computador, use as setas ou W A S D: esquerda/direita viram, cima/baixo andam pra frente/trás. No celular, arraste o círculo no canto da tela.',
  },
  {
    emoji: '🏫',
    title: 'Escolinhas de missão',
    text: 'Caminhe até uma escolinha colorida com um professor na porta pra abrir uma missão. As cinzas ainda estão trancadas — complete a anterior pra desbloquear a próxima.',
  },
  {
    emoji: '🏆',
    title: 'Recompensas',
    text: 'Acertar uma missão dá XP, moedas e às vezes um badge novo. Errar não tira nada — pode tentar de novo até acertar!',
  },
]

export function Tutorial({ onDone, quickStart = false }: TutorialProps) {
  const [step, setStep] = useState(0)
  const isLast = step === STEPS.length - 1
  const current = STEPS[step]

  if (quickStart) {
    return (
      <div className="screen tutorial-screen">
        <div className="tutorial-emoji">🪐</div>
        <h1>Sua primeira missão espera no planeta</h1>
        <p className="subtitle">Explore à vontade. A escolinha colorida tem um desafio para você começar.</p>
        <button type="button" className="primary-button" onClick={onDone}>Entrar no planeta</button>
      </div>
    )
  }

  return (
    <div className="screen tutorial-screen">
      <button type="button" className="tutorial-skip" onClick={onDone}>
        Pular
      </button>

      <div className="tutorial-emoji">{current.emoji}</div>
      <h1>{current.title}</h1>
      <p className="subtitle">{current.text}</p>

      <div className="tutorial-dots">
        {STEPS.map((_, i) => (
          <span key={i} className={`tutorial-dot ${i === step ? 'active' : ''}`} />
        ))}
      </div>

      <button
        type="button"
        className="primary-button"
        onClick={() => (isLast ? onDone() : setStep((s) => s + 1))}
      >
        {isLast ? 'Começar a jogar! 🚀' : 'Próximo'}
      </button>
    </div>
  )
}
