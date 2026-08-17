import { useState } from 'react'
import type { Profile } from '../types'
import { loadProfile, saveProfile } from './storage'

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(() => loadProfile())

  function createProfile(name: string, avatarEmoji: string) {
    const next: Profile = { name, avatarEmoji, createdAt: new Date().toISOString(), equippedHatId: null }
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

  return { profile, createProfile, equipAvatar, equipHat }
}
