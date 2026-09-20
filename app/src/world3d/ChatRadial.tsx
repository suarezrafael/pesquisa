import { contextualQuickChatMessages, type ChatContext } from '../data/chatMessages'
import { useModalA11y } from '../state/useModalA11y'

interface ChatRadialProps {
  context: ChatContext
  onSend: (messageId: string) => void
  onMore: () => void
  onClose: () => void
}

const RADIUS = 80

// Backlog "Lab 194 - Quick chat contextual sem supervisao pesada": atalho de 1 toque pras frases
// mais relevantes pro contexto atual (planeta/corrida/casa/pet), em vez de abrir direto o catálogo
// completo de 5 abas (`ChatPanel.tsx`, ainda intacto — acessível daqui via "mais opções", último
// botão do círculo). Continua 100% catalogado (mesmo `onSend(messageId)` do painel completo,
// mesma validação de servidor) — nenhum texto livre, só um caminho mais curto até uma frase já
// existente. Vai atrás do MESMO portão parental do painel completo (`openMultiplayerFeature` em
// `World3D.tsx` decide isso ANTES de abrir este componente) — chat continua sendo comunicação
// real com outros jogadores pela rede, categoria diferente do ranking (lab-205), que só passou a
// dispensar o portão pra abrir o PAINEL porque exibe dados passivos, não envia nada a ninguém.
export function ChatRadial({ context, onSend, onMore, onClose }: ChatRadialProps) {
  const rootRef = useModalA11y(onClose)
  const items = contextualQuickChatMessages(context)
  const slotCount = items.length + 1 // +1 pro botão "mais opções", sempre o último

  return (
    // Fundo transparente (não `.modal-overlay` escuro) só pra capturar clique-fora-fecha — mesma
    // decisão já tomada pra chat/ranking/mochila (comentário de `canvasInert` em `World3D.tsx`):
    // são atalhos pequenos, não telas cheias, o canvas continua interativo ao redor.
    <div className="chat-radial-backdrop" onClick={onClose}>
      <div
        className="chat-radial"
        role="menu"
        aria-label="Chat rápido"
        ref={rootRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="chat-radial-center" aria-hidden="true">
          💬
        </div>
        {items.map((item, i) => {
          const angle = (i / slotCount) * 2 * Math.PI - Math.PI / 2
          const x = Math.round(Math.cos(angle) * RADIUS)
          const y = Math.round(Math.sin(angle) * RADIUS)
          return (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className="chat-radial-btn"
              style={{ transform: `translate(${x}px, ${y}px)` }}
              onClick={() => {
                onSend(item.id)
                onClose()
              }}
              aria-label={item.text}
            >
              <span aria-hidden="true">{item.emoji}</span>
            </button>
          )
        })}
        {(() => {
          const angle = (items.length / slotCount) * 2 * Math.PI - Math.PI / 2
          const x = Math.round(Math.cos(angle) * RADIUS)
          const y = Math.round(Math.sin(angle) * RADIUS)
          return (
            <button
              type="button"
              role="menuitem"
              className="chat-radial-btn chat-radial-more"
              style={{ transform: `translate(${x}px, ${y}px)` }}
              onClick={onMore}
              aria-label="Mais opções de chat"
            >
              ⋯
            </button>
          )
        })()}
        <button type="button" className="modal-close chat-radial-close" onClick={onClose} aria-label="Fechar chat rápido">
          ×
        </button>
      </div>
    </div>
  )
}
