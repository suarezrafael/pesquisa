// Cartões-postais colecionáveis (lab-141) — item do backlog de engajamento discutido em chat
// (mesma lista de onde saiu o login diário, lab-138), nunca escolhido antes. Dado de domínio puro
// (sem import de engine 3D), mesmo padrão de `achievements.ts`/`glasses.ts`: um cartão por
// planeta-destino, concedido de graça na PRIMEIRA chegada (`applyPostcardCollected`,
// `state/progression.ts`), puramente de coleção — sem moeda/XP, mesmo espírito do emblema (badge),
// não da recompensa de missão.
export interface PostcardOption {
  planetId: string
  name: string
  emoji: string
  description: string
}

export const POSTCARD_CATALOG: PostcardOption[] = [
  { planetId: 'marte', name: 'Saudações de Marte', emoji: '🔴', description: 'O planeta vermelho, cheio de crateras e alienígenas curiosos.' },
  { planetId: 'mercurio', name: 'Saudações de Mercúrio', emoji: '☿️', description: 'O planeta mais perto do Sol — de dia, um forno; de noite, um freezer.' },
  { planetId: 'venus', name: 'Saudações de Vênus', emoji: '♀️', description: 'Coberto de vulcões, o planeta mais quente do sistema solar.' },
  { planetId: 'jupiter', name: 'Saudações de Júpiter', emoji: '🟠', description: 'O maior planeta, com sua famosa Grande Mancha Vermelha.' },
  { planetId: 'saturno', name: 'Saudações de Saturno', emoji: '🪐', description: 'Famoso pelos seus anéis brilhantes de gelo e poeira.' },
  { planetId: 'urano', name: 'Saudações de Urano', emoji: '🔵', description: 'Um gigante de gelo que gira quase deitado de lado.' },
  { planetId: 'netuno', name: 'Saudações de Netuno', emoji: '🔷', description: 'O planeta mais distante, com os ventos mais fortes do sistema solar.' },
]

export function findPostcardByPlanetId(planetId: string): PostcardOption | undefined {
  return POSTCARD_CATALOG.find((p) => p.planetId === planetId)
}
