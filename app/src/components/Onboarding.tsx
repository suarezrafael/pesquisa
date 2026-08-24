import { useState } from 'react'
import { AVATAR_CATALOG } from '../data/avatars'
import { generateNickname } from '../data/nicknames'
import { isNicknameAllowed, sanitizeNicknameChars } from '../data/nicknameFilter'

// Só os avatares gratuitos aparecem na criação de perfil — os demais são desbloqueados com
// moedas na lojinha (world3d/AvatarShop.tsx), depois de já estar jogando.
const AVATAR_OPTIONS = AVATAR_CATALOG.filter((a) => a.cost === 0).map((a) => a.emoji)

interface OnboardingProps {
  onDone: (name: string, avatarEmoji: string) => void
}

export function Onboarding({ onDone }: OnboardingProps) {
  const [name, setName] = useState('')
  const [avatarEmoji, setAvatarEmoji] = useState(AVATAR_OPTIONS[0])

  const trimmedName = name.trim()
  const nicknameBlocked = trimmedName.length > 0 && !isNicknameAllowed(trimmedName)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!trimmedName || !isNicknameAllowed(trimmedName)) return
    onDone(trimmedName, avatarEmoji)
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
              onChange={(e) => setName(sanitizeNicknameChars(e.target.value).slice(0, 20))}
              placeholder="Ex: Raposa Corajosa"
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
          {nicknameBlocked ? (
            <small className="field-hint field-hint-error">Esse apelido não pode ser usado — tente outro.</small>
          ) : (
            <small className="field-hint">
              Use um apelido, não seu nome real — outros jogadores podem ver! Só letras, sem número ou símbolo.
            </small>
          )}
        </label>

        <button type="submit" className="primary-button" disabled={!trimmedName || nicknameBlocked}>
          Começar aventura {avatarEmoji}
        </button>
      </form>
    </div>
  )
}
