import { describe, expect, it } from 'vitest'
import { QUALITY_PROFILES, desiredEffectTier, developmentGpuTierOverride, reducedQualitySettings } from './qualityProfile'

describe('quality profiles (lab-225)', () => {
  it('preserves the mobile and desktop render budgets', () => {
    const weak = QUALITY_PROFILES.weak
    const strong = QUALITY_PROFILES.strong

    expect([weak.engineAntialias, weak.msaaSamples, weak.fxaaEnabled, weak.ssaoEnabled]).toEqual([false, 1, true, false])
    expect([weak.shadowMapSize, weak.shadowCastersEnabled, weak.environmentTextureSize]).toEqual([512, false, 128])
    expect([strong.engineAntialias, strong.msaaSamples, strong.fxaaEnabled, strong.ssaoEnabled]).toEqual([true, 4, true, true])
    expect([strong.shadowMapSize, strong.shadowCastersEnabled, strong.environmentTextureSize]).toEqual([1024, true, 256])
    expect([weak.initialHardwareScalingLevel, strong.initialHardwareScalingLevel]).toEqual([1.15, 1])
  })

  it('reports reductions and keeps important visual cues enabled on mobile', () => {
    const weak = QUALITY_PROFILES.weak
    const reduced = reducedQualitySettings(weak)

    expect(reduced).toContain('ssaoEnabled')
    expect(reduced).toContain('shadowCastersEnabled')
    expect(reduced).toContain('earthPropCount')
    expect(reduced).toContain('marsEnemyCount')
    expect(reduced).toContain('initialHardwareScalingLevel')
    expect(reduced).not.toContain('fxaaEnabled')
    expect(reducedQualitySettings(QUALITY_PROFILES.strong)).toEqual([])
    expect(weak.fxaaEnabled).toBe(true)
  })

  it('accepts a local test override only in development', () => {
    expect(developmentGpuTierOverride('?gpuTier=weak', true)).toBe('weak')
    expect(developmentGpuTierOverride('?gpuTier=strong', true)).toBe('strong')
    expect(developmentGpuTierOverride('?gpuTier=weak', false)).toBeNull()
    expect(developmentGpuTierOverride('?gpuTier=unknown', true)).toBeNull()
  })

  it('reduces real-scene render passes when the startup benchmark overestimates a GPU', () => {
    expect(desiredEffectTier(11.45)).toBe(2)
    expect(desiredEffectTier(25)).toBe(1)
    expect(desiredEffectTier(35)).toBe(0)
  })
})
