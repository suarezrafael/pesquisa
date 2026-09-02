// Tela "Quem vai jogar?" (lab-108) — só aparece quando o aparelho já tem 2+ perfis OU o
// responsável pediu pra trocar (botão 🔁 no HUD); perfil único (o caso comum) nunca vê esta tela,
// o jogo segue direto pro mundo 3D como sempre foi. Reaproveita `.screen`/`.primary-button` de
// `TitleScreen.tsx`/`Onboarding.tsx`, sem CSS novo além da grade de perfis.
import type { ProfileRosterEntry } from '../state/storage'
import { MAX_PROFILES } from '../state/storage'

interface ProfilePickerProps {
  roster: ProfileRosterEntry[]
  onSelect: (id: string) => void
  onCreateNew: () => void
}

export function ProfilePicker({ roster, onSelect, onCreateNew }: ProfilePickerProps) {
  return (
    <div className="screen profile-picker">
      <h1>Quem vai jogar?</h1>
      <p className="subtitle">Cada explorador(a) tem seu próprio progresso neste aparelho.</p>

      <div className="profile-picker-grid">
        {roster.map((entry) => (
          <button
            type="button"
            key={entry.id}
            className="profile-picker-item"
            onClick={() => onSelect(entry.id)}
          >
            <span className="profile-picker-emoji">{entry.avatarEmoji}</span>
            <span className="profile-picker-name">{entry.name}</span>
          </button>
        ))}

        {roster.length < MAX_PROFILES && (
          <button type="button" className="profile-picker-item profile-picker-add" onClick={onCreateNew}>
            <span className="profile-picker-emoji">➕</span>
            <span className="profile-picker-name">Novo perfil</span>
          </button>
        )}
      </div>
    </div>
  )
}
