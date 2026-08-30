// Baús de tesouro escondidos (lab-131, pedido do usuário: "baús de tesouro escondidos") — um por
// planeta-destino sem combate (Marte já tem sua própria recompensa exclusiva de exploração, o pote
// de moedas do lab-128). Dado de domínio puro (sem import de engine 3D), mesmo padrão de
// `furniture.ts`/`hats.ts`. Achado por proximidade em `World3D.tsx`, creditado via
// `applyTreasureChestFound` (`state/progression.ts`) — moeda flat, sem multiplicador de evento
// semanal/assinante (é recompensa de exploração, não de responder pergunta).
export interface TreasureChest {
  id: string
  planetId: string
  coinReward: number
}

export const TREASURE_CHESTS: TreasureChest[] = [
  { id: 'bau-mercurio', planetId: 'mercurio', coinReward: 15 },
  { id: 'bau-venus', planetId: 'venus', coinReward: 15 },
  { id: 'bau-jupiter', planetId: 'jupiter', coinReward: 15 },
  { id: 'bau-saturno', planetId: 'saturno', coinReward: 15 },
  { id: 'bau-urano', planetId: 'urano', coinReward: 15 },
  { id: 'bau-netuno', planetId: 'netuno', coinReward: 15 },
]

export function findTreasureChestById(id: string): TreasureChest | undefined {
  return TREASURE_CHESTS.find((c) => c.id === id)
}
