import { useState } from 'react'
import { AVATAR_CATALOG } from '../data/avatars'
import { generateNickname } from '../data/nicknames'

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
          <span>Seu apelido de explorador(a)</span>
          <div className="nickname-row">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: RaposaCorajosa42"
              maxLength={20}
              autoFocus
            />
            <button
              type="button"
              className="nickname-generate-btn"
              onClick={() => setName(generateNickname())}
              aria-label="Gerar apelido aleatório"
            >
              🎲 Gerar
            </button>
          </div>
          <small className="field-hint">Use um apelido, não seu nome real — outros jogadores podem ver!</small>
        </label>

        <button type="submit" className="primary-button" disabled={!name.trim()}>
          Começar aventura {avatarEmoji}
        </button>
      </form>
    </div>
  )
}
