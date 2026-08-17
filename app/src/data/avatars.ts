// Catálogo de avatares — dado de domínio puro (sem import de engine 3D), igual ao padrão de
// `quests.ts`. `colorRgb`/`accentColorRgb` são 0-1 (não um tipo do Babylon) pra manter esse
// arquivo desacoplado do motor de renderização, conforme docs/prompts/03-arquitetura-sistema.md
// §1 — quem converte pra `Color3` e monta a geometria 3D é o código de renderização
// (world3d/World3D.tsx), não este arquivo.
//
// `features` (lab-13, pedido do usuário: "bonecos 3d pra trocar não só de avatar") descreve as
// peças 3D que diferenciam cada boneco de verdade (orelhas/rabo/acessório), não só a cor da
// camisa — cada combinação abaixo foi escolhida pra combinar com o tema do emoji/nome.
export type EarStyle = 'none' | 'triangle' | 'round' | 'tufted'
export type TailStyle = 'none' | 'fluffy' | 'thin' | 'tufted'
export type SpecialAccessory = 'none' | 'horn' | 'horns' | 'mane' | 'beak' | 'eyes' | 'tentacles'

export interface BonecoFeatures {
  earStyle: EarStyle
  tailStyle: TailStyle
  special: SpecialAccessory
  /** Cor das peças extras (orelhas/rabo/acessório) — pode ser igual ou diferente de `colorRgb`. */
  accentColorRgb: [number, number, number]
}

export interface AvatarOption {
  id: string
  emoji: string
  name: string
  /** Custo em moedas pra desbloquear. 0 = já disponível desde o início (onboarding). */
  cost: number
  colorRgb: [number, number, number]
  features: BonecoFeatures
}

export const AVATAR_CATALOG: AvatarOption[] = [
  {
    id: 'raposa',
    emoji: '🦊',
    name: 'Raposa',
    cost: 0,
    colorRgb: [0.94, 0.51, 0.2],
    features: { earStyle: 'triangle', tailStyle: 'fluffy', special: 'none', accentColorRgb: [0.98, 0.97, 0.94] },
  },
  {
    id: 'gato',
    emoji: '🐱',
    name: 'Gato',
    cost: 0,
    colorRgb: [0.95, 0.72, 0.25],
    features: { earStyle: 'triangle', tailStyle: 'thin', special: 'none', accentColorRgb: [0.95, 0.72, 0.25] },
  },
  {
    id: 'panda',
    emoji: '🐼',
    name: 'Panda',
    cost: 0,
    colorRgb: [0.85, 0.85, 0.9],
    features: { earStyle: 'round', tailStyle: 'none', special: 'none', accentColorRgb: [0.12, 0.12, 0.15] },
  },
  {
    id: 'sapo',
    emoji: '🐸',
    name: 'Sapo',
    cost: 0,
    colorRgb: [0.36, 0.75, 0.4],
    features: { earStyle: 'none', tailStyle: 'none', special: 'eyes', accentColorRgb: [0.95, 0.97, 0.9] },
  },
  {
    id: 'unicornio',
    emoji: '🦄',
    name: 'Unicórnio',
    cost: 0,
    colorRgb: [0.8, 0.6, 0.95],
    features: { earStyle: 'none', tailStyle: 'fluffy', special: 'horn', accentColorRgb: [1, 0.92, 0.75] },
  },
  {
    id: 'tigre',
    emoji: '🐯',
    name: 'Tigre',
    cost: 0,
    colorRgb: [0.95, 0.55, 0.15],
    features: { earStyle: 'triangle', tailStyle: 'tufted', special: 'none', accentColorRgb: [0.15, 0.1, 0.08] },
  },
  {
    id: 'coruja',
    emoji: '🦉',
    name: 'Coruja',
    cost: 12,
    colorRgb: [0.4, 0.55, 0.58],
    features: { earStyle: 'tufted', tailStyle: 'none', special: 'beak', accentColorRgb: [0.85, 0.55, 0.15] },
  },
  {
    id: 'coala',
    emoji: '🐨',
    name: 'Coala',
    cost: 15,
    colorRgb: [0.62, 0.64, 0.68],
    features: { earStyle: 'round', tailStyle: 'none', special: 'none', accentColorRgb: [0.92, 0.9, 0.88] },
  },
  {
    id: 'lobo',
    emoji: '🐺',
    name: 'Lobo',
    cost: 20,
    colorRgb: [0.42, 0.47, 0.62],
    features: { earStyle: 'triangle', tailStyle: 'fluffy', special: 'none', accentColorRgb: [0.95, 0.95, 0.95] },
  },
  {
    id: 'leao',
    emoji: '🦁',
    name: 'Leão',
    cost: 25,
    colorRgb: [0.85, 0.6, 0.15],
    features: { earStyle: 'round', tailStyle: 'tufted', special: 'mane', accentColorRgb: [0.5, 0.3, 0.08] },
  },
  {
    id: 'dragao',
    emoji: '🐲',
    name: 'Dragão',
    cost: 35,
    colorRgb: [0.16, 0.6, 0.38],
    features: { earStyle: 'none', tailStyle: 'tufted', special: 'horns', accentColorRgb: [0.85, 0.7, 0.2] },
  },
  {
    id: 'polvo',
    emoji: '🐙',
    name: 'Polvo',
    cost: 45,
    colorRgb: [0.72, 0.22, 0.55],
    features: { earStyle: 'none', tailStyle: 'none', special: 'tentacles', accentColorRgb: [0.72, 0.22, 0.55] },
  },
]

export const DEFAULT_UNLOCKED_AVATAR_IDS: string[] = AVATAR_CATALOG.filter((a) => a.cost === 0).map(
  (a) => a.id,
)

export function findAvatarByEmoji(emoji: string): AvatarOption | undefined {
  return AVATAR_CATALOG.find((a) => a.emoji === emoji)
}

export function findAvatarById(id: string): AvatarOption | undefined {
  return AVATAR_CATALOG.find((a) => a.id === id)
}
