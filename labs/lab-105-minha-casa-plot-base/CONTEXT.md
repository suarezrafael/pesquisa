# Contexto — Laboratório 105 — Minha Casa (plot base gratuito)

Preenchido em: 2026-08-29
Commit inicial → final: 0f258a85547bfe07c355d1fbb61bcb1377b699a3..HEAD

## O que foi feito
Primeira fatia de "Minha Casa" (`docs/plano-comercial-backend.md`, catálogo Fase E) — escolhida
pelo usuário entre 4 frentes de backlog de produto não implementadas (Minha Casa / Fase F Stripe
produção / e-mail semanal via Resend / múltiplos perfis por família).

- **`app/src/world3d/World3D.tsx`**: nova estrutura fixa "Minha Casa" perto do spawn
  (`houseUp = (-0.35, 1, 0.12)`, espelhada em relação à carteira de estudos que fica em
  `(0.35, 1, 0.12)` — mesma distância do spawn, lado oposto, sem competir com nenhuma das duas).
  Paredes (`houseWalls`, com `PhysicsAggregate` sólido), fundação, porta decorativa e telhado —
  literalmente a mesma técnica de construção das escolinhas de missão (`walls`/`foundation`/`door`/
  `roof`, `settleMeshOnTerrain` com o telhado excluído da amostragem). Rótulo 🏠 (`TextBlock`
  linkado ao telhado, mesmo padrão do `deskLabel`/labels de escola).
- **Gatilho de proximidade** (mesmo bloco de código do gatilho da carteira/loja): `Vector3.Distance`
  contra `houseSurfacePos`, `HOUSE_TRIGGER_DISTANCE = 1.2` (mesmo valor da carteira), histerese via
  `triggered`/`RESET_DISTANCE` — abre `onOpenMyHouseRef.current()`. Sem pose especial (ao contrário
  da carteira, que congela o boneco "sentado" — aqui não há razão pra travar nada).
- **`app/src/world3d/MyHousePanel.tsx`** (novo): painel reaproveitando a estrutura/CSS de
  `AchievementsPanel.tsx` (`.modal`, `.quest-list-modal`, `.quest-list`, `.quest-list-item` — zero
  CSS novo). Mostra 3 itens placeholder ("Cama"/"Mesa e cadeira"/"Planta") com status 🔜 e texto
  "Chega em um próximo laboratório" — não tem lógica de compra/posicionamento.
- **`app/src/App.tsx`**: novo estado `showMyHouse`, prop `onOpenMyHouse={() => setShowMyHouse(true)}`
  passada pro `World3D`, entra em `suspendTriggers` (mesmo padrão de todo outro painel), renderiza
  `<MyHousePanel onClose={...} />` quando aberto.

## Decisões técnicas tomadas
- **Correção de arquitetura feita DURANTE a investigação de código, antes de implementar** (decisão
  tomada nesta sessão, sem pergunta ao usuário — modo automático, decisão de baixo risco reversível):
  a premissa inicial era "casa é um espaço 3D andável de verdade" (consistência com o resto do jogo
  ser uma exploração 3D contínua). Checando o código real das escolinhas antes de implementar,
  descobri que NENHUM prédio deste jogo tem interior andável hoje — a "porta" das escolinhas é só
  decorativa (`door`, colada por fora, sem vão na física), e `walls` é sempre uma caixa SÓLIDA com
  `PhysicsAggregate`. A interação real com QUALQUER prédio/objeto deste jogo é 100% por GATILHO DE
  PROXIMIDADE abrindo um painel 2D (escolas → `QuestModal`, carteira → `AchievementsPanel`, balcão
  da loja → `AvatarShop`). Implementar um vão de porta físico de verdade seria a ÚNICA exceção a
  esse padrão em todo o arquivo — risco maior (mesma classe de bug do lab-93, travar física/posição
  por engano) por um ganho que o próprio documento de origem não pede. Decisão revisada: Minha Casa
  segue o MESMO padrão de todo o resto do jogo — fachada sólida visível de fora, painel 2D novo pra
  interação. Isso também simplificou bastante o escopo real deste laboratório.
- **Posição da casa espelhada em relação à carteira** (`(-0.35, 1, 0.12)` vs. `(0.35, 1, 0.12)`) —
  mesma distância angular do spawn que já se provou segura (a carteira nunca teve problema de
  afundamento/flutuação), lado oposto pra não competir visualmente nem fisicamente com ela.
- **Reaproveitar 100% a paleta de materiais/geometria das escolinhas** (não inventar uma variação
  nova de parede/telhado) — reduz superfície de bug (mesmo código já testado em produção há várias
  labs) e mantém a linguagem visual do jogo coerente (toda estrutura "prédio" parece prédio).

## Pendências / dívidas conhecidas
- Nenhuma nova introduzida por este laboratório — reaproveita padrões já existentes e testados
  (construção de prédio das escolinhas, gatilho de proximidade da carteira/loja).

## Funcionalidades planejadas que NÃO foram concluídas
- Nenhuma das planejadas para ESTE laboratório ficou pendente — todas as 5 (estrutura, rótulo,
  gatilho, painel, wiring) foram concluídas e verificadas ao vivo. O que ficou de fora é o que já
  estava explicitamente fora de escopo desde o início (ver `FEATURES.md`, "Fora de escopo").

## O que o próximo laboratório deve desenvolver
- **Mobília comprável com moeda** — a extensão natural direta: catálogo de itens (cama/mesa/
  cadeira/tapete/planta/luminária, conforme `docs/plano-comercial-backend.md`), provavelmente uma
  aba nova em `AvatarShop.tsx` ou um componente próprio de loja de móveis, unlock por moeda (mesmo
  padrão de `unlockHat`/`unlockGlasses` em `useProgress`). Precisa decidir: os móveis aparecem
  representados de alguma forma no painel `MyHousePanel` (ex.: cada item comprado troca o emoji 🔜
  por ✓, ou ganha uma prévia visual), já que não há cena 3D navegável pra "colocar" fisicamente.
- **Os dois conjuntos temáticos exclusivos de assinante** ("Quarto Espacial" 🚀, "Jardim Encantado"
  🌷) — depende da mobília comprável existir primeiro (mesmo padrão de entitlement já usado em
  chapéus/óculos exclusivos, `entitlementActive`).
- Bug de morros invisíveis (lab-95) continua em aberto, esperando resposta do usuário.

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`
- Como rodar/verificar o que foi construído neste laboratório:
  - `cd app && npm run build` — typecheck + build de produção, confirmado passando sem erros.
  - `cd app && npm run dev`, abrir o jogo, criar um perfil, e em DevTools/console:
    `window.__debugTeleport(-0.35, 1, 0.12)` — teleporta exatamente pra cima de "Minha Casa" e abre
    o painel na hora (`window.__scene.getMeshByName('houseWalls')` confirma a malha/física
    presentes). Sair do raio (`window.__debugTeleport(0, -1, 0)`) e voltar reabre o painel — mesma
    histerese `triggered`/`RESET_DISTANCE` de qualquer outro gatilho deste arquivo.
  - Confirmado ao vivo nesta sessão: casa visível com rótulo 🏠, painel "Minha Casa" abre/fecha/
    reabre corretamente, sem erros de console.
