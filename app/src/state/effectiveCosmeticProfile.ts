import { AVATAR_CATALOG, findAvatarByEmoji } from '../data/avatars'
import { HAT_CATALOG } from '../data/hats'
import { GLASSES_CATALOG } from '../data/glasses'
import {
  BACKPACK_COLOR_CATALOG,
  HAIR_SHAPE_CATALOG,
  PANTS_COLOR_CATALOG,
  SHIRT_COLOR_CATALOG,
  SHOE_COLOR_CATALOG,
} from '../data/customization'
import type { Profile } from '../types'

function availableId<T extends { id: string; subscriptionOnly?: boolean }>(catalog: T[], id: string | null): string | null {
  if (!id) return null
  return catalog.find((item) => item.id === id)?.subscriptionOnly ? null : id
}

export function effectiveCosmeticProfile(profile: Profile, entitlementActive: boolean): Profile {
  if (entitlementActive) return profile

  const avatar = findAvatarByEmoji(profile.avatarEmoji)
  const freeAvatarEmoji = AVATAR_CATALOG.find((item) => item.cost === 0 && !item.subscriptionOnly)?.emoji ?? '🦊'
  return {
    ...profile,
    avatarEmoji: avatar?.subscriptionOnly ? freeAvatarEmoji : profile.avatarEmoji,
    equippedHatId: availableId(HAT_CATALOG, profile.equippedHatId),
    equippedShirtColorId: availableId(SHIRT_COLOR_CATALOG, profile.equippedShirtColorId),
    equippedPantsColorId: availableId(PANTS_COLOR_CATALOG, profile.equippedPantsColorId),
    equippedShoeColorId: availableId(SHOE_COLOR_CATALOG, profile.equippedShoeColorId),
    equippedBackpackColorId: availableId(BACKPACK_COLOR_CATALOG, profile.equippedBackpackColorId),
    equippedHairShapeId: availableId(HAIR_SHAPE_CATALOG, profile.equippedHairShapeId),
    equippedGlassesId: availableId(GLASSES_CATALOG, profile.equippedGlassesId),
  }
}
