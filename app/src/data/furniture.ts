// Catálogo de mobília de Minha Casa (lab-106) — dado de domínio puro (sem import de engine 3D),
// mesmo padrão de `glasses.ts`/`hats.ts`. Continuação direta do lab-105 (plot base gratuito):
// aqui a mobília vira REALMENTE comprável com moeda, substituindo os itens placeholder do
// `MyHousePanel`. Não há eixo de "equipar" (a casa não é uma cena 3D navegável ainda — ver
// CONTEXT.md do lab-105) — cada item é só possuído ou não, mostrado como lista no próprio painel.
export interface FurnitureOption {
  id: string
  name: string
  emoji: string
  cost: number
  /** Fase E do plano comercial (ver docs/plano-comercial-backend.md) — item exclusivo de
   * assinante em vez de comprável com moeda, mesmo campo/regra já usados em `glasses.ts`/
   * `hats.ts`. Só os dois SETS TEMÁTICOS (lab-107) usam isto — a casa em si e a mobília básica
   * (acima) continuam sempre grátis/compráveis com moeda, regra inegociável do plano comercial. */
  subscriptionOnly?: boolean
}

export const FURNITURE_CATALOG: FurnitureOption[] = [
  { id: 'cama', name: 'Cama', emoji: '🛏️', cost: 20 },
  { id: 'mesa_cadeira', name: 'Mesa e cadeira', emoji: '🪑', cost: 15 },
  { id: 'tapete', name: 'Tapete', emoji: '🟪', cost: 8 },
  { id: 'planta', name: 'Planta', emoji: '🪴', cost: 6 },
  { id: 'luminaria', name: 'Luminária', emoji: '💡', cost: 10 },
  // Sets temáticos exclusivos de assinante (lab-107, `docs/plano-comercial-backend.md`
  // linhas 180-182) — a partir daqui. "Quarto Espacial" 🚀 primeiro, "Jardim Encantado" 🌷 depois.
  { id: 'cama_nave', name: 'Cama-Nave', emoji: '🚀', cost: 0, subscriptionOnly: true },
  { id: 'luminaria_planeta', name: 'Luminária-Planeta', emoji: '🪐', cost: 0, subscriptionOnly: true },
  { id: 'tapete_estrelas', name: 'Tapete de Estrelas', emoji: '🌌', cost: 0, subscriptionOnly: true },
  { id: 'grama_florida', name: 'Grama Florida', emoji: '🌸', cost: 0, subscriptionOnly: true },
  { id: 'banco_madeira', name: 'Banco de Madeira', emoji: '🪵', cost: 0, subscriptionOnly: true },
  { id: 'borboletas_animadas', name: 'Borboletas Animadas', emoji: '🦋', cost: 0, subscriptionOnly: true },
  // Itens de temática educacional (lab-123, pedido do usuário: "mais itens relacionados a
  // educação também") — SEMPRE grátis/compráveis com moeda, nunca `subscriptionOnly`: conteúdo
  // educacional nunca é gate de assinatura, regra inegociável do plano comercial (mesma regra que
  // já vale pra missões/progressão).
  { id: 'estante_livros', name: 'Estante de Livros', emoji: '📚', cost: 18 },
  { id: 'globo_terrestre', name: 'Globo Terrestre', emoji: '🌍', cost: 14 },
  { id: 'lousa', name: 'Lousa', emoji: '🖍️', cost: 12 },
  { id: 'microscopio', name: 'Microscópio', emoji: '🔬', cost: 16 },
]

export function findFurnitureById(id: string): FurnitureOption | undefined {
  return FURNITURE_CATALOG.find((f) => f.id === id)
}
