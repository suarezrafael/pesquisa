export type InteractionInput = 'keyboard' | 'touch'

export function interactionInputForDevice(coarsePointer: boolean, touchPointCount: number): InteractionInput {
  return coarsePointer || touchPointCount > 0 ? 'touch' : 'keyboard'
}

export function interactionHint(action: string, input: InteractionInput): string {
  const command = input === 'touch' ? 'Toque em E' : 'Pressione E'
  return action ? `${command} pra ${action}` : command
}
