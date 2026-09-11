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
import { lazy, Suspense } from 'react'
import { ACHIEVEMENT_CATALOG } from '../data/achievements'
import { usePlayerPublicProfile } from '../state/usePlayerPublicProfile'

const AvatarPreview3D = lazy(() => import('./AvatarPreview3D').then((m) => ({ default: m.AvatarPreview3D })))

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
            <button
              type="button"
              className="secondary-button"
              onClick={() => onVisitHouse(profile.nickname, profile.house!)}
            >
              🏠 Visitar casa
            </button>
          ) : (
            <p className="field-hint">🏠 Casa não visitável agora.</p>
          )}

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
