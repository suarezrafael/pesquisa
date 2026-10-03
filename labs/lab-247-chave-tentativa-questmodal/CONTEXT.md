# Contexto — Laboratório 247 — Chave de tentativa nos QuestModal restantes

Preenchido em: 2026-10-03
Commit inicial → final: a698712abbbe4472ca00fb9b1179a920f8cce2cc..a5baf07

## O que foi feito

- `App.tsx`: os 4 usos restantes de `QuestModal` (`activeQuest`,
  `activeSurpriseQuiz`, `activePlanetQuest`, `activeCoopQuest`) agora têm
  `key={quest.id}`, mesma técnica do `key={attemptId}` aplicada ao desafio
  ambiental no lab-246 (achado de severidade alta do Copilot na PR #135).
  Nenhum desses 4 tem um `attemptId` próprio, então `quest.id` é a identidade
  de tentativa disponível — estável e única por missão no pool de
  `data/quests.ts`.
- `QuestModal.test.tsx`: `QuestIdKeyHarness` + 1 teste novo reproduzindo o
  formato real desses 4 chamadores (`{quest && <QuestModal key={quest.id}
  .../>}`), confirmando que trocar de missão sem fechar explicitamente ainda
  reseta `feedback`/`selectedId` e cancela o timer de conclusão pendente.
- Nenhuma mudança em regras de pontuação, XP, moeda, streak ou persistência.

## Decisões técnicas tomadas

- **Endurecimento preventivo, não correção de bug confirmado.** Investiguei
  se os gatilhos de `activeSurpriseQuiz`/`activePlanetQuest` (proximidade em
  `World3D.tsx`, linhas ~14955-14973) podiam reabrir um modal já aberto do
  mesmo jeito que o desafio ambiental: hoje todos os gatilhos relevantes
  (E-key em `handleInteractPress`, loop de física de moedas/pergaminhos)
  são guardados por `suspendRef.current`/`hudInertRef.current`, que ficam
  verdadeiros assim que qualquer um desses 4 estados fica não-nulo — então
  não encontrei um caminho reproduzível de re-disparo síncrono nestes 4.
  Ainda assim, a mesma classe de risco (quest troca em memória, mesma
  instância React reaproveitada) existe estruturalmente, e o próprio Copilot
  recomendou isto na PR #135 ("key other callers by their attempt
  identity") — decisão: aplicar o endurecimento agora, documentar que é
  preventivo, sem inflar a certeza do achado.
- **`quest.id` em vez de um `attemptId` sintético.** Diferente do desafio
  ambiental (que já tinha um `attemptId` dedicado por `crypto.randomUUID()`
  para proteger contra `onCorrect` atrasado), estes 4 não têm essa
  indireção. Criar um `attemptId` novo só para a `key` seria complexidade
  sem benefício extra — `quest.id` já é único por missão e já está
  disponível sem mudar nenhum outro estado.
- **Teste novo em vez de reaproveitar `AttemptHarness` do lab-246.** O
  mecanismo de remontagem por troca de `key` já está provado genericamente
  pelo teste do lab-246; o teste novo (`QuestIdKeyHarness`) existe para
  validar a `key` real usada em produção (`quest.id`) em vez de um id
  sintético, não para reprovar o mecanismo do React.

## Pendências / dívidas conhecidas

- Nenhuma condição de corrida foi reproduzida ao vivo ou em teste automatizado
  para estes 4 chamadores — o lab é defensivo, baseado na recomendação do
  Copilot e na semelhança estrutural com o bug real do lab-246, não em um
  relato de usuário ou reprodução confirmada.
- Teste físico Android (Redmi Pad 2) continua pendente, acumulado dos labs
  238-247.

## Publicação

- PR #137 mesclada (squash) em `e82377d`. Review do Copilot: 2 achados de
  severidade baixa, ambos sobre convenção — comentários novos referenciando
  laboratório/PR/Copilot violavam `docs/prompts/04-manutencao-clean-code.md`
  (MUST, linhas 24-27: esse histórico pertence ao `CONTEXT.md` e ao git log,
  não ao código). Corrigido no mesmo PR (commit `9f292f1`), mantendo só o
  motivo comportamental em cada comentário; a mesma limpeza foi aplicada por
  consistência ao comentário equivalente do lab-246 (desafio ambiental), que
  tinha a mesma violação e está no mesmo arquivo. CI em `main` (run
  37133198977) passou 3/3 jobs após o merge — isso já inclui o deploy
  automático para produção (Vercel + Cloudflare, `.github/workflows/ci.yml`,
  secrets configurados desde o lab-104); confirmado ao vivo em
  `missaoaprendizado.com` servindo `index-CcSzaPg9.js` após o merge.

## Funcionalidades planejadas que NÃO foram concluídas

- Nenhuma — as 3 funcionalidades planejadas em `FEATURES.md` foram
  concluídas (key nos 4 chamadores, teste de regressão, suite/lint/build
  sem regressão).

## O que o próximo laboratório deve desenvolver

- Prioridade maior se houver dispositivo: playtest físico no Redmi Pad 2
  (pergunta, Central, portão, teclado virtual), acumulado desde o lab-238.
- Sem dispositivo: a varredura deste lab não achou outros `setTimeout`/
  callbacks temporizados sem guarda em `App.tsx`/`World3D.tsx`/`HudHeader.tsx`
  — os usos em `World3D.tsx` já têm histórico extenso de correções do
  Copilot (ex.: linhas 3912+, 13911-13957, 16275+). Não auditar de novo sem
  um caminho concreto de efeito tardio reproduzível (relato de usuário ou
  teste automatizado que falhe primeiro).
- Retomar a PR #125 (Lab 236, "revalidar assinatura durante sessões
  longas") continua em aberto desde 2026-09-24, agora com conflito de merge
  com `main` — não foi tocada nesta sessão; decisão de resolver os
  conflitos e/ou abandoná-la segue com o usuário, já que depende de
  validação manual com assinatura real que esta sessão não pode fazer.

## Estado do repositório ao final

- Branch: `lab-247-chave-tentativa-questmodal`, commit `a5baf07`.
- Suite: 358/358 testes (33 arquivos). Lint: zero erros, 2 avisos
  preexistentes (`PetPanel.tsx:46`, `server-accounts/src/domain.test.ts:923`).
  Build: TypeScript + Vite + PWA passaram, aviso preexistente de chunk
  >500kB.
- Como verificar: `npm run test` / `npm run lint` / `npm run build` em
  `app/`; `git show a5baf07` para o diff completo.
- `.github/copilot-instructions.md` e `.vscode/` locais não incluídos.
