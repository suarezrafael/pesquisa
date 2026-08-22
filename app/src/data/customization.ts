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

export interface ColorOption {
  id: string
  name: string
  cost: number
  colorRgb: [number, number, number]
}

export const PANTS_COLOR_CATALOG: ColorOption[] = [
  { id: 'calca_azul', name: 'Calça Azul', cost: 0, colorRgb: [0.22, 0.28, 0.48] },
  { id: 'calca_verde', name: 'Calça Verde', cost: 10, colorRgb: [0.2, 0.45, 0.3] },
  { id: 'calca_vermelha', name: 'Calça Vermelha', cost: 10, colorRgb: [0.55, 0.18, 0.18] },
]

export const SHOE_COLOR_CATALOG: ColorOption[] = [
  { id: 'sapato_preto', name: 'Tênis Preto', cost: 0, colorRgb: [0.12, 0.12, 0.14] },
  { id: 'sapato_branco', name: 'Tênis Branco', cost: 8, colorRgb: [0.92, 0.92, 0.9] },
  { id: 'sapato_amarelo', name: 'Tênis Amarelo', cost: 8, colorRgb: [0.9, 0.75, 0.15] },
]

export const BACKPACK_COLOR_CATALOG: ColorOption[] = [
  { id: 'mochila_padrao', name: 'Mochila Padrão', cost: 0, colorRgb: [0.5, 0.25, 0.2] },
  { id: 'mochila_roxa', name: 'Mochila Roxa', cost: 12, colorRgb: [0.45, 0.25, 0.55] },
  { id: 'mochila_laranja', name: 'Mochila Laranja', cost: 12, colorRgb: [0.85, 0.45, 0.15] },
]

// Camisa é o eixo mais visível (maior área do boneco) — preço um pouco mais alto que os outros.
export const SHIRT_COLOR_CATALOG: ColorOption[] = [
  { id: 'camisa_padrao', name: 'Camisa Padrão', cost: 0, colorRgb: [0.3, 0.55, 0.75] },
  { id: 'camisa_rosa', name: 'Camisa Rosa', cost: 15, colorRgb: [0.85, 0.4, 0.55] },
  { id: 'camisa_amarela', name: 'Camisa Amarela', cost: 15, colorRgb: [0.9, 0.75, 0.2] },
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
