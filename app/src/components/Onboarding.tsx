import { useState } from 'react'
import { AVATAR_CATALOG } from '../data/avatars'

// Só os avatares gratuitos aparecem na criação de perfil — os demais são desbloqueados com
// moedas na lojinha (world3d/AvatarShop.tsx), depois de já estar jogando.
const AVATAR_OPTIONS = AVATAR_CATALOG.filter((a) => a.cost === 0).map((a) => a.emoji)

interface OnboardingProps {
  onDone: (name: string, avatarEmoji: string) => void
}

export function Onboarding({ onDone }: OnboardingProps) {
  const [name, setName] = useState('')
  const [avatarEmoji, setAvatarEmoji] = useState(AVATAR_OPTIONS[0])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onDone(trimmed, avatarEmoji)
  }

  return (
    <div className="screen onboarding">
      <h1>Bem-vindo(a) à aventura!</h1>
      <p className="subtitle">Escolha seu avatar e o seu nome de explorador(a).</p>

      <form onSubmit={handleSubmit}>
        <div className="avatar-grid" role="group" aria-label="Escolha seu avatar">
          {AVATAR_OPTIONS.map((emoji) => (
            <button
              type="button"
              key={emoji}
              className={`avatar-choice ${avatarEmoji === emoji ? 'selected' : ''}`}
              onClick={() => setAvatarEmoji(emoji)}
              aria-pressed={avatarEmoji === emoji}
            >
              {emoji}
            </button>
          ))}
        </div>

        <label className="field">
          <span>Seu nome</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Digite seu nome"
            maxLength={20}
            autoFocus
          />
        </label>

        <button type="submit" className="primary-button" disabled={!name.trim()}>
          Começar aventura {avatarEmoji}
        </button>
      </form>
    </div>
  )
}
