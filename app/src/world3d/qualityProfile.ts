export type GpuTier = 'weak' | 'strong'
export type AdaptiveEffectTier = 0 | 1 | 2

// Scene FPS, unlike the startup GPU benchmark, includes the real world and its render passes.
export function desiredEffectTier(avgFps: number): AdaptiveEffectTier {
  if (avgFps < 20) return 2
  if (avgFps < 30) return 1
  return 0
}

export function developmentGpuTierOverride(search: string, enabled: boolean): GpuTier | null {
  if (!enabled) return null
  const tier = new URLSearchParams(search).get('gpuTier')
  return tier === 'weak' || tier === 'strong' ? tier : null
}

export interface QualityProfile {
  id: 'economy' | 'full'
  engineAntialias: boolean
  initialHardwareScalingLevel: number
  msaaSamples: number
  fxaaEnabled: boolean
  ssaoEnabled: boolean
  shadowMapSize: number
  blurredShadows: boolean
  shadowCastersEnabled: boolean
  glowEnabled: boolean
  environmentTextureSize: number
  earthPropCount: number
  desertPropCount: number
  rocksPerMountain: number
  critterCount: number
  cloudCount: number
  rainParticleCapacity: number
  rainEmitRateMultiplier: number
  grassCount: number
  walkerCount: number
  marsEnemyCount: number
  rocketTrailEnabled: boolean
  pondEnabled: boolean
  poolPeopleEnabled: boolean
  treasureGlowAnimationEnabled: boolean
  footstepDustEnabled: boolean
  collectibleRingTessellation: number
  visualFeedbackDurationScale: number
}

// Values mirror the two existing World3D branches. Keep readability and educational content
// outside this profile; scaling can still change at runtime through the FPS auto-tune.
export const QUALITY_PROFILES: Readonly<Record<GpuTier, Readonly<QualityProfile>>> = {
  weak: {
    id: 'economy',
    engineAntialias: false,
    initialHardwareScalingLevel: 1.15,
    msaaSamples: 1,
    fxaaEnabled: true,
    ssaoEnabled: false,
    shadowMapSize: 512,
    blurredShadows: false,
    shadowCastersEnabled: false,
    glowEnabled: false,
    environmentTextureSize: 128,
    earthPropCount: 24,
    desertPropCount: 4,
    rocksPerMountain: 2,
    critterCount: 14,
    cloudCount: 4,
    rainParticleCapacity: 150,
    rainEmitRateMultiplier: 130,
    grassCount: 900,
    walkerCount: 3,
    marsEnemyCount: 3,
    rocketTrailEnabled: false,
    pondEnabled: false,
    poolPeopleEnabled: false,
    treasureGlowAnimationEnabled: false,
    footstepDustEnabled: false,
    collectibleRingTessellation: 12,
    visualFeedbackDurationScale: 0.65,
  },
  strong: {
    id: 'full',
    engineAntialias: true,
    initialHardwareScalingLevel: 1,
    msaaSamples: 4,
    fxaaEnabled: true,
    ssaoEnabled: true,
    shadowMapSize: 1024,
    blurredShadows: true,
    shadowCastersEnabled: true,
    glowEnabled: true,
    environmentTextureSize: 256,
    earthPropCount: 65,
    desertPropCount: 7,
    rocksPerMountain: 4,
    critterCount: 39,
    cloudCount: 9,
    rainParticleCapacity: 600,
    rainEmitRateMultiplier: 500,
    grassCount: 2600,
    walkerCount: 10,
    marsEnemyCount: 6,
    rocketTrailEnabled: true,
    pondEnabled: true,
    poolPeopleEnabled: true,
    treasureGlowAnimationEnabled: true,
    footstepDustEnabled: true,
    collectibleRingTessellation: 20,
    visualFeedbackDurationScale: 1,
  },
}

export function reducedQualitySettings(profile: Readonly<QualityProfile>): string[] {
  const full = QUALITY_PROFILES.strong
  return (Object.keys(full) as (keyof QualityProfile)[]).filter((key) => {
    if (key === 'id') return false
    if (key === 'initialHardwareScalingLevel') return profile[key] > full[key]
    const value = profile[key]
    const fullValue = full[key]
    if (typeof value === 'boolean' && typeof fullValue === 'boolean') return !value && fullValue
    return typeof value === 'number' && typeof fullValue === 'number' && value < fullValue
  })
}
