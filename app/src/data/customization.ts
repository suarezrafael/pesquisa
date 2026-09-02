// Catálogos de customização visual do boneco (lab-73, pedido do usuário: "tem que dar pra
// escolher na lojinha a cor da camiseta e da mochila trocando por moedas, a cor da calça, a cor
// do sapato, e o formato do cabelo, pode ser 3 opções de cada") — dado de domínio puro (sem
// import de engine 3D), mesmo padrão de `avatars.ts`/`hats.ts`. Cada eixo é independente dos
// outros (trocar a cor da calça não mexe no sapato, no cabelo, etc.), e independente da criatura
// escolhida (`avatars.ts`) — mesmo espírito dos chapéus (`hats.ts`).
//
// A primeira opção de cada catálogo tem custo 0 (mantém o padrão visual atual do boneco, pra
// ninguém "perder" a aparência que já tinha antes deste laboratório) — só as outras duas custam
// moedas. `equippedXxxId: null` (ver `types.ts`) significa "usar o padrão atual", não "a primeira
// opção do catálogo" — são a mesma cor visualmente, mas `null` cobre perfis salvos antes deste
// laboratório sem precisar de migração nenhuma.

// lab-122 (pedido do usuário: itens exclusivos precisam de "textura, estilos, mais cores... mais
// moda" em vez de só uma cor sólida diferente) — cada valor mapeia pra um tratamento visual
// diferente em `studentFigure.ts` (`applyClothingLook`). `undefined`/ausente = comportamento atual
// (cor sólida), preservado pra TODO item grátis/comprável com moeda, sem exceção.
export type ClothingStyle =
  | 'starry'
  | 'nebula'
  | 'holographic'
  | 'prism'
  | 'neon-glow'
  | 'metallic-gold'

export interface ColorOption {
  id: string
  name: string
  cost: number
  colorRgb: [number, number, number]
  /** Fase E do plano comercial (ver docs/plano-comercial-backend.md) — item exclusivo de
   * assinante em vez de comprável com moeda. Nunca reclassifica um item que já era comprável
   * com moeda antes desta fase — só entradas novas. */
  subscriptionOnly?: boolean
  /** lab-122 — só itens `subscriptionOnly` recebem um valor aqui. */
  style?: ClothingStyle
}

// lab-137 (backlog reportado na sequência do lab-133: "mais roupas texturizadas e mais opções na
// lojinha") — cada catálogo ganhou 1 cor sólida nova (compra com moeda) + os 4 `style`s que ainda
// faltavam pra completar as 6 texturas do lab-122 (antes cada catálogo só tinha 2 das 6). Nenhuma
// mudança em `studentFigure.ts`/`applyClothingLook` foi necessária — o tratamento visual já é
// genérico por `style`, essas entradas só reaproveitam o que já existe.
export const PANTS_COLOR_CATALOG: ColorOption[] = [
  { id: 'calca_azul', name: 'Calça Azul', cost: 0, colorRgb: [0.22, 0.28, 0.48] },
  { id: 'calca_verde', name: 'Calça Verde', cost: 10, colorRgb: [0.2, 0.45, 0.3] },
  { id: 'calca_vermelha', name: 'Calça Vermelha', cost: 10, colorRgb: [0.55, 0.18, 0.18] },
  { id: 'calca_preta', name: 'Calça Preta', cost: 10, colorRgb: [0.15, 0.15, 0.17] },
  {
    id: 'calca_estelar',
    name: 'Calça Estelar',
    cost: 0,
    colorRgb: [0.14, 0.12, 0.32],
    subscriptionOnly: true,
    style: 'starry',
  },
  {
    id: 'calca_galactica',
    name: 'Calça Galáctica',
    cost: 0,
    colorRgb: [0.32, 0.12, 0.42],
    subscriptionOnly: true,
    style: 'nebula',
  },
  {
    id: 'calca_holografica',
    name: 'Calça Holográfica',
    cost: 0,
    colorRgb: [0.7, 0.4, 0.85],
    subscriptionOnly: true,
    style: 'holographic',
  },
  {
    id: 'calca_prisma',
    name: 'Calça Prisma',
    cost: 0,
    colorRgb: [0.5, 0.3, 0.9],
    subscriptionOnly: true,
    style: 'prism',
  },
  {
    id: 'calca_neon',
    name: 'Calça Neon',
    cost: 0,
    colorRgb: [0.25, 0.85, 0.55],
    subscriptionOnly: true,
    style: 'neon-glow',
  },
  {
    id: 'calca_dourada',
    name: 'Calça Dourada',
    cost: 0,
    colorRgb: [0.8, 0.65, 0.25],
    subscriptionOnly: true,
    style: 'metallic-gold',
  },
]

export const SHOE_COLOR_CATALOG: ColorOption[] = [
  { id: 'sapato_preto', name: 'Tênis Preto', cost: 0, colorRgb: [0.12, 0.12, 0.14] },
  { id: 'sapato_branco', name: 'Tênis Branco', cost: 8, colorRgb: [0.92, 0.92, 0.9] },
  { id: 'sapato_amarelo', name: 'Tênis Amarelo', cost: 8, colorRgb: [0.9, 0.75, 0.15] },
  { id: 'sapato_azul', name: 'Tênis Azul', cost: 8, colorRgb: [0.2, 0.4, 0.8] },
  {
    id: 'sapato_neon',
    name: 'Tênis Neon',
    cost: 0,
    colorRgb: [0.3, 0.95, 0.55],
    subscriptionOnly: true,
    style: 'neon-glow',
  },
  {
    id: 'sapato_dourado',
    name: 'Tênis Dourado',
    cost: 0,
    colorRgb: [0.85, 0.68, 0.22],
    subscriptionOnly: true,
    style: 'metallic-gold',
  },
  {
    id: 'sapato_estelar',
    name: 'Tênis Estelar',
    cost: 0,
    colorRgb: [0.12, 0.1, 0.3],
    subscriptionOnly: true,
    style: 'starry',
  },
  {
    id: 'sapato_galactico',
    name: 'Tênis Galáctico',
    cost: 0,
    colorRgb: [0.3, 0.12, 0.4],
    subscriptionOnly: true,
    style: 'nebula',
  },
  {
    id: 'sapato_holografico',
    name: 'Tênis Holográfico',
    cost: 0,
    colorRgb: [0.8, 0.5, 0.85],
    subscriptionOnly: true,
    style: 'holographic',
  },
  {
    id: 'sapato_prisma',
    name: 'Tênis Prisma',
    cost: 0,
    colorRgb: [0.5, 0.3, 0.9],
    subscriptionOnly: true,
    style: 'prism',
  },
]

export const BACKPACK_COLOR_CATALOG: ColorOption[] = [
  { id: 'mochila_padrao', name: 'Mochila Padrão', cost: 0, colorRgb: [0.5, 0.25, 0.2] },
  { id: 'mochila_roxa', name: 'Mochila Roxa', cost: 12, colorRgb: [0.45, 0.25, 0.55] },
  { id: 'mochila_laranja', name: 'Mochila Laranja', cost: 12, colorRgb: [0.85, 0.45, 0.15] },
  { id: 'mochila_verde', name: 'Mochila Verde', cost: 12, colorRgb: [0.2, 0.5, 0.3] },
  {
    id: 'mochila_dourada',
    name: 'Mochila Dourada',
    cost: 0,
    colorRgb: [0.85, 0.7, 0.25],
    subscriptionOnly: true,
    style: 'metallic-gold',
  },
  {
    id: 'mochila_estelar',
    name: 'Mochila Estelar',
    cost: 0,
    colorRgb: [0.16, 0.18, 0.38],
    subscriptionOnly: true,
    style: 'starry',
  },
  {
    id: 'mochila_galactica',
    name: 'Mochila Galáctica',
    cost: 0,
    colorRgb: [0.32, 0.14, 0.42],
    subscriptionOnly: true,
    style: 'nebula',
  },
  {
    id: 'mochila_holografica',
    name: 'Mochila Holográfica',
    cost: 0,
    colorRgb: [0.75, 0.45, 0.85],
    subscriptionOnly: true,
    style: 'holographic',
  },
  {
    id: 'mochila_prisma',
    name: 'Mochila Prisma',
    cost: 0,
    colorRgb: [0.5, 0.32, 0.9],
    subscriptionOnly: true,
    style: 'prism',
  },
  {
    id: 'mochila_neon',
    name: 'Mochila Neon',
    cost: 0,
    colorRgb: [0.25, 0.85, 0.6],
    subscriptionOnly: true,
    style: 'neon-glow',
  },
]

// Camisa é o eixo mais visível (maior área do boneco) — preço um pouco mais alto que os outros.
export const SHIRT_COLOR_CATALOG: ColorOption[] = [
  { id: 'camisa_padrao', name: 'Camisa Padrão', cost: 0, colorRgb: [0.3, 0.55, 0.75] },
  { id: 'camisa_rosa', name: 'Camisa Rosa', cost: 15, colorRgb: [0.85, 0.4, 0.55] },
  { id: 'camisa_amarela', name: 'Camisa Amarela', cost: 15, colorRgb: [0.9, 0.75, 0.2] },
  { id: 'camisa_verde', name: 'Camisa Verde', cost: 15, colorRgb: [0.25, 0.55, 0.35] },
  {
    id: 'camisa_holografica',
    name: 'Camisa Holográfica',
    cost: 0,
    colorRgb: [0.78, 0.35, 0.9],
    subscriptionOnly: true,
    style: 'holographic',
  },
  {
    id: 'camisa_prisma',
    name: 'Camisa Prisma',
    cost: 0,
    colorRgb: [0.4, 0.62, 0.92],
    subscriptionOnly: true,
    style: 'prism',
  },
  {
    id: 'camisa_estelar',
    name: 'Camisa Estelar',
    cost: 0,
    colorRgb: [0.14, 0.12, 0.3],
    subscriptionOnly: true,
    style: 'starry',
  },
  {
    id: 'camisa_galactica',
    name: 'Camisa Galáctica',
    cost: 0,
    colorRgb: [0.34, 0.15, 0.45],
    subscriptionOnly: true,
    style: 'nebula',
  },
  {
    id: 'camisa_neon',
    name: 'Camisa Neon',
    cost: 0,
    colorRgb: [0.28, 0.85, 0.55],
    subscriptionOnly: true,
    style: 'neon-glow',
  },
  {
    id: 'camisa_dourada',
    name: 'Camisa Dourada',
    cost: 0,
    colorRgb: [0.85, 0.68, 0.25],
    subscriptionOnly: true,
    style: 'metallic-gold',
  },
]

export type HairShape = 'padrao' | 'moicano' | 'longo'

export interface HairShapeOption {
  id: string
  name: string
  cost: number
  shape: HairShape
}

export const HAIR_SHAPE_CATALOG: HairShapeOption[] = [
  { id: 'cabelo_padrao', name: 'Cabelo Padrão', cost: 0, shape: 'padrao' },
  { id: 'cabelo_moicano', name: 'Moicano', cost: 12, shape: 'moicano' },
  { id: 'cabelo_longo', name: 'Cabelo Longo', cost: 12, shape: 'longo' },
]

export function findColorOption(catalog: ColorOption[], id: string | null): ColorOption | undefined {
  if (!id) return undefined
  return catalog.find((c) => c.id === id)
}

export function findHairShapeOption(id: string | null): HairShapeOption | undefined {
  if (!id) return undefined
  return HAIR_SHAPE_CATALOG.find((h) => h.id === id)
}
