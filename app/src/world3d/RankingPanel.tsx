import type { RankingEntry } from './multiplayer'
import { getLevel } from '../state/progression'

interface RankingPanelProps {
  entries: RankingEntry[]
  connected: boolean
  onClose: () => void
}

// Ranking só de quem está conectado agora, na mesma rede local (mesmo servidor de retransmissão,
// app/server/relay.cjs) — sem conta, sem histórico entre sessões, igual ao resto do multiplayer
// local (lab-06). Nível é recalculado aqui a partir do XP (`getLevel`, determinístico) em vez de
// viajar pela rede como campo separado, pra nunca poder ficar dessincronizado da regra real.
export function RankingPanel({ entries, connected, onClose }: RankingPanelProps) {
  return (
    <div className="chat-panel ranking-panel">
      <div className="chat-panel-header">
        <span>Ranking {connected ? '🟢 conectado' : '🔴 sem conexão'}</span>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar ranking">
          ×
        </button>
      </div>

      <div className="chat-panel-messages">
        {entries.length === 0 && <p className="chat-empty">Ninguém por perto ainda.</p>}
        {entries.map((entry, i) => (
          <p key={entry.id} className={`ranking-row${entry.isSelf ? ' ranking-row-self' : ''}`}>
            <span className="ranking-place">{i + 1}º</span> {entry.avatarEmoji} <strong>{entry.name}</strong>
            {entry.isSelf && ' (você)'} — Nível {getLevel(entry.xp)} · 🪙 {entry.coins}
          </p>
        ))}
      </div>
    </div>
  )
}
