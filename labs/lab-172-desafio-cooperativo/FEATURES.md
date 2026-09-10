# Laboratório 172 — desafio cooperativo fechado

Status: concluído
Início: 2026-09-10
Fim: 2026-09-10
Commit inicial: d0df086e446bc88635973468c29b2c8927bacc75

## Objetivo do laboratório

`docs/market-metrics-engagement-backlog.md` §10 (ordem sugerida dos próximos labs), item 7: "Lab
170 - Desafios cooperativos fechados" no documento — renumerado pra lab-172, já que os labs
170/171 reais deste repositório foram usados pra casa interativa e álbum de conquistas. Escopo do
documento: "desafio em dupla ou grupo pequeno com objetivos educativos complementares, chat
fechado e recompensa coletiva grátis"; critério de aceite: "crianças conseguem completar um
objetivo cooperativo SEM comunicação livre; progresso educacional não depende de assinatura."

## Decisão confirmada com o usuário antes de codar

Perguntado via `AskUserQuestion`: quem pode formar dupla? Confirmado — **qualquer jogador
multiplayer por perto** (reaproveita o limite de confiança já estabelecido no portão parental do
multiplayer, lab-152; quem já autorizou multiplayer já aceita a criança interagir com qualquer
outro jogador conectado pelo sistema fechado), NÃO restrito a amigos confirmados (isso exigiria
vincular a identidade persistente de amizade, `server-accounts`, ao id efêmero de conexão do
relé multiplayer — vínculo que não existe hoje, escopo bem maior).

## Funcionalidades planejadas

- [x] Mecânica: cada participante responde sua PRÓPRIA missão (sorteada do pool normal de
      `data/quests.ts`, sem catálogo novo) de forma independente — nunca precisam trocar um valor
      calculado entre si (satisfaz "sem comunicação livre" literalmente, não só "sem texto
      livre"); a cooperação é ter feito juntos, no mesmo lugar, ao mesmo tempo.
- [x] Landmark novo no planeta principal (`desafio-em-dupla`, dois pedestais + bandeirola) — dica
      "Pressione E" só aparece com outro jogador de verdade por perto.
- [x] Handshake pelo relé multiplayer (`server-cf-relay`): novo tipo de mensagem `coop-done`
      (partnerId apontado por quem respondeu certo); cada cliente decide sozinho se o par se
      formou (os dois se apontaram mutuamente, dentro de uma janela de 90s) — servidor só valida
      forma e repassa, nunca decide nada de jogo.
- [x] Recompensa coletiva grátis: 10 moedas + emblema "Dupla Dinâmica" (primeira vez), uma vez por
      dia real por perfil (mesmo anti-farm de `feedPet`/login diário); nunca trava progresso
      educacional (a pergunta em si é uma missão normal, responder certo não depende de nada
      pago).
- [x] Testes de domínio nos dois pacotes (`progression.ts`: `applyCoopChallengeCompleted`, e um
      achado de bug real corrigido de passagem — `applyQuestCompletion` substituía `badges`
      inteiro em vez de unir, o que apagaria "Dupla Dinâmica" na missão seguinte).

## Fora de escopo (explicitamente adiado)

- Restringir a dupla a amigos confirmados — decisão do usuário, ver acima.
- Grupos de 3+ jogadores — o documento cita "dupla OU grupo pequeno"; dupla já cobre o critério de
  aceite, grupo maior multiplicaria a complexidade do handshake sem pedido explícito.
- Qualquer UI de "convidar" — a formação da dupla é 100% por proximidade física no jogo, sem
  convite/notificação (mais simples, sem superfície social nova).
