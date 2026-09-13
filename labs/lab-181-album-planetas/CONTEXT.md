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
- Testes: 9 novos em `progression.test.ts` (5 para `planetDiscoverySlots`, 4 para
  `nextPlanetDiscovery`) e 1 novo em `server-accounts/src/domain.test.ts`. Suíte completa
  verificada: app 194/194, server-accounts 148/148, `tsc -b`/`tsc --noEmit` e `npm run build`
  limpos.
- Verificação ao vivo (dev server, `localhost:5176`, Chrome): seção "Planetas" renderiza a
  callout de próxima descoberta correta; expandir Marte mostra os 3 slots esperados
  (Colecionável/Objeto especial/Segredo escondido), todos bloqueados no estado inicial; o evento
  `album_planet_opened` dispara com `planetId: "marte"` (confirmado via monkey-patch de
  `window.fetch`); após simular a coleta do postal de Marte via `localStorage` e recarregar, o
  slot Colecionável passa a `✓`/nome real ("Saudações de Marte") e a callout avança
  corretamente para o pote de moedas (`actionable_object`) como próxima descoberta grátis.

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
  - `cd app && npm run test` (194 testes, inclui `planetDiscoverySlots`/`nextPlanetDiscovery`).
  - `cd app/server-accounts && npm run test` (148 testes, inclui validação de
    `album_planet_opened`).
  - `cd app && npm run dev`, abrir o jogo, teleportar até um planeta-destino, coletar/descobrir
    algo nele, abrir o Catálogo de Conquistas (ícone no `HudHeader`) e expandir a linha do
    planeta na seção "Planetas" para ver os 3 slots e o progresso refletidos.
