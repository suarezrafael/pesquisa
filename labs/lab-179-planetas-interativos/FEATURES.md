# Laboratório 179 — Planetas interativos v1

Status: concluído
Início: 2026-09-12
Fim: 2026-09-12
Commit inicial: 3d7d825aa76b3ea38dcb653b9f1031bf2ac94de5

## Objetivo do laboratório

Fechar o item `docs/growth-retention-monetization-backlog.md`, "Lab 179 - Planetas interativos v1"
(P1) — próximo item recomendado no `CONTEXT.md` do lab-185. Escopo do backlog: pelo menos 3
interações por planeta existente (NPC com fala catalogada, objeto acionável, mini-puzzle
ambiental, colecionável ou segredo visual), instrumentadas com eventos próprios, sem texto
livre/UGC.

## Investigação prévia (antes de codar)

Levantamento do código real feito antes de escrever este documento — achado principal: **muito
mais infraestrutura de interação já existe do que o backlog sugere**, o gap real é bem menor que
"21 interações novas" (7 planetas × 3):

- **6 dos 7 planetas-destino** (`mercurio`, `venus`, `jupiter`, `saturno`, `urano`, `netuno` —
  todos exceto `marte`) **já têm 3 interações reais, distintas, cada um**:
  - **`data/postcards.ts`** — cartão-postal colecionável, concedido de graça na primeira chegada
    (`applyPostcardCollected`, `progression.ts`) → categoria "colecionável".
  - **`data/treasureChests.ts`** — baú de tesouro 3D físico (modelo completo em `World3D.tsx`,
    achado por proximidade) → categoria "objeto acionável".
  - **`data/planetQuests.ts`** — 6 "escolinhas" de astronomia por planeta (`applyPlanetQuestCompletion`,
    dão XP de verdade) → categoria "desafio educativo" (satisfaz o critério de aceite "pelo menos
    uma interação conecta a desafio educativo curto").
  - **NENHUMA das 3 dispara evento de analytics hoje** — confirmado grepando `state/useProgress.ts`:
    só `completeQuest` (missão do planeta principal) chama `trackQuestCompleted`; os call sites de
    `applyPlanetQuestCompletion`/`applyTreasureChestFound`/`applyPostcardCollected` não chamam
    nenhuma função de `productAnalytics.ts`. Isso explica por que o backlog pede
    "instrumentar eventos" — as interações já existem, só não são medidas.
- **`marte` é o único planeta sem baú (`treasureChests.ts` exclui `marte` explicitamente, "Marte já
  tem sua própria recompensa exclusiva de exploração") e sem escolinha** (`planetQuests.ts` não tem
  chave `marte`) — tem só o cartão-postal (colecionável) + o combate contra ETs/robôs (lab-60) que,
  ao vencer, revela um "pote de moedas" na base alienígena (lab-128, objeto acionável/recompensa de
  exploração gated). Isso já dá 2 interações distintas a Marte; falta 1 pra bater o "pelo menos 3"
  do backlog.
- **Não existe NENHUM sistema de NPC com diálogo em planetas** — `WalkerNpc` (bolha de fala) existe
  só no mundo principal (hub), pra "pessoas" de fundo. Um comentário antigo em `World3D.tsx`
  (linha ~463, contexto de Marte) registra uma decisão explícita e anterior do usuário: "por
  enquanto o planetinha pode ter só árvores e rochas, não precisa NPC" — decisão de performance
  (mesmo espírito da contagem baixa de inimigos em Marte, "cada inimigo roda IA por quadro").
  Decisão deste lab: NÃO introduzir NPCs em planetas agora — usar a interação nova de Marte pra
  fechar o "≥3" com uma categoria mais barata (mini-puzzle ambiental ou segredo visual), coerente
  com essa restrição de performance já estabelecida, em vez de reabrir essa decisão sem necessidade
  (o backlog pede "pelo menos 3 interações", não exige as 5 categorias inteiras).
- **Padrão pra evento novo**: em vez de 1 evento por tipo de interação (o que o lab-185 fez pros 3
  eventos dele), este lab usa **1 evento genérico `planet_interaction_completed`** com
  `meta: { planetId, kind }` — o nome da métrica esperada no backlog
  (`planet_interactions_per_session`) já é uma contagem AGREGADA por tipo, não por tipo separado;
  um evento genérico com `kind` também deixa contar "quantos tipos distintos de interação uma
  criança já fez num planeta" com uma única query (`count(distinct meta->>'kind')`), o que é
  literalmente o critério de aceite "pelo menos 3 interações por planeta". `kind` allowlist:
  `collectible` (postcard), `actionable_object` (baú, pote de moedas de Marte),
  `educational_quiz` (escolinha), e o que a nova interação de Marte definir.
- **Nenhuma migração de banco necessária** — mesmo padrão do lab-185, `product_events` já tem tudo.

## Funcionalidades planejadas

- [x] Evento novo `planet_interaction_completed` na allowlist `PRODUCT_EVENT_TYPES`
      (`app/server-accounts/src/domain.ts`) + tracker fino `trackPlanetInteractionCompleted(planetId, kind)`
      em `productAnalytics.ts`, mesmo padrão de `trackPlanetTravelCompleted`. Validação
      server-side de `kind` (allowlist fixa, `isValidPlanetInteractionKind`) e `planetId`
      (reaproveita `isValidDestinationPlanetId` já existente do lab-185) em `handleTrackEvent`,
      mesmo padrão de `isValidCosmeticSlot` (recusa o evento inteiro com 400 se inválido, em vez de
      gravar com `meta: null`, pelo mesmo motivo do lab-185: o campo É o sinal inteiro).
      (referência: backlog, Lab 179, "instrumentar eventos"; "eventos não coletam PII")
- [x] Instrumentadas as 3 interações já existentes nos 6 planetas que já as têm: `foundTreasureChest`
      (`kind: 'actionable_object'`), `collectPostcard` (`kind: 'collectible'`) e `completePlanetQuest`
      (`kind: 'educational_quiz'`, só na conclusão GENUÍNA, mesmo guard de idempotência de
      `completeQuest`) — todas em `state/useProgress.ts`.
      (referência: backlog, Lab 179, "cada planeta tem objetivo/descoberta clara"; "pelo menos uma
      interação conecta a desafio educativo curto")
- [x] Nova interação pra Marte fechar o "≥3": segredo visual (`data/planetSecrets.ts`,
      `applyPlanetSecretFound` em `progression.ts`, `foundPlanetSecretIds` novo em `Progress`) — uma
      sonda espacial quebrada escondida bem longe da estação alienígena/pote de moedas
      (`buildPlanetSecret`/`onFindPlanetSecret`, `World3D.tsx`), achada por proximidade real, sem
      marcador chamativo antes (diferente do baú). Categoria "segredo visual" escolhida em vez de
      NPC porque o código já registra uma decisão de performance anterior contra NPCs em planetas.
      (referência: backlog, Lab 179, "pelo menos 3 interações por planeta existente")
- [x] `GET /admin/metrics` ganha uma chave nova em `weeklyFunnel` (`planetInteractionCompleted`),
      mesmo padrão `weeklyDevices(tipo)` das chaves já existentes.
      (referência: backlog, Lab 179, "Métricas esperadas: planet_interactions_per_session")
- [x] `docs/event-catalog.md` atualizado com o evento novo, incluindo a allowlist de `kind`, e a
      seção "Qual métrica alimenta" atualizada explicando o que já existia vs. o que é novo.
- [x] Teste automatizado das novas funções puras: `isValidPlanetInteractionKind`/allowlist de
      evento (`domain.test.ts`, server-accounts) e `applyPlanetSecretFound` (`progression.test.ts`,
      app) — mesmo padrão de `isValidCosmeticSlot`/`applyTreasureChestFound`.
- [x] `npx tsc -b`/`--noEmit` (app e server-accounts) limpos; `npm run test` limpo nos dois; `npm run
      build` (app) limpo, sem regressão de bundle (`studentFigure` continua no mesmo tamanho de
      sempre, pré-existente, não relacionado a este lab).
- [~] Verificado ao vivo num navegador real — **bloqueado por um problema de ambiente desta sessão**,
      não do código deste lab: `npm run dev` trava indefinidamente em "Carregando o mundo 3D…", sem
      erro nenhum no console. Isolado com 2 testes independentes antes de desistir: (1) reproduzido
      IDENTICAMENTE com todas as mudanças deste lab stashadas (baseline limpo) — prova que não é bug
      deste lab; (2) mesmo com o cache de dependências do Vite (`node_modules/.vite`) limpo do zero,
      o próprio passo `[optimizer] bundling dependencies...` do Vite trava, ANTES de qualquer código
      deste app rodar — um problema no próprio dev server desta sessão, não no código. Compensado
      com: `npm run build` (produção, pipeline de bundling INTEIRAMENTE diferente do dev server)
      completou limpo; verificação ao vivo contra produção (leitura, `wrangler dev`) confirmando a
      validação server-side funcionando corretamente (ver abaixo); revisão manual cuidadosa do
      código novo em `World3D.tsx` (achou e corrigiu um bug real de orientação: `MeshBuilder.CreateDisc`
      nasce "de pé", trocado por um cilindro baixo, mesmo padrão já usado pra lagoa/moedas neste
      arquivo). Verificado ao vivo contra produção (leitura): `planet_interaction_completed` com
      `planetId`/`kind` válidos aceito (204, gravado corretamente); com `kind`/`planetId` inválido
      recusado (400, nunca vira linha); `weeklyFunnel.planetInteractionCompleted` responde
      corretamente.

## Fora de escopo (explicitamente adiado)

- Planeta novo, editor de mundo, narrativa longa, monetização (explicitamente fora de escopo no
  próprio item do backlog).
- Sistema de NPC com diálogo em planetas — decisão deste lab de não reabrir essa frente agora
  (ver investigação prévia); pode virar um lab futuro se o backlog priorizar.
- Métricas de coorte dedicadas (`return_after_planet_visit`, D1/D7 específico de quem visita
  planeta) — a infraestrutura de coorte do lab-185 (`cohortComparison`) já permite calcular isso
  manualmente via `?cohortSplitDate=`, mas uma métrica NOMEADA e exposta fica pra quando o backlog
  pedir explicitamente (mesmo espírito do lab-185, que não expôs toda métrica imaginável de uma vez).
