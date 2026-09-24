import { describe, expect, it } from 'vitest'
import { AVATAR_CATALOG } from '../data/avatars'
import { HAT_CATALOG } from '../data/hats'
import { GLASSES_CATALOG } from '../data/glasses'
import { BACKPACK_COLOR_CATALOG, PANTS_COLOR_CATALOG, SHIRT_COLOR_CATALOG, SHOE_COLOR_CATALOG } from '../data/customization'
import type { Profile } from '../types'
import { effectiveCosmeticProfile } from './effectiveCosmeticProfile'

const premium = <T extends { subscriptionOnly?: boolean }>(catalog: T[]): T => {
  const item = catalog.find((option) => option.subscriptionOnly)
  if (!item) throw new Error('catalogo sem visual familiar para o teste')
  return item
}

const profile: Profile = {
  name: 'Exploradora',
  avatarEmoji: premium(AVATAR_CATALOG).emoji,
  createdAt: '2026-09-23T00:00:00.000Z',
  equippedHatId: premium(HAT_CATALOG).id,
  equippedShirtColorId: premium(SHIRT_COLOR_CATALOG).id,
  equippedPantsColorId: premium(PANTS_COLOR_CATALOG).id,
  equippedShoeColorId: premium(SHOE_COLOR_CATALOG).id,
  equippedBackpackColorId: premium(BACKPACK_COLOR_CATALOG).id,
  equippedHairShapeId: 'cabelo_moicano',
  equippedGlassesId: premium(GLASSES_CATALOG).id,
  nicknameChangedAt: null,
}

describe('effectiveCosmeticProfile', () => {
  it('oculta todos os visuais familiares quando nao ha acesso, sem alterar o perfil salvo', () => {
    const visible = effectiveCosmeticProfile(profile, false)
    expect(AVATAR_CATALOG.find((avatar) => avatar.emoji === visible.avatarEmoji)?.subscriptionOnly).toBeFalsy()
    expect(visible.equippedHatId).toBeNull()
    expect(visible.equippedShirtColorId).toBeNull()
    expect(visible.equippedPantsColorId).toBeNull()
    expect(visible.equippedShoeColorId).toBeNull()
    expect(visible.equippedBackpackColorId).toBeNull()
    expect(visible.equippedGlassesId).toBeNull()
    expect(visible.equippedHairShapeId).toBe('cabelo_moicano')
    expect(visible.name).toBe(profile.name)
    expect(profile.avatarEmoji).toBe(premium(AVATAR_CATALOG).emoji)
    expect(profile.equippedHatId).toBe(premium(HAT_CATALOG).id)
  })

  it('restaura a aparencia original quando o acesso volta', () => {
    effectiveCosmeticProfile(profile, false)
    expect(effectiveCosmeticProfile(profile, true)).toBe(profile)
  })

  it('preserva itens gratuitos e conquistados sem acesso familiar', () => {
    const freeProfile: Profile = {
      ...profile,
      avatarEmoji: AVATAR_CATALOG.find((item) => item.cost === 0 && !item.subscriptionOnly)!.emoji,
      equippedHatId: HAT_CATALOG.find((item) => !item.subscriptionOnly && item.cost > 0)!.id,
      equippedShirtColorId: SHIRT_COLOR_CATALOG.find((item) => !item.subscriptionOnly)!.id,
      equippedPantsColorId: null,
      equippedShoeColorId: null,
      equippedBackpackColorId: null,
      equippedGlassesId: null,
    }
    expect(effectiveCosmeticProfile(freeProfile, false)).toEqual(freeProfile)
  })
})
