# Laboratório 110 — Sistema Solar: seleção de planeta + Mercúrio

Status: concluído
Início: 2026-08-29
Fim: 2026-08-29
Commit inicial: 4d87f325a1cf63337a013410e3fa16fc14556574

## Objetivo do laboratório
Pedido direto do usuário: "ampliar o mundo do jogo... ter os planetas do sistema solar, como já
tem Marte, pode fazer outros planetinhas, que só renderiza no momento que viajamos pra lá de
foguete, então ao entrar no foguete temos que escolher o planetinha, deve ter todos os planetas do
sistema solar, com características visuais reais deles." Escopo de cada planeta NOVO confirmado
com o usuário: moedas escondidas pra incentivar exploração, SEM combate/inimigos (Marte continua
sendo o único planeta com ETs/robôs/health bar — não muda).

Dado o tamanho (6 planetas novos: Mercúrio, Vênus, Júpiter, Saturno, Urano, Netuno — Terra é o
planeta principal, Marte já existe), este é o PRIMEIRO de vários laboratórios: aqui entra a
arquitetura de múltiplos destinos (hoje é um `boolean onSecondPlanet` fixo, só Marte) + o seletor
de planeta ao embarcar no foguete + o primeiro planeta novo (Mercúrio), provando o sistema
genérico com 2 destinos reais antes de escalar pros outros 5.

## Investigado antes de planejar
- `app/src/world3d/World3D.tsx`: arquitetura atual do "segundo planeta" é um `boolean
  onSecondPlanet` (nunca pensado pra mais de um destino) + `buildSecondPlanetIfNeeded()`
  (hardcoded pra Marte: rochas, cavernas, morros, estação alienígena, inimigos) +
  `boardRocket()`/`landRocket()` (`toSecondPlanet: boolean`) + constantes fixas
  (`SECOND_PLANET_CENTER`/`RADIUS`/`LANDING_UP`). Embarcar hoje é IMEDIATO ao apertar "E" perto do
  foguete (`handleInteractPress`, sem painel/escolha) — precisa virar um seletor quando há mais de
  um destino disponível.
- Confirmado que os avisos/estado de combate de Marte (`marsHealthRef`/`marsEnemies`/
  `onMarsCombatZone`/aviso de "leve espada e arma") ficam TODOS dentro do `if (arrivedAtSecondPlanet)`
  de `landRocket` — dá pra manter isso Marte-específico (`if (planetId === 'marte')`) sem tocar no
  comportamento de Marte, só generalizando o resto (posição/raio/rocket de retorno) por planeta.
  Ver `docs/prompts/03-arquitetura-sistema.md`.
- Padrão de moeda escondida já existe (`PLATEAU_CENTERS.forEach` perto da linha 5669) — pivot +
  `alignmentQuaternion` + `coins.push({pivot, mesh, worldPos, collected: false})`, coletado pelo
  mesmo laço genérico de física (`Vector3.Distance(pos, coin.worldPos)`) que já funciona em
  qualquer planeta, sem mudança nenhuma — `pos` é sempre posição ABSOLUTA do avatar (já inclui o
  deslocamento pro centro de Marte hoje), reaproveitável tal e qual pra Mercúrio.
- `propTemplates` (glTF de rocha, índices 6-10) já usados por Marte/deserto — reaproveitáveis pra
  Mercúrio sem carregar nenhum asset novo.
- `DynamicTexture` já usado no projeto (chama/partícula de foguete) — confirma que dá pra gerar
  textura procedural (útil nos próximos laboratórios pra faixas de Júpiter/Saturno/Urano/Netuno,
  não usado neste laboratório — Mercúrio é só cor sólida + crateras via geometria).

## Decisões técnicas tomadas
- **Marte não muda em NADA visual/de gameplay** — a refatoração generaliza a estrutura de dados
  (`currentPlanetId: string | null` no lugar de `onSecondPlanet: boolean`, um `Map` de foguetes de
  volta no lugar de uma variável única), mas o corpo de `buildSecondPlanetIfNeeded` continua
  literalmente o mesmo código, só movido pra dentro de um `case 'marte':` — zero risco de regressão
  visual, verificado ao vivo comparando com o que já existia.
- **Seletor de planeta só aparece no foguete da Terra (planeta principal)** — embarcar em Mercúrio/
  Marte pro retorno continua direto (só existe UM destino possível: casa), sem painel nenhum, exatamente
  como funciona hoje.
- **Painel novo (`PlanetPickerPanel.tsx`) local ao `World3D`**, mesmo padrão de `WeaponBagPanel`
  (estado React local dentro do próprio componente, não subido pra `App.tsx` — o foguete e a
  escolha de destino são inteiramente uma preocupação da cena 3D, sem nada que o resto do app
  precise saber).
- **Mercúrio sem combate/inimigos** (confirmado com o usuário) — só terreno + crateras + rochas
  esparsas + moedas escondidas + foguete de volta. Características visuais reais: cinza-acastanhado
  (sem atmosfera pra dar cor ao céu — mas o céu já é compartilhado/global, fora de escopo trocar),
  MUITO craterizado (o traço mais reconhecível de Mercúrio — sem vento/água pra apagar crateras
  antigas), sem vegetação nenhuma, raio menor que Marte (é o menor planeta do sistema solar).
- **Posição no espaço**: `MERCURY_CENTER` num eixo diferente de `SECOND_PLANET_CENTER` (Marte),
  bem afastado — cada planeta só é construído/visitado a partir do planeta principal (nunca voa-se
  direto de um planeta secundário pro outro), então não precisam estar "perto" um do outro, só
  longe o bastante do planeta principal pra não competir visualmente.

## Funcionalidades planejadas
- [x] Generalizar o estado de planeta atual (`currentPlanetId: string | null`, `builtPlanetIds`,
      `Map` de foguetes de retorno) — Marte migrado pro novo formato sem mudar comportamento.
- [x] `boardRocket(toPlanetId: string | null)`/`landRocket()` atualizados pro novo formato.
- [x] Registro de planetas de destino (`id`/`nome`/raio/posição/direção de pouso) — Marte + Mercúrio
      cadastrados (`DESTINATION_PLANETS`).
- [x] `PlanetPickerPanel.tsx` (novo): painel simples mostrando os destinos disponíveis (nome +
      emoji + botão "Viajar"); aparece ao apertar "E" perto do foguete principal, reaproveita
      `.modal-overlay`/`.avatar-shop-*` (zero CSS novo).
- [x] Mercúrio: esfera cinza-acastanhada, 13-14 crateras (decalques de disco de aro + piso
      recuados), rochas esparsas (mesmos templates de Marte), 6 moedas escondidas, foguete de
      volta com rótulo — tudo sem combate/inimigo, confirmado com o usuário.
- [x] Verificação ao vivo (dev server + browser automation, viagem completa de ida e volta pros
      dois destinos): Marte continua IDÊNTICO — health bar cheia, "5 marcianos restantes", anel
      sonoro pulsando, estação alienígena, foguete de volta, tudo confirmado presente depois da
      viagem; seletor mostra corretamente "Marte 🔴"/"Mercúrio ☿️"; viagem completa pra Mercúrio
      confirmada por inspeção direta da cena (13 crateras, 6 moedas, foguete de volta todos
      presentes) E visualmente (screenshot); volta de Marte pra casa confirmada (anel sonoro
      desativado, HUD de combate some, aterrissagem correta perto do foguete principal). Sem erro
      de console em nenhuma etapa. **Achado da verificação, não um bug do jogo**: a aba de
      automação ficou `document.hidden` durante os voos (rAF do Babylon trava nesse estado),
      exigindo forçar `engine._deltaTime` manualmente pra completar os ~9s de voo simulado —
      técnica registrada na memória do projeto (`browser_automation_frame_throttle`) pra reuso
      futuro; não afeta jogadores reais (só ocorre em aba de automação sem foco real).

## Fora de escopo (explicitamente adiado)
- Vênus, Júpiter, Saturno, Urano, Netuno — próximos laboratórios desta mesma frente.
- Qualquer combate/inimigo/estrutura temática em Mercúrio (ou nos planetas futuros) — decisão do
  usuário: só moedas escondidas.
- Texturas proceduráticas de faixas (Júpiter/Saturno/Urano/Netuno) e anéis (Saturno) — não
  precisam ainda pra Mercúrio, ficam pro laboratório que construir esses planetas.
