import type { Material } from '@babylonjs/core'

// Lab 224: allowlist deliberadamente exata. Todo material fora desta lista permanece dinamico por
// padrao, inclusive avatar/NPCs, pets, GLBs importados, agua, clima, quests, moedas, efeitos,
// puzzles e interiores com fade. Os aprovados abaixo pertencem somente a primitivas MeshBuilder
// sem morph targets e nao recebem mutacoes depois da configuracao inicial.
export const EARTH_STATIC_MATERIAL_NAMES = [
  'parkourPlatformMat',
  'parkour2PlatformMat',
  'parkour3PlatformMat',
  'parkour4PlatformMat',
  'streetMat',
  'centerLineMat',
  'schoolWallMat',
  'schoolDoorMat',
  'schoolFoundationMat',
  'deskWoodMat',
  'deskMetalMat',
  'deskBookMat',
  'coopStoneMat',
  'coopFlagMat',
  'bridgeWoodMat',
  'bridgeStoneMat',
  'fuelTankMat',
  'fuelHoseMat',
  'plaquePostMat',
  'plaqueBoardMat',
  'hubArchMat',
  'hubPedestalMat',
  'hubBridgePedestalMat',
  'hubReturnMat',
  'houseWallMat',
  'houseRoofMat',
  'houseDoorMat',
  'houseFoundationMat',
  'gameCenterWallMat',
  'gameCenterRoofMat',
  'gameCenterDoorMat',
  'gameCenterFoundationMat',
  'shopWallMat',
  'shopRoofMat',
  'shopFoundationMat',
  'shopCounterMat',
  'shopShelfMat',
  'towerWallMat',
  'towerRoofMat',
  'towerFloorMat',
  'quizTowerWallMat',
  'quizTowerRoofMat',
  'quizTowerFloorMat',
  'quizTowerStepMat',
  'quizTowerMarkerMat',
] as const

export const EARTH_DYNAMIC_MATERIAL_EXCLUSION_GROUPS = [
  'avatar, NPCs e multiplayer',
  'pets e acessorios',
  'GLBs importados',
  'agua, clima e grama',
  'telhados e portais de quest',
  'moedas, recompensas e efeitos',
  'puzzles e minijogos',
  'interiores com fade',
] as const

export interface StaticMaterialFreezeReport {
  expectedNames: number
  matchedMaterials: number
  frozenMaterials: number
  newlyFrozenMaterials: number
  alreadyFrozenMaterials: number
  missingNames: string[]
}

const earthStaticMaterialNames = new Set<string>(EARTH_STATIC_MATERIAL_NAMES)

export function freezeAuditedEarthMaterials(materials: readonly Material[]): StaticMaterialFreezeReport {
  const uniqueMaterials = [...new Set(materials)]
  const matchedNames = new Set<string>()
  let newlyFrozenMaterials = 0
  let alreadyFrozenMaterials = 0

  const matchedMaterials = uniqueMaterials.filter((material) => {
    if (!earthStaticMaterialNames.has(material.name)) return false
    matchedNames.add(material.name)
    if (material.isFrozen) alreadyFrozenMaterials++
    else {
      material.freeze()
      newlyFrozenMaterials++
    }
    return true
  })

  return {
    expectedNames: EARTH_STATIC_MATERIAL_NAMES.length,
    matchedMaterials: matchedMaterials.length,
    frozenMaterials: matchedMaterials.filter((material) => material.isFrozen).length,
    newlyFrozenMaterials,
    alreadyFrozenMaterials,
    missingNames: EARTH_STATIC_MATERIAL_NAMES.filter((name) => !matchedNames.has(name)),
  }
}
