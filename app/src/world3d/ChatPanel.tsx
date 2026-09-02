import { useState } from 'react'
import type { ChatMessage } from './multiplayer'
import {
  findQuickChatMessage,
  quickChatByCategory,
  QUICK_CHAT_CATEGORY_LABELS,
  type QuickChatCategory,
} from '../data/chatMessages'
import { useModalA11y } from '../state/useModalA11y'

interface ChatPanelProps {
  messages: ChatMessage[]
  connected: boolean
  onSend: (messageId: string) => void
  onClose: () => void
}

const CATEGORIES = Object.keys(QUICK_CHAT_CATEGORY_LABELS) as QuickChatCategory[]

// Sem campo de texto livre — requisito [MUST] de docs/prompts/01-seguranca.md §1 / prompt.md §11
// ("nenhum chat de texto livre entre crianças no MVP"). Só existe um seletor de mensagens
// pré-definidas + emotes (`QUICK_CHAT_MESSAGES`); não há nenhum `<input>` de texto neste
// componente. Catálogo bem maior desde o lab-82 (pedido do usuário: mais engajamento sem abrir
// texto livre) — dividido em abas por categoria pra caber na tela sem virar uma lista gigante.
export function ChatPanel({ messages, connected, onSend, onClose }: ChatPanelProps) {
  const [activeCategory, setActiveCategory] = useState<QuickChatCategory>('saudacao')
  const panelRef = useModalA11y(onClose)

  return (
    <div className="chat-panel" role="region" aria-label="Chat" ref={panelRef} tabIndex={-1}>
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

      <div className="chat-panel-categories">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`chat-category-btn ${cat === activeCategory ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {QUICK_CHAT_CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      <div className="chat-panel-quickbar">
        {quickChatByCategory(activeCategory).map((m) => (
          <button key={m.id} type="button" className="chat-quick-btn" onClick={() => onSend(m.id)}>
            <span aria-hidden="true">{m.emoji}</span> {m.text}
          </button>
        ))}
      </div>
    </div>
  )
}
