import { useState } from 'react'

interface TutorialProps {
  onDone: () => void
}

const STEPS = [
  {
    emoji: '🪐',
    title: 'Bem-vindo ao seu mini-planeta!',
    text: 'Você é uma bolinha rolando pela superfície de um planeta pequeno. Por ser redondo, dá pra rolar por cima dele inteiro sem cair!',
  },
  {
    emoji: '🕹️',
    title: 'Como se mover',
    text: 'No computador, use as setas ou W A S D. No celular, arraste o círculo no canto da tela. A bolinha rola na direção que você mandar.',
  },
  {
    emoji: '✨',
    title: 'Portais de missão',
    text: 'Role até um portal brilhante pra abrir uma missão. Os cinzas ainda estão trancados — complete a missão anterior pra desbloquear o próximo.',
  },
  {
    emoji: '🏆',
    title: 'Recompensas',
    text: 'Acertar uma missão dá XP, moedas e às vezes um badge novo. Errar não tira nada — pode tentar de novo até acertar!',
  },
]

export function Tutorial({ onDone }: TutorialProps) {
  const [step, setStep] = useState(0)
  const isLast = step === STEPS.length - 1
  const current = STEPS[step]

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
