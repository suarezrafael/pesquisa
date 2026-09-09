# Contexto — Laboratório 164 — jornada de ativação de 10 minutos

Preenchido em: 2026-09-09
Commit inicial → final: ad1944e0cfce007c73e0002eddf77cef72cbc58d..(PR aberto, ver seção final)

## O que foi feito

Primeiro item do backlog guiado por métricas (`docs/market-metrics-engagement-backlog.md`),
renumerado de "Lab 163" no documento pra lab-164 real deste repositório.

- **Marcador visual "comece aqui"** (`world3d/World3D.tsx`): um feixe de luz vertical emissivo
  (cilindro fino, `GlowLayer` já existente na cena faz o brilho) acima da escolinha de `quests[0]`
  (`q01`, sempre desbloqueada — `isQuestUnlocked`), criado logo depois do laço `quests.forEach` que
  monta as 30 escolinhas do planeta principal. Pulso suave de brilho (`Math.sin`) no mesmo
  `scene.onBeforeRenderObservable` que já anima chuva/nuvens.
- **Visibilidade do marcador**: `applyActivationBeaconVisual()`, chamada no mesmo gatilho que já
  recolore os telhados por missão (`applyPortalVisual`/`__refreshPortals`, disparado pelo
  `useEffect` em `[progress]`) — visível só quando `progress.completedQuestIds.length === 0`; some
  pra sempre assim que a primeira missão é respondida, sem precisar de estado novo (deriva do
  progresso já persistido).
- **Instrumentação fina de ativação** (`productAnalytics.ts`): três eventos novos, cada um disparado
  no máximo uma vez POR SESSÃO (flag em memória, não `localStorage` — mede fricção de carregamento
  a cada sessão, inclusive de jogador veterano, não só ativação de perfil novo):
  - `trackFirstControl()` — chamado de `World3D.tsx` no primeiro frame em que o vetor de movimento
    combinado (teclado + joystick) é diferente de zero.
  - `trackFirstLearningChallenge()` — chamado de `App.tsx`, `handleSelectQuest`, na primeira missão
    aberta da sessão.
  - `trackFirstReward(isFirstQuestEver)` — chamado de `state/useProgress.ts`, `completeQuest`, na
    primeira conclusão GENUÍNA de missão da sessão (mesmo guard `wasAlreadyCompleted` que já protege
    `trackQuestCompleted`). `isFirstQuestEver` (`completedQuestIds.length === 0` ANTES desta
    conclusão) decide se soma o evento combinado `activation_cycle_completed` — só quando é
    realmente a primeira missão da vida do perfil E dentro dos 10 minutos da sessão atual.
  - `PRODUCT_EVENT_TYPES` (`server-accounts/src/domain.ts`) ganhou os 4 tipos novos na allowlist —
    sem isso o Worker rejeitaria os eventos com 400 (`isValidProductEventType`).

## Decisões técnicas tomadas

- **Feixe de luz, não seta/trilha**: o documento sugeria "seta/holograma/trilha" — escolhido um
  feixe vertical simples por ser a opção mais barata de implementar com a infraestrutura já
  existente (a `GlowLayer` da cena já ilumina material emissivo, mesmo mecanismo dos telhados) e
  visível de qualquer ângulo/distância no planeta pequeno, sem precisar de lógica de
  apontamento/bússola relativa à câmera.
- **`quests[0]` como "primeira missão"**: não foi criada nenhuma quest nova — `quests[0]` (`q01`,
  "Sequência Misteriosa") já é sempre desbloqueada desde o início (`isQuestUnlocked`), então serve
  como o objetivo guiado sem nenhuma mudança de dado.
- **Eventos por SESSÃO, não por PERFIL**: `time_to_first_control`/`time_to_first_learning_challenge`/
  `time_to_first_reward` disparam pra qualquer jogador (novo ou veterano) uma vez por sessão —
  interpretação deliberada: como `lab-165` (catálogo de eventos/dashboard) ainda não existe, a
  cohort "perfil novo" vai ser filtrada na análise depois (por `session_start`/idade do perfil), não
  aqui; medir sempre também serve pra detectar regressão de desempenho/fricção em jogadores
  antigos. Só `activation_cycle_completed` exige de verdade `isFirstQuestEver` — esse é o único que
  representa literalmente "perfil novo ativado".
- **Sem endpoint/schema novo no backend**: diferente do lab-163 (que precisou de migração), este
  lab só estende uma allowlist de strings já existente (`PRODUCT_EVENT_TYPES`) — sem tabela nova,
  sem coluna nova, sem risco de quebrar nada em produção que já funciona hoje.

## Achado ao verificar ao vivo (ambiente de automação)

Confirmado (ver seção seguinte) que o navegador de automação sofre a MESMA limitação já documentada
em labs anteriores (135/140/141/146/162, ver `[[browser_automation_frame_throttle]]` na memória): a
aba perde o foco real do sistema operacional, o `requestAnimationFrame`/`scene.onBeforeRenderObservable`
do Babylon fica parado, e um evento de teclado sintético sozinho não é suficiente pra disparar o
loop de jogo. Forçar `engine._deltaTime` + uma chamada manual de `scene.render()` (técnica já
registrada na memória) resolveu — o próximo tick do loop rodou de verdade e disparou o `fetch` pro
Worker no exato instante certo.

## Verificação ao vivo (`npm run dev`, Chrome real via automação)

1. **Marcador visual**: perfil de teste real (`LabTester`, `completedQuestIds: []`) mostrou o feixe
   de luz dourado saindo do telhado roxo da escolinha "1" (zoom confirmado por screenshot). Editado
   `completedQuestIds` pra `['q01']` diretamente no `localStorage` + reload: o feixe desapareceu por
   completo (só o brilho normal do telhado "concluído" ficou, mesmo comportamento de
   `applyPortalVisual`). `localStorage` restaurado pro estado original (`[]`) ao final — nenhum dado
   real do perfil de teste foi alterado permanentemente.
2. **Instrumentação**: `window.fetch` interceptado via monkey-patch pra capturar chamadas sem
   depender de conectividade real (este ambiente de automação não tem acesso à internet — `fetch`
   pra qualquer host externo falha com `TypeError: Failed to fetch`, confirmado tentando `GET
   /health` diretamente). Disparado um `keydown`/`keyup` sintético de `w` + um `scene.render()`
   forçado (técnica acima): exatamente 1 chamada capturada, pro endpoint certo
   (`.../events`), no exato momento do frame forçado — confirma que `trackFirstControl()` dispara
   na hora certa, mesmo sem poder confirmar o corpo exato da requisição nem a resposta do servidor
   (bloqueados pela falta de rede real deste ambiente, não por bug de código).
3. **Não verificado ao vivo**: `trackFirstLearningChallenge`/`trackFirstReward`/
   `activation_cycle_completed` — mesma limitação de rede/foco; a lógica é estruturalmente idêntica
   à de `trackFirstControl` (já confirmada) e à de `trackQuestCompleted`/`trackPlayClick` (já
   provados em produção há vários labs), então a confiança vem de revisão de código + os testes
   automatizados, não de uma chamada de rede real observada.

## Pendências / dívidas conhecidas

- Nenhuma nova. O catálogo de eventos/dashboard (lab-165) é quem vai efetivamente LER esses eventos
  novos — até lá, eles só acumulam na tabela `product_events` sem análise automatizada.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — todos os itens do `FEATURES.md` deste laboratório foram concluídos.

## O que o próximo laboratório deve desenvolver

**lab-165** — catálogo de eventos e dashboard semanal de produto (doc: "Lab 164"), conforme
sequência já confirmada pelo usuário e registrada em `labs/CURRENT.md`. Deve documentar a taxonomia
completa de eventos (incluindo os 4 novos deste lab) e construir a leitura/agregação que hoje não
existe — os eventos deste lab-164 já estão sendo gravados, mas ninguém ainda os lê de volta.

## Estado do repositório ao final

- Branch: a definir no momento do commit (mesmo padrão do lab-163 — branch de PR a partir de
  `main`, sem worktree nesta sessão).
- `npx tsc -b` (app): limpo. `npm run test` (app): 136/136 (sem teste novo — mudanças de
  UI/loop de render/hook de efeito, fora do escopo de domínio puro coberto pelos testes do app).
  `npm run build` (app): limpo, `World3D-*.js` manteve o mesmo tamanho de chunk (~650KB, sem
  regressão perceptível pela adição de um cilindro/material). `npx tsc --noEmit`/`npm run test`
  (server-accounts): limpo, 97/97 (1 novo).
- Ver seção "Verificação ao vivo" acima pro que foi confirmado num navegador real via automação.
