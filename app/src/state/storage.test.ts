// @vitest-environment jsdom
// `storage.ts` não tinha nenhum teste direto apesar de ser a camada de persistência de verdade do
// jogo (perfil/progresso de cada criança, migração de save legado) — uma regressão aqui arrisca
// perder ou duplicar progresso real, não só um bug cosmético. Foco deste arquivo:
// `migrateLegacyProfileIfNeeded` (interna, exercida via `listProfiles`/`loadProfile`/
// `loadProgress`), que já teve um bug real documentado no próprio código-fonte (migração
// duplicada ao trocar de perfil, corrigido antes do commit do lab-108) sem nenhum teste de
// regressão protegendo essa correção até agora.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  clearActiveProfile,
  getActiveProfileId,
  hasTutorialBeenSeen,
  listProfiles,
  loadLastPlayedAt,
  loadProfile,
  loadProgress,
} from './storage'

// Espelham as chaves legadas privadas de `storage.ts` — precisam ficar em sincronia se essas
// constantes mudarem lá (`LEGACY_PROFILE_KEY` etc.).
const LEGACY_PROFILE_KEY = 'jogo-educativo:profile'
const LEGACY_PROGRESS_KEY = 'jogo-educativo:progress'
const LEGACY_TUTORIAL_SEEN_KEY = 'jogo-educativo:tutorialSeen'
const LEGACY_LAST_PLAYED_KEY = 'jogo-educativo:lastPlayedAt'

describe('migração de perfil legado (storage.ts)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('instalação nova (sem save legado) não migra nada', () => {
    expect(listProfiles()).toEqual([])
    expect(getActiveProfileId()).toBeNull()
  })

  it('migra um save legado completo pro sistema de slots, no primeiro acesso', () => {
    localStorage.setItem(LEGACY_PROFILE_KEY, JSON.stringify({ name: 'Ana', avatarEmoji: '🐱' }))
    localStorage.setItem(
      LEGACY_PROGRESS_KEY,
      JSON.stringify({ completedQuestIds: ['q01'], xp: 40, coins: 10 }),
    )
    localStorage.setItem(LEGACY_TUTORIAL_SEEN_KEY, 'true')
    localStorage.setItem(LEGACY_LAST_PLAYED_KEY, '2026-10-01T00:00:00.000Z')

    const roster = listProfiles()
    expect(roster).toHaveLength(1)
    expect(roster[0]).toMatchObject({ name: 'Ana', avatarEmoji: '🐱' })
    expect(getActiveProfileId()).toBe(roster[0].id)

    const profile = loadProfile()
    expect(profile).toMatchObject({ name: 'Ana', avatarEmoji: '🐱' })
    expect(loadProgress()).toMatchObject({ completedQuestIds: ['q01'], xp: 40, coins: 10 })
    expect(hasTutorialBeenSeen()).toBe(true)
    expect(loadLastPlayedAt()).toBe('2026-10-01T00:00:00.000Z')
  })

  it('migra um save legado parcial (só perfil, sem progresso/tutorial/último acesso) sem travar', () => {
    localStorage.setItem(LEGACY_PROFILE_KEY, JSON.stringify({ name: 'Bia', avatarEmoji: '🐶' }))

    const roster = listProfiles()
    expect(roster).toHaveLength(1)
    expect(loadProgress()).toMatchObject({ completedQuestIds: [], xp: 0, coins: 0 })
    expect(hasTutorialBeenSeen()).toBe(false)
    expect(loadLastPlayedAt()).toBeNull()
  })

  it('save legado com JSON corrompido não migra e não lança', () => {
    localStorage.setItem(LEGACY_PROFILE_KEY, '{ isso nao e json valido')

    expect(() => listProfiles()).not.toThrow()
    expect(listProfiles()).toEqual([])
    expect(getActiveProfileId()).toBeNull()
    // A chave legada em si continua intocada — nenhuma tentativa de migração deve apagá-la.
    expect(localStorage.getItem(LEGACY_PROFILE_KEY)).not.toBeNull()
  })

  it('a migração copia o save legado, nunca move — a chave original continua legível depois', () => {
    localStorage.setItem(LEGACY_PROFILE_KEY, JSON.stringify({ name: 'Caio', avatarEmoji: '🦊' }))
    listProfiles()
    expect(localStorage.getItem(LEGACY_PROFILE_KEY)).not.toBeNull()
  })

  it('não migra de novo (duplicado) quando o perfil ativo é trocado/limpo depois da 1a migração', () => {
    // Regressão do bug documentado em storage.ts: usar o id ativo como guarda da migração fazia
    // "Trocar perfil" (que só limpa o id ativo, nunca o roster) disparar uma 2a migração a cada
    // troca, duplicando o perfil legado num slot novo. O guard correto é o ROSTER, não o id ativo.
    localStorage.setItem(LEGACY_PROFILE_KEY, JSON.stringify({ name: 'Duda', avatarEmoji: '🐰' }))

    const firstRoster = listProfiles()
    expect(firstRoster).toHaveLength(1)

    clearActiveProfile()
    expect(getActiveProfileId()).toBeNull()

    const rosterAfterSwitch = listProfiles()
    expect(rosterAfterSwitch).toHaveLength(1)
    expect(rosterAfterSwitch).toEqual(firstRoster)
  })
})
