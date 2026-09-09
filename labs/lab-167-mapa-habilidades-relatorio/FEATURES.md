# Laboratório 167 — mapa de habilidades e relatório de aprendizagem

Status: em andamento
Início: 2026-09-09
Fim: -
Commit inicial: dc38da3a5a9a3e59269303aedb95f1fc096d73bc

## Objetivo do laboratório

Último dos 4 itens confirmados pelo usuário nesta sessão
(`docs/market-metrics-engagement-backlog.md`, seção 6, "Lab 166" no documento — **renumerado para
lab-167**, mesmo motivo dos labs 164-166). Sequência completa: ativação de 10 min (164) → catálogo
de eventos (165) → página familiar transparente (166) → este.

Problema citado no documento: "pais pagam mais quando enxergam progresso verificável em
habilidades, não apenas tempo de tela". Escopo do documento: "mapear desafios a habilidades como
lógica, matemática, leitura e resolução de problemas; mostrar resumo no portal familiar e no
relatório semanal."

## Estado atual levantado antes de planejar o escopo

- **Os desafios já têm habilidade mapeada** — nenhum trabalho de categorização novo é necessário:
  `data/quests.ts` (as 30 missões do planeta principal) já tem `type: QuestType` (`'logica' |
  'matematica' | 'leitura'`), dividido igualmente (10 de cada). `data/planetQuests.ts` (as 36
  perguntas de astronomia dos outros planetas) também tem o campo, mas as 36 estão marcadas
  `'logica'` sem distinção real — não é um sinal de habilidade de verdade, é só o formato do tipo
  `Quest` reaproveitado; por isso o mapa de habilidades usa só `data/quests.ts`, nunca
  `planetQuests.ts` (mesmo cuidado de isolamento já registrado pra `completedPlanetQuestIds` vs.
  `completedQuestIds` no `types.ts`: "misturar essas perguntas inflaria a contagem").
- **Dois lugares já mostram progresso, nenhum mostra habilidade**: `ChildProgressPanel`
  (`components/FamilyPortal.tsx`, painel local no `/familia`, lê `localStorage` do mesmo aparelho)
  mostra nível/moedas/missões concluídas/badges, mas nenhum recorte por tipo de desafio. O
  relatório semanal por e-mail (`buildWeeklyProgressEmail`, `server-accounts/src/domain.ts`, lab-119)
  usa `ProgressSummary` (5 números: level/totalXp/coins/questsCompleted/badgesCount, sincronizado
  por `useEntitlement.ts`, `syncProgressSummary`) — também sem recorte por habilidade.

## Funcionalidades planejadas

- [ ] Função pura nova `skillBreakdown(progress: Progress): Record<QuestType, number>`
      (`state/progression.ts`) — conta quantas das 30 missões de `data/quests.ts` em
      `completedQuestIds` são de cada tipo. Testável em isolamento (mesmo padrão de
      `progression.test.ts`).
- [ ] `ChildProgressPanel` (`components/FamilyPortal.tsx`) ganha um recorte por habilidade
      (🧩 Lógica X/10, 🔢 Matemática X/10, 📖 Leitura X/10) + uma linha de "ponto forte" (maior
      contagem) e "pra praticar mais" (menor contagem, só se houver diferença real).
- [ ] `ProgressSummary` (`server-accounts/src/domain.ts`) ganha 3 campos novos —
      `logicaCompleted`/`matematicaCompleted`/`leituraCompleted` — validados por
      `isValidProgressSummary` (mesmo padrão `isPlausibleCount` já usado pros outros campos).
- [ ] `syncProgressSummary` (`state/useEntitlement.ts`) passa a enviar os 3 números novos, usando
      `skillBreakdown`.
- [ ] `buildWeeklyProgressEmail` (`server-accounts/src/domain.ts`) ganha uma seção nova: contagem
      por habilidade, "ponto forte", "pra praticar mais" e uma sugestão de atividade genérica
      ligada à habilidade mais fraca (citado no critério de aceite do documento: "relatório mostra
      pontos fortes, pontos a praticar e atividade sugerida").
- [ ] Testes de domínio novos pra `skillBreakdown` e pra qualquer lógica pura extraída de
      `buildWeeklyProgressEmail` (se a escolha de "ponto forte"/"praticar mais" virar função
      própria, testável sem HTML).

## Fora de escopo (explicitamente citado no documento)

- Diagnóstico clínico, ranking escolar, nota formal, promessa de melhoria acadêmica garantida.
- Recategorizar `data/planetQuests.ts`/quiz surpresa por habilidade — fora do escopo, e misturar
  esses dados infacionaria a contagem sem sinal real (ver "Estado atual" acima).
- Qualquer mudança em `ProgressSummary` além dos 3 campos novos (level/totalXp/coins/etc. continuam
  como estão).
- UI nova de "mapa" visual (gráfico radar, etc.) — só contagem simples por habilidade, mesmo
  espírito minimalista do resto do `ChildProgressPanel`.

## Critérios de aceite (citados do documento, seção 6)

Cada desafio tem habilidade associada (já é verdade, `data/quests.ts`); relatório mostra pontos
fortes, pontos a praticar e atividade sugerida; linguagem é compreensível pra adulto.

## Riscos citados no documento

Parecer avaliação escolar formal (mitigado: linguagem de "força/prática", nunca nota/conceito);
dados insuficientes pra inferências fortes (mitigado: só mostra contagem real, nunca infere
capacidade além do que foi jogado); ansiedade dos pais (mitigado: tom positivo, "pra praticar mais"
em vez de "fraco em").
