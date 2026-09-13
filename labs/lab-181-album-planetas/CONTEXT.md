# Contexto — Laboratório 181 — Circuito de descoberta e álbum de planetas

Preenchido em: 2026-09-13
Commit inicial → final: 57e52fc5fce618db0099fe6f004e014e0b4632f2..(commit deste lab, ver PR)

## O que foi feito

- Duas funções puras novas em `app/src/state/progression.ts`:
  - `planetDiscoverySlots(planetId, progress)` — devolve os 3 slots de descoberta de um planeta
    (`collectible`/`actionable_object`/o 3º que varia entre `educational_quiz` e `visual_secret`),
    cada um com `discovered: boolean`, cruzando os 4 catálogos já existentes
    (`postcards.ts`, `treasureChests.ts`, `planetSecrets.ts`, `planetQuests.ts`).
  - `nextPlanetDiscovery(progress)` — acha a próxima descoberta ainda não feita, seguindo a ordem
    de `POSTCARD_CATALOG`; nunca checa `entitlementActive`/assinatura (a regra inegociável do
    projeto é nunca gatear progresso/exploração, só cosmético).
  - `findTreasureChestByPlanetId` adicionado em `data/treasureChests.ts` por simetria com os
    outros 3 catálogos (só existia `findTreasureChestById`).
- Nova seção "Planetas" dentro do `AchievementsPanel.tsx` existente (não um painel novo separado):
  lista dos 7 planetas com fração de progresso (ex. "1/3 descobertas"), expande ao tocar pra
  mostrar os 3 slots individuais com nome/emoji reais quando descoberto ou `???`/🔒 quando não;
  destaque "🎯 Próxima descoberta" no topo, reaproveitando o padrão visual do `nextObjective` já
  usado pelas seções de badges/postais/pets.
- Evento novo `album_planet_opened` (`meta.planetId`), disparado ao expandir um planeta específico
  na lista (sinal de interesse real, distinto de simplesmente abrir o painel inteiro):
  `trackAlbumPlanetOpened` em `productAnalytics.ts`, allowlist em `server-accounts/src/domain.ts`,
  validação de `planetId` em `index.ts`, `weeklyFunnel.albumPlanetOpened` agregando por device.
- `docs/event-catalog.md` atualizado com a linha do evento novo e uma nota explícita de que
  `discoverable_collected` (citado no backlog) já é coberto por `planet_interaction_completed`
  (lab-179) — não recriado.
- Testes: 13 novos em `progression.test.ts` (2 para `markMarsCoinPotFound`, 7 para
  `planetDiscoverySlots`, 4 para `nextPlanetDiscovery`) e 1 novo em
  `server-accounts/src/domain.test.ts`. Suíte completa verificada ao final: app 198/198,
  server-accounts 148/148, `tsc -b`/`tsc --noEmit` e `npm run build` limpos.
- Campo novo em `Progress` (`foundMarsCoinPotEver: boolean`, `types.ts`) e função pura
  `markMarsCoinPotFound` (`progression.ts`) — ver rodada 5 do review abaixo pra motivação; não
  muda a recompensa repetível do pote em si (`World3D.tsx`), só adiciona um marco permanente
  separado pro álbum.
- Verificação ao vivo (dev server, `localhost:5176`, Chrome): seção "Planetas" renderiza a
  callout de próxima descoberta correta; expandir Marte mostra os 3 slots esperados
  (Colecionável/Objeto especial/Segredo escondido), todos bloqueados no estado inicial; o evento
  `album_planet_opened` dispara com `planetId: "marte"` (confirmado via monkey-patch de
  `window.fetch`); após simular a coleta do postal de Marte via `localStorage` e recarregar, o
  slot Colecionável passa a `✓`/nome real ("Saudações de Marte") e a callout avança
  corretamente para o pote de moedas alienígena (`actionable_object`) como próxima descoberta
  grátis (o critério de "descoberto" desse slot específico passou por 2 correções reais nas
  rodadas 4-5 do review — ver abaixo).

## Decisões técnicas tomadas

- **Reaproveitar `POSTCARD_CATALOG` em vez de criar `data/destinationPlanets.ts`.** O FEATURES.md
  planejava um arquivo novo mínimo (id/nome/emoji dos 7 planetas), mas `data/postcards.ts` já
  expõe exatamente essa forma via `POSTCARD_CATALOG`, na mesma ordem de `DESTINATION_PLANET_LIST`
  (`World3D.tsx`). Criar um arquivo novo só pra duplicar essa lista adicionaria uma segunda fonte
  de verdade sem necessidade — decisão tomada e comunicada ao usuário durante a implementação.
- **Nova seção dentro do `AchievementsPanel.tsx` existente, não um painel novo.** O `HudHeader` já
  tem ~11 ícones; abrir mais um painel dedicado só pra planetas pioraria a navegação. O padrão
  visual (`.quest-list`/`.quest-list-item`, badge `✓`/🔒) já estabelecido nas seções de
  badges/postais/pets foi reaproveitado igual, incluindo o padrão de callout "próxima descoberta".
- **`album_planet_opened` dispara só ao EXPANDIR um planeta, não ao abrir o painel.** Abrir o
  painel inteiro já é medido por outro evento (existente); expandir um planeta específico é um
  sinal de interesse mais forte e granular — só dispara na transição fechado→aberto, não a cada
  toggle.
- **"NPCs" do backlog interpretado como a escolinha de astronomia já existente** (`educational_quiz`,
  professor NPC) em vez de conteúdo novo — mesmo espírito de reaproveitamento do lab-180. Não foi
  criado nenhum slot de NPC dedicado.
- **`discoverable_collected` do backlog não foi criado como evento novo** — é redundante com
  `planet_interaction_completed` (lab-179), que já tem `weeklyFunnel.planetInteractionCompleted`
  cobrindo "descobertas por semana". Documentado em `docs/event-catalog.md`.

## Pendências / dívidas conhecidas

- Nenhuma dívida técnica conhecida ao final deste lab.

## Review automático do Copilot (PR #60)

- **Rodada 1**: 2 achados reais, ambos corrigidos — `.planet-toggle` herdava só o padding vertical
  de `.quest-list-item` (~39px de altura), abaixo do alvo de toque mínimo de 44×44px
  (`docs/prompts/02-design-profissional.md` §3, MUST); corrigido com `min-height: 44px`, mesmo
  padrão já usado por `.modal-close`. `aria-label` do catálogo omitia a seção "Pets" (já existente
  desde o lab-171, sem relação direta com este lab, mas no mesmo elemento editado) — corrigido
  incluindo "pets" na lista. Aproveitado o mesmo commit pra remover um comentário no CSS que
  referenciava "lab-181" diretamente — violação do MUST de
  `docs/prompts/04-manutencao-clean-code.md` §2 (nenhum comentário deve referenciar o laboratório
  atual), reescrito para descrever só o "porquê" técnico (altura do alvo de toque).
- **Rodada 2**: mais 7 comentários novos (todos deste lab) referenciando "lab-181" diretamente —
  mesma violação do MUST acima, não pega na 1ª rodada porque o `.planet-toggle` foi o único achado
  citado explicitamente ali; removidos/reescritos em `domain.ts`, `index.ts` (2), `treasureChests.ts`,
  `productAnalytics.ts`, `progression.ts`, `AchievementsPanel.tsx` (3). Também 1 achado real de CSS:
  `.planet-toggle` é um `<button>` nativo, que usa a cor `buttontext` do navegador em vez de herdar
  a cor do body — corrigido com `color: inherit`, senão as linhas de planeta ficariam com uma cor
  de texto diferente das outras linhas do mesmo catálogo. E 1 achado de consistência
  documentação-vs-código: `FEATURES.md`/`CONTEXT.md` descreviam a seção nova como "grade" (grid),
  mas o código sempre reaproveitou o mesmo padrão de LISTA vertical (`.quest-list`) das outras 3
  seções — corrigida a documentação pra bater com o que foi de fato implementado (a decisão de
  reaproveitar o padrão de lista, não criar um grid novo, é a mesma citada nas "Decisões técnicas"
  acima).
- **Rodada 3**: 2 achados reais corrigidos. (1) `planetDiscoverySlots` marcava o slot
  `educational_quiz` como descoberto só com `isPlanetFullyCompleted` (as 6 perguntas do planeta
  respondidas), mas `trackPlanetInteractionCompleted(planetId, 'educational_quiz')`
  (`useProgress.ts`, `completePlanetQuest`) já dispara na PRIMEIRA pergunta certa — o álbum ficava
  mostrando a escolinha como "não descoberta" mesmo depois da interação real já ter acontecido e
  sido contabilizada em `planet_interaction_completed`. Corrigido pra checar "pelo menos uma
  pergunta do planeta respondida" (`planetQuestList.some(...)`), o mesmo critério do evento; teste
  de regressão novo cobrindo o caso de só 1 pergunta respondida. (2) `<div className="quest-list-info">`
  aninhado direto dentro do `<button>` da linha do planeta — HTML inválido (`<button>` só aceita
  "phrasing content", `<div>` não é) que pode gerar árvore de acessibilidade inconsistente;
  corrigido trocando por `<span>` (a mesma classe CSS já usa `display: flex`, funciona igual).
- **Rodada 4**: 4 achados reais corrigidos. (1) O slot `actionable_object` de Marte usava
  `unlockedHatIds.includes(MARS_REWARD_HAT_ID)` como proxy pra "coletou o pote de moedas", mas são
  interações DIFERENTES: `unlockMarsReward` (a Coroa de Herói) dispara ao derrotar o último
  inimigo, enquanto a coleta do pote em si (`marsCoinPotCollected`, `World3D.tsx`) é
  deliberadamente por-visita, sem estado durável em `Progress` (decisão do lab-179, pra não
  precisar de idempotência entre sessões nesse pote específico) — não existe hoje nenhum sinal
  persistente que corresponda literalmente a "o pote foi coletado alguma vez". Corrigido
  RENOMEANDO o slot pra descrever a recompensa que de fato é durável e correspondente
  (`name: 'Coroa de Herói de Marte'`, emoji 🪐, mesmo item de `data/hats.ts`), em vez de inventar
  estado novo só pra este lab — mantém a asserção "clareou Marte" honesta sem contradizer a
  decisão de design do lab-179 de manter o pote efêmero. (2) `docs/event-catalog.md` também
  descrevia a seção nova como "grade" — mesma correção de wording da rodada 2, que não tinha
  coberto este arquivo. (3) `planetQuests[planetId]` (objeto plain, chave arbitrária) com um
  `planetId` igual a uma propriedade herdada de `Object.prototype` (`"constructor"`, `"toString"`)
  devolvia um valor truthy não-array, e o `.some(...)` seguinte lançava exceção — contradizendo o
  próprio comportamento documentado de planeta inválido devolver `[]`; corrigido com
  `Array.isArray(...)` no lugar do truthy check, com teste de regressão novo. (4) Contagem de
  testes errada no `CONTEXT.md`/`FEATURES.md` (diziam 9, eram 10 depois da rodada 3) — corrigida
  pra refletir o número real a cada rodada daqui pra frente.
- **Rodada 5**: a correção da rodada 4 (renomear o slot pra "Coroa de Herói de Marte") foi
  insuficiente — trocar só o RÓTULO não resolvia a inconsistência real: o `kind: 'actionable_object'`
  de Marte, em todo o resto do domínio (`docs/event-catalog.md`, `planet_interaction_completed`),
  já significa especificamente "pote de moedas", então renomear o texto sem mudar o que
  `discovered` de fato mede deixava a categoria e o rótulo dizendo coisas diferentes. Fix definitivo:
  campo novo `foundMarsCoinPotEver: boolean` em `Progress` (`types.ts`) + `markMarsCoinPotFound`
  (`progression.ts`, mesmo padrão `{ progress, granted }` de `applyTreasureChestFound`), chamado em
  `World3D.tsx` (via `onFoundMarsCoinPotRef`, prop nova `onFoundMarsCoinPot` até `App.tsx` →
  `useProgress().foundMarsCoinPot()`) TODA vez que o pote é coletado de verdade — sem mudar o
  evento de analytics existente (que já dispara em toda coleta, não só a 1ª) nem a recompensa
  repetível em si (o pote continua dando moeda a cada visita); o campo novo só nunca desfaz depois
  de marcado uma vez. Voltou o slot pro nome/emoji originais ("Pote de moedas alienígena"/🪙), já
  que agora `discovered` mede exatamente essa coisa. Verificado ao vivo (dev server): com o
  capacete de combate desbloqueado mas `foundMarsCoinPotEver: false`, o slot fica corretamente
  bloqueado (prova de que não usa mais o capacete como proxy); com o campo em `true`, mostra
  descoberto.
- **Rodada 6**: 1 achado real crítico + 6 de limpeza. O crítico: `foundMarsCoinPot()`
  (`useProgress.ts`) lia `progress` do closure de render em vez de usar atualizador funcional —
  `World3D.tsx` chama essa função logo depois de até `MARS_COIN_POT_REWARD` chamadas encadeadas a
  `collectCoin()` (que É funcional, `setProgress(prev => ...)`) na mesma coleta; ler o `progress`
  "velho" do closure e escrever por cima com `setProgress(result.progress)` podia sobrescrever as
  moedas recém-enfileiradas por essas chamadas anteriores no mesmo lote do React, perdendo moeda de
  verdade. Corrigido pra usar `setProgress(prev => ...)`, mesmo padrão de `collectCoin`/
  `collectCoins`. Limpeza: mais 4 comentários novos com "lab-181" (`types.ts`, `storage.ts`,
  `World3D.tsx` ×2) removidos; comentário em `progression.ts` ainda descrevia o pote como
  persistido via `unlockedHatIds`/`unlockMarsReward` (a explicação da rodada 4, já superada pela
  rodada 5) — atualizado pra citar `foundMarsCoinPotEver`/`markMarsCoinPotFound`; contagem de teste
  desatualizada (194) num trecho do `CONTEXT.md` que a rodada 4 não tinha coberto, corrigida pra
  198; `FEATURES.md` (investigação prévia) ainda afirmava como fato atual que o pote já era durável
  via `unlockedHatIds` — anotado como suposição original ERRADA, sem reescrever a investigação
  em si; descrição/PR também diziam "grade" em vez de "lista" num lugar que a rodada 2 não tinha
  coberto (`AchievementsPanel.tsx` JSX, e o corpo da própria PR #60 no GitHub). Também adicionado
  `aria-controls` no botão de cada planeta, apontando pro `id` da lista de slots expandida
  (padrão de disclosure), achado novo que não tinha aparecido nas rodadas anteriores.

## Funcionalidades planejadas que NÃO foram concluídas

- Nenhuma — todos os itens do FEATURES.md foram concluídos (o item de `data/destinationPlanets.ts`
  foi substituído pela decisão de reaproveitar `POSTCARD_CATALOG`, ver "Decisões técnicas" acima).
- "D7 por número de descobertas" (métrica citada pelo backlog) foi deliberadamente adiada — já
  estava marcada "fora de escopo" no FEATURES.md original, pois exigiria uma consulta de coorte
  nova (mesmo padrão do lab-185), fora do escopo pequeno deste lab.

## O que o próximo laboratório deve desenvolver

Próximo item da ordem sugerida em `docs/growth-retention-monetization-backlog.md` (item 8): **Lab
182 - Eventos semanais saudáveis**, estendendo o sistema semanal determinístico já existente em
`app/src/data/weeklyEvents.ts` — preservando uma única fonte de verdade para rotação semanal,
bônus e copy; objetivo educativo/ambiental com recompensa cosmética ou moeda grátis, janela ampla
e mensagem explícita de que não há problema em perder; sem pagamento para acelerar/recuperar.
Critérios de aceite do backlog: evento aparece como convite (não obrigação); ausência nunca pune
pet/progresso; recompensa previsível; sem segunda rotação semanal concorrente nem recompensa
conflitante com a progressão atual.

## Estado do repositório ao final

- Branch: `lab-181-album-planetas` (a mesclar em `main` via PR).
- Como rodar/verificar o que foi construído neste laboratório:
  - `cd app && npm run test` (198 testes, inclui `markMarsCoinPotFound`/`planetDiscoverySlots`/
    `nextPlanetDiscovery`).
  - `cd app/server-accounts && npm run test` (148 testes, inclui validação de
    `album_planet_opened`).
  - `cd app && npm run dev`, abrir o jogo, teleportar até um planeta-destino, coletar/descobrir
    algo nele, abrir o Catálogo de Conquistas (ícone no `HudHeader`) e expandir a linha do
    planeta na seção "Planetas" para ver os 3 slots e o progresso refletidos.
