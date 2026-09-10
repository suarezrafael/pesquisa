# Contexto — Laboratório 174 — desafio educativo leve na rotina diária do pet

Preenchido em: 2026-09-10
Commit inicial → final: ea36511d5f6bb10dda3bb4b2d2b356da684a29a8..30572e54c44912849b33c3eb61bb70acd1e6ddfe (PR #48, mergeada em main)

## O que foi feito

`docs/market-metrics-engagement-backlog.md` §10, item 6 ("Lab 168 - Rotina diária saudável com
pet" no documento). Confirmado com o usuário via `AskUserQuestion` que o resto do backlog top-8
já estava completo (checado item a item nesta sessão) e que o único pedaço faltando deste item era
o "desafio educativo leve" — hoje alimentar o pet era só um clique, sem aprendizado junto.

- **`applyPetDailyChallengeCompleted`** (`state/progression.ts`) — nova função pura, recompensa 5
  moedas (mesma ordem de grandeza do menor dia do login diário), 1x por dia real por perfil, só
  com um pet equipado. Mesmo padrão anti-farm (`dayGap >= 1`, defesa contra relógio ajustado pra
  trás) de `feedPet`/`applyCoopChallengeCompleted`.
- **`PetPanel.tsx`** ganhou um botão "🎓 Desafio rápido do dia" ao lado de "🍖 Alimentar" (só
  aparece pro pet ativo/equipado). Clicar abre um cartão inline (não um modal novo empilhado,
  reaproveita as classes `.quest-prompt`/`.quest-choices`/`.quest-choice`/`.quest-feedback` já
  existentes do `QuestModal`) com 1 pergunta sorteada de `data/quests.ts` — mesmo banco já
  reaproveitado pelo desafio cooperativo (lab-172), sem catálogo novo. Errar nunca bloqueia nem
  reduz a recompensa (só "Quase! Tente outra opção. 💪", sem limite de tentativas); acertar dá a
  recompensa e desabilita o botão até o dia seguinte ("🎓 Desafio feito hoje").
- **`Progress.lastPetChallengeAt`** novo campo (mesmo formato de `lastPetFeedAt`/
  `lastCoopChallengeAt`), com valor padrão `null` em `storage.ts` — perfis existentes (sem esse
  campo salvo) recebem `null` automaticamente pelo merge `{ ...emptyProgress, ...JSON.parse(raw) }`
  que `loadProgress` já fazia antes deste lab, sem precisar de migração/backfill dedicado.
- Renomeada a função local `fedToday` → `doneToday` em `PetPanel.tsx` (agora usada pros dois
  botões diários do pet, não só o de alimentar) — só um ajuste de nome, comportamento idêntico;
  atualizada a referência cruzada em `AchievementsPanel.tsx`.

## Decisões técnicas tomadas

- **Não reaproveita `QuestModal`/`completedQuestIds` diretamente** — o desafio do pet precisa ser
  repetível todo dia (não "completar uma missão", que é 1x pra sempre por design), então usar o
  mesmo fluxo de `completeQuest` misturaria duas semânticas diferentes (progresso permanente de
  missão vs. rotina diária repetível). Em vez disso, o cartão de pergunta é embutido diretamente
  em `PetPanel.tsx`, sorteando de `quests` sem checar/gravar em `completedQuestIds` — só a
  recompensa em moeda é nova, controlada por `lastPetChallengeAt` separado.
- **Pergunta sorteada de QUALQUER quest do banco (não só as ainda não concluídas)** — diferente do
  desafio cooperativo (que prioriza missões incompletas porque ali a "missão" de verdade também é
  concluída), aqui é só um momento de prática rápida; repetir uma pergunta já vista antes não tem
  problema, o objetivo é o momento educativo, não o progresso de missão.
- **Sem evento de analytics dedicado** — `feedPet` (mesma categoria de ação diária) nunca teve um
  evento próprio; mantida a mesma simetria, evita instrumentação desproporcional a uma ação tão
  pequena.
- **Sem limite de tentativas erradas** — o documento proíbe explicitamente qualquer punição na
  rotina do pet ("streak punitivo, cobrança pra recuperar sequência"); bloquear tentativas ou
  reduzir a recompensa por errar violaria o mesmo princípio.

## Achados do review automático do Copilot (PR #48, corrigidos antes do merge)

- **`doneToday` (`PetPanel.tsx`) comparava calendário LOCAL, divergindo do critério de "dia" da
  regra de domínio (`utcDayNumber`, UTC)** — em fusos à FRENTE de UTC, o dia local vira antes do
  dia UTC, deixando a UI habilitar o botão horas antes do domínio aceitar de verdade. Corrigido
  reaproveitando `utcDayNumber` (agora exportado de `progression.ts`) nos dois botões diários
  (alimentar e desafio), eliminando a divergência de raiz em vez de só documentá-la como aceitável
  (como o comentário original de `fedToday` fazia).
- **UI selava "acertou! +5 moedas" sem confirmar se a recompensa foi REALMENTE concedida** —
  `onChallengeCorrect` não devolvia nada; agora devolve o `rewarded` real
  (`applyPetDailyChallengeCompleted(...).rewarded`), e a UI só mostra a mensagem de sucesso quando
  isso é `true`; um novo estado `already-done` cobre o caso raro em que o domínio recusa mesmo com
  a resposta certa (avisa "Você já fez o desafio de hoje!" em vez de travar a criança numa mensagem
  de sucesso falsa).
- **Achado ao verificar a correção acima ao vivo (não veio do Copilot)**: o cartão de pergunta
  inteiro desaparecia no MESMO instante em que a recompensa era concedida — `alreadyChallengedToday`
  vira `true` assim que o `progress` atualizado chega via re-render, e a condição original
  (`challengeOpen && !alreadyChallengedToday`) escondia o cartão antes da mensagem "Isso aí!"
  chegar a aparecer na tela. Corrigido mantendo o cartão visível enquanto `challengeFeedback !==
  null`.

Segunda rodada do Copilot (mesmo PR, commit `518667b`) trouxe mais 2 achados reais:

- **`challengeQuest.passage` nunca era renderizado no cartão inline** — perguntas de leitura
  (`type: 'leitura'`, têm um texto de apoio em `passage`) ficavam sem contexto/indecifráveis no
  desafio do pet, mesmo já sendo renderizado normalmente pelo `QuestModal`. Corrigido reaproveitando
  a mesma classe `.quest-passage` (já existente) antes do `quest-prompt`.
- **Comentário de `utcDayNumber` invertia UTC/local** — dizia "vira à meia-noite LOCAL... em vez
  de UTC", quando na verdade a função vira à meia-noite UTC (o próprio exemplo do Brasil, 21h no
  relógio local, já provava isso — só a frase-guia estava com os termos trocados). Corrigido o
  texto, especialmente relevante agora que a função foi exportada e passou a ser lida por mais
  gente.

Terceira rodada do Copilot (commit `e5d3f68`): "Approval recommended", 0 achados novos — só um
ajuste de documentação sugerido no comentário do próprio `onChallengeCorrect` (os cenários citados
de recusa não batiam com a regra real de `applyPetDailyChallengeCompleted`: só recusa quando já
recompensado no dia UTC atual ou com carimbo corrompido, não "dia virou"/"aberto antes de meia-noite"
como o texto anterior sugeria). Corrigido.

## Pendências / dívidas conhecidas

Nenhuma nova.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — todos os itens do `FEATURES.md` foram concluídos.

## O que o próximo laboratório deve desenvolver

Com este lab, **todos os 8 itens da "Ordem sugerida" (§10) do
`docs/market-metrics-engagement-backlog.md` estão completos**. O que resta no documento é: "Lab
171 - Casa visitável somente leitura" (P1, mas fora da lista top-8 priorizada) e os itens de
pesquisa/aquisição (teardown competitivo, teste de 5 segundos, sessão observada, experimentos de
aquisição) — o documento recomenda só avançar pra aquisição paga depois de evidência real de
ativação/retenção, que exige pesquisa com usuários reais, fora do escopo de um laboratório de
código. Aguardar pedido novo do usuário sobre qual desses (ou outro item) priorizar a seguir.

## Estado do repositório ao final

- Branch: `lab-174-desafio-educativo-pet`, mergeada em `main` via PR #48 (merge commit
  `30572e5`), branch remota apagada após o merge. **Confirma deploy em produção**: CI/CD verde
  nos 3 workers, `GET /health` do `server-accounts`
  (`https://missao-aprender-accounts.rafaelvs.workers.dev/health`) → 200; app
  (`https://app-two-flax-92.vercel.app`) → 200.
- `npx tsc -b`/`npm run test` (app): limpo, 165/165 (5 novos, `applyPetDailyChallengeCompleted`).
  `npm run build`: limpo, sem regressão de bundle (nenhum chunk novo, mudança só em componentes já
  existentes).
- **Verificado ao vivo via Chrome real**: perfil de teste com pet adotado/equipado via
  `localStorage` (id certo confirmado em `data/pets.ts`, `gato_laranja`); botão "🎓 Desafio rápido
  do dia" confirmado aparecendo ao lado de "Alimentar"; clique abriu o cartão inline com pergunta
  real do banco ("Qual item não pertence ao grupo: carro, ônibus, bicicleta, sapato?"); resposta
  ERRADA ("Carro") confirmada sem penalidade (moedas inalteradas, mensagem "Quase! Tente outra
  opção. 💪", pergunta continua respondível); resposta CERTA ("Sapato") confirmada concedendo
  exatamente +5 moedas (128→133 — o valor antes disso, 127→128, veio de uma moeda ambiente
  coletada ao entrar no mundo, sem relação com este desafio) e desabilitando o botão ("🎓 Desafio
  feito hoje"),
  `lastPetChallengeAt` gravado no `localStorage` com o timestamp real do clique. Perfil de teste
  restaurado ao estado original (moedas, pet equipado, `lastPetChallengeAt`) ao final.
- **Reverificado ao vivo depois dos achados do Copilot**: mesmo fluxo repetido do zero (novo pet
  de teste, nova pergunta sorteada — "O que aconteceu com o foguete?") confirmou a mensagem "Isso
  aí! 🪙 +5 moedas pro cuidado de hoje." agora aparecendo de verdade na tela (127→132, +5 exato) e
  permanecendo visível junto com "🎓 Desafio feito hoje" no botão — antes da correção do bug de
  desaparecimento, essa mensagem nunca chegava a ser vista. Perfil de teste restaurado de novo ao
  final.
- **Reverificado de novo pra confirmar o `passage`**: `Math.random` sobrescrito temporariamente
  pra forçar o sorteio de uma quest de leitura conhecida (`q03`, "O Gato Sonolento") — o texto de
  apoio ("Miau era um gato muito esperto...") confirmado aparecendo no cartão antes da pergunta,
  como esperado.
