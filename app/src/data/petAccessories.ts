// Catalogo de cosmeticos de pet (lab-216) — dado de dominio puro, sem dependencia do Babylon.
// Cada encaixe e independente: uma coleira/capa curta pode coexistir com uma mascara. Todos os
// itens desta primeira fatia sao gratuitos ou compraveis apenas com moedas ganhas jogando.
export type PetAccessorySlot = 'neck' | 'face'
export type PetAccessoryShape = 'collar' | 'cape' | 'mask'

export interface PetAccessoryOption {
  id: string
  name: string
  emoji: string
  cost: number
  slot: PetAccessorySlot
  shape: PetAccessoryShape
  colorRgb: [number, number, number]
}

export const PET_ACCESSORY_CATALOG: PetAccessoryOption[] = [
  {
    id: 'coleira_celeste',
    name: 'Coleira Celeste',
    emoji: '💫',
    cost: 0,
    slot: 'neck',
    shape: 'collar',
    colorRgb: [0.18, 0.65, 0.92],
  },
  {
    id: 'capa_exploradora',
    name: 'Capa Exploradora',
    emoji: '🦸',
    cost: 18,
    slot: 'neck',
    shape: 'cape',
    colorRgb: [0.92, 0.28, 0.38],
  },
  {
    id: 'mascara_heroi',
    name: 'Máscara de Herói',
    emoji: '🎭',
    cost: 16,
    slot: 'face',
    shape: 'mask',
    colorRgb: [0.28, 0.32, 0.82],
  },
  {
    id: 'mascara_raio',
    name: 'Máscara Raio',
    emoji: '⚡',
    cost: 24,
    slot: 'face',
    shape: 'mask',
    colorRgb: [0.96, 0.72, 0.12],
  },
]

export const DEFAULT_UNLOCKED_PET_ACCESSORY_IDS = PET_ACCESSORY_CATALOG.filter((item) => item.cost === 0).map(
  (item) => item.id,
)

export function findPetAccessoryById(id: string): PetAccessoryOption | undefined {
  return PET_ACCESSORY_CATALOG.find((item) => item.id === id)
}
