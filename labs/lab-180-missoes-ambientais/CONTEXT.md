# Contexto — Laboratório 180 — Missões ambientais de aprendizagem

Preenchido em: 2026-09-12
Commit inicial → final: 6114f8e3dcc5124422a0819148edd22451b7b91d..6e81720

## O que foi feito

- **3 landmarks novos no planeta principal** (`app/src/world3d/World3D.tsx`), mesmo padrão visual/
  geométrico da carteira de estudos e do desafio em dupla (lab-172): `TransformNode` fixo
  posicionado com `terrainGroundRadial`/`settleMeshOnTerrain`, emoji flutuante, dica "Pressione E"
  visível dentro de um raio de gatilho (`ENV_CHALLENGE_TRIGGER_DISTANCE = 1.3`).
  - **Ponte** (`ponte-logica`, 🌉) — dois pilares + tabuleiro + corrimãos.
  - **Posto de abastecimento do foguete** (`posto-abastecimento-matematica`, ⛽) — perto de
    `ROCKET_LAUNCH_DIR` (mesma direção da plataforma de lançamento).
  - **Placa** (`placa-leitura`, 📜) — poste + tabuleiro.
- Cada landmark sorteia uma pergunta do TIPO certo (`logica`/`matematica`/`leitura`) de
  `data/quests.ts`, priorizando uma ainda não respondida (cai pro pool inteiro do tipo se todas já
  feitas) — `pickEnvironmentalQuest`, dentro do mesmo handler de tecla `E` que já trata
  carro/foguete/casa/desafio em dupla.
- Resposta certa credita XP/moeda REAIS via `completeQuest` (`App.tsx`,
  `handleEnvironmentalChallengeCorrect`) — é uma missão normal do pool de sempre, só alcançada por
  um caminho ambiental novo, não uma recompensa paralela como o desafio em dupla.
- Eventos novos `learning_challenge_started`/`learning_challenge_completed` (nomes exatos do
  backlog) com `meta.kind` (`"bridge"`/`"rocket_fuel"`/`"plaque"`) — `productAnalytics.ts`,
  allowlist `isValidLearningChallengeKind` em `server-accounts/src/domain.ts`, validação em
  `index.ts` (`handleTrackEvent`, recusa o evento inteiro com `kind` inválido, mesmo padrão de
  `planet_interaction_completed` do lab-179).
- `docs/event-catalog.md`: 2 linhas novas na tabela + nota na seção de métricas por área
  explicando que `retry_without_quit_rate` (citado pelo backlog) é uma métrica DERIVADA (proporção
  de `started` que vira `completed`), sem evento próprio.

## Decisões técnicas tomadas

- **"Abrir portas por padrões" (4º tema do backlog) ficou fora de escopo** — o critério de aceite
  pede só 3 missões ambientais, e o documento autoriza "transformar PARTE dos quizzes", não os 4
  temas.
- **Direções dos 3 landmarks escolhidas por inspeção**, não por um script de varredura medida
  (diferente de `ROCKET_LAUNCH_DIR`/`MARS_UFO_DIR`) — mesmo método informal já usado pela
  carteira de estudos/desafio em dupla. Não houve verificação de colisão lateral com escolas/
  platôs/outros marcos além da posição vertical real (`terrainGroundRadial`); se um jogador real
  reportar um landmark colidindo com algo, é o próximo ponto de investigação (mesma classe de bug
  já documentada nos labs 95/134/135 pra escolas/casa).
- **Resposta certa credita recompensa REAL** (não um caminho paralelo tipo desafio em dupla) —
  decisão consciente: os landmarks são uma pele nova pra responder o MESMO pool de perguntas, não
  uma economia de recompensa separada.
- **Achado do review automático do Copilot na PR #59 (1ª rodada)**,
  3 achados reais corrigidos:
  1. `trackFirstLearningChallenge()` não disparava ao abrir um landmark ambiental (só via
     escolinha) — uma criança que começasse a sessão por um landmark ficava fora do funil de
     ativação de 10 minutos (`activation_cycle_completed`, lab-164). Corrigido chamando o tracker
     idempotente também em `handleOpenEnvironmentalChallenge`.
  2. Teste novo confirmando que `learning_challenge_started`/`completed` de fato entraram em
     `PRODUCT_EVENT_TYPES` (`isValidProductEventType`) — os testes de `isValidLearningChallengeKind`
     cobriam só o `kind`, uma remoção acidental do allowlist principal passaria despercebida.
  3. Este `CONTEXT.md` (handoff de fim de lab) estava faltando — `FEATURES.md` já marcava
     "concluído" mas a pasta não tinha o arquivo que a própria convenção do projeto exige.
- **Achado do review automático do Copilot na PR #59 (2ª rodada)**, 4 achados reais corrigidos:
  1. `GET /admin/metrics` nunca expunha os 2 eventos novos em `weeklyFunnel` (só entravam na
     allowlist) — corrigido com `weeklyFunnel.learningChallengeStarted`/`learningChallengeCompleted`
     (`index.ts`), mesma convenção de ALCANCE do resto do funil.
  2. Race real: `QuestModal` atrasa `onCorrect` em 700ms (`setTimeout`) — fechar o modal (ou abrir
     outro landmark) dentro desse intervalo deixava o `onCorrect` capturado disparar depois sobre
     um estado já trocado, podendo creditar recompensa de uma tentativa cancelada por cima de um
     desafio novo. Corrigido com `attemptId` (`crypto.randomUUID()`, só em memória) comparado
     contra um `ref` vivo antes de creditar qualquer coisa — o `ref` é zerado tanto ao fechar
     quanto ao completar, invalidando qualquer callback atrasado da MESMA tentativa.
  3. `retry_without_quit_rate` reavaliada com mais rigor: o payload não carrega id de tentativa
     nenhum (só `kind`+`device_id`+timestamp) — se o mesmo `kind` for aberto mais de uma vez antes
     de completar, comparar `started`×`completed` pode atribuir a conclusão à tentativa ERRADA.
     Decisão: não adicionar um id de correlação ao contrato do evento só pra essa métrica (mudança
     maior, fora do escopo deste lab) — reforçada a documentação (`productAnalytics.ts`,
     `docs/event-catalog.md`) deixando explícito que é uma proporção AGREGADA, não uma taxa por
     tentativa individual confiável.
  4. Seção "Funcionalidades planejadas que NÃO foram concluídas" (abaixo) se autocontradizia —
     dizia "nenhuma" no título e "todas concluídas" no corpo, texto reescrito pra não confundir.
- **Achado do review automático do Copilot na PR #59 (3ª/4ª rodadas)**:
  1. Consistência de histórico de review entre `CONTEXT.md`/`CURRENT.md` (achado da 3ª rodada,
     texto ajustado, sem mudança de código).
  2. **Achado arquitetural real (4ª rodada)**: a seleção de pergunta certa pro landmark
     (`pickEnvironmentalQuest`) morava DENTRO de `World3D.tsx`, acoplada à engine 3D — viola
     `docs/prompts/03-arquitetura-sistema.md` §1 (regra de quest/progressão precisa ficar testável
     sem instanciar a cena). Extraída pra `selectEnvironmentalChallengeQuest`
     (`state/progression.ts`), com `random` injetável — `World3D.tsx` só chama e repassa o
     resultado. 4 testes novos (`progression.test.ts`): sorteia só do tipo certo, prioriza
     incompleta, cai pro pool inteiro quando todas já feitas, RNG determinístico em teste.

## Pendências / dívidas conhecidas

- Posições dos 3 landmarks não foram verificadas contra TODOS os marcos do planeta (escolas,
  platôs, deserto, lagoa/piscina) com a mesma técnica de varredura medida usada em labs anteriores
  (`ROCKET_LAUNCH_DIR` etc.) — risco baixo mas real de colisão visual não descoberta ainda.
- `retry_without_quit_rate` não tem cálculo automatizado nenhum (nem endpoint, nem query pronta) —
  documentado como "consulta ad-hoc quando precisar" em `docs/event-catalog.md`, não construído
  neste lab.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — as 3 (mais o suporte de eventos/testes/docs) planejadas em `FEATURES.md` foram todas
concluídas e verificadas ao vivo (ver "O que foi feito" acima).

## O que o próximo laboratório deve desenvolver

Seguindo a ordem recomendada por `docs/growth-retention-monetization-backlog.md`, o próximo item é
o **Lab 181 - Circuito de descoberta e álbum de planetas** (item 7 da ordem sugerida).

## Estado do repositório ao final

- Branch: `lab-180-missoes-ambientais`, PR #59 aberta contra `main`.
- `npx tsc -b` (app) / `npx tsc --noEmit` (server-accounts): limpos. `npm run test`: app 185/185
  (4 novos, `selectEnvironmentalChallengeQuest` — extraída de `World3D.tsx` na 4ª rodada do
  review, ver "Decisões técnicas tomadas"); server-accounts 147/147 (3 novos: 2 `it`s de
  `isValidLearningChallengeKind`, 1 confirmando o allowlist de `isValidProductEventType`).
  `npm run build` (app): limpo.
- **Verificado ao vivo via Chrome real** (Vite dev server local, não produção): hint "Pressione E"
  acende perto de cada landmark; os 3 abrem o tipo de pergunta certo (Lógica "Depois de Amanhã" /
  Matemática "Balas na Caixa" / Leitura); resposta certa credita XP/moeda reais (RewardToast
  confirmado); `learning_challenge_completed` dispara com `kind` correto pros 3 (confirmado via
  monkey-patch de `window.fetch`).
- CI verde na PR #59 (3 workflows). 2 rodadas de review automático do Copilot até este handoff
  (3 achados reais na 1ª, 4 na 2ª — 7 no total), todos corrigidos (ver "Decisões técnicas
  tomadas") — aguardando confirmação de rodada limpa antes do merge/deploy (fora do escopo deste
  `CONTEXT.md`, que documenta o código já implementado e verificado, não o processo de review
  ainda em andamento — este handoff é atualizado a cada rodada com achados reais).
- Como verificar: abrir o jogo, andar até um dos 3 landmarks novos no planeta principal (ponte,
  posto de abastecimento perto do foguete, placa), apertar `E` com a dica visível.
