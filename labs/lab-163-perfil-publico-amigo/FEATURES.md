# Laboratório 163 — perfil público de amigo (avatar + conquistas)

Status: concluído
Início: 2026-09-09
Fim: 2026-09-09
Commit inicial: 9670e3c92873dbb8b017e6a8b5faf84522adc13b

## Objetivo do laboratório

Fecha o Grupo B do backlog social (lab-158) com o último item do plano: `GET /players/:id/
public-profile` (referência: `labs/lab-158-amigos-plano-arquitetura/FEATURES.md`, endpoint já
especificado ali) + tela no `FriendsPanel` pra ver avatar equipado + conquistas de um amigo — NUNCA
XP, moeda, ou qualquer outro dado de progresso/família (regra definida no lab-158, sem mudança).

## Achado ao planejar (decisão técnica desta sessão)

O plano do lab-158 especifica o endpoint mas não como o servidor passa a conhecer o "avatar
equipado" (cor de roupa/cabelo/chapéu/óculos) e as conquistas de um jogador — hoje
`player_identities` só guarda `nickname`+`avatar_emoji` (a criatura-base) e `last_seen_at`; o resto
(`Profile.equipped*`, `Progress.badges`) vive só no `localStorage` do aparelho, nunca sincronizado
pro backend (mesmo é verdade pra qualquer assinante ou não — `server-accounts` nunca guarda
progresso de jogo, só a camada comercial, `docs/plano-comercial-backend.md`).

Decisão: piggyback no heartbeat já existente (`useHeartbeat.ts`, roda a cada 60s durante toda a
sessão) — o corpo do `POST /players/heartbeat` ganha campos opcionais (`equippedLook`, `badges`),
o servidor faz upsert em colunas novas de `player_identities` (`equipped_look` jsonb, `badges`
text[]) sempre que vierem presentes. Sem endpoint novo de sincronização, sem intervalo novo. Não é
dado sensível (mesma classe de nickname+emoji já sincronizados desde o lab-159) — não muda a
superfície de risco do lab-158, só estende o que já era sincronizado.

## Funcionalidades planejadas

- [x] Migração `0007_player_public_profile.sql` (`server-accounts`): `player_identities` ganha
      `equipped_look` e `badges`, ambos jsonb (não `text[]` como o FEATURES.md original cogitava —
      ver "Decisão tomada durante a implementação" abaixo).
- [x] `POST /players/heartbeat` aceita `equippedLook`/`badges` opcionais no corpo e faz upsert
      dessas colunas quando presentes (sem quebrar quem ainda manda só `{playerId}`).
- [x] `useHeartbeat.ts` passa a montar e enviar o snapshot (equipped* do `Profile` ativo +
      `Progress.badges`) a cada tick — reaproveita os mesmos dados já lidos por `AchievementsPanel`/
      lojinha, sem storage novo.
- [x] `GET /players/:id/public-profile` (`server-accounts`) — devolve
      `{nickname, avatarEmoji, equippedLook, badges}` de um `player_identities` só; 404 se não
      existe. Sem entitlement/autenticação (mesma regra de `/players/search`).
- [x] `FriendsPanel.tsx` (aba "Amigos") — clicar num amigo aceito abre uma visão de perfil (nova,
      reaproveita `AvatarPreview3D.tsx` — já renderiza o boneco 3D customizado na lojinha — pra
      mostrar o boneco do amigo, mais os emblemas de `ACHIEVEMENT_CATALOG` que aparecem em
      `badges`).
- [x] Regra de segurança confirmada pelo código, não só descrição: o handler novo NUNCA seleciona
      `xp`/`coins`/`device_id`/família — só as colunas de aparência+conquista.

## Decisão tomada durante a implementação

`badges` virou jsonb, não `text[]` como o plano original cogitava — nenhum outro endpoint deste
Worker já passava um array Postgres como parâmetro pro driver `@neondatabase/serverless`, e o
resto do Worker já usa jsonb pra listas/objetos vindos do client (`progress_backups`,
`product_events.metadata`); mais consistente e sem risco de serialização não testada.

Achado ao implementar a UI: `FriendsPanel.tsx` já renderiza usando `useModalA11y` (Esc fecha +
foco). Um segundo modal empilhado (perfil do amigo) teria SEU PRÓPRIO `useModalA11y`, registrando
um segundo listener de Esc na `window` — apertar Esc uma vez chamaria os dois `onClose` (o do
painel de baixo já registrado antes, sem como o de cima impedir), fechando os dois painéis juntos
num só toque. Corrigido projetando o perfil como uma VISÃO dentro do mesmo painel (mesmo espírito
de `AchievementsPanel.tsx` mostrando duas coleções sem empilhar diálogo), não um modal novo — ver
`PlayerPublicProfileView.tsx`.

## Fora de escopo (explicitamente adiado)

- Sincronizar perfil de quem nunca abriu o painel de Amigos (sem `playerId` registrado, heartbeat
  nem roda) — mesma limitação de sempre, ninguém é forçado a ter identidade de jogador.
- Backfill de `equipped_look`/`badges` pra jogadores já registrados antes deste lab — populam
  sozinhos no primeiro heartbeat seguinte ao deploy; ficam `null`/`{}` até lá (perfil público
  mostra "sem dados ainda" nesse caso).
- Qualquer ação a partir do perfil público (adicionar amigo, denunciar, bloquear) — só visualização,
  mesmo escopo que o lab-158 definiu pra este item.
