// Catálogo de pets adotáveis (lab-155) — dado de domínio puro (sem import de engine 3D), mesmo
// padrão de `hats.ts`/`avatars.ts`. Item de maior alavancagem de engajamento encontrado na
// pesquisa de mercado desta sessão (relatório "Carta de Navegação") — o core loop do Adopt Me!:
// adotar, cuidar, ver crescer. `species` só descreve QUAL bicho — quem monta a geometria 3D de
// verdade é `world3d/petFigure.ts` (`buildPetFigure`, compartilhado entre o mundo e o preview da
// lojinha), conforme docs/prompts/03-arquitetura-sistema.md §1.
export type PetSpecies = 'gato' | 'cachorro' | 'coelho' | 'tartaruga'

export interface PetOption {
  id: string
  name: string
  species: PetSpecies
  emoji: string
  cost: number
  furColorRgb: [number, number, number]
}

export const PET_CATALOG: PetOption[] = [
  {
    id: 'gato_laranja',
    name: 'Gato Laranja',
    species: 'gato',
    emoji: '🐱',
    cost: 30,
    furColorRgb: [0.85, 0.55, 0.25],
  },
  {
    id: 'gato_preto',
    name: 'Gato Preto',
    species: 'gato',
    emoji: '🐈‍⬛',
    cost: 30,
    furColorRgb: [0.15, 0.15, 0.15],
  },
  {
    id: 'cachorro_marrom',
    name: 'Cachorro Marrom',
    species: 'cachorro',
    emoji: '🐶',
    cost: 40,
    furColorRgb: [0.5, 0.32, 0.18],
  },
  {
    id: 'cachorro_branco',
    name: 'Cachorro Branco',
    species: 'cachorro',
    emoji: '🐕',
    cost: 40,
    furColorRgb: [0.92, 0.9, 0.85],
  },
  {
    id: 'coelho_branco',
    name: 'Coelho Branco',
    species: 'coelho',
    emoji: '🐰',
    cost: 45,
    furColorRgb: [0.94, 0.92, 0.88],
  },
  {
    id: 'coelho_marrom',
    name: 'Coelho Marrom',
    species: 'coelho',
    emoji: '🐇',
    cost: 45,
    furColorRgb: [0.55, 0.36, 0.22],
  },
  {
    id: 'tartaruga_verde',
    name: 'Tartaruga Verde',
    species: 'tartaruga',
    emoji: '🐢',
    cost: 50,
    furColorRgb: [0.38, 0.68, 0.32],
  },
  {
    id: 'tartaruga_azul',
    name: 'Tartaruga Azul',
    species: 'tartaruga',
    emoji: '🐢',
    cost: 50,
    furColorRgb: [0.27, 0.6, 0.72],
  },
]

export function findPetById(id: string): PetOption | undefined {
  return PET_CATALOG.find((p) => p.id === id)
}

// Achado ao vivo: medido via bounding box real no Chrome, pet adulto ficava com ~21% da
// altura do avatar — bem menor do que o "companheiro visível" que o backlog pede. Multiplicador
// aplicado POR CIMA da escala relativa de estágio já existente (`petStageScale`, que continua
// intocada — filhote/jovem seguem proporcionalmente menores que o adulto da mesma espécie). Cada
// espécie tem seu próprio limite porque as malhas de base têm proporções diferentes entre si — um
// multiplicador único deixaria algumas espécies grandes ou pequenas demais em relação às outras.
export const PET_SPECIES_SCALE_MULTIPLIER: Record<PetSpecies, number> = {
  gato: 1.6,
  cachorro: 1.8,
  coelho: 1.65,
  tartaruga: 1.7,
}
