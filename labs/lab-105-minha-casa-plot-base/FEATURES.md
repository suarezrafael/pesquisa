# Laboratório 105 — Minha Casa (primeira fatia: plot base gratuito)

Status: concluído
Início: 2026-08-29
Fim: 2026-08-29
Commit inicial: 0f258a85547bfe07c355d1fbb61bcb1377b699a3

## Objetivo do laboratório
Construir a PRIMEIRA fatia de "Minha Casa" (`docs/plano-comercial-backend.md`, catálogo de
cosméticos Fase E, item ainda não construído — escolhido pelo usuário entre 4 frentes de backlog
de produto não implementadas: Minha Casa / Fase F Stripe produção / e-mail semanal via Resend /
múltiplos perfis de criança por família). O documento de origem já avisa que o sistema completo
"viraria seu próprio laboratório dado o tamanho" — este laboratório entrega só a base: um plot/casa
FIXO, GRATUITO pra todo jogador (mesmo princípio já aplicado em progressão/cooperação: nunca gatear
conteúdo social/de exploração atrás de assinatura, só cosmético) — fachada 3D sólida perto do spawn
mais um painel 2D acessado por proximidade (ver correção de arquitetura abaixo). Mobília comprável
com moeda e os dois conjuntos exclusivos de assinante ("Quarto Espacial" 🚀, "Jardim Encantado" 🌷)
ficam para laboratórios seguintes.

## Investigado antes de planejar
- `docs/plano-comercial-backend.md` (linhas 130-184): especifica plot gratuito + mobília avulsa
  comprável com moeda + 2 conjuntos temáticos exclusivos de assinante; "modo visita" (ver casa de
  amigo) é P2 explícito, fora de escopo até revisão de segurança infantil equivalente ao quick-chat.
- Precedente mais próximo já construído: `labs/lab-93-carteira-de-estudos-e-conquistas/` — objeto
  FIXO único perto do spawn (`terrainGroundRadial` + `settleMeshOnTerrain`), gatilho de proximidade
  abre uma interação, pose "sentado" congela só a pose do boneco (nunca física/input/posição — bug
  real encontrado e corrigido lá quando a primeira versão gateava o bloco inteiro). Mesma lição se
  aplica aqui: entrar/sair da casa deve mexer só em câmera/estado visual, nunca travar o loop de
  física.
- Precedente de estrutura com interior andável: as escolinhas de missão (`World3D.tsx`, paredes +
  telhado + professor) já são "prédios" que o boneco entra fisicamente hoje — `settleMeshOnTerrain`
  já sabe excluir telhado/professor da amostragem de altura (`excludeFromSampling`, lição do lab-95:
  incluir peças que não tocam o chão distorce o assentamento do prédio inteiro). Minha Casa reusa
  esse padrão de construção (paredes+telhado+chão assentados no terreno), não o padrão mais simples
  da carteira (objeto decorativo sem interior).
- **Correção de arquitetura feita DURANTE a investigação de código, antes de implementar**: a
  premissa inicial ("espaço 3D andável de verdade") foi checada contra o código real das escolinhas
  e não se sustentou. NENHUM prédio deste jogo tem interior andável hoje — escolas são uma caixa
  SÓLIDA (`PhysicsAggregate(walls, PhysicsShapeType.BOX, ...)`, sem vão de porta na física, só um
  `door` decorativo colado por fora) e a interação é 100% por GATILHO DE PROXIMIDADE que abre um
  painel 2D (escolas → `QuestModal`; carteira → `AchievementsPanel`; balcão da loja → `AvatarShop`
  — todos no mesmo padrão de `Vector3.Distance` + histerese gatilho/reset em `World3D.tsx`). Inventar
  física de porta/interior andável seria a única exceção a esse padrão em todo o arquivo — risco
  maior (mesma classe de bug do lab-93: travar física/posição por engano) pra um ganho que o
  documento de origem nem pede ainda. **Decisão revisada**: Minha Casa segue o MESMO padrão —
  fachada 3D sólida e visível de fora (mesma técnica de construção das escolinhas: paredes+telhado+
  fundação assentados via `terrainGroundRadial`/`settleMeshOnTerrain`/`excludeFromSampling`), gatilho
  de proximidade abre um painel 2D novo (`MyHousePanel`) — a "decoração"/mobília deste primeiro
  laboratório vive no PAINEL, não dentro de uma cena 3D navegável.

## Funcionalidades planejadas
- [x] Estrutura fixa "Minha Casa" perto do spawn (perto da carteira de estudos, mas sem competir
      posicionalmente com ela nem com o ponto de chegada) — paredes, telhado, fundação, porta
      decorativa — reaproveita literalmente o padrão de construção das escolinhas (`walls`
      sólida com `PhysicsAggregate`, `settleMeshOnTerrain` com telhado excluído da amostragem).
- [x] Rótulo/indicador visual (mesmo padrão da carteira: `TextBlock` com emoji, `linkWithMesh`) —
      🏠 sobre a casa, visível de longe.
- [x] Gatilho de proximidade (mesmo padrão do balcão da loja/carteira — `Vector3.Distance` +
      histerese gatilho/reset) abre um painel novo `MyHousePanel.tsx` — sem pose especial
      congelada (não há razão pra travar o boneco aqui, ao contrário da carteira que simula
      "sentado").
- [x] `MyHousePanel.tsx`: painel simples (reaproveita CSS/estrutura de `AchievementsPanel.tsx`)
      apresentando a casa como espaço pessoal gratuito do jogador, com aviso de que móveis
      compráveis chegam em um próximo laboratório — sem lógica de compra/posicionamento ainda.
- [x] Wiring em `App.tsx`: novo estado `showMyHouse`, prop `onOpenMyHouse` pro `World3D`, entra em
      `suspendTriggers` (mesmo padrão de todo outro painel).
- [x] Verificação ao vivo (dev server local + browser automation, teleporte de QA
      `window.__debugTeleport`, dev-only): casa aparece na cena (`scene.getMeshByName('houseWalls')`
      confirmado, `physicsBody` estático presente), painel abre exatamente ao chegar na posição da
      casa, fecha ao clicar em ×, reabre só depois de teleportar pra longe e voltar (histerese
      `triggered`/`RESET_DISTANCE` confirmada funcionando). `npm run build` (typecheck + produção)
      passou sem erros.

## Fora de escopo (explicitamente adiado)
- Mobília comprável com moeda (loja de móveis) — próximo laboratório desta frente.
- Os dois conjuntos temáticos exclusivos de assinante ("Quarto Espacial", "Jardim Encantado") —
  requer o sistema de mobília comprável existir primeiro.
- "Modo visita" (ver a casa de um outro jogador) — P2 explícito no documento de origem, precisa de
  revisão de segurança infantil própria antes de qualquer implementação.
- Persistência de posição de mobília customizada (não existe ainda mobília móvel neste laboratório).
