import { useState } from 'react'
import type { Profile } from '../types'
import { createProfileSlot, loadProfile, saveProfile } from './storage'
import { trackCosmeticEquipped } from '../productAnalytics'
import {
  BACKPACK_COLOR_CATALOG,
  HAIR_SHAPE_CATALOG,
  PANTS_COLOR_CATALOG,
  SHIRT_COLOR_CATALOG,
  SHOE_COLOR_CATALOG,
  type ColorOption,
  type HairShapeOption,
} from '../data/customization'

// lab-185 (achado do review do Copilot na PR #55): `ColorSection`/`HairShapeSection`
// (`world3d/AvatarShop.tsx`) tratam `id === null` E "o próprio item padrão do catálogo (cost 0,
// não-assinatura)" como visualmente equivalentes a "usar o padrão" — então um jogador que troca
// pra outra cor e depois VOLTA pro padrão chama `equip*Color(idDoItemPadrao)`, não
// `equip*Color(null)`. Sem checar isso aqui, esse retorno ao padrão contava como "equipou um
// cosmético novo", contradizendo a decisão já documentada de só contar escolhas de verdade.
function isCatalogDefault(catalog: Array<ColorOption | HairShapeOption>, id: string): boolean {
  const option = catalog.find((opt) => opt.id === id)
  if (!option) return false
  const subscriptionOnly = 'subscriptionOnly' in option && option.subscriptionOnly
  return option.cost === 0 && !subscriptionOnly
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(() => loadProfile())

  function createProfile(name: string, avatarEmoji: string) {
    // lab-108: cria o slot (roster + torna ativo) ANTES de montar/salvar o perfil — cobre tanto o
    // primeiro perfil de um aparelho novo quanto um perfil adicional (irmão jogando no mesmo
    // tablet), sem nenhuma ramificação especial aqui.
    createProfileSlot(name, avatarEmoji)
    const next: Profile = {
      name,
      avatarEmoji,
      createdAt: new Date().toISOString(),
      equippedHatId: null,
      equippedShirtColorId: null,
      equippedPantsColorId: null,
      equippedShoeColorId: null,
      equippedBackpackColorId: null,
      equippedHairShapeId: null,
      equippedGlassesId: null,
    }
    saveProfile(next)
    setProfile(next)
  }

  function equipAvatar(avatarEmoji: string) {
    setProfile((prev) => {
      if (!prev) return prev
      const next: Profile = { ...prev, avatarEmoji }
      saveProfile(next)
      return next
    })
  }

  function equipHat(hatId: string | null) {
    setProfile((prev) => {
      if (!prev) return prev
      const next: Profile = { ...prev, equippedHatId: hatId }
      saveProfile(next)
      return next
    })
    // lab-185: só ao equipar um item de verdade, não ao voltar pro padrão (`null`) — o sinal de
    // engajamento é "escolheu um cosmético", não "removeu um".
    if (hatId) trackCosmeticEquipped('hat')
  }

  // Personalização de cores/cabelo (lab-73) — mesmo formato do `equipHat` acima, um por eixo
  // (`null` = volta pro visual padrão). Repetitivo de propósito: cada função é só duas linhas,
  // não vale a pena generalizar num helper genérico só pra economizar isso.
  function equipShirtColor(id: string | null) {
    setProfile((prev) => {
      if (!prev) return prev
      const next: Profile = { ...prev, equippedShirtColorId: id }
      saveProfile(next)
      return next
    })
    if (id && !isCatalogDefault(SHIRT_COLOR_CATALOG, id)) trackCosmeticEquipped('shirtColor')
  }

  function equipPantsColor(id: string | null) {
    setProfile((prev) => {
      if (!prev) return prev
      const next: Profile = { ...prev, equippedPantsColorId: id }
      saveProfile(next)
      return next
    })
    if (id && !isCatalogDefault(PANTS_COLOR_CATALOG, id)) trackCosmeticEquipped('pantsColor')
  }

  function equipShoeColor(id: string | null) {
    setProfile((prev) => {
      if (!prev) return prev
      const next: Profile = { ...prev, equippedShoeColorId: id }
      saveProfile(next)
      return next
    })
    if (id && !isCatalogDefault(SHOE_COLOR_CATALOG, id)) trackCosmeticEquipped('shoeColor')
  }

  function equipBackpackColor(id: string | null) {
    setProfile((prev) => {
      if (!prev) return prev
      const next: Profile = { ...prev, equippedBackpackColorId: id }
      saveProfile(next)
      return next
    })
    if (id && !isCatalogDefault(BACKPACK_COLOR_CATALOG, id)) trackCosmeticEquipped('backpackColor')
  }

  function equipHairShape(id: string | null) {
    setProfile((prev) => {
      if (!prev) return prev
      const next: Profile = { ...prev, equippedHairShapeId: id }
      saveProfile(next)
      return next
    })
    if (id && !isCatalogDefault(HAIR_SHAPE_CATALOG, id)) trackCosmeticEquipped('hairShape')
  }

  function equipGlasses(id: string | null) {
    setProfile((prev) => {
      if (!prev) return prev
      const next: Profile = { ...prev, equippedGlassesId: id }
      saveProfile(next)
      return next
    })
    if (id) trackCosmeticEquipped('glasses')
  }

  return {
    profile,
    createProfile,
    equipAvatar,
    equipHat,
    equipShirtColor,
    equipPantsColor,
    equipShoeColor,
    equipBackpackColor,
    equipHairShape,
    equipGlasses,
  }
}
