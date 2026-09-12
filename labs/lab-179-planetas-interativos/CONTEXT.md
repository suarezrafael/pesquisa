# Contexto — Laboratório 179 — Planetas interativos v1

Preenchido em: 2026-09-12
Commit inicial → final: 3d7d825aa76b3ea38dcb653b9f1031bf2ac94de5..HEAD (ver `git log` na branch
`lab-179-planetas-interativos`)

## O que foi feito

Investigação prévia (antes de codar, ver `FEATURES.md`) achou que 6 dos 7 planetas-destino
(`mercurio`, `venus`, `jupiter`, `saturno`, `urano`, `netuno`) já tinham 3 interações reais e
distintas — cartão-postal colecionável (`postcards.ts`), baú de tesouro (`treasureChests.ts`),
escolinha de astronomia (`planetQuests.ts`, dá XP de verdade) — mas NENHUMA disparava evento de
analytics. `marte` era o único sem 3 (sem baú, sem escolinha — só cartão-postal + combate/pote de
moedas). O lab fechou os 6 itens planejados:

- **Evento genérico `planet_interaction_completed`** (`meta: { planetId, kind }`) na allowlist
  `PRODUCT_EVENT_TYPES` (`app/server-accounts/src/domain.ts`) + tracker fino
  `trackPlanetInteractionCompleted(planetId, kind)` em `productAnalytics.ts`. Validação server-side
  de `kind` (`isValidPlanetInteractionKind`, allowlist de 4 valores) e `planetId` (reaproveita
  `isValidDestinationPlanetId` do lab-185) em `handleTrackEvent` — recusa o evento inteiro (400)
  se inválido, mesmo padrão do lab-185 pra `slot`/`toPlanetId`.
- **Instrumentadas as 3 interações já existentes** nos 6 planetas que já as têm:
  `foundTreasureChest` (`kind: 'actionable_object'`), `collectPostcard` (`kind: 'collectible'`) e
  `completePlanetQuest` (`kind: 'educational_quiz'`, só na conclusão GENUÍNA) — todas em
  `state/useProgress.ts`.
- **Nova interação em Marte** (`data/planetSecrets.ts`, `applyPlanetSecretFound` em
  `progression.ts`, `foundPlanetSecretIds` novo em `Progress`): um segredo visual (sonda espacial
  quebrada) escondido bem longe da estação alienígena/pote de moedas, achado por proximidade real,
  sem marcador chamativo antes (diferente do baú). `buildPlanetSecret`/trigger de proximidade em
  `World3D.tsx`.
- **`weeklyFunnel.planetInteractionCompleted`** em `GET /admin/metrics`, mesmo padrão
  `weeklyDevices(tipo)` das chaves já existentes.
- **`docs/event-catalog.md`** atualizado com o evento novo (incl. allowlist de `kind`) e a seção
  "Qual métrica alimenta" explicando o que já existia vs. o que é novo neste lab.
- **Testes automatizados**: `isValidPlanetInteractionKind`/allowlist de evento
  (`domain.test.ts`, server-accounts) e `applyPlanetSecretFound` (`progression.test.ts`, app).

## Decisões técnicas tomadas

- **Evento GENÉRICO (`kind` em `meta`) em vez de 1 evento por tipo de interação** — diferente do
  padrão do lab-185 (1 evento por feature nova). O nome da métrica que o backlog pede
  (`planet_interactions_per_session`) já é uma contagem AGREGADA por tipo, não um contador
  separado por categoria; um `kind` genérico permite contar "quantos TIPOS distintos de interação"
  por planeta com `count(distinct meta->>'kind')`, que é literalmente o critério de aceite do
  backlog ("pelo menos 3 interações por planeta").
- **Categoria "segredo visual" em Marte em vez de NPC** — o backlog lista NPC como uma das 5
  categorias possíveis, mas `World3D.tsx` já registra uma decisão de performance anterior contra
  NPCs em planetas ("por enquanto o planetinha pode ter só árvores e rochas, não precisa NPC",
  contexto de Marte). Reabrir essa decisão não era necessário — o backlog pede "pelo menos 3
  interações", não as 5 categorias inteiras — então a categoria mais barata (visual/estático,
  sem diálogo/IA) fechou o critério sem reabrir essa frente.
- **Segredo sem NENHUM marcador 3D visível, nem antes nem depois de achado** — diferente do baú
  (texto sempre visível de longe, "vitrine" de recompensa), o segredo precisa ser genuinamente
  escondido pra render a exploração completa do planeta significativa; o feedback de "achou" vem
  só de um banner transitório na UI, nunca de algo flutuando no mundo 3D pra sempre.
- **Disparo das 3 interações pré-existentes dentro de `useProgress.ts`, não na UI** — mesmo
  raciocínio do lab-185 pro `cosmetic_equipped`: o hook é o único ponto real de mutação de estado,
  chamado por qualquer caminho que decida completar a interação; colocar o `trackEvent` na UI
  arriscaria esquecer um caminho e duplicar ou perder o evento.

## Review automático do Copilot (PR #56)

**1ª rodada** — 3 achados reais:

- **Marte só emitia 2 das 3 interações prometidas** — a implementação original só instrumentou o
  segredo visual novo e (indiretamente, via `collectPostcard`) o cartão-postal, mas o POTE DE
  MOEDAS (a 2ª interação de Marte, categoria "objeto acionável", já contava como tal desde a
  investigação prévia registrada em `FEATURES.md`) continuava chamando só `onCollectCoinRef.current()`
  em loop, sem nenhum evento de analytics. Corrigido: `trackPlanetInteractionCompleted('marte',
  'actionable_object')` chamado direto no gatilho de proximidade do pote em `World3D.tsx` (não via
  `useProgress`, já que o pote reseta a cada visita — não precisa de estado novo de idempotência
  entre sessões, só não disparar mais de uma vez por visita, o que `marsCoinPotCollected` já
  garante sozinho). Nunca instrumenta moedas comuns, só este pote específico.
- **`docs/event-catalog.md` descrevia mal o cartão-postal** — dizia que `planet_interaction_completed`
  mede "o que a criança faz DEPOIS de chegar", mas o cartão-postal é concedido NO INSTANTE da
  chegada (`landRocket`), não numa ação separada depois. Corrigido pra deixar claro que nem toda
  categoria é estritamente pós-chegada.
- **`weeklyFunnel.planetInteractionCompleted` não é literalmente `planet_interactions_per_session`**
  — o nome da métrica no backlog sugere uma contagem POR SESSÃO, mas a implementação (mesma
  convenção do resto do `weeklyFunnel`) mede ALCANCE: dispositivos únicos com pelo menos 1
  interação na semana, sem agrupar por sessão (nenhum evento carrega id de sessão hoje). Decisão
  (mesmo espírito de `cameraRecenterUsed`, lab-185): documentar a limitação em vez de construir uma
  métrica de sessão nova — comentário adicionado em `index.ts` e `event-catalog.md`.

Verificação desta rodada: `npx tsc -b`/`--noEmit` (app e server-accounts) limpos; `npm run test`
app 181/181 (inalterado), server-accounts 144/144 (inalterado — mudança é só a chamada de tracker
+ texto de documentação, sem lógica nova isolável). `npm run build` (app) limpo. Reverificado ao
vivo contra produção (`wrangler dev` porta 8802, banco real, só leitura): `planet_interaction_completed`
com `planetId: 'marte'`/`kind: 'actionable_object'` aceito (204) e gravado corretamente (confirmado
lendo a linha de volta do banco antes de apagá-la).

**2ª rodada** — 4 achados reais:

- **Comentário de código não é visível pra quem só consome a API** — a limitação de
  `planetInteractionCompleted` (mede alcance, não sessão) documentada na 1ª rodada só existia como
  comentário em `index.ts`, invisível pra quem lê a resposta JSON sem abrir o código-fonte —
  exatamente o motivo de `guardrails: string[]` existir. Corrigido adicionando um 4º guardrail no
  próprio JSON de resposta.
- **Ordem das interações de Marte descrita errado em `event-catalog.md`** — o texto dizia que o
  segredo visual "chega a 3" e depois que o pote de moedas "fecha a 3ª interação", contradição
  óbvia (os dois não podem ser o 3º). Corrigido pra ordem real: cartão-postal (1ª), pote de moedas
  pré-existente (2ª), segredo visual novo (3ª, o que fecha o "pelo menos 3" do backlog).
- **Tabela de eventos não listava `World3D.tsx` como fonte** — a coluna "Arquivo de origem" de
  `planet_interaction_completed` só citava `state/useProgress.ts`, mas o pote de moedas de Marte
  dispara o evento direto em `World3D.tsx` (achado da 1ª rodada), sem passar por `useProgress`.
  Corrigido pra listar os dois arquivos.
- **`FEATURES.md` ainda dizia "Status: em andamento"/"Fim: -"** mesmo com `CONTEXT.md` já
  preenchido como final e todos os itens marcados `[x]` — estado inconsistente. Corrigido pra
  "Status: concluído"/"Fim: 2026-09-12", mesmo padrão do lab-185 (que já fixava isso no primeiro
  commit de implementação, não só no merge final).

Verificação desta rodada: `npx tsc --noEmit` (server-accounts) limpo; `npm run test` 144/144
(sem teste novo — string de guardrail e texto de documentação). Reverificado ao vivo contra
produção (`wrangler dev` porta 8803, banco real, só leitura): `GET /admin/metrics` confirmado
respondendo com o 4º guardrail novo.

## Pendências / dívidas conhecidas

- **Agregação por device, não por criança** (herdada do lab-185) — os eventos novos deste lab
  herdam a mesma imprecisão já aceita pro resto do funil.
- **`device_id` sem autenticação** (herdada do lab-185) — mesma limitação estrutural, documentada
  em `docs/event-catalog.md`.
- **`weeklyFunnel.planetInteractionCompleted` mede alcance, não frequência/sessão** — ver achado da
  1ª rodada do review acima; documentado, não resolvido (mesmo padrão de `cameraRecenterUsed`).
- **Sistema de NPC com diálogo em planetas continua fora de escopo** — decisão explícita deste lab
  de não reabrir essa frente (ver "Decisões técnicas tomadas" acima); pode virar um lab futuro se o
  backlog priorizar.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — os 6 itens planejados em `FEATURES.md` foram concluídos.

## O que o próximo laboratório deve desenvolver

Seguindo a ordem recomendada por `docs/growth-retention-monetization-backlog.md`, o próximo item é
o **Lab 180 - Missões ambientais de aprendizagem**: transformar parte dos quizzes em desafios
ambientais (alinhar pontes por lógica, abastecer foguete com matemática, decifrar placas por
leitura, abrir portas por padrões), reaproveitando dados existentes de quest/habilidades.

## Estado do repositório ao final

- Branch: `lab-179-planetas-interativos`.
- `npx tsc -b` (app) e `npx tsc --noEmit` (server-accounts): limpos. `npm run test`: app 181/181
  (3 novos, `applyPlanetSecretFound`); server-accounts 144/144 (3 novos, `isValidPlanetInteractionKind`
  + allowlist). `npm run build` (app): limpo, sem regressão de bundle.
- Nenhuma migração de banco — `product_events` já tinha tudo necessário.
- **Verificado ao vivo contra produção** (`wrangler dev` local, banco de PRODUÇÃO real, só
  leitura): `planet_interaction_completed` com `planetId`/`kind` válidos aceito e gravado
  corretamente (todas as 4 combinações testadas: `collectible`/`visual_secret`/`actionable_object`
  em `marte`); com valor inválido recusado (400, nunca vira linha); `weeklyFunnel.planetInteractionCompleted`
  responde corretamente.
- **Verificação num navegador real bloqueada por um problema de ambiente desta sessão** (não do
  código deste lab) — `npm run dev` trava indefinidamente em "Carregando o mundo 3D…", sem erro no
  console. Isolado com 2 testes antes de desistir: (1) reproduzido IDENTICAMENTE com todas as
  mudanças deste lab stashadas (baseline limpo) — prova que não é bug deste lab; (2) mesmo com o
  cache de dependências do Vite (`node_modules/.vite`) limpo do zero, o próprio passo
  `[optimizer] bundling dependencies...` do Vite trava, ANTES de qualquer código deste app rodar.
  Compensado com `npm run build` (pipeline de bundling inteiramente diferente do dev server,
  completou limpo) e revisão manual cuidadosa do código novo em `World3D.tsx` — achou e corrigiu um
  bug real de orientação: `MeshBuilder.CreateDisc` nasce "de pé" (normal no eixo Z), trocado por um
  cilindro baixo, mesmo padrão já usado pra lagoa/pote de moedas neste arquivo.
