# Laboratório 20 — Ranking local (mesma rede)

Status: em andamento
Início: 2026-08-17
Commit inicial: 5493c9aadcb40b3277518d8443b88777a5fa32af

## Objetivo do laboratório
`prompt.md` §6 (Backlog Inicial Priorizado) lista como P1: "ranking por turma/amigos". O P0
restante ("progresso local/conta") exige uma decisão de infraestrutura do usuário e não pode ser
iniciado sozinho (ver `labs/lab-18-polimento-fisica-visual/CONTEXT.md` e
`labs/lab-19-colisao-npc-neblina/CONTEXT.md`); "mais conteúdo" já foi o laboratório anterior duas
vezes (lab-17, escolhido de novo como opção no lab-16). Ranking é o próximo item do backlog P1 que
não depende de nenhuma decisão externa: o multiplayer local (lab-06) já conecta os jogadores da
mesma rede via `app/server/relay.cjs` e já transmite `state` (posição/direção) em tempo real —
falta só incluir XP/moedas nesse `state` já existente e mostrar isso como uma lista ordenada.

## Funcionalidades planejadas
- [ ] Estender `RemoteState` (`src/world3d/multiplayer.ts`) e `sendState()` pra incluir `xp` e
      `coins` do jogador (o `relay.cjs` já repassa qualquer campo do `state` sem mudança —
      confirmado lendo `broadcast(id, { ...msg, id })`).
- [ ] Guardar `xp`/`coins` mais recentes de cada jogador remoto (`RemotePlayer`, `World3D.tsx`).
- [ ] Painel de ranking (`RankingPanel.tsx`, React, mesmo padrão de `ChatPanel.tsx`/
      `AvatarShop.tsx`) — lista jogadores conectados (+ o próprio jogador) ordenados por nível
      (`getLevel(xp)`, `src/state/progression.ts`, reaproveitado — nível é função determinística
      de xp, não precisa viajar pela rede separado) e por moedas como desempate.
- [ ] Botão de ícone novo no `HudHeader` (🏆) pra abrir o painel, mesmo padrão dos botões
      existentes (chat, loja, missões).
- [ ] Verificação: `npm run build` passa; testar com dois clientes na mesma rede (dois navegadores
      abertos no dev server) — o ranking de um mostra o XP/moedas do outro em tempo real.

## Fora de escopo (explicitamente adiado)
- Ranking "por turma" de verdade (agrupamento por sala de aula) — exigiria conta/perfil de
  professor, que é o item de backend ainda bloqueado por decisão de infraestrutura.
- Persistir/histórico de ranking entre sessões — o ranking é só de quem está conectado agora,
  igual ao resto do multiplayer local (sem conta, sem nuvem).
