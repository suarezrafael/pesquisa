import { useState } from 'react'
import type { Profile } from '../types'
import { createProfileSlot, loadProfile, saveProfile } from './storage'

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
  }

  function equipPantsColor(id: string | null) {
    setProfile((prev) => {
      if (!prev) return prev
      const next: Profile = { ...prev, equippedPantsColorId: id }
      saveProfile(next)
      return next
    })
  }

  function equipShoeColor(id: string | null) {
    setProfile((prev) => {
      if (!prev) return prev
      const next: Profile = { ...prev, equippedShoeColorId: id }
      saveProfile(next)
      return next
    })
  }

  function equipBackpackColor(id: string | null) {
    setProfile((prev) => {
      if (!prev) return prev
      const next: Profile = { ...prev, equippedBackpackColorId: id }
      saveProfile(next)
      return next
    })
  }

  function equipHairShape(id: string | null) {
    setProfile((prev) => {
      if (!prev) return prev
      const next: Profile = { ...prev, equippedHairShapeId: id }
      saveProfile(next)
      return next
    })
  }

  function equipGlasses(id: string | null) {
    setProfile((prev) => {
      if (!prev) return prev
      const next: Profile = { ...prev, equippedGlassesId: id }
      saveProfile(next)
      return next
    })
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
