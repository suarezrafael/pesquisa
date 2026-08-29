# Contexto — Laboratório 110 — Sistema Solar: seleção de planeta + Mercúrio

Preenchido em: 2026-08-29
Commit inicial → final: 4d87f325a1cf63337a013410e3fa16fc14556574..HEAD

## O que foi feito
Pedido direto do usuário: ampliar o mundo do jogo pra incluir os planetas do sistema solar
(hoje só tinha Marte), renderizados sob demanda ao viajar de foguete, com um seletor de destino ao
embarcar. Escopo de cada planeta novo confirmado com o usuário: moedas escondidas, sem combate.
Primeiro de vários laboratórios desta frente — este entrega a arquitetura genérica de múltiplos
destinos + o seletor + Mercúrio (primeiro planeta novo).

- **`app/src/world3d/World3D.tsx`** (refatoração extensa, ~15 pontos de código tocados):
  - Substituído `onSecondPlanet: boolean` por `currentPlanetId: string | null` (`null` = planeta
    principal). Toda checagem MARTE-ESPECÍFICA (combate, inimigos, anel sonoro, item de
    espada/arma só existir na Terra) passou a comparar `currentPlanetId === 'marte'` (ou
    `=== null` pro inverso); a parte GENÉRICA (qual foguete checar, física radial, teleporte)
    passou a usar `currentPlanetId !== null`/o registro de planetas.
  - `secondPlanetBuilt: boolean` → `builtPlanetIds: Set<string>`; `secondPlanetReturnRocket`
    (variável única) → `returnRockets: Map<string, {root, hintLabel}>`.
  - Novo registro `DESTINATION_PLANETS`/`DESTINATION_PLANET_LIST` (id/nome/emoji/raio/centro/
    direção de pouso) — hoje com `marte` (reaproveitando as constantes `SECOND_PLANET_*`
    JÁ EXISTENTES, sem renomear nada nelas) e `mercurio` (constantes novas `MERCURY_*`).
  - `boardRocket(toPlanetId: string | null)`/`landRocket()` reescritos pra ler
    origem/destino do registro genérico em vez de um par fixo de constantes — o aviso de "leve
    espada e arma" e o reset de vida/inimigos ao chegar continuam Marte-específicos
    (`if (toPlanetId === 'marte')`/`if (arrivedPlanetId === 'marte')`), sem mudança nenhuma no
    conteúdo desses blocos.
  - `buildSecondPlanetIfNeeded` renomeada pra `buildMarsIfNeeded` (guarda interna de "já
    construído" removida — agora é responsabilidade do dispatcher `buildPlanetIfNeeded`); corpo
    da função **NÃO MUDOU** nenhuma linha de conteúdo (rochas/cavernas/morros/estação/inimigos
    idênticos).
  - Nova `buildMercuryIfNeeded()`: esfera cinza-acastanhada, crateras (par de discos rasos —
    piso escuro + aro claro — orientados pela normal da superfície, técnica nova pra este
    laboratório), rochas esparsas (mesmos templates glTF de Marte), 6 moedas escondidas (mesmo
    padrão das moedas de pico de montanha do planeta principal), foguete de volta.
  - Novo dispatcher `buildPlanetIfNeeded(id)`.
  - Novo estado local `planetPickerOpen` + ref `boardRocketToRef` (ponte React → closure, mesmo
    padrão inverso de `onOpenAchievementsRef` etc.) — embarcar no foguete PRINCIPAL abre o
    seletor em vez de decolar direto; embarcar em qualquer foguete de RETORNO continua indo
    direto pra casa (único destino possível, sem seletor).
- **`app/src/world3d/PlanetPickerPanel.tsx`** (novo): painel "Pra onde vamos?" — reaproveita
  `.modal-overlay`/`.modal quest-list-modal` (`MyHousePanel`) e `.avatar-shop-grid`/`-item`/
  `-emoji`/`-action` (`AvatarShop`), zero CSS novo.

## Decisões técnicas tomadas
- **Marte não mudou nenhuma linha de comportamento visual/gameplay** — a estratégia inteira da
  refatoração foi: generalizar só o ESTADO (variável única → registro genérico) e os PONTOS DE
  DISPATCH (`boardRocket`/`landRocket`/o gatilho de "E"/o fade de dica), preservando 100% do
  conteúdo das constantes `SECOND_PLANET_*` e do corpo de `buildMarsIfNeeded` intocados. Isso foi
  verificado ao vivo (viagem completa de ida e volta) antes de considerar o laboratório concluído.
- **Sem combate/inimigo em Mercúrio** (confirmado com o usuário, escolhido entre "só exploração
  visual"/"igual Marte"/"moedas sem combate") — decisão que se aplica a TODOS os próximos planetas
  desta frente, não só Mercúrio.
- **Crateras via decalque de geometria, não deformação de malha** — dois discos rasos concêntricos
  (piso escuro por cima de um aro mais claro e um pouco maior) colados na superfície esférica lisa,
  em vez de gerar uma esfera com relevo próprio só pra Mercúrio. Muito mais barato e simples que
  imitar o sistema de `terrainHeight` do planeta principal, e suficiente pra ler como "cratera" na
  escala/distância de câmera do jogo.
- **Achado real de ferramenta de verificação (não um bug do produto)**: a aba de automação do
  navegador ficava `document.hidden` durante os ~9s de voo de foguete, travando o `dt` do Babylon
  (`engine.getDeltaTime()`) e congelando a animação indefinidamente enquanto a aba não tivesse
  foco real do SO. Contornado forçando `engine._deltaTime` manualmente antes de cada chamada
  manual de `scene.render()` — técnica registrada na memória do projeto
  (`browser_automation_frame_throttle.md`) pra reaproveitar em qualquer verificação futura de
  algo que precise de múltiplos quadros reais (não só um estado estático). Não afeta jogadores de
  verdade, só ambiente de automação sem foco de janela real.

## Pendências / dívidas conhecidas
- Nenhuma nova.

## Funcionalidades planejadas que NÃO foram concluídas
- Nenhuma das planejadas para este laboratório — as 6 concluídas e verificadas ao vivo (arquitetura
  genérica, seletor, Mercúrio, regressão de Marte, build/testes limpos).

## O que o próximo laboratório deve desenvolver
- **Vênus** — planeta rochoso interno como Mercúrio, mas com atmosfera espessa amarelo-alaranjada
  (visualmente: um "shell" translúcido levemente maior que o chão, cor amarelo-enxofre) e
  temperatura extrema — mesmo padrão de moedas escondidas, sem combate.
- **Júpiter/Saturno** — gigantes gasosos, precisam de faixas horizontais (`DynamicTexture`
  procedural, já usado no projeto pra chama do foguete/gota de chuva — nunca usado ainda pra
  textura de PLANETA) e, no caso de Saturno, anéis (viável com `MeshBuilder.CreateTorus` achatado
  no eixo Y, mesma técnica já usada no anel sonoro de combate de Marte, só numa escala bem maior).
- **Urano/Netuno** — gigantes de gelo, cor azul-esverdeada/azul profundo, possivelmente eixo de
  rotação/pouso visualmente "tombado" pra Urano (característica real bem reconhecível).
- Bug de morros invisíveis (lab-95), secrets do lab-104 e corte de DNS do lab-109 continuam em
  aberto, esperando o usuário.

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`
- Como rodar/verificar o que foi construído neste laboratório:
  - `cd app && npm run test` — 44 testes, sem mudança de contagem (nenhuma lógica de domínio pura
    tocada — tudo aqui é `World3D.tsx`, fora do escopo dos testes automatizados do projeto).
  - `cd app && npm run build` — typecheck + build de produção, sem erros.
  - `cd app && npm run dev`, `window.__debugTeleport(-0.3797213687147455, -0.913545457642601,
    0.14576137678401327)` (dev-only) pra chegar perto do foguete principal, apertar "E" abre o
    seletor "Pra onde vamos?" com Marte/Mercúrio — escolher um e segurar "W" (~9s) decola/pousa;
    no planeta-destino, "E" perto do foguete de volta leva direto pra casa sem seletor nenhum.
