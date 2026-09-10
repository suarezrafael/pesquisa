# Contexto — Laboratório 174 — desafio educativo leve na rotina diária do pet

Preenchido em: 2026-09-10
Commit inicial → final: ea36511d5f6bb10dda3bb4b2d2b356da684a29a8..(PR aberto, ver seção final)

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

- Branch: `lab-174-desafio-educativo-pet`.
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
