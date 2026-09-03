// Geometria pura de colisão entre peças de mobília dentro de casa (lab-140, pedido do usuário:
// "os objetos precisam ter uma posição válida com teste de colisão nas paredes e outros objetos
// ou será uma posição inválida"). Extraído de `World3D.tsx` pra virar testável sem precisar
// simular Babylon/DOM — mesmo raciocínio de manter lógica de domínio fora do motor de jogo
// (`docs/prompts/03-arquitetura-sistema.md` §1), mesmo essa aqui sendo geometria de cena 3D, não
// regra de recompensa/progressão: círculos em vez de caixas exatas por peça (raio aproximado por
// tipo, suficiente pra um jogo de decorar casa pra criança).

export interface FurnitureObstacle {
  x: number
  z: number
  radius: number
}

// `rug` fica com raio bem pequeno de propósito — na vida real um tapete fica DEBAIXO de outros
// móveis, então quase não deveria bloquear nada.
export const FURNITURE_COLLISION_RADIUS: Record<string, number> = {
  rug: 0.15,
  bed: 1.0,
  table: 0.75,
  plant: 0.4,
  lamp: 0.35,
  bench: 0.6,
  butterflies: 0.3,
  shelf: 0.55,
  globe: 0.35,
  board: 0.5,
  microscope: 0.35,
}
export const FURNITURE_COLLISION_RADIUS_DEFAULT = 0.6

export function collisionRadiusForKind(kind: string | undefined): number {
  if (!kind) return FURNITURE_COLLISION_RADIUS_DEFAULT
  return FURNITURE_COLLISION_RADIUS[kind] ?? FURNITURE_COLLISION_RADIUS_DEFAULT
}

// Verdadeiro só se um círculo de raio `movingRadius` centrado em (x,z) não se sobrepõe a NENHUM
// obstáculo da lista — a parede em si fica de fora de propósito (já é impossível de violar: o
// movimento durante o posicionamento trava a posição antes de chegar aqui, ver
// `HOUSE_ROOM_HALF_SIZE - FURNITURE_PLACEMENT_MARGIN` em `World3D.tsx`), então esta função só
// cuida de objeto-contra-objeto.
export function isFurniturePositionValid(
  x: number,
  z: number,
  movingRadius: number,
  obstacles: FurnitureObstacle[],
): boolean {
  for (const obstacle of obstacles) {
    const dist = Math.hypot(x - obstacle.x, z - obstacle.z)
    if (dist < movingRadius + obstacle.radius) return false
  }
  return true
}
