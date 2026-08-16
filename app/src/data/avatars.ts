// Catálogo de avatares — dado de domínio puro (sem import de engine 3D), igual ao padrão de
// `quests.ts`. `colorRgb` é 0-1 (não um tipo do Babylon) pra manter esse arquivo desacoplado do
// motor de renderização, conforme docs/prompts/03-arquitetura-sistema.md §1 — quem converte pra
// `Color3` é o código de renderização (world3d/World3D.tsx), não este arquivo.
export interface AvatarOption {
  id: string
  emoji: string
  name: string
  /** Custo em moedas pra desbloquear. 0 = já disponível desde o início (onboarding). */
  cost: number
  colorRgb: [number, number, number]
}

export const AVATAR_CATALOG: AvatarOption[] = [
  { id: 'raposa', emoji: '🦊', name: 'Raposa', cost: 0, colorRgb: [0.94, 0.51, 0.2] },
  { id: 'gato', emoji: '🐱', name: 'Gato', cost: 0, colorRgb: [0.95, 0.72, 0.25] },
  { id: 'panda', emoji: '🐼', name: 'Panda', cost: 0, colorRgb: [0.85, 0.85, 0.9] },
  { id: 'sapo', emoji: '🐸', name: 'Sapo', cost: 0, colorRgb: [0.36, 0.75, 0.4] },
  { id: 'unicornio', emoji: '🦄', name: 'Unicórnio', cost: 0, colorRgb: [0.8, 0.6, 0.95] },
  { id: 'tigre', emoji: '🐯', name: 'Tigre', cost: 0, colorRgb: [0.95, 0.55, 0.15] },
  { id: 'coruja', emoji: '🦉', name: 'Coruja', cost: 12, colorRgb: [0.4, 0.55, 0.58] },
  { id: 'coala', emoji: '🐨', name: 'Coala', cost: 15, colorRgb: [0.62, 0.64, 0.68] },
  { id: 'lobo', emoji: '🐺', name: 'Lobo', cost: 20, colorRgb: [0.42, 0.47, 0.62] },
  { id: 'leao', emoji: '🦁', name: 'Leão', cost: 25, colorRgb: [0.85, 0.6, 0.15] },
  { id: 'dragao', emoji: '🐲', name: 'Dragão', cost: 35, colorRgb: [0.16, 0.6, 0.38] },
  { id: 'polvo', emoji: '🐙', name: 'Polvo', cost: 45, colorRgb: [0.72, 0.22, 0.55] },
]

export const DEFAULT_UNLOCKED_AVATAR_IDS: string[] = AVATAR_CATALOG.filter((a) => a.cost === 0).map(
  (a) => a.id,
)

export function findAvatarByEmoji(emoji: string): AvatarOption | undefined {
  return AVATAR_CATALOG.find((a) => a.emoji === emoji)
}

export function findAvatarById(id: string): AvatarOption | undefined {
  return AVATAR_CATALOG.find((a) => a.id === id)
}
