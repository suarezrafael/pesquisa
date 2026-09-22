import { NullEngine, PBRMaterial, Scene } from '@babylonjs/core'
import { afterEach, describe, expect, it } from 'vitest'
import {
  EARTH_DYNAMIC_MATERIAL_EXCLUSION_GROUPS,
  EARTH_STATIC_MATERIAL_NAMES,
  freezeAuditedEarthMaterials,
} from './staticMaterials'

describe('freezeAuditedEarthMaterials (lab-224)', () => {
  let engine: NullEngine | null = null

  afterEach(() => {
    engine?.dispose()
    engine = null
  })

  it('congela somente nomes aprovados e ignora duplicatas do mesmo objeto', () => {
    engine = new NullEngine()
    const scene = new Scene(engine)
    const staticMaterial = new PBRMaterial('schoolWallMat', scene)
    const dynamicQuestMaterial = new PBRMaterial('roofMat-q01', scene)

    const report = freezeAuditedEarthMaterials([
      staticMaterial,
      staticMaterial,
      dynamicQuestMaterial,
    ])

    expect(staticMaterial.isFrozen).toBe(true)
    expect(dynamicQuestMaterial.isFrozen).toBe(false)
    expect(report.matchedMaterials).toBe(1)
    expect(report.frozenMaterials).toBe(1)
    expect(report.newlyFrozenMaterials).toBe(1)
    expect(report.alreadyFrozenMaterials).toBe(0)
    expect(report.expectedNames).toBe(EARTH_STATIC_MATERIAL_NAMES.length)
    expect(report.missingNames).not.toContain('schoolWallMat')
  })

  it('e idempotente e preserva a lista explicita de grupos dinamicos', () => {
    engine = new NullEngine()
    const scene = new Scene(engine)
    const staticMaterial = new PBRMaterial('streetMat', scene)

    freezeAuditedEarthMaterials([staticMaterial])
    const secondReport = freezeAuditedEarthMaterials([staticMaterial])

    expect(secondReport.newlyFrozenMaterials).toBe(0)
    expect(secondReport.alreadyFrozenMaterials).toBe(1)
    expect(secondReport.frozenMaterials).toBe(1)
    expect(new Set(EARTH_STATIC_MATERIAL_NAMES).size).toBe(EARTH_STATIC_MATERIAL_NAMES.length)
    expect(EARTH_DYNAMIC_MATERIAL_EXCLUSION_GROUPS).toContain('avatar, NPCs e multiplayer')
    expect(EARTH_DYNAMIC_MATERIAL_EXCLUSION_GROUPS).toContain('interiores com fade')
  })
})
