import { useState } from 'react'
import type { RankingEntry } from './multiplayer'
import { getLevel, weeklyXpEarned } from '../state/progression'
import { getActiveProfileId, listProfiles, loadProgressForProfileId } from '../state/storage'
import { useModalA11y } from '../state/useModalA11y'
import type { Profile, Progress } from '../types'

interface RankingPanelProps {
  entries: RankingEntry[]
  connected: boolean
  // Backlog "Lab 195 - Ranking seguro sem fricção excessiva" — abrir este painel não passa mais
  // pelo portão parental (ver `World3D.tsx`, `onOpenRanking`); `hasMultiplayerConsent` distingue
  // "nunca autorizou multiplayer" (mostra o convite abaixo) de "autorizou mas está reconectando"
  // (`connected` já cobre esse caso com "sem conexão"). `onRequestMultiplayerConsent` reabre o
  // MESMO portão já usado pelo chat — presença online de verdade continua exigindo a mesma
  // autorização de sempre, só a entrada na UI mudou.
  hasMultiplayerConsent: boolean
  onRequestMultiplayerConsent: () => void
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

export function RankingPanel({
  entries,
  connected,
  hasMultiplayerConsent,
  onRequestMultiplayerConsent,
  profile,
  progress,
  onClose,
}: RankingPanelProps) {
  const panelRef = useModalA11y(onClose)
  // Só mostra a aba local com 2+ perfis no aparelho — mesmo espírito de `ProfilePicker` só
  // aparecer com múltiplos perfis (lab-108): ranking de uma pessoa só não diz nada.
  const roster = listProfiles()
  const showLocalTab = roster.length > 1
  // Backlog "Lab 195" — sem consentimento de multiplayer ainda, a aba online não tem nenhum outro
  // jogador de verdade pra mostrar (só o próprio perfil); com 2+ perfis no aparelho, a aba local
  // JÁ tem dado real — abrir direto nela evita a criança cair numa aba "vazia" só com um convite.
  const [tab, setTab] = useState<RankingTab>(showLocalTab && !hasMultiplayerConsent ? 'local' : 'online')
  // lab-157 (achado do review automático do Copilot): só monta a lista local (leituras de
  // `localStorage` + ordenação) quando a aba local está de fato ABERTA — antes rodava em todo
  // render sempre que houvesse 2+ perfis, mesmo olhando "Online agora".
  const localEntries = tab === 'local' ? buildLocalEntries(profile, progress, new Date().toISOString()) : []

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
          hasMultiplayerConsent ? (
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
            // Backlog "Lab 195" — nunca finge que "ver o ranking online" é mais seguro que ativar
            // multiplayer de verdade: conectar torna a posição/aparência do jogador visível pra
            // qualquer outro jogador conectado, não é só um placar. O convite deixa isso explícito
            // e reaproveita o MESMO portão parental do chat, em vez de inventar uma autorização
            // separada mais fraca.
            <div className="ranking-online-gate">
              <p>
                Pra ver outros jogadores online aqui, é preciso ativar o modo online — a mesma
                autorização usada pelo chat.
              </p>
              <button type="button" className="chat-category-btn" onClick={onRequestMultiplayerConsent}>
                Ativar modo online
              </button>
            </div>
          )
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
