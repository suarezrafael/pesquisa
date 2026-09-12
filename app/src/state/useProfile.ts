import { useState } from 'react'
import type { Profile } from '../types'
import { createProfileSlot, loadProfile, saveProfile } from './storage'
import { trackCosmeticEquipped } from '../productAnalytics'

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
    if (id) trackCosmeticEquipped('shirtColor')
  }

  function equipPantsColor(id: string | null) {
    setProfile((prev) => {
      if (!prev) return prev
      const next: Profile = { ...prev, equippedPantsColorId: id }
      saveProfile(next)
      return next
    })
    if (id) trackCosmeticEquipped('pantsColor')
  }

  function equipShoeColor(id: string | null) {
    setProfile((prev) => {
      if (!prev) return prev
      const next: Profile = { ...prev, equippedShoeColorId: id }
      saveProfile(next)
      return next
    })
    if (id) trackCosmeticEquipped('shoeColor')
  }

  function equipBackpackColor(id: string | null) {
    setProfile((prev) => {
      if (!prev) return prev
      const next: Profile = { ...prev, equippedBackpackColorId: id }
      saveProfile(next)
      return next
    })
    if (id) trackCosmeticEquipped('backpackColor')
  }

  function equipHairShape(id: string | null) {
    setProfile((prev) => {
      if (!prev) return prev
      const next: Profile = { ...prev, equippedHairShapeId: id }
      saveProfile(next)
      return next
    })
    if (id) trackCosmeticEquipped('hairShape')
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
