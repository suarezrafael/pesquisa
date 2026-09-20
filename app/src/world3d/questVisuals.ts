import { Color3 } from '@babylonjs/core'
import type { QuestType } from '../types'

export const questTypeColor: Record<QuestType, Color3> = {
  logica: new Color3(0.55, 0.4, 0.95), // roxo
  matematica: new Color3(0.29, 0.62, 0.67), // azul-esverdeado (accent do design system)
  leitura: new Color3(0.96, 0.51, 0.68), // rosa (primary do design system)
}

// Backlog "Lab 196 - NPCs vivos nos planetas secundarios" — fala catalogada curta do professor de
// cada escolinha ao se aproximar, uma por matéria (não por escolinha individual) — reforça "papel
// claro" e "conecta matemática/lógica/leitura" (critério de aceite do backlog) sem inventar um
// catálogo de diálogo novo por NPC.
export const questTypeGreeting: Record<QuestType, string> = {
  logica: '🧩 Vamos treinar lógica?',
  matematica: '🔢 Bora praticar matemática?',
  leitura: '📖 Que tal umas leituras?',
}
