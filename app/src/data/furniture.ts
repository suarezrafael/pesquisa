// Catálogo de mobília de Minha Casa (lab-106) — dado de domínio puro (sem import de engine 3D),
// mesmo padrão de `glasses.ts`/`hats.ts`. Continuação direta do lab-105 (plot base gratuito):
// aqui a mobília vira REALMENTE comprável com moeda, substituindo os itens placeholder do
// `MyHousePanel`. Não há eixo de "equipar" (a casa não é uma cena 3D navegável ainda — ver
// CONTEXT.md do lab-105) — cada item é só possuído ou não, mostrado como lista no próprio painel.
// Itens exclusivos de assinante ("Quarto Espacial", "Jardim Encantado",
// `docs/plano-comercial-backend.md`) ficam pra um próximo laboratório, quando `subscriptionOnly`
// entrar em uso aqui (mesmo campo já usado em `glasses.ts`/`hats.ts`).
export interface FurnitureOption {
  id: string
  name: string
  emoji: string
  cost: number
  subscriptionOnly?: boolean
}

export const FURNITURE_CATALOG: FurnitureOption[] = [
  { id: 'cama', name: 'Cama', emoji: '🛏️', cost: 20 },
  { id: 'mesa_cadeira', name: 'Mesa e cadeira', emoji: '🪑', cost: 15 },
  { id: 'tapete', name: 'Tapete', emoji: '🟪', cost: 8 },
  { id: 'planta', name: 'Planta', emoji: '🪴', cost: 6 },
  { id: 'luminaria', name: 'Luminária', emoji: '💡', cost: 10 },
]

export function findFurnitureById(id: string): FurnitureOption | undefined {
  return FURNITURE_CATALOG.find((f) => f.id === id)
}
