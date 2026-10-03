// Telemetria de produto (lab-99, resto de G11 — prompt.md §12: D1/D7 retention, tempo médio por
// sessão, quests concluídas por usuário). Mesmo padrão de `errorReporting.ts` (lab-84): reporta
// pro próprio Worker de contas, não um serviço de terceiro; `fetch` com `keepalive: true`; falha
// silenciosamente, nunca interrompe o jogo pra criança. Diferença central de privacidade: todo
// evento carrega só `getOrCreateDeviceId()` (`storage.ts`) — um `crypto.randomUUID()` sem NENHUM
// vínculo com nome/apelido/e-mail/família, nunca o perfil/progresso da criança.
import { getOrCreateDeviceId } from './state/storage'

const ACCOUNTS_API_URL = import.meta.env.VITE_ACCOUNTS_API_URL as string

// `occurredAt` opcional (achado do review automático do Copilot) — por padrão usa "agora", mas um
// chamador que já capturou um `nowIso` pra outra decisão relacionada (ex.: qual semana ISO um
// bônus pertence) pode passar o MESMO instante aqui, evitando o evento registrado divergir da
// decisão que ele está anunciando bem na virada exata de um limite de tempo.
function trackEvent(type: string, meta?: Record<string, unknown>, occurredAt: string = new Date().toISOString()): void {
  fetch(`${ACCOUNTS_API_URL}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceId: getOrCreateDeviceId(),
      type,
      occurredAt,
      meta,
    }),
    // Mesmo motivo do `errorReporting.ts`: `session_end` dispara no `pagehide`, bem no momento em
    // que a aba pode estar fechando — sem `keepalive`, o navegador cancelaria a requisição no meio.
    keepalive: true,
  }).catch(() => {
    // Sem telemetria de telemetria — se o próprio evento falhar em enviar, só descarta.
  })
}

// Chamado uma vez, no topo de `main.tsx` — dispara `session_start` já no carregamento e registra
// `session_end` (com a duração da sessão) pra quando a aba fechar/for pra segundo plano.
// `pagehide` em vez de `beforeunload`: mais confiável em mobile/PWA (Safari/Chrome no Android não
// garantem `beforeunload` de forma consistente quando o app vai pra segundo plano, que é o caso
// comum de "fechar" um PWA — trocar de app ou apagar da lista de recentes, não uma navegação de
// verdade).
export function installProductAnalytics(): void {
  const sessionStartedAt = performance.now()
  sessionStartedAtMs = sessionStartedAt
  trackEvent('session_start')
  window.addEventListener('pagehide', () => {
    trackEvent('session_end', { durationMs: Math.round(performance.now() - sessionStartedAt) })
  })
}

// Exportado à parte (não só usado internamente) pra `useProgress.ts` disparar `quest_completed`
// sem precisar reimplementar o `fetch`/`keepalive`/tratamento de erro acima.
export function trackQuestCompleted(questId: string): void {
  trackEvent('quest_completed', { questId })
}

// lab-161 (home inicial dupla criança/responsável, docs/business-analyst-prompt-backlog.md §4
// P0 item 1): os dois cliques que decidem se a primeira impressão convenceu cada público —
// "Jogar" (criança) e "Área dos responsáveis" (adulto). Sem isso, não dá pra medir se a proposta
// dupla da `TitleScreen` está funcionando, só especular.
export function trackPlayClick(): void {
  trackEvent('play_click')
}

export function trackParentAreaClick(): void {
  trackEvent('parent_area_click')
}

// lab-164 (docs/market-metrics-engagement-backlog.md §4, "Métricas de apoio") — instrumentação
// fina da jornada de ativação de 10 minutos. Cada evento dispara no máximo uma vez POR SESSÃO
// (flag em memória, não `localStorage`): mede fricção/desempenho de carregamento a cada sessão,
// não só a ativação de um perfil novo — um jogador veterano reabrindo o jogo também gera esses
// eventos de novo, o que é o comportamento certo (senão nunca saberíamos se o carregamento
// piorou pra quem já joga há meses).
let sessionStartedAtMs: number | null = null
let firstControlSent = false
let firstLearningChallengeSent = false
let firstRewardSent = false
let firstMinigameSent = false

// Perfis novos completam o ciclo "jogar + aprender + recompensa" dentro desta janela ou não
// contam como ativados (docs/market-metrics-engagement-backlog.md §4, North Star).
const ACTIVATION_WINDOW_MS = 10 * 60 * 1000

function elapsedSinceSessionStartMs(): number | null {
  if (sessionStartedAtMs === null) return null
  return Math.round(performance.now() - sessionStartedAtMs)
}

// Chamado pelo movimento do avatar (teclado/joystick combinados, `world3d/World3D.tsx`) — sinal
// de "conseguiu controlar o personagem", citado literalmente na definição da métrica no documento.
export function trackFirstControl(): void {
  if (firstControlSent) return
  firstControlSent = true
  const durationMs = elapsedSinceSessionStartMs()
  if (durationMs !== null) trackEvent('time_to_first_control', { durationMs })
}

// Chamado quando a criança abre a PRIMEIRA missão da sessão (`App.tsx`, `handleSelectQuest`) —
// nunca em toda abertura de missão, senão a métrica deixaria de significar "primeira vez".
export function trackFirstLearningChallenge(): void {
  if (firstLearningChallengeSent) return
  firstLearningChallengeSent = true
  const durationMs = elapsedSinceSessionStartMs()
  if (durationMs !== null) trackEvent('time_to_first_learning_challenge', { durationMs })
}

// Chamado pela PRIMEIRA conclusão genuína de missão da sessão (`state/useProgress.ts`,
// `completeQuest`, mesmo guard de `wasAlreadyCompleted` que já protege `trackQuestCompleted`
// contra reprise inflar a métrica). `isFirstQuestEver` vem de fora porque só quem chama sabe se
// `completedQuestIds` estava vazio ANTES desta conclusão — só nesse caso, e só dentro da janela
// de 10 minutos, o "ciclo de ativação" (jogar + aprender + recompensa) conta como fechado; um
// jogador veterano completando sua próxima missão do dia gera `time_to_first_reward` (útil pra
// medir desempenho da sessão) mas nunca `activation_cycle_completed`.
export function trackFirstReward(isFirstQuestEver: boolean): void {
  if (firstRewardSent) return
  firstRewardSent = true
  const durationMs = elapsedSinceSessionStartMs()
  if (durationMs === null) return
  trackEvent('time_to_first_reward', { durationMs })
  if (isFirstQuestEver && durationMs <= ACTIVATION_WINDOW_MS) {
    trackEvent('activation_cycle_completed', { durationMs })
  }
}

// Backlog "Lab 212 - Centro de jogos educativo com saguão e portais" cita `time_to_first_minigame`
// como métrica esperada — mesmo padrão de `trackFirstLearningChallenge` acima (uma vez por sessão,
// tempo desde o início dela). Chamada de dentro de `trackMinigameStarted` (não de cada chamador
// individual) pra cobrir TODO caminho que inicia um mini-jogo de verdade — hoje o hub (lab-196) e o
// portal "Lógica" do centro de jogos (backlog "Lab 212"), qualquer um novo no futuro ganha o sinal
// de graça.
export function trackFirstMinigame(): void {
  if (firstMinigameSent) return
  firstMinigameSent = true
  const durationMs = elapsedSinceSessionStartMs()
  if (durationMs !== null) trackEvent('time_to_first_minigame', { durationMs })
}

// lab-166 (docs/market-metrics-engagement-backlog.md §6, "Lab 165" no documento) — funil de
// conversão adulta, pendência já registrada em `docs/event-catalog.md` no lab-165. Diferente dos
// eventos de ativação acima, estes não têm limite de "uma vez por sessão" — cada visita à página
// familiar, cada início de cadastro e cada checkout iniciado é um evento próprio, mesmo padrão de
// `trackPlayClick`/`trackParentAreaClick` (lab-161).
export function trackFamilyLandingViewed(): void {
  trackEvent('family_landing_viewed')
}

export function trackParentSignupStarted(): void {
  trackEvent('parent_signup_started')
}

export function trackCheckoutStarted(): void {
  trackEvent('checkout_started')
}

// lab-173 (docs/market-metrics-engagement-backlog.md §10, item 8 da ordem sugerida, "Lab 173 -
// Preview de relatório semanal antes da assinatura"): diferente do exemplo estático que já ficava
// sempre visível (lab-166), o preview cheio agora fica recolhido atrás de um botão — só dispara
// quando o responsável de verdade clica pra abrir, medindo interesse real no benefício mais forte
// da assinatura antes de pedir cadastro. Sem limite de "uma vez", mesmo padrão de
// `trackFamilyLandingViewed`/`trackParentSignupStarted` (cada clique é seu próprio evento).
export function trackWeeklyReportPreviewViewed(): void {
  trackEvent('weekly_report_preview_viewed')
}

// lab-175 ("Lab 171 - Casa visitável somente leitura", docs/market-metrics-engagement-backlog.md)
// — aproxima (não mede de verdade — o evento sai uma vez por clique, mas
// `weeklyFunnel.houseVisited` agrega por `count(distinct device_id)`, perdendo revisita do mesmo
// aparelho e não distinguindo perfil que compartilha/troca de aparelho; detalhe completo em
// `docs/event-catalog.md`) a "visitas por criança" citada no documento. Dispara no clique de
// "Visitar casa" (`App.tsx`, `handleVisitHouse`), não só quando a cena 3D confirma a entrada —
// mesmo espírito de `trackWeeklyReportPreviewViewed`, o clique já é o sinal de intenção real.
export function trackHouseVisited(): void {
  trackEvent('house_visited')
}

// lab-185 (docs/growth-retention-monetization-backlog.md, "Lab 185"): câmera, lojinha e planetas
// não tinham nenhum evento próprio — os 3 abaixo fecham essa lacuna, mesmo padrão de
// `trackHouseVisited` (cada ocorrência é seu próprio evento, sem limite de "uma vez").

// Botão ⟲ do lab-178 — é literalmente a métrica que aquele lab já prometia medir ("menor uso
// repetido de recenter", ver seção "Lab 178" do backlog) e nunca instrumentou.
export function trackCameraRecenterUsed(): void {
  trackEvent('camera_recenter_used')
}

// Disparado ao equipar boné/óculos/cor/estilo de cabelo na lojinha (`useProfile.ts`) — sinal de
// engajamento com o loop de customização, independente de o item ser cosmético grátis ou pago.
export function trackCosmeticEquipped(slot: string): void {
  trackEvent('cosmetic_equipped', { slot })
}

// Disparado na chegada bem-sucedida a um planeta (`landRocket`, `World3D.tsx`) — base pra medir
// exploração antes do Lab 179 adicionar interações dentro de cada planeta.
export function trackPlanetTravelCompleted(toPlanetId: string): void {
  trackEvent('planet_travel_completed', { toPlanetId })
}

// lab-179 ("Planetas interativos v1") — UM evento genérico pra qualquer interação dentro de um
// planeta-destino, em vez de um evento por tipo (diferente do padrão do lab-185): a métrica
// esperada pelo backlog (`planet_interactions_per_session`) já é uma contagem AGREGADA por tipo,
// e um evento só com `kind` em `meta` deixa contar "quantos TIPOS distintos de interação uma
// criança já fez num planeta" com uma query simples (`count(distinct meta->>'kind')`) — que é
// literalmente o critério de aceite do backlog ("pelo menos 3 interações por planeta"). `kind` é
// um valor de um conjunto FIXO no código-fonte (nunca texto livre), validado no servidor
// (`isValidPlanetInteractionKind`, `domain.ts`) mesmo espírito de `slot`/`toPlanetId` do lab-185.
export function trackPlanetInteractionCompleted(planetId: string, kind: string): void {
  trackEvent('planet_interaction_completed', { planetId, kind })
}

// lab-180 ("Missões ambientais de aprendizagem") — nomes exatos citados pelo documento
// (`learning_challenge_started`/`learning_challenge_completed`). `kind` identifica qual dos 3
// landmarks novos (ponte/lógica, posto de abastecimento/matemática, placa/leitura) — allowlist
// fixa em `server-accounts/src/domain.ts`, mesmo espírito de `kind` do
// `trackPlanetInteractionCompleted` acima. Sem limite de "uma vez por sessão": cada tentativa é
// seu próprio par de eventos.
//
// Backlog "Lab 200 - Extensao de missoes fisicas por planeta" — 3 `kind` novos
// (`push_object`/`circuit_order`/`reading_collect`), mesmo pipeline/allowlist acima, disparados
// por mecânicas físicas num planeta secundário (Vênus) em vez de landmarks estáticos no planeta
// principal. Achado do review automático do Copilot: este comentário e o allowlist do servidor
// precisam ficar em sincronia — atualizado aqui junto da mudança do allowlist.
//
// Achado do review automático do Copilot (PR #59): SEM um id de tentativa no payload (só
// `kind`+`device_id`+timestamp), não dá pra calcular `retry_without_quit_rate` (métrica citada
// pelo documento) como uma taxa POR TENTATIVA de verdade — se o mesmo dispositivo abre o mesmo
// `kind` duas vezes antes de completar uma vez, não tem como saber com certeza qual `started`
// aquele `completed` fecha (pode atribuir a conclusão à tentativa ERRADA). Decisão: não adicionar
// um id de correlação ao contrato do evento só pra essa métrica — ela fica documentada como
// aproximação grosseira (proporção agregada de `started`/`completed` por dispositivo+`kind` numa
// janela de tempo, não uma taxa por tentativa individual confiável), mesmo espírito de outras
// métricas "aproximadas" já aceitas neste catálogo (`docs/event-catalog.md`).
export function trackLearningChallengeStarted(kind: string): void {
  trackEvent('learning_challenge_started', { kind })
}

export function trackLearningChallengeCompleted(kind: string): void {
  trackEvent('learning_challenge_completed', { kind })
}

// Backlog "Lab 209 - Hub de mini-jogos e teleport por botão no chão" — nomes exatos citados pelo
// documento. `minigameId` identifica qual pedestal do hub (`"parkour1"`, `"ponte-logica"`).
// No hub, `minigame_completed` dispara ao voltar pelo pedestal de retorno, não ao resolver o
// desafio internamente. Nas arenas da Central, dispara ao vencer a tentativa; os ids distinguem
// o desafio da ponte (`ponte-logica`) da arena de padrões (`logica`).
export function trackMinigameStarted(minigameId: string): void {
  trackEvent('minigame_started', { minigameId })
  trackFirstMinigame()
}

export function trackMinigameCompleted(minigameId: string): void {
  trackEvent('minigame_completed', { minigameId })
}

// Backlog "Lab 213 - Template de arena educativa reutilizável" cita `minigame_retried`/
// `minigame_exited` como eventos comuns esperados do template. `trackMinigameRetried` dispara
// quando a criança tenta de novo DEPOIS de terminar (sucesso ou falha) — nunca no meio de uma
// tentativa em andamento. `trackMinigameExited` dispara só quando ela sai com uma tentativa REALMENTE
// em andamento (não depois de já ter terminado) — mede abandono de verdade, não "saiu depois de já
// ter acabado o jogo".
export function trackMinigameRetried(minigameId: string): void {
  trackEvent('minigame_retried', { minigameId })
}

export function trackMinigameExited(minigameId: string): void {
  trackEvent('minigame_exited', { minigameId })
}

// Backlog "Lab 212 - Centro de jogos educativo com saguão e portais" — nomes exatos citados pelo
// documento. `game_center_entered`/`game_center_returned` não carregam `meta` (mesmo espírito de
// `camera_recenter_used`/`weekly_event_objective_completed`: evento novo, sem campo documentado,
// não herda a tolerância de `meta` livre dos eventos legados). `portalId` de
// `trackGamePortalSelected` dispara pra QUALQUER portal, bloqueado ou não — mede "a criança
// entendeu que aquele portal existe e o que ele é", não "conseguiu jogar" (só `Lógica` tem
// mini-jogo de verdade nesta fatia; os outros 3 ainda não existem, ver `FEATURES.md`).
export function trackGameCenterEntered(): void {
  trackEvent('game_center_entered')
}

export function trackGamePortalSelected(portalId: string): void {
  trackEvent('game_portal_selected', { portalId })
}

export function trackGameCenterReturned(): void {
  trackEvent('game_center_returned')
}

// Dispara ao EXPANDIR um planeta específico na lista do `AchievementsPanel.tsx` (sinal de
// interesse real num planeta, distinto de só abrir o painel inteiro). Sem limite de "uma vez por
// sessão": reabrir o mesmo planeta depois de fechar conta de novo.
export function trackAlbumPlanetOpened(planetId: string): void {
  trackEvent('album_planet_opened', { planetId })
}

// Dispara na PRIMEIRA vez que o objetivo educativo/ambiental do evento semanal é concluído em cada
// semana ISO — não a cada desafio ambiental completado, só quando o bônus é de fato concedido
// (`applyWeeklyEventObjectiveProgress`, `progression.ts`, idempotente por semana). `nowIso` é o
// MESMO instante usado pra decidir se o bônus foi concedido (`App.tsx`) — sem isso, o evento
// gravado podia ter um `occurredAt` de um instante ligeiramente diferente do usado pra decidir a
// semana, divergindo bem na virada exata de semana ISO.
export function trackWeeklyEventObjectiveCompleted(nowIso: string): void {
  trackEvent('weekly_event_objective_completed', undefined, nowIso)
}

// Backlog "Lab 217 - Progressao, album e recompensas do centro de jogos" — nomes exatos citados
// pelo documento (`minigame_trophy_earned`, e `weekly_meaningful_play_learning_sessions` como
// métrica derivada de `game_center_weekly_quest_completed`, ver `weeklyFunnel` no Worker).
// `category`/`tier` são conjuntos FIXOS (`isValidGameCenterPortalId` já existente reaproveitado
// pra `category`; `tier` validado à parte, `domain.ts`). Dispara só na conclusão EXATA que cruza
// um limiar NOVO (`applyGameCenterMinigameCompleted`, `progression.ts`), nunca em toda vitória
// acima do limiar já alcançado — evita inflar a métrica com repetição.
export function trackMinigameTrophyEarned(category: string, tier: string): void {
  trackEvent('minigame_trophy_earned', { category, tier })
}

// Missão semanal "jogue 1 mini-jogo educativo" (Lab 217) — MESMO padrão de
// `trackWeeklyEventObjectiveCompleted` acima (evento SEPARADO, objetivo semanal diferente, mesmo
// motivo de usar o `nowIso` que decidiu a concessão em vez de ler o relógio de novo aqui).
export function trackGameCenterWeeklyQuestCompleted(nowIso: string): void {
  trackEvent('game_center_weekly_quest_completed', undefined, nowIso)
}

// Dispara quando o responsável VÊ o resumo de habilidade praticada no centro de jogos
// (`ChildProgressPanel`, `FamilyPortal.tsx`) — mesmo padrão/trigger de `trackWeeklyReportPreviewViewed`
// (na transição de estado/montagem, não no clique, mesmo raciocínio anti-contagem-dupla).
export function trackGameCenterProgressViewed(): void {
  trackEvent('game_center_progress_viewed')
}

// Backlog "Lab 210 - Parkour arcade com argolas, tesouros e power-ups justos" — cobre as métricas
// citadas pelo documento ("conclusões de parkour", "troféus conquistados") sem mudar a semântica já
// existente de `minigame_completed('parkour1')` (que continua contando ao tocar o pedestal de
// retorno, não isto). Dispara toda vez que o jogador alcança o topo do percurso, mesmo sem todas as
// argolas — `ringsCollected`/`totalRings` deixam a análise distinguir "chegou" de "dominou" sem
// precisar de um segundo evento.
export function trackParkourCourseCompleted(
  ringsCollected: number,
  totalRings: number,
  elapsedSeconds: number,
  trophyEarned: boolean,
): void {
  trackEvent('parkour_course_completed', { ringsCollected, totalRings, elapsedSeconds, trophyEarned })
}

// Cobre "tentativas por sessão"/"retry sem abandono" (Lab 210) — dispara a cada queda que aciona o
// teleporte de volta pro checkpoint, nunca pra volta ao hub (isso já é `minigame_completed`/saída
// deliberada, não uma "tentativa" no sentido de retry dentro do próprio percurso).
export function trackParkourCheckpointRespawn(checkpointIndex: number): void {
  trackEvent('parkour_checkpoint_respawn', { checkpointIndex })
}
