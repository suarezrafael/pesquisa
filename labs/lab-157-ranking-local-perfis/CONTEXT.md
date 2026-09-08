# Contexto — Laboratório 157 — Ranking local entre perfis do aparelho

Preenchido em: 2026-09-08
Commit inicial → final: 643d123c352ac419800d6bd5659b582e8a18d49f..HEAD

## O que foi feito

Último item do Grupo A do backlog social (lab-154) — fecha o backlog planejado nesse laboratório.

- **`app/src/data/weeklyEvents.ts`**: `isoWeekKey(date)` nova, exportada — reaproveita a MESMA
  lógica de ajuste ISO 8601 (quinta-feira da semana) já usada por `isoWeekNumber` (interna, gira o
  evento semanal), mas devolve uma chave estável combinando ano-da-semana + número (`"2026-W37"`)
  em vez de só o número (que sozinho repete todo ano).
- **`app/src/types.ts`/`state/storage.ts`**: `Progress` ganhou `weeklyXpWeekKey`/
  `weeklyXpSnapshot` — "XP ganho nesta semana" é DERIVADO (`xp` atual menos o valor que `xp` tinha
  no início da semana), não guardado direto. `storage.ts` ganhou `loadProgressForProfileId(id)`
  (lê o `Progress` de QUALQUER perfil do roster, não só o ativo — necessário pra comparar todos os
  perfis de uma vez sem trocar de perfil ativo) e `getActiveProfileId` virou exportada (era só
  interna).
- **`app/src/state/progression.ts`**: `syncWeeklyXpSnapshot(progress, nowIso)` (reseta o snapshot
  quando a chave da semana muda — idempotente, chamado uma vez por sessão) e `weeklyXpEarned(
  progress, nowIso)` (leitura pura, nunca muta — usada pra montar o ranking). 6 testes novos.
- **`app/src/state/useProgress.ts`/`App.tsx`**: `syncWeeklyXp(nowIso)` novo, chamado no MESMO
  efeito que já roda `touchLastPlayed`/`claimDailyLogin` uma vez por sessão — mesma leitura de
  relógio reaproveitada, sem `new Date()` extra.
- **`app/src/world3d/RankingPanel.tsx`**: duas abas — "🌐 Online agora" (comportamento original do
  lab-20, intocado) e "📱 Neste aparelho" (nova, só aparece com 2+ perfis no roster). A aba local
  lê `listProfiles()` + `loadProgressForProfileId` pra cada perfil que NÃO é o ativo, e usa a prop
  `progress` (React, mais fresca) pro perfil ativo — ordenada por `weeklyXpEarned` decrescente.

## Decisões técnicas tomadas

- **XP semanal DERIVADO, não um contador incrementado a cada ganho**: guardar só um snapshot (o
  `xp` no início da semana) é mais simples e à prova de esquecimento — não existe nenhum lugar do
  código que precisa "lembrar de incrementar o XP semanal" toda vez que XP é concedido (dezenas de
  lugares diferentes: missões, escolinhas de planeta, quiz surpresa...); a diferença é sempre
  calculada sob demanda a partir da MESMA fonte de verdade (`xp` total) que já é atualizada em
  todos esses lugares.
- **Duas abas no MESMO painel, não um ícone novo no HUD**: o HUD já tem 9 ícones (chegou a esse
  número entre os labs 151-156); ranking online e ranking local são a mesma "categoria" de
  informação (comparar com outros jogadores), então abas dentro do painel existente fazem mais
  sentido que inflar ainda mais a barra de ícones.
- **Aba local só aparece com 2+ perfis**: ranking de uma pessoa só (o caso comum, quase todo
  jogador) não diz nada — mesmo raciocínio de `ProfilePicker` só aparecer com múltiplos perfis
  (lab-108).
- **Perfil ativo usa a prop `progress` (memória), não `loadProgressForProfileId`**: evita uma
  leitura redundante do `localStorage` pro MESMO dado que o React já tem em mãos, mais fresco (o
  `localStorage` só é atualizado depois de `saveProgress`, que roda de forma síncrona na maioria
  dos casos mas não há garantia formal disso em TODOS os caminhos).

## Achados reais do review automático do Copilot (PR #28)

- **`loadProgressForProfileId` sem `migrateLegacyProfileIfNeeded()`**: diferente de `loadProgress`/
  `listProfiles`, a função nova não migrava perfil legado — não quebrava HOJE (`RankingPanel`
  sempre chama `listProfiles()` antes, que já migra), mas era uma inconsistência de API real: a
  função é exportada e um uso futuro sem essa chamada antes deixaria de migrar. Corrigido chamando
  `migrateLegacyProfileIfNeeded()` também aqui, igual às funções irmãs.
- **`localEntries` calculado em todo render, mesmo na aba "Online agora"**: leituras de
  `localStorage` + ordenação rodando à toa sempre que houvesse 2+ perfis, independente de qual aba
  estava aberta. Corrigido só montando a lista quando `tab === 'local'`.

## Pendências / dívidas conhecidas

Nenhuma nova. Com este laboratório, o Grupo A do backlog social (lab-154) está completo: pets
(lab-155), séries (lab-156), ranking local (lab-157). Resta só o Grupo B (amigos, busca por nick,
status online, convites), bloqueado nas 3 perguntas de arquitetura/segurança já registradas em
`labs/lab-154-.../FEATURES.md`.

## Funcionalidades planejadas que NÃO foram concluídas

Todas as funcionalidades planejadas em `FEATURES.md` foram concluídas.

## O que o próximo laboratório deve desenvolver

Sem prioridade única — o Grupo A do backlog social está completo. Restam: Grupo B do backlog
social (precisa da decisão do usuário sobre identidade de jogador buscável), G15 (DNS/rotação de
chave), verificar domínio no Resend (opcional), e confirmar com o usuário o bug de morros
(lab-151) e a recomendação de preço da pesquisa de mercado (R$9,90-14,90/mês).

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`.
- `npx tsc -b` (app): sem erros. `npm run test` (app): 131/131 (6 novos).
- Verificado ao vivo (dev server local + navegador, Chrome desktop): perfil de teste criado direto
  no `localStorage` (irmão fictício, `test-sibling-1`) com XP semanal (250) maior que o do perfil
  ativo (30, apesar de XP TOTAL maior) — aba "Neste aparelho" mostrou a ordenação correta por XP
  da semana, não por XP total, com "(você)" marcado certo no perfil ativo. Removido do
  `localStorage` depois de confirmar (dado só de teste). Sem erro de console.
- Como verificar de novo: `cd app && npm run dev`, criar um segundo perfil de verdade (tela de
  troca de perfil), ganhar XP nos dois, abrir o Ranking (🏆) → aba "📱 Neste aparelho".
