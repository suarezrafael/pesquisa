import { useState } from 'react'
import type { Profile } from '../types'
import { loadProfile, saveProfile } from './storage'

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(() => loadProfile())

  function createProfile(name: string, avatarEmoji: string) {
    const next: Profile = { name, avatarEmoji, createdAt: new Date().toISOString() }
    saveProfile(next)
    setProfile(next)
  }

  return { profile, createProfile }
}
