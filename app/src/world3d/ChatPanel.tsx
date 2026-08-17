import type { ChatMessage } from './multiplayer'
import { QUICK_CHAT_MESSAGES, findQuickChatMessage } from '../data/chatMessages'

interface ChatPanelProps {
  messages: ChatMessage[]
  connected: boolean
  onSend: (messageId: string) => void
  onClose: () => void
}

// Sem campo de texto livre — requisito [MUST] de docs/prompts/01-seguranca.md §1 / prompt.md §11
// ("nenhum chat de texto livre entre crianças no MVP"). Só existe um seletor de mensagens
// pré-definidas + emotes (`QUICK_CHAT_MESSAGES`); não há nenhum `<input>` de texto neste
// componente.
export function ChatPanel({ messages, connected, onSend, onClose }: ChatPanelProps) {
  return (
    <div className="chat-panel">
      <div className="chat-panel-header">
        <span>Chat {connected ? '🟢 conectado' : '🔴 sem conexão'}</span>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar chat">
          ×
        </button>
      </div>

      <div className="chat-panel-messages">
        {messages.length === 0 && <p className="chat-empty">Nenhuma mensagem ainda.</p>}
        {messages.map((m, i) => {
          const quick = findQuickChatMessage(m.messageId)
          if (!quick) return null
          return (
            <p key={i} className="chat-message">
              <strong>{m.name}:</strong> {quick.emoji} {quick.text}
            </p>
          )
        })}
      </div>

      <div className="chat-panel-quickbar">
        {QUICK_CHAT_MESSAGES.map((m) => (
          <button key={m.id} type="button" className="chat-quick-btn" onClick={() => onSend(m.id)}>
            <span aria-hidden="true">{m.emoji}</span> {m.text}
          </button>
        ))}
      </div>
    </div>
  )
}
