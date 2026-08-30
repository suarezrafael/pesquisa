import type { Profile, Progress } from '../types'
import { DEFAULT_UNLOCKED_AVATAR_IDS } from '../data/avatars'
import { DEFAULT_UNLOCKED_HAT_IDS } from '../data/hats'
import { DEFAULT_UNLOCKED_GLASSES_IDS } from '../data/glasses'

// Chaves LEGADAS (antes do lab-108) — perfil único por aparelho, sem id nenhum. Nunca apagadas:
// `migrateLegacyProfileIfNeeded` só COPIA o que encontra aqui pro sistema de slots na primeira
// leitura pós-atualização, deixando o original intocado (zero risco de perda de progresso real de
// família já jogando, mesmo que a migração tenha algum bug não previsto).
const LEGACY_PROFILE_KEY = 'jogo-educativo:profile'
const LEGACY_PROGRESS_KEY = 'jogo-educativo:progress'
const LEGACY_TUTORIAL_SEEN_KEY = 'jogo-educativo:tutorialSeen'
const LEGACY_LAST_PLAYED_KEY = 'jogo-educativo:lastPlayedAt'

const DEVICE_ID_KEY = 'jogo-educativo:deviceId'

// Múltiplos perfis por aparelho (lab-108, pedido: dois irmãos no mesmo tablet, cada um com seu
// próprio avatar/progresso). `PROFILE_LIST_KEY` guarda só um "roster" leve (id/nome/emoji) pra
// desenhar a tela de escolha sem carregar o `Progress` inteiro de cada perfil; o perfil/progresso
// completo de cada um vive em chaves com o id embutido (`profileKey`/`progressKey` etc.). A
// assinatura da família (`entitlementStorage.ts`) e o id anônimo de analytics (`DEVICE_ID_KEY`
// abaixo) ficam de fora de propósito — são por APARELHO, não por criança.
const PROFILE_LIST_KEY = 'jogo-educativo:profiles'
const ACTIVE_PROFILE_ID_KEY = 'jogo-educativo:activeProfileId'

export const MAX_PROFILES = 4

export interface ProfileRosterEntry {
  id: string
  name: string
  avatarEmoji: string
}

function profileKey(id: string): string {
  return `jogo-educativo:profile:${id}`
}
function progressKey(id: string): string {
  return `jogo-educativo:progress:${id}`
}
function tutorialSeenKey(id: string): string {
  return `jogo-educativo:tutorialSeen:${id}`
}
function lastPlayedKey(id: string): string {
  return `jogo-educativo:lastPlayedAt:${id}`
}

function loadRoster(): ProfileRosterEntry[] {
  const raw = localStorage.getItem(PROFILE_LIST_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as ProfileRosterEntry[]
  } catch {
    return []
  }
}

function saveRoster(roster: ProfileRosterEntry[]): void {
  localStorage.setItem(PROFILE_LIST_KEY, JSON.stringify(roster))
}

function getActiveProfileId(): string | null {
  return localStorage.getItem(ACTIVE_PROFILE_ID_KEY)
}

// Roda a cada leitura (barata — só checa duas chaves) até o perfil legado ser migrado uma vez.
// Guarda pelo ROSTER (não por `ACTIVE_PROFILE_ID_KEY`) de propósito — bug real pego ANTES do
// commit deste laboratório: usar o id ativo como guarda fazia o botão "Trocar perfil"
// (`clearActiveProfile`, que só apaga o id ativo, nunca o roster) disparar uma SEGUNDA migração
// a cada troca, duplicando o perfil legado num slot novo toda vez. O roster, uma vez preenchido,
// nunca é limpo por nenhuma ação deste laboratório — guarda confiável de "já migrei". Instalação
// NOVA (sem perfil legado nenhum) não migra nada — segue o fluxo normal de `createProfileSlot` na
// primeira vez que alguém cria um perfil pelo onboarding.
function migrateLegacyProfileIfNeeded(): void {
  if (loadRoster().length > 0) return
  const legacyRaw = localStorage.getItem(LEGACY_PROFILE_KEY)
  if (!legacyRaw) return
  let legacyProfile: Partial<Profile>
  try {
    legacyProfile = JSON.parse(legacyRaw) as Partial<Profile>
  } catch {
    return
  }

  const id = crypto.randomUUID()
  localStorage.setItem(profileKey(id), legacyRaw)
  const legacyProgress = localStorage.getItem(LEGACY_PROGRESS_KEY)
  if (legacyProgress) localStorage.setItem(progressKey(id), legacyProgress)
  const legacyTutorialSeen = localStorage.getItem(LEGACY_TUTORIAL_SEEN_KEY)
  if (legacyTutorialSeen) localStorage.setItem(tutorialSeenKey(id), legacyTutorialSeen)
  const legacyLastPlayed = localStorage.getItem(LEGACY_LAST_PLAYED_KEY)
  if (legacyLastPlayed) localStorage.setItem(lastPlayedKey(id), legacyLastPlayed)

  saveRoster([{ id, name: legacyProfile.name ?? '', avatarEmoji: legacyProfile.avatarEmoji ?? '🦊' }])
  localStorage.setItem(ACTIVE_PROFILE_ID_KEY, id)
}

// Lista os perfis já criados neste aparelho (pra tela "Quem vai jogar?", `ProfilePicker.tsx`).
// Perfil único (o caso comum, quase todo mundo) devolve um array de 1 item — `App.tsx` decide não
// mostrar picker nenhum nesse caso, o jogo se comporta exatamente como antes deste laboratório.
export function listProfiles(): ProfileRosterEntry[] {
  migrateLegacyProfileIfNeeded()
  return loadRoster()
}

// Cria um slot novo (roster + torna ativo) SEM ainda escrever o `Profile` completo — quem chama
// (`useProfile.createProfile`) monta o objeto e chama `saveProfile` logo em seguida, que já grava
// na chave do slot recém-ativado. Cobre tanto o primeiro perfil de um aparelho novo (roster vazio)
// quanto um perfil adicional ("+ Novo perfil" no picker) com o mesmo código, sem caso especial.
export function createProfileSlot(name: string, avatarEmoji: string): string {
  const roster = loadRoster()
  const id = crypto.randomUUID()
  saveRoster([...roster, { id, name, avatarEmoji }])
  localStorage.setItem(ACTIVE_PROFILE_ID_KEY, id)
  return id
}

export function switchActiveProfile(id: string): void {
  localStorage.setItem(ACTIVE_PROFILE_ID_KEY, id)
}

// Botão "Trocar perfil" do HUD (lab-108) — some com o ativo SEM apagar nenhum dado, só devolve o
// aparelho pra tela de escolha no próximo carregamento (`App.tsx` recarrega a página logo depois
// de chamar isto, pelo mesmo motivo do `switchActiveProfile`: mais simples e confiável que
// sincronizar manualmente todo o estado do React).
export function clearActiveProfile(): void {
  localStorage.removeItem(ACTIVE_PROFILE_ID_KEY)
}

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
  // Mobília de Minha Casa (lab-106) — nada vem grátis (ao contrário dos outros eixos, que sempre
  // têm uma opção padrão sem custo); a casa começa vazia, tudo se compra com moeda.
  unlockedFurnitureIds: [],
  // Escolinhas de astronomia dos planetas do Sistema Solar (lab-115) — ver comentário em
  // `types.ts`.
  completedPlanetQuestIds: [],
  // Baús de tesouro escondidos (lab-131) — ver comentário em `types.ts`.
  foundTreasureChestIds: [],
}

// A partir daqui, `loadProfile`/`saveProfile`/`loadProgress`/`saveProgress`/`hasTutorialBeenSeen`/
// `markTutorialSeen`/`touchLastPlayed`/`loadLastPlayedAt` operam sobre o PERFIL ATIVO no aparelho
// (lab-108) — a assinatura externa não mudou, então `useProfile.ts`/`useProgress.ts`/
// `FamilyPortal.tsx` continuam funcionando sem nenhuma alteração, só passam a refletir "o perfil
// ativo agora" em vez de "o único perfil que existe".
export function loadProfile(): Profile | null {
  migrateLegacyProfileIfNeeded()
  const id = getActiveProfileId()
  if (!id) return null
  const raw = localStorage.getItem(profileKey(id))
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
  const id = getActiveProfileId()
  if (!id) return
  localStorage.setItem(profileKey(id), JSON.stringify(profile))
  // Mantém o roster em sincronia — nome/avatar podem mudar depois da criação (lojinha).
  const roster = loadRoster()
  const idx = roster.findIndex((r) => r.id === id)
  if (idx >= 0) {
    const next = [...roster]
    next[idx] = { id, name: profile.name, avatarEmoji: profile.avatarEmoji }
    saveRoster(next)
  }
}

export function loadProgress(): Progress {
  migrateLegacyProfileIfNeeded()
  const id = getActiveProfileId()
  if (!id) return emptyProgress
  const raw = localStorage.getItem(progressKey(id))
  if (!raw) return emptyProgress
  try {
    return { ...emptyProgress, ...(JSON.parse(raw) as Progress) }
  } catch {
    return emptyProgress
  }
}

export function saveProgress(progress: Progress): void {
  const id = getActiveProfileId()
  if (!id) return
  localStorage.setItem(progressKey(id), JSON.stringify(progress))
}

export function hasTutorialBeenSeen(): boolean {
  const id = getActiveProfileId()
  if (!id) return false
  return localStorage.getItem(tutorialSeenKey(id)) === 'true'
}

export function markTutorialSeen(): void {
  const id = getActiveProfileId()
  if (!id) return
  localStorage.setItem(tutorialSeenKey(id), 'true')
}

// lab-91 (pedido do usuário: itens que ajudem o responsável a acompanhar o que a criança está
// fazendo no jogo) — só um carimbo de "quando foi a última vez que o jogo abriu com um perfil já
// criado", pra alimentar o painel de progresso do `/familia`. Não é telemetria de sessão nem
// rastreamento de tempo jogado — um valor só, sobrescrito a cada abertura.
export function touchLastPlayed(): void {
  const id = getActiveProfileId()
  if (!id) return
  localStorage.setItem(lastPlayedKey(id), new Date().toISOString())
}

export function loadLastPlayedAt(): string | null {
  const id = getActiveProfileId()
  if (!id) return null
  return localStorage.getItem(lastPlayedKey(id))
}

// lab-99, resto de G11 (prompt.md §12: D1/D7 retention, tempo médio por sessão, quests
// concluídas por usuário) — PRIMEIRA vez que algo sai deste aparelho pra alimentar uma métrica
// agregada (tudo antes disso, incluindo `touchLastPlayed` acima, fica só local). ID 100% anônimo
// (`crypto.randomUUID()`), sem NENHUM vínculo com nome/apelido/e-mail/família — o `[MUST]` de
// `docs/prompts/01-seguranca.md` sobre "identificador técnico, não dado pessoal" permite
// exatamente isto. Gerado uma única vez por aparelho/navegador, reaproveitado pra sempre depois —
// deliberadamente POR APARELHO, não por perfil de criança (lab-108): vários perfis no mesmo
// tablet compartilham o mesmo id anônimo, o suficiente pro que as métricas agregadas medem hoje.
export function getOrCreateDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_ID_KEY)
  if (existing) return existing
  const created = crypto.randomUUID()
  localStorage.setItem(DEVICE_ID_KEY, created)
  return created
}
