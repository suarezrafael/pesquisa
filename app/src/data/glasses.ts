// Catálogo de óculos (lab-92) — dado de domínio puro (sem import de engine 3D), mesmo padrão de
// `hats.ts`: eixo de customização INDEPENDENTE da criatura/chapéu escolhidos (`equippedGlassesId`
// em `types.ts`). Item planejado desde a Fase E (`docs/plano-comercial-backend.md`, "Catálogo de
// cosméticos") mas nunca construído até agora — resto da lista dessa seção (chapéu com formato
// novo, roupa com padrão/emissive, mochila voadora) segue fora de escopo, precisa de mais
// trabalho de geometria/material do que este eixo.
export type GlassesShape = 'sunglasses' | 'vr'

export interface GlassesOption {
  id: string
  name: string
  emoji: string
  cost: number
  shape: GlassesShape
  colorRgb: [number, number, number]
  /** Fase E do plano comercial (ver docs/plano-comercial-backend.md) — item exclusivo de
   * assinante em vez de comprável com moeda. Reaproveita as mesmas formas primitivas já
   * existentes (nenhuma geometria nova no Babylon), só com uma cor nova — nunca reclassifica um
   * item que já era comprável com moeda antes desta fase. */
  subscriptionOnly?: boolean
}

export const GLASSES_CATALOG: GlassesOption[] = [
  {
    id: 'oculos_sol',
    name: 'Óculos de Sol',
    emoji: '😎',
    cost: 10,
    shape: 'sunglasses',
    colorRgb: [0.1, 0.1, 0.12],
  },
  {
    id: 'oculos_colorido',
    name: 'Óculos Colorido',
    emoji: '🕶️',
    cost: 10,
    shape: 'sunglasses',
    colorRgb: [0.85, 0.35, 0.55],
  },
  // Exclusivos de assinante (Fase E) — a partir daqui.
  {
    id: 'oculos_rv',
    name: 'Óculos de Realidade Virtual',
    emoji: '🥽',
    cost: 0,
    shape: 'vr',
    colorRgb: [0.25, 0.28, 0.35],
    subscriptionOnly: true,
  },
  {
    id: 'oculos_holografico',
    name: 'Óculos Holográfico',
    emoji: '✨',
    cost: 0,
    shape: 'sunglasses',
    colorRgb: [0.72, 0.35, 0.95],
    subscriptionOnly: true,
  },
]

export const DEFAULT_UNLOCKED_GLASSES_IDS: string[] = GLASSES_CATALOG.filter(
  (g) => g.cost === 0 && !g.subscriptionOnly,
).map((g) => g.id)

export function findGlassesById(id: string): GlassesOption | undefined {
  return GLASSES_CATALOG.find((g) => g.id === id)
}
