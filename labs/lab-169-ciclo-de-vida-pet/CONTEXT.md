# Contexto — Laboratório 169 — ciclo de vida do pet (idade por dias, sem morte)

Preenchido em: 2026-09-09
Commit inicial → final: ce153b869fcca4ad40a460a44c01f32335f425f0..0011465 (PR #43, mergeado)

## O que foi feito

Pedido do usuário no lab-168, deliberadamente adiado pra uma conversa de design própria ("o pet
tem que ter ciclo de vida ele deve crescer envelhecer e morrer"). Retomado nesta sessão ("pode
fazer um ciclo de vida normal, incrementado os anos por dias"). Antes de codar, perguntei ao
usuário via `AskUserQuestion` como "morrer" deveria funcionar pra uma criança de ~10 anos — 3
opções (reversível/"dorme e pode reviver", permanente com readoção, "envelhece mas nunca morre de
verdade"). O usuário escolheu a terceira, a mais segura das três.

- **`Progress.petAdoptedAt`** (`types.ts`/`storage.ts`) — novo `Record<string, string>`, data/hora
  da adoção de cada pet, gravada por `adoptPet` (que ganhou um parâmetro `nowIso` novo) e nunca
  sobrescrita.
- **`petAgeYears`** (`state/progression.ts`) — 1 dia real corrido desde a adoção = 1 "ano" do pet,
  usando o mesmo `utcDayNumber` (dia UTC) já usado por `feedPet`/`applyDailyLoginReward`.
- **`petLifecycleStage(careStage, ageYears)`** — combina os dois eixos independentes do ciclo de
  vida: `careStage` (cuidado real, `petStageFor(petCareCounts)`, decide filhote→jovem→adulto,
  intocado) e `ageYears` (tempo de convivência, decide só se um pet JÁ adulto também é "idoso").
  Nunca deixa a idade sozinha promover um filhote/jovem — preserva a decisão original do lab-155
  ("só CUIDAR, ação real, faz o pet avançar", comentário em `petStageFor`).
- **`backfillPetAdoptedAt(progress, nowIso)`** — perfis com pet adotado antes desta funcionalidade
  existir (ex.: perfis de produção já com pet) não têm `petAdoptedAt`; chamado uma vez no
  carregamento (`useProgress.ts`), começando a contar idade a partir de HOJE. Devolve a MESMA
  referência quando não há nada a preencher (mesma convenção de `equipPet`/`unlockGeneric`), pra
  `useProgress` só salvar quando de fato mudou algo.
- **`PetStage`** ganhou o valor `'idoso'`; `petStageScale('idoso')` usa a mesma escala de adulto (o
  corpo não encolhe de velho — só o pelo muda).
- **`World3D.tsx` (`rebuildPet`)** — quando o estágio combinado é "idoso", tinge o pelo com
  `Color3.Lerp(furColorBase, cinza, 0.45)` antes de construir a malha. Único sinal visual da fase;
  nunca remove/esconde/reduz o pet.
- **`PetPanel.tsx`** — mostra "🧓 Idoso" (`STAGE_LABEL`) e uma segunda tag "N anos de convivência"
  (ou "Recém-adotado"/"1 ano de convivência" nos casos singulares) pra cada pet possuído. Subtítulo
  do painel atualizado pra mencionar a fase idosa sem soar como um aviso negativo.

## Decisões técnicas tomadas

- **Dois eixos independentes (cuidado × tempo), nunca um substituindo o outro** — a decisão
  original do lab-155 (crescimento exige cuidado real, não passa sozinho com o tempo) continua
  válida; a idade só ACRESCENTA a fase "idoso" por cima de um adulto já criado por cuidado.
  Alternativa descartada: trocar o motor de crescimento inteiro pra idade — teria revertido uma
  decisão de design deliberada sem pedido explícito do usuário pra isso.
- **`petAgeYears` reaproveita `utcDayNumber`, não uma contagem de milissegundos crua** — mesmo
  raciocínio de "dia" já usado no resto do jogo (`feedPet`, login diário), consistente mesmo que
  o limiar de virada de dia (meia-noite UTC, não local) já seja uma simplificação conhecida e
  documentada no código original.
- **`backfillPetAdoptedAt` como função pura separada, chamada uma vez no `useState` inicial de
  `useProgress`** — mesmo padrão de auto-cura de `migrateLegacyProfileIfNeeded` (`storage.ts`);
  evita quebrar perfis de produção que já tinham pet antes desta funcionalidade existir.
- **Tingimento de pelo em vez de troca de modelo 3D** — mais barato, reaproveita a malha
  procedural existente (`buildGato`/`buildCachorro`), e mantém a identidade visual do pet (cor
  base ainda reconhecível, só mais grisalha) — criança continua reconhecendo "o MEU pet", não um
  pet diferente.

## Pendências / dívidas conhecidas

Nenhuma nova. PR #43 teve 6 achados reais do Copilot corrigidos antes do merge, em 4 rodadas:
- **`saveProgress` dentro do inicializador do `useState`** (`useProgress.ts`) — side effect em
  fase de render; `StrictMode` roda o inicializador 2x em dev, arriscando escrita duplicada/
  imprevisível. Movido pra um `useEffect` (array de dependência vazio, roda uma vez de verdade).
- **Pet só ficava "idoso" com outro evento acontecendo** (`World3D.tsx`) — o estágio combinado
  depende de tempo real (`petAgeYears`), mas `__refreshPet` só disparava em mudanças de
  `equippedPetId`/`petCareCounts`; numa sessão longa atravessando a virada de dia, o pet podia
  atingir 30+ anos sem nunca ficar grisalho até outro evento forçar refresh. Adicionado
  `petAgingInterval` (`setInterval` de 1h, mesmo padrão de `refreshRanking` sobrevivendo em
  segundo plano) chamando `rebuildPet` periodicamente.
- **`petAgeYears` podia devolver `NaN`** com uma data de adoção corrompida/ISO inválida
  (`utcDayNumber` devolve `NaN` sem lançar erro) — o comentário original já dizia "nunca NaN", mas
  faltava a checagem de verdade; adicionado `Number.isFinite` nos dois dias antes de subtrair,
  mesmo cuidado que `applyDailyLoginReward`/`feedPet` já têm com relógio corrompido.
- **`petAgingInterval` sem checar `disposed`** — um disparo já enfileirado bem na hora do
  desmonte do componente rodaria `rebuildPet` DEPOIS de `scene.dispose()`/`engine.dispose()`;
  callback agora checa `disposed` antes de chamar `rebuildPet`, mesmo padrão já usado logo após
  o `await HavokPhysics()`.
- **`adoptPet` podia "rejuvenescer" um pet já adotado** — sempre sobrescrevia `petAdoptedAt[id]`
  com `nowIso`, contradizendo o próprio comentário ("nunca sobrescrita depois"); um `progress`
  inconsistente/corrompido (id sumiu de `unlockedPetIds` mas a data antiga ainda existia) faria
  `adoptPet` reiniciar a idade do zero. Agora preserva `progress.petAdoptedAt[id]` quando já
  existir, só usa `nowIso` na primeira vez de verdade.
- **`backfillPetAdoptedAt` usava o operador `in`**, que também consulta a cadeia de protótipos
  (`'toString' in {}` é `true`) — com dado corrompido/id inesperado no `localStorage`, podia
  considerar uma chave "existente" sem ser uma entrada real. Trocado por checagem direta
  `=== undefined` no valor.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — todos os itens do `FEATURES.md` foram concluídos. Morte/remoção do pet foi descartada
de propósito (decisão explícita do usuário), não uma pendência.

## O que o próximo laboratório deve desenvolver

Nenhum item já sequenciado por este laboratório. Aguardar pedido novo do usuário ou puxar do
backlog geral (`docs/market-metrics-engagement-backlog.md`/`docs/product-discovery-backlog.md`).

## Estado do repositório ao final

- Branch: `lab-169-ciclo-de-vida-pet` (mergeada e apagada). **Confirma deploy em produção**: PR
  #43 mergeado (6 achados reais do Copilot corrigidos em 3 rodadas de review), CI/CD verde nos 3
  workers, deploy automático confirmado (`GET /health` 200, app respondendo 200 no Vercel).
- `npx tsc -b`: limpo. `npm run test` (app): 144/144 (5 novos — `petAgeYears`,
  `petLifecycleStage`, `backfillPetAdoptedAt`, `adoptPet` gravando `petAdoptedAt`,
  `petStageScale('idoso')`). `npm run build`: limpo, sem regressão de bundle.
- **Verificado ao vivo via Chrome real** (automação, mesmo perfil de teste local usado no
  lab-168): confirmado que `backfillPetAdoptedAt` preencheu `petAdoptedAt` sozinho pro pet já
  adotado numa sessão anterior (sem `petAdoptedAt` prévio). Forçado `petCareCounts` pra 7
  (adulto) e `petAdoptedAt` pra 40 dias atrás; depois de recarregar, `PetPanel` mostrou "🧓 Idoso"
  + "40 anos de convivência" corretamente, e o pet no mundo 3D confirmado com escala 1 (igual
  adulto) e cor do pelo exatamente igual ao valor esperado do `Color3.Lerp` (base
  `[0.85,0.55,0.25]` → `[0.8275,0.6625,0.4975]`, lerp 45% pra cinza) — bate com a fórmula, não só
  visualmente parecido.
