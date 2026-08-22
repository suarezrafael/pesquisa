# Contexto — Laboratório 65 — Estação alienígena, alertas de Marte e correção de PWA desatualizado

Preenchido em: 2026-08-22
Commit inicial → final: 6aac19613adc8b076a55b074e77cdfb50da9323d..HEAD

## O que foi feito

1. **Contador de marcianos vivos** (`World3D.tsx`) — `marsEnemyCount`/`setMarsEnemyCount`, espelha
   `aliveEnemyCount` (calculado no mesmo laço de IA que já percorre `marsEnemies` todo quadro) só
   quando o valor muda (`lastMarsEnemyCount`). Renderizado no HUD como "N marciano(s) restante(s)"
   quando `onMarsCombatZone`.
2. **Alerta de perigo por proximidade** — `dangerOverlayRef` (DOM direto, não `useState`, mesmo
   padrão de `debugRef`): opacidade calculada a partir da distância do inimigo vivo mais próximo
   (`nearestEnemyDist`, também computado no mesmo laço), interpolando de 0 (fora de
   `MARS_DANGER_RADIUS=3`) a um máximo dentro de `MARS_ENEMY_ATTACK_RADIUS=1.3`, multiplicado por
   um pulso senoidal (`time`) pra sensação de "piscando". CSS: `.mars-danger-overlay`, vinheta
   radial vermelha, `pointer-events: none`.
3. **Rochas de Marte sem a "bola"** — `rockIndices` (Marte) não inclui mais o índice 11
   (`stone_smallA`, um seixo liso e redondo por design no Kenney Nature Kit); continua em uso no
   planeta principal (`DESERT_ROCK_INDICES`, inalterado). Cada rocha (não-caverna) ganhou um
   colisor esfera invisível embutido (mesmo padrão/constante de proteção já usado nas props do
   planeta principal — `PROP_COLLIDER_PROTRUSION`), parentado em `secondPlanetRoot`.
4. **Morros** (`buildMarsHill`, novo) — dome via `CreateSphere({slice})` (mesma técnica de
   `buildCaveEntrance`), 4 espalhados numa distribuição própria (fase angular diferente das
   rochas), cada um com colisor esfera invisível maior.
5. **Estação alienígena / disco voador** (`buildUfoStation`, novo) — anel de 14 segmentos de
   parede ao redor de um círculo (2 pulados = porta ampla, ~2.9m), cada parede com
   `PhysicsAggregate` própria; casco/domo achatado + bolha de cockpit translúcida por cima (só
   visual); anel luminoso ciano no topo da parede; piso interno decorativo; console/painel de nave
   (base angulada + tela emissiva + botões coloridos), tudo decorativo, sem interação nova.
   Posicionada numa direção fixa (`MARS_UFO_DIR`), com rótulo flutuante "Estação Alienígena".
6. **Correção do PWA desatualizado** (`vite.config.ts`, `main.tsx`, `tsconfig.app.json`) —
   `injectRegister: false` desliga o script de registro auto-injetado; registro manual via
   `virtual:pwa-register` (`registerSW({ immediate: true, onNeedRefresh() { location.reload() } })`)
   força um recarregamento assim que uma versão nova é detectada, em vez de só deixar o novo
   service worker "esperando" pra assumir na próxima navegação por conta própria do usuário.

## Decisões técnicas tomadas

- **Física estática construída DEPOIS de posicionar o `root` na Marte, nunca antes** — bug real
  encontrado e corrigido AINDA durante a implementação (antes de qualquer teste ao vivo): a
  primeira versão de `buildUfoStation` criava as paredes (com `PhysicsAggregate`) num `root` ainda
  solto na origem da cena, só posicionado em Marte pelo código chamador DEPOIS de retornar — os
  colisores estáticos teriam sido "gravados" na posição errada (origem, não Marte). Corrigido
  passando `parent`/`anchorUp`/`radius` pra dentro da função e posicionando `root` como a
  primeiríssima coisa, mesmo padrão já usado pelo Prédio dos Enigmas (`quizTowerBase` posicionado
  antes de qualquer parede/piso).
- **Raio de exclusão da estação recalculado depois de um falso alarme ao vivo** — testando ao vivo,
  uma rocha (`rock_tallA`) parecia atravessar visualmente a estrutura da estação; o raio de
  exclusão original (0.5 rad pras rochas, 0.6 pros morros) era menor que o raio angular da própria
  estação nesse planeta pequeno (`UFO_RADIUS=3.2` num planeta de raio 6 ocupa ~0.56 rad sozinha).
  Aumentado pra 0.8/0.95 rad. Investigando mais a fundo descobri que o objeto "atravessando" na
  verdade era o FOGUETE DE VOLTA (69° de distância angular, mas visível por cima do horizonte
  próximo desse planeta pequeno) — não uma rocha de verdade — mas o raio de exclusão maior
  continua sendo uma margem de segurança sensata, então ficou.
- **"Morros" como props decorativos, não relevo de terreno de verdade** — decisão já registrada em
  `FEATURES.md`: mudar a física do chão de Marte de uma esfera perfeita
  (`PhysicsShapeType.SPHERE`) pra uma malha deformada arriscaria quebrar várias contas que já
  assumem `SECOND_PLANET_RADIUS` como a altura do chão em qualquer direção (posição de inimigos,
  foguete, itens, teleporte). Domos sentados por cima da esfera lisa, com colisor próprio, entregam
  o mesmo resultado visual/de gameplay sem esse risco.
- **PWA: registro manual em vez de confiar no script auto-injetado** — `skipWaiting`/
  `clientsClaim` (já configurados desde o lab-51) fazem o service worker novo ASSUMIR em segundo
  plano, mas isso só muda quem RESPONDE às próximas requisições — não recarrega sozinho a aba já
  aberta, que continua rodando o JS antigo já carregado em memória. `onNeedRefresh` + reload
  explícito fecha esse buraco. Efeito colateral aceito conscientemente: um recarregamento sem
  aviso quando uma versão nova é detectada (aceitável — progresso já é salvo continuamente em
  `localStorage`, perder só a posição de caminhada momentânea é um custo baixo comparado a nunca
  ver as atualizações).

## Pendências / dívidas conhecidas

- **Interior da estação (porta/console de perto) não confirmado com screenshot literal** — a
  estrutura (12 paredes com física, porta de 2 segmentos, console decorativo) foi confirmada por
  inspeção de cena (contagem/nomes de malha corretos) e visualmente de fora (silhueta metálica
  clara com anel luminoso, de vários ângulos), mas tentar posicionar a câmera especificamente
  DENTRO via teleporte de QA (`__debugTeleportExact`) esbarrou numa dificuldade genuína: Marte tem
  raio 6 (bem menor que o planeta principal, raio 13), então qualquer imprecisão no cálculo de uma
  posição "no chão, em pé" via coordenadas exatas tende a deixar a câmera em terceira pessoa
  encravada na curvatura do terreno (mesmo problema, em grau maior, já visto testando outras
  coisas em Marte nesta sessão). Confirmado que existe uma abertura escura na estrutura num dos
  screenshots (indicando a porta), mas sem uma confirmação "andei lá dentro e vi o painel"
  definitiva. Baixo risco — a mesma técnica de colisão/parede já funciona comprovadamente no
  Prédio dos Enigmas.
- **Correção do PWA só será confirmada de verdade quando o usuário testar no celular depois do
  deploy deste laboratório** — o código está correto e builda/typecheca limpo, mas o sintoma
  original ("instalei e ainda tava a versão antiga") só se resolve de fato na prática do lado do
  usuário; não há como simular "um celular com o app já instalado antes desta mudança" a partir
  daqui.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — todos os seis pedidos foram implementados; o único item com confirmação parcial (porta/
interior da estação) está detalhado em "Pendências" acima, não é uma funcionalidade faltando.

## O que o próximo laboratório deve desenvolver

1. Se o usuário testar no celular e a versão antiga ainda aparecer, investigar mais a fundo
   (possivelmente um problema específico de cache do navegador do celular, fora do controle do
   código do app — nesse caso, orientar o usuário a desinstalar e reinstalar o PWA uma vez).
2. Se possível testar num aparelho real (sem a limitação de teleporte de QA), confirmar
   visualmente entrar na estação alienígena e ver o painel de perto.
3. Itens antigos ainda pendentes, sem mudança: confirmar se a recompensa em moeda do combate
   atualiza o HUD; thin instancing (maior alavanca de performance não puxada, desde o lab-53);
   decidir sobre desligar o Fly.io (v1, sem uso desde o lab-54).

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`, a partir de `main`. PR #5 (labs 58-61) ainda aberto —
  este laboratório continua no mesmo PR até o usuário mesclar.
- Como rodar/verificar localmente: `cd app && npm install && npm run dev`.
- Como redeployar o jogo: `cd app && npx vercel --prod --yes` (feito ao final deste laboratório,
  pedido explícito do usuário).
