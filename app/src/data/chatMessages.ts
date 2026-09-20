// Catálogo fechado de mensagens de chat (lab-12, expandido no lab-82) — requisito [MUST] de
// docs/prompts/01-seguranca.md §1 / prompt.md §11: "nenhum chat de texto livre entre crianças no
// MVP... usar apenas mensagens pré-definidas / quick chat / emotes". Só o `id` de uma entrada
// aqui trafega pela rede (ver multiplayer.ts) — nenhum campo de texto livre existe em lugar
// nenhum do fluxo de chat, então não há o que sanitizar/filtrar: é impossível enviar algo que não
// esteja nesta lista.
//
// Expansão do lab-82: usuário reportou que crianças acharam as 10 frases originais pouco pra
// interação de verdade ("não permite comunicação e engajamento"). Resposta: catálogo bem maior
// (~35 frases em 5 categorias), não abrir texto livre — o pedido real era mais variedade de
// expressão, não texto arbitrário. Ver labs/lab-82-.../CONTEXT.md pro contexto completo dessa
// decisão.
//
// `server/relay.cjs` e `server-cf-relay/src/index.ts` mantêm cada um sua própria cópia da lista
// de ids (não dá pra importar TS/CJS entre os três projetos sem acoplar os deploys) pra validar
// no servidor também, não só confiar no client — se adicionar/remover uma mensagem aqui,
// atualizar `QUICK_CHAT_IDS` nos dois relés também.
export type QuickChatCategory = 'saudacao' | 'reacao' | 'convite' | 'elogio' | 'jogo'

export interface QuickChatMessage {
  id: string
  emoji: string
  text: string
  category: QuickChatCategory
}

export const QUICK_CHAT_CATEGORY_LABELS: Record<QuickChatCategory, string> = {
  saudacao: 'Saudações',
  reacao: 'Reações',
  convite: 'Convites',
  elogio: 'Elogios',
  jogo: 'No jogo',
}

export const QUICK_CHAT_MESSAGES: QuickChatMessage[] = [
  // Saudações
  { id: 'oi', emoji: '👋', text: 'Oi!', category: 'saudacao' },
  { id: 'bom_dia', emoji: '☀️', text: 'Bom dia!', category: 'saudacao' },
  { id: 'boa_tarde', emoji: '🌤️', text: 'Boa tarde!', category: 'saudacao' },
  { id: 'boa_noite', emoji: '🌙', text: 'Boa noite!', category: 'saudacao' },
  { id: 'tchau', emoji: '👋', text: 'Tchau!', category: 'saudacao' },
  { id: 'ate_mais', emoji: '✌️', text: 'Até mais!', category: 'saudacao' },
  { id: 'prazer', emoji: '🙂', text: 'Prazer em te conhecer!', category: 'saudacao' },

  // Reações
  { id: 'legal', emoji: '😄', text: 'Que legal!', category: 'reacao' },
  { id: 'adorei', emoji: '❤️', text: 'Adorei!', category: 'reacao' },
  { id: 'uau', emoji: '😮', text: 'Uau!', category: 'reacao' },
  { id: 'haha', emoji: '😂', text: 'Haha!', category: 'reacao' },
  { id: 'nossa', emoji: '😲', text: 'Nossa, incrível!', category: 'reacao' },
  { id: 'triste', emoji: '😢', text: 'Que pena!', category: 'reacao' },
  { id: 'surpresa', emoji: '🤩', text: 'Não acredito!', category: 'reacao' },

  // Convites / cooperação
  { id: 'vamos', emoji: '🤝', text: 'Vamos juntos?', category: 'convite' },
  { id: 'vem_aqui', emoji: '➡️', text: 'Vem por aqui!', category: 'convite' },
  { id: 'espera', emoji: '⏳', text: 'Espera um pouco!', category: 'convite' },
  { id: 'ajuda', emoji: '🆘', text: 'Preciso de ajuda!', category: 'convite' },
  { id: 'combinado', emoji: '👍', text: 'Combinado!', category: 'convite' },
  { id: 'trocar', emoji: '🔄', text: 'Quer trocar de item?', category: 'convite' },
  { id: 'escolinha', emoji: '🏫', text: 'Vamos pra escolinha?', category: 'convite' },
  { id: 'explorar', emoji: '🧭', text: 'Bora explorar o planeta!', category: 'convite' },
  { id: 'sigam_me', emoji: '🏃', text: 'Sigam-me!', category: 'convite' },

  // Elogios
  { id: 'voce_demais', emoji: '🌟', text: 'Você é demais!', category: 'elogio' },
  { id: 'boa_ideia', emoji: '💡', text: 'Boa ideia!', category: 'elogio' },
  { id: 'muito_bem', emoji: '👏', text: 'Muito bem!', category: 'elogio' },
  { id: 'roupa_legal', emoji: '🧥', text: 'Adorei sua roupa!', category: 'elogio' },
  { id: 'chapeu_legal', emoji: '🎩', text: 'Que chapéu legal!', category: 'elogio' },
  { id: 'inteligente', emoji: '🧠', text: 'Você é muito esperto(a)!', category: 'elogio' },

  // No jogo
  { id: 'consegui', emoji: '🎉', text: 'Consegui!', category: 'jogo' },
  { id: 'quase_la', emoji: '💪', text: 'Quase lá!', category: 'jogo' },
  { id: 'tentar_de_novo', emoji: '🔁', text: 'Vou tentar de novo!', category: 'jogo' },
  { id: 'moeda', emoji: '🪙', text: 'Encontrei uma moeda!', category: 'jogo' },
  { id: 'cuidado', emoji: '⚠️', text: 'Cuidado!', category: 'jogo' },
  { id: 'missao_dificil', emoji: '🤔', text: 'Essa missão é difícil!', category: 'jogo' },
  { id: 'nivel_up', emoji: '⬆️', text: 'Subi de nível!', category: 'jogo' },

  // Backlog "Lab 194 - Quick chat contextual sem supervisao pesada" — 3 frases novas pra cobrir
  // contextos (casa/corrida/pet) sem análogo natural entre as ~35 já existentes; os outros
  // contextos (planeta, default) reaproveitam 100% frases já existentes.
  { id: 'bem_vindo_casa', emoji: '🏠', text: 'Bem-vindo à minha casa!', category: 'convite' },
  { id: 'boa_corrida', emoji: '🏁', text: 'Boa corrida!', category: 'jogo' },
  { id: 'pet_fofo', emoji: '🐾', text: 'Que bichinho fofo!', category: 'elogio' },
]

export function findQuickChatMessage(id: string): QuickChatMessage | undefined {
  return QUICK_CHAT_MESSAGES.find((m) => m.id === id)
}

export function quickChatByCategory(category: QuickChatCategory): QuickChatMessage[] {
  return QUICK_CHAT_MESSAGES.filter((m) => m.category === category)
}

// Backlog "Lab 194 - Quick chat contextual sem supervisao pesada": chat radial mostra só as
// frases mais relevantes pro contexto atual (evita cavar 5 abas / ~35 frases pra achar "Vamos pra
// escolinha?" quando o jogador está literalmente na frente de uma escolinha). `ChatRadial.tsx`
// consome isto; o catálogo completo por categoria (`ChatPanel.tsx`, acima) continua intacto e
// acessível via "mais opções" a partir do radial — nada removido, só um atalho contextual novo.
export type ChatContext = 'casa' | 'corrida' | 'planeta' | 'pet' | 'default'

const CONTEXTUAL_QUICK_CHAT_IDS: Record<ChatContext, string[]> = {
  casa: ['bem_vindo_casa', 'vem_aqui', 'trocar', 'legal'],
  corrida: ['boa_corrida', 'vamos', 'quase_la', 'consegui'],
  planeta: ['explorar', 'escolinha', 'ajuda', 'cuidado'],
  pet: ['pet_fofo', 'adorei', 'legal', 'voce_demais'],
  default: ['oi', 'legal', 'vamos', 'ajuda'],
}

export function contextualQuickChatMessages(context: ChatContext): QuickChatMessage[] {
  return CONTEXTUAL_QUICK_CHAT_IDS[context]
    .map((id) => findQuickChatMessage(id))
    .filter((m): m is QuickChatMessage => !!m)
}
