// Segredos visuais escondidos por planeta (lab-179, "Planetas interativos v1") — dado de domínio
// puro (sem import de engine 3D), mesmo padrão de `treasureChests.ts`/`postcards.ts`. Categoria
// "segredo visual" do backlog (`docs/growth-retention-monetization-backlog.md`, Lab 179):
// diferente de um baú (recompensa explícita anunciada por um marcador visível de longe), um
// segredo fica escondido de propósito, sem marcador chamativo, recompensando quem explora o
// planeta inteiro. v1 só cobre `marte` — é o único planeta-destino sem baú de tesouro
// (`treasureChests.ts` exclui `marte` explicitamente) e sem escolinha (`planetQuests.ts` não tem
// entrada pra `marte`), então precisava de uma 3ª interação pra bater o "pelo menos 3" do backlog.
export interface PlanetSecret {
  id: string
  planetId: string
  name: string
  coinReward: number
  description: string
}

export const PLANET_SECRETS: PlanetSecret[] = [
  {
    id: 'segredo-marte-sonda',
    planetId: 'marte',
    name: 'Sonda Perdida',
    coinReward: 15,
    description: 'Os destroços enferrujados de uma sonda espacial antiga, meio enterrados na areia vermelha.',
  },
]

export function findPlanetSecretById(id: string): PlanetSecret | undefined {
  return PLANET_SECRETS.find((s) => s.id === id)
}

export function findPlanetSecretByPlanetId(planetId: string): PlanetSecret | undefined {
  return PLANET_SECRETS.find((s) => s.planetId === planetId)
}
