import { Color3 } from '@babylonjs/core'
import type { QuestType } from '../types'

export const questTypeColor: Record<QuestType, Color3> = {
  logica: new Color3(0.55, 0.4, 0.95), // roxo
  matematica: new Color3(0.29, 0.62, 0.67), // azul-esverdeado (accent do design system)
  leitura: new Color3(0.96, 0.51, 0.68), // rosa (primary do design system)
}
