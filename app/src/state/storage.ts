import type { Profile, Progress } from '../types'
import { DEFAULT_UNLOCKED_AVATAR_IDS } from '../data/avatars'
import { DEFAULT_UNLOCKED_HAT_IDS } from '../data/hats'
import { DEFAULT_UNLOCKED_GLASSES_IDS } from '../data/glasses'

const PROFILE_KEY = 'jogo-educativo:profile'
const PROGRESS_KEY = 'jogo-educativo:progress'
const TUTORIAL_SEEN_KEY = 'jogo-educativo:tutorialSeen'
const LAST_PLAYED_KEY = 'jogo-educativo:lastPlayedAt'
const DEVICE_ID_KEY = 'jogo-educativo:deviceId'

export const emptyProgress: Progress = {
  completedQuestIds: [],
  xp: 0,
  coins: 0,
  badges: [],
  unlockedAvatarIds: DEFAULT_UNLOCKED_AVATAR_IDS,
  unlockedHatIds: DEFAULT_UNLOCKED_HAT_IDS,
  // Personalização de cores/cabelo (lab-73) — só a primeira opção (custo 0) de cada catálogo
  // vem desbloqueada; as outras duas se compram na lojinha. IDs fixos aqui em vez de importar
  // `customization.ts` e filtrar por custo (como os avatares/chapéus fazem) só pra manter este
  // arquivo sem mais uma dependência — os catálogos raramente mudam a ordem dos itens grátis.
  unlockedShirtColorIds: ['camisa_padrao'],
  unlockedPantsColorIds: ['calca_azul'],
  unlockedShoeColorIds: ['sapato_preto'],
  unlockedBackpackColorIds: ['mochila_padrao'],
  unlockedHairShapeIds: ['cabelo_padrao'],
  unlockedGlassesIds: DEFAULT_UNLOCKED_GLASSES_IDS,
}

export function loadProfile(): Profile | null {
  const raw = localStorage.getItem(PROFILE_KEY)
  if (!raw) return null
  try {
    // `equippedHatId: null` como default cobre perfis salvos antes do lab-24 (chapéus), que não
    // têm esse campo gravado ainda — sem isso, `profile.equippedHatId` ficaria `undefined` em
    // vez de `null` pra quem já tinha perfil salvo, um valor fora do tipo declarado. `Partial`
    // no cast (não `Profile` direto) porque dado salvo antes deste lab pode legitimamente não
    // ter o campo — sem isso o TS assume que o spread sempre sobrescreve o default. Mesmo
    // raciocínio pros campos de personalização do lab-73.
    return {
      equippedHatId: null,
      equippedShirtColorId: null,
      equippedPantsColorId: null,
      equippedShoeColorId: null,
      equippedBackpackColorId: null,
      equippedHairShapeId: null,
      equippedGlassesId: null,
      ...(JSON.parse(raw) as Partial<Profile>),
    } as Profile
  } catch {
    return null
  }
}

export function saveProfile(profile: Profile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

export function loadProgress(): Progress {
  const raw = localStorage.getItem(PROGRESS_KEY)
  if (!raw) return emptyProgress
  try {
    return { ...emptyProgress, ...(JSON.parse(raw) as Progress) }
  } catch {
    return emptyProgress
  }
}

export function saveProgress(progress: Progress): void {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
}

export function hasTutorialBeenSeen(): boolean {
  return localStorage.getItem(TUTORIAL_SEEN_KEY) === 'true'
}

export function markTutorialSeen(): void {
  localStorage.setItem(TUTORIAL_SEEN_KEY, 'true')
}

// lab-91 (pedido do usuário: itens que ajudem o responsável a acompanhar o que a criança está
// fazendo no jogo) — só um carimbo de "quando foi a última vez que o jogo abriu com um perfil já
// criado", pra alimentar o painel de progresso do `/familia`. Não é telemetria de sessão nem
// rastreamento de tempo jogado — um valor só, sobrescrito a cada abertura.
export function touchLastPlayed(): void {
  localStorage.setItem(LAST_PLAYED_KEY, new Date().toISOString())
}

export function loadLastPlayedAt(): string | null {
  return localStorage.getItem(LAST_PLAYED_KEY)
}

// lab-99, resto de G11 (prompt.md §12: D1/D7 retention, tempo médio por sessão, quests
// concluídas por usuário) — PRIMEIRA vez que algo sai deste aparelho pra alimentar uma métrica
// agregada (tudo antes disso, incluindo `touchLastPlayed` acima, fica só local). ID 100% anônimo
// (`crypto.randomUUID()`), sem NENHUM vínculo com nome/apelido/e-mail/família — o `[MUST]` de
// `docs/prompts/01-seguranca.md` sobre "identificador técnico, não dado pessoal" permite
// exatamente isto. Gerado uma única vez por aparelho/navegador, reaproveitado pra sempre depois.
export function getOrCreateDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_ID_KEY)
  if (existing) return existing
  const created = crypto.randomUUID()
  localStorage.setItem(DEVICE_ID_KEY, created)
  return created
}
