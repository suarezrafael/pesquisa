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
  /** Fase E do plano comercial (ver docs/plano-comercial-backend.md) — item exclusivo de
   * assinante em vez de comprável com moeda. Reaproveita as mesmas formas primitivas já
   * existentes (nenhuma geometria nova no Babylon), só com uma cor nova — nunca reclassifica um
   * item que já era comprável com moeda antes desta fase. */
  subscriptionOnly?: boolean
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
  // Exclusivos de assinante (Fase E) — a partir daqui.
  {
    id: 'coroa_diamante',
    name: 'Coroa de Diamante',
    emoji: '💎',
    cost: 0,
    shape: 'crown',
    colorRgb: [0.8, 0.92, 0.98],
    subscriptionOnly: true,
  },
  {
    id: 'bone_holografico',
    name: 'Boné Holográfico',
    emoji: '🧢',
    cost: 0,
    shape: 'cap',
    colorRgb: [0.72, 0.35, 0.95],
    subscriptionOnly: true,
  },
  {
    id: 'laco_estelar',
    name: 'Laço Estelar',
    emoji: '✨',
    cost: 0,
    shape: 'bow',
    colorRgb: [0.25, 0.2, 0.65],
    subscriptionOnly: true,
  },
]

export const DEFAULT_UNLOCKED_HAT_IDS: string[] = HAT_CATALOG.filter(
  (h) => h.cost === 0 && !h.subscriptionOnly,
).map((h) => h.id)

export function findHatById(id: string): HatOption | undefined {
  return HAT_CATALOG.find((h) => h.id === id)
}
