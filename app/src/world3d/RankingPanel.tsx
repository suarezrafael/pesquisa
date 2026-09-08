import { useState } from 'react'
import type { RankingEntry } from './multiplayer'
import { getLevel, weeklyXpEarned } from '../state/progression'
import { getActiveProfileId, listProfiles, loadProgressForProfileId } from '../state/storage'
import { useModalA11y } from '../state/useModalA11y'
import type { Profile, Progress } from '../types'

interface RankingPanelProps {
  entries: RankingEntry[]
  connected: boolean
  // lab-157 — só usados pela aba "Neste aparelho" (ranking local entre perfis, lab-108); a aba
  // "Online agora" (comportamento original, lab-20) não depende de nenhum dos dois.
  profile: Profile
  progress: Progress
  onClose: () => void
}

type RankingTab = 'online' | 'local'

// Ranking local entre perfis do MESMO aparelho (lab-157, último item do Grupo A do backlog social
// do lab-154) — "quem joga com quem se conhece" retém mais que multiplayer anônimo global,
// achado da pesquisa de mercado desta sessão. Lê `Progress` de cada perfil do roster (lab-108)
// direto do `localStorage` (`loadProgressForProfileId`), sem trocar de perfil ativo pra isso; o
// perfil ATIVO usa a prop `progress` (React, sempre mais fresca que o que já foi salvo) em vez de
// reler do próprio `localStorage`.
function buildLocalEntries(profile: Profile, progress: Progress, nowIso: string) {
  const roster = listProfiles()
  const activeId = getActiveProfileId()
  return roster
    .map((r) => {
      const isSelf = r.id === activeId
      const p = isSelf ? progress : loadProgressForProfileId(r.id)
      return {
        id: r.id,
        name: isSelf ? profile.name : r.name,
        avatarEmoji: isSelf ? profile.avatarEmoji : r.avatarEmoji,
        weeklyXp: weeklyXpEarned(p, nowIso),
        isSelf,
      }
    })
    .sort((a, b) => b.weeklyXp - a.weeklyXp)
}

export function RankingPanel({ entries, connected, profile, progress, onClose }: RankingPanelProps) {
  const panelRef = useModalA11y(onClose)
  const [tab, setTab] = useState<RankingTab>('online')
  // Só mostra a aba local com 2+ perfis no aparelho — mesmo espírito de `ProfilePicker` só
  // aparecer com múltiplos perfis (lab-108): ranking de uma pessoa só não diz nada.
  const roster = listProfiles()
  const showLocalTab = roster.length > 1
  const localEntries = showLocalTab ? buildLocalEntries(profile, progress, new Date().toISOString()) : []

  return (
    <div
      className="chat-panel ranking-panel"
      role="region"
      aria-label="Ranking"
      ref={panelRef}
      tabIndex={-1}
    >
      <div className="chat-panel-header">
        <span>Ranking {tab === 'online' && (connected ? '🟢 conectado' : '🔴 sem conexão')}</span>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar ranking">
          ×
        </button>
      </div>

      {showLocalTab && (
        <div className="chat-panel-categories">
          <button
            type="button"
            className={`chat-category-btn ${tab === 'online' ? 'active' : ''}`}
            onClick={() => setTab('online')}
          >
            🌐 Online agora
          </button>
          <button
            type="button"
            className={`chat-category-btn ${tab === 'local' ? 'active' : ''}`}
            onClick={() => setTab('local')}
          >
            📱 Neste aparelho
          </button>
        </div>
      )}

      <div className="chat-panel-messages">
        {tab === 'online' ? (
          <>
            {entries.length === 0 && <p className="chat-empty">Ninguém por perto ainda.</p>}
            {entries.map((entry, i) => (
              <p key={entry.id} className={`ranking-row${entry.isSelf ? ' ranking-row-self' : ''}`}>
                <span className="ranking-place">{i + 1}º</span> {entry.avatarEmoji} <strong>{entry.name}</strong>
                {entry.isSelf && ' (você)'} — Nível {getLevel(entry.xp)} · 🪙 {entry.coins}
              </p>
            ))}
          </>
        ) : (
          localEntries.map((entry, i) => (
            <p key={entry.id} className={`ranking-row${entry.isSelf ? ' ranking-row-self' : ''}`}>
              <span className="ranking-place">{i + 1}º</span> {entry.avatarEmoji} <strong>{entry.name}</strong>
              {entry.isSelf && ' (você)'} — {entry.weeklyXp} XP esta semana
            </p>
          ))
        )}
      </div>
    </div>
  )
}
