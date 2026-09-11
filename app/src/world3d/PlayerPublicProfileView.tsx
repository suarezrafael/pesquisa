// Perfil público de um amigo (lab-163, último item do Grupo B do backlog social,
// labs/lab-158-.../FEATURES.md): avatar equipado + conquistas — nunca XP, moeda, ou qualquer
// outro dado de progresso/família (regra decidida no lab-158). Renderizado DENTRO do mesmo
// `modal-overlay` do `FriendsPanel.tsx` (não um segundo diálogo empilhado) — dois `useModalA11y`
// simultâneos registrariam dois listeners de Esc na `window`, e apertar Esc uma vez fecharia os
// dois painéis juntos (o listener mais antigo, do painel de baixo, já teria disparado antes de o
// de cima poder impedir). Mesmo espírito de `AchievementsPanel.tsx` mostrando duas coleções num
// painel só. `AvatarPreview3D` carregado preguiçoso (mesmo motivo de `AvatarShop.tsx`:
// `@babylonjs/core` é pesado, e o painel de Amigos abre bem mais vezes do que alguém abre um
// perfil dentro dele).
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { ACHIEVEMENT_CATALOG } from '../data/achievements'
import { usePlayerPublicProfile, type PlayerPublicProfile } from '../state/usePlayerPublicProfile'

const AvatarPreview3D = lazy(() => import('./AvatarPreview3D').then((m) => ({ default: m.AvatarPreview3D })))

const ACCOUNTS_API_URL = import.meta.env.VITE_ACCOUNTS_API_URL as string

interface PlayerPublicProfileViewProps {
  playerId: string
  nickname: string
  onBack: () => void
  // lab-175 ("Lab 171 - Casa visitável somente leitura") — chamado com o snapshot de mobília já
  // carregado (nunca `null`, o botão só aparece quando `profile.house` existe); quem chama fecha
  // o painel de Amigos e entra na casa 3D com esses dados.
  onVisitHouse: (nickname: string, house: { furnitureIds: string[]; placements: Record<string, { x: number; z: number; rotY: number }> }) => void
}

export function PlayerPublicProfileView({ playerId, nickname, onBack, onVisitHouse }: PlayerPublicProfileViewProps) {
  const { profile, loading, error } = usePlayerPublicProfile(playerId)
  // lab-175 (achado do review automático do Copilot no PR #49, segunda rodada): `profile.house`
  // fica preso no instante em que este painel abriu — se o dono desligar a visibilidade ENQUANTO
  // o visitante está com este perfil aberto, o botão continuava usando o snapshot velho e ainda
  // deixava entrar. Revalida buscando o perfil DE NOVO no clique, em vez de confiar no cache.
  const [revalidating, setRevalidating] = useState(false)
  const [visitError, setVisitError] = useState<string | null>(null)
  // lab-175 (achado do review automático do Copilot no PR #49, terceira rodada): sem isto,
  // clicar "Visitar casa" e depois "← Voltar"/fechar o painel ANTES da resposta chegar ainda
  // disparava `onVisitHouse` (teleportando o jogador pra dentro de casa) mesmo com a tela já
  // abandonada — mesmo padrão `cancelled` já usado em `usePlayerPublicProfile.ts`.
  //
  // Achado do Copilot na 4ª rodada: `useRef(true)` só roda uma vez, no primeiro render — em
  // `<StrictMode>` (`main.tsx`), o React monta, desmonta (roda esta limpeza, `current = false`) e
  // remonta de propósito em dev; sem reafirmar `current = true` na PRÓPRIA montagem do efeito, o
  // ref ficava travado em `false` pra sempre depois desse ciclo, quebrando `handleVisitClick` em
  // dev mesmo com o componente genuinamente montado.
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  async function handleVisitClick() {
    setVisitError(null)
    setRevalidating(true)
    try {
      const res = await fetch(`${ACCOUNTS_API_URL}/players/${encodeURIComponent(playerId)}/public-profile`)
      const body = (await res.json().catch(() => null)) as (PlayerPublicProfile & { error?: string }) | null
      if (!mountedRef.current) return
      // lab-175 (achado do review automático do Copilot no PR #49, terceira rodada): uma
      // resposta HTTP com erro (rate limit, falha temporária do servidor) não é o MESMO caso de
      // "o dono desligou a visibilidade" (`res.ok` com `house: null`) — misturar os dois mostrava
      // "casa não visitável" pra uma falha só temporária, quando "tente de novo" seria mais certo.
      if (!res.ok) {
        setVisitError(body?.error ?? 'Não foi possível confirmar a visita agora — tente de novo.')
      } else if (body?.house) {
        onVisitHouse(body.nickname, body.house)
      } else {
        setVisitError('🏠 A casa não está mais visitável agora.')
      }
    } catch {
      if (mountedRef.current) setVisitError('Não foi possível confirmar a visita agora — tente de novo.')
    } finally {
      if (mountedRef.current) setRevalidating(false)
    }
  }

  return (
    <>
      <button type="button" className="chat-category-btn" onClick={onBack}>
        ← Voltar
      </button>
      {/* Achado do review do Copilot (PR #37): `nickname` (prop, do `friend-summary` já carregado
          antes de abrir esta view) pode estar desatualizado se o amigo mudou de apelido depois —
          `profile.nickname`, assim que carrega, é a fonte mais recente. */}
      <h2>{profile?.nickname ?? nickname}</h2>

      {loading && <p>Carregando…</p>}
      {error && <p className="field-hint">{error}</p>}

      {profile && (
        <>
          <div className="avatar-preview-3d-wrap">
            <Suspense fallback={<div className="avatar-preview-3d-canvas avatar-preview-3d-loading" />}>
              <AvatarPreview3D
                avatarEmoji={profile.avatarEmoji}
                hatId={profile.equippedLook?.equippedHatId ?? null}
                shirtColorId={profile.equippedLook?.equippedShirtColorId ?? null}
                pantsColorId={profile.equippedLook?.equippedPantsColorId ?? null}
                shoeColorId={profile.equippedLook?.equippedShoeColorId ?? null}
                backpackColorId={profile.equippedLook?.equippedBackpackColorId ?? null}
                hairShapeId={profile.equippedLook?.equippedHairShapeId ?? null}
                glassesId={profile.equippedLook?.equippedGlassesId ?? null}
              />
            </Suspense>
          </div>

          {/* lab-175 ("Lab 171 - Casa visitável somente leitura") — só aparece quando o dono
              manteve a visibilidade ligada e já sincronizou mobília; senão, mensagem neutra (nunca
              "amigo desativou", que soaria como rejeição pessoal). */}
          {profile.house ? (
            <button type="button" className="secondary-button" onClick={handleVisitClick} disabled={revalidating}>
              {revalidating ? 'Verificando…' : '🏠 Visitar casa'}
            </button>
          ) : (
            <p className="field-hint">🏠 Casa não visitável agora.</p>
          )}
          {visitError && <p className="field-hint">{visitError}</p>}

          <h3>Conquistas</h3>
          <div className="quest-list">
            {ACHIEVEMENT_CATALOG.map((achievement) => {
              const earned = profile.badges.includes(achievement.id)
              return (
                <div key={achievement.id} className={`quest-list-item ${earned ? 'completed' : 'locked'}`}>
                  <span className="quest-list-index" aria-hidden="true">
                    {achievement.emoji}
                  </span>
                  <div className="quest-list-info">
                    <span className="quest-list-title">{achievement.name}</span>
                  </div>
                  <span className="quest-list-status">{earned ? '✓' : '🔒'}</span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
