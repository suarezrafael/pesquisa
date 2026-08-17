// Catálogo de chapéus (lab-24) — dado de domínio puro (sem import de engine 3D), mesmo padrão de
// `avatars.ts`. É um eixo de customização INDEPENDENTE da criatura escolhida (avatars.ts): trocar
// de criatura não mexe no chapéu equipado, e vice-versa — dois catálogos/estados separados.
// `shape` é só uma descrição — quem monta a geometria 3D de verdade é `world3d/World3D.tsx`
// (`applyHat`), conforme docs/prompts/03-arquitetura-sistema.md §1.
export type HatShape = 'cap' | 'party' | 'crown' | 'flower' | 'bow'

export interface HatOption {
  id: string
  name: string
  emoji: string
  cost: number
  shape: HatShape
  colorRgb: [number, number, number]
}

export const HAT_CATALOG: HatOption[] = [
  {
    id: 'bone',
    name: 'Boné',
    emoji: '🧢',
    cost: 0,
    shape: 'cap',
    colorRgb: [0.85, 0.25, 0.25],
  },
  {
    id: 'festa',
    name: 'Chapéu de Festa',
    emoji: '🥳',
    cost: 10,
    shape: 'party',
    colorRgb: [0.35, 0.55, 0.9],
  },
  {
    id: 'flor',
    name: 'Flor',
    emoji: '🌸',
    cost: 8,
    shape: 'flower',
    colorRgb: [0.95, 0.55, 0.75],
  },
  {
    id: 'laco',
    name: 'Laço',
    emoji: '🎀',
    cost: 8,
    shape: 'bow',
    colorRgb: [0.9, 0.2, 0.4],
  },
  {
    id: 'coroa',
    name: 'Coroa',
    emoji: '👑',
    cost: 20,
    shape: 'crown',
    colorRgb: [0.95, 0.78, 0.2],
  },
]

export const DEFAULT_UNLOCKED_HAT_IDS: string[] = HAT_CATALOG.filter((h) => h.cost === 0).map((h) => h.id)

export function findHatById(id: string): HatOption | undefined {
  return HAT_CATALOG.find((h) => h.id === id)
}
