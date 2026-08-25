# Contexto — Laboratório 93 — carteira de estudos (boneco senta) + catálogo de conquistas

Preenchido em: 2026-08-25
Commit inicial → final: 71ad5341d53b8a130f0cd38bc19a5ff319607a8b..HEAD

## O que foi feito
- **`app/src/state/progression.ts`**: `BADGE_FIRST_QUEST`/`BADGE_HALFWAY`/`BADGE_ALL_DONE`
  exportadas (eram `const` privadas) — fonte única de verdade pro novo catálogo.
- **`app/src/data/achievements.ts`** (novo): `ACHIEVEMENT_CATALOG`, 3 entradas (mesmos badges já
  emitidos por `badgesEarnedAt`), cada uma com emoji + descrição de como ganhar (a de "Metade do
  Caminho" calcula `Math.ceil(quests.length / 2)` dinamicamente, não um número fixo).
- **`app/src/world3d/AchievementsPanel.tsx`** (novo): mesma estrutura de `QuestListOverlay.tsx`,
  reaproveitando as classes CSS `.quest-list`/`.quest-list-item`/etc. já existentes sem precisar
  de CSS novo — encaixe quase 1:1 com o formato de exibição já usado pra lista de missões.
- **`app/src/world3d/World3D.tsx`**: geometria da carteira (mesa + livro decorativo + 2 pernas
  cilíndricas; banquinho + 2 pernas, mesmo vocabulário de primitivas das escolinhas), posicionada
  perto do spawn (`deskUp = (0.35, 1, 0.12).normalize()`, deslocada o bastante do ponto de
  chegada), assentada no terreno com `settleMeshOnTerrain` (mesma função das escolas). Label
  flutuante 🏆 igual ao número das escolas. Gatilho de proximidade (`DESK_TRIGGER_DISTANCE = 1.2`,
  raio intermediário entre o das escolas e o do quiz) chama `onOpenAchievements` e congela a pose
  sentada nos pivôs do boneco.
- **`app/src/App.tsx`**: `showAchievements` state, prop `onOpenAchievements`, `AchievementsPanel`
  renderizado condicionalmente, incluído em `suspendTriggers`.
- **Deploy em produção** do frontend.

## Bug real encontrado e corrigido durante o teste ao vivo (o achado mais importante deste laboratório)
A primeira versão gateava o **bloco inteiro** de física/movimento do jogador local por
`sittingAtDesk`:
```
if (!drivingCar && !drivingRocket && !sittingAtDesk) { /* gravidade, input, física, pose... */ }
```
Isso parecia certo por analogia com `drivingCar`/`drivingRocket` (mesmo "corpo congelado" que o
carro já faz), mas tem uma diferença importante: sair do carro é um evento explícito (tecla `E`,
um handler separado que zera `drivingCar` diretamente) — não depende de nada dentro do bloco que
acabou de ser desligado. Sair da carteira, por outro lado, é só o jogador ANDAR embora (gatilho de
distância, sem tecla) — e o código que lê o teclado/aplica velocidade/atualiza a posição do avatar
(o que permitiria "andar embora" de verdade) **estava dentro do mesmo bloco que ficou desligado**.
Resultado: o jogador ficava **fisicamente preso na carteira pra sempre** — nem `RESET_DISTANCE`
conseguia disparar, porque a posição do avatar parava de ser atualizada por input assim que
sentava. Um soft-lock real, não cosmético.

**Como foi descoberto**: testado ao vivo teleportando o avatar pra longe da carteira
(`window.__debugTeleport`, hook de QA já existente) e observando `window.__playerFigure.
legPivotL.rotation.x` — continuava travado em `-1.1` (valor da pose sentada) mesmo depois de
distâncias grandes e múltiplas tentativas de mover via tecla. Isolado com um debug hook temporário
(`window.__debugSittingAtDesk()`, removido antes do commit) que confirmou: mesmo com o avatar
fisicamente teleportado pra longe, `sittingAtDesk` nunca voltava a `false`, porque o código que
verificaria a distância pra limpar essa flag dependia de uma posição que só o próprio bloco
desligado atualizaria — um ciclo fechado sem saída.

**Correção**: o gate `!sittingAtDesk` saiu da condição externa (física/input voltam a rodar
sempre, como antes deste laboratório) e entrou só na recalculagem da POSE de caminhada
(2 linhas: `if (sittingAtDesk) { /* não mexe */ } else if (moving) { ... } else { decai... }`).
Física, gravidade e leitura de teclado continuam sempre ativos — o jogador sempre consegue andar
embora. A única coisa congelada enquanto sentado é o ÂNGULO dos pivôs (visual), não a posição real
do personagem.

## Como foi verificado (metodologia real, não só o resultado)
Sessões de teste anteriores neste mesmo laboratório mostraram "0 FPS" no HUD de debug do jogo —
`requestAnimationFrame` genuinamente pausado/faminto no ambiente de automação do navegador (mesmo
padrão já registrado na memória "Browser automation frame throttle"). Isso produziu vários
falsos-negativos ao longo da investigação (ex.: um teste de missão que "não disparou" por causa de
dados de progresso malformados no teste, não um bug de verdade — `completedQuestIds` usando `'q1'`
em vez do formato real `'q01'`). A confirmação definitiva só veio numa sessão onde o HUD mostrou
"1 FPS" (frames genuinamente correndo, ainda que devagar) — nela, `window.__debugSittingAtDesk()`
mostrou a transição `true → false` corretamente ao se afastar, confirmando que a lógica de
`sittingAtDesk`/`RESET_DISTANCE` está correta. A recalculagem VISUAL da pose (decaimento gradual
de volta pra postura normal) não foi reconfirmada quadro a quadro depois da correção — é código
JÁ EXISTENTE, não modificado por este laboratório (o mesmo `else { rotation *= 0.8 }` usado há
vários laboratórios pra qualquer transição de pose) — confiança nele vem de já estar em produção,
não de reteste específico aqui.

## Decisões técnicas tomadas
- **Carteira é objeto FIXO e compartilhado, não mobília comprável/posicionável.** Decisão de
  escopo explícita (ver `FEATURES.md`) — "Minha Casa" (o sistema completo, já planejado em
  `docs/plano-comercial-backend.md`) é maior que uma iteração; forçar esse sistema inteiro só pra
  colocar uma carteira teria inflado um pedido pequeno.
- **Painel de conquistas reaproveita CSS existente sem nenhuma classe nova.** O formato ícone+nome
  +descrição+status de `.quest-list-item` já encaixava exatamente — criar um visual próprio seria
  trabalho sem necessidade real.
- **Sit pose só congela a POSE, nunca a física/posição.** A lição principal deste laboratório —
  ver seção do bug acima. Generalizável pra qualquer feature futura que precise de um "estado
  parado" visual sem travar o jogador de verdade.
- **Debug hooks temporários (`__debugSuspend`, `__debugSittingAtDesk`) usados só durante a
  investigação, removidos antes do commit final** — não fazem parte do escopo planejado, foram
  scaffolding de diagnóstico. `window.__debugTeleport`/`__debugTeleportExact` (já existentes,
  lab-39) foram essenciais pra isolar o bug sem depender de conseguir andar de verdade no ambiente
  de automação.

## Pendências / dívidas conhecidas
- Nenhuma nova além do já listado como fora de escopo no `FEATURES.md` (Minha Casa completa,
  transição de pose animada em vez de congelada).

## Funcionalidades planejadas que NÃO foram concluídas
- Nenhuma do escopo definido no `FEATURES.md` deste laboratório ficou de fora — o bug encontrado
  foi corrigido dentro do próprio laboratório, não adiado.

## O que o próximo laboratório deve desenvolver
Item 4 do pedido maior do usuário (`labs/CURRENT.md`): brinde ao vencer o chefe de Marte (ETs +
robô) — vira um colecionável exclusivo in-game (pesquisa de mercado já feita no lab-91: tendência
de colecionáveis/trading-card-style no Brasil). Com isso, os 4 itens do pedido maior do usuário
registrado desde o lab-91 estarão completos.

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`
- Frontend deployado em produção (`https://missaoaprendizado.com`,
  `app-two-flax-92.vercel.app`) com a carteira de estudos.
- Como verificar: `cd app && npm run test` (36 testes) e `npx tsc -b` (limpo). Pra reproduzir a
  verificação ao vivo: abrir o dev server, usar `window.__scene.getTransformNodeByName('carteira-
  estudos')` pra achar a posição, `window.__debugTeleportExact(x,y,z)` pra ir até lá, e observar
  `window.__playerFigure`/o painel no DOM.
