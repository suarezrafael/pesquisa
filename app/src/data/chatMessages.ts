// Catálogo fechado de mensagens de chat (lab-12) — requisito [MUST] de
// docs/prompts/01-seguranca.md §1 / prompt.md §11: "nenhum chat de texto livre entre crianças no
// MVP... usar apenas mensagens pré-definidas / quick chat / emotes". Só o `id` de uma entrada
// aqui trafega pela rede (ver multiplayer.ts) — nenhum campo de texto livre existe em lugar
// nenhum do fluxo de chat, então não há o que sanitizar/filtrar: é impossível enviar algo que não
// esteja nesta lista.
//
// server/relay.cjs mantém uma cópia dos ids (não dá pra importar TS num script CommonJS simples)
// pra validar no servidor também, não só confiar no client — se adicionar/remover uma mensagem
// aqui, atualizar a lista `QUICK_CHAT_IDS` lá também.
export interface QuickChatMessage {
  id: string
  emoji: string
  text: string
}

export const QUICK_CHAT_MESSAGES: QuickChatMessage[] = [
  { id: 'oi', emoji: '👋', text: 'Oi!' },
  { id: 'legal', emoji: '😄', text: 'Que legal!' },
  { id: 'consegui', emoji: '🎉', text: 'Consegui!' },
  { id: 'vamos', emoji: '🤝', text: 'Vamos juntos?' },
  { id: 'vem_aqui', emoji: '➡️', text: 'Vem por aqui!' },
  { id: 'espera', emoji: '⏳', text: 'Espera um pouco!' },
  { id: 'ajuda', emoji: '🆘', text: 'Preciso de ajuda!' },
  { id: 'combinado', emoji: '👍', text: 'Combinado!' },
  { id: 'adorei', emoji: '❤️', text: 'Adorei!' },
  { id: 'tchau', emoji: '👋', text: 'Tchau!' },
]

export function findQuickChatMessage(id: string): QuickChatMessage | undefined {
  return QUICK_CHAT_MESSAGES.find((m) => m.id === id)
}
