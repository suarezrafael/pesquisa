import { useState } from 'react'
import type { ChatMessage } from './multiplayer'

interface ChatPanelProps {
  messages: ChatMessage[]
  connected: boolean
  onSend: (text: string) => void
  onClose: () => void
}

export function ChatPanel({ messages, connected, onSend, onClose }: ChatPanelProps) {
  const [text, setText] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    onSend(trimmed)
    setText('')
  }

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
        {messages.map((m, i) => (
          <p key={i} className="chat-message">
            <strong>{m.name}:</strong> {m.text}
          </p>
        ))}
      </div>

      <form className="chat-panel-input" onSubmit={handleSubmit}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escreva uma mensagem..."
          maxLength={140}
        />
        <button type="submit" disabled={!text.trim()}>
          Enviar
        </button>
      </form>
    </div>
  )
}
