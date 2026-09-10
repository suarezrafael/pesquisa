# Contexto — Laboratório 171 — álbum central de conquistas e coleções

Preenchido em: 2026-09-10
Commit inicial → final: 7615d603fd71eaece23dbbd42cf004b832ad43cf..(PR aberto, ver seção final)

## O que foi feito

`docs/market-metrics-engagement-backlog.md` §10, item 5 ("lab-167-album-central-conquistas" no
documento, renumerado pra lab-171 já que o lab-167 real deste repositório foi usado pro mapa de
habilidades). `AchievementsPanel.tsx` (lab-93/141) já mostrava emblemas e cartões-postais; faltava
pets e um destaque de "próximo objetivo".

- **Seção "Pets" nova** (`AchievementsPanel.tsx`) — mesmo padrão visual de cartões-postais: pet
  possuído mostra nome/emoji/estágio (`petStageFor`/`petLifecycleStage`/`petAgeYears`, já
  existentes de `progression.ts`, lab-155/169); não possuído mostra "???"/custo em moedas.
- **Destaque "🎯 Próximo objetivo"** no topo do painel — `nextObjective(progress)`, função pura
  nova em `AchievementsPanel.tsx`, acha o primeiro item AINDA bloqueado em ordem de prioridade
  emblema → cartão-postal → pet.
- **`STAGE_LABEL` exportado** de `PetPanel.tsx` (era local) pra `AchievementsPanel.tsx` reaproveitar
  o mesmo rótulo de estágio, sem duplicar o mapa.

## Decisões técnicas tomadas

- **`nextObjective` mora em `AchievementsPanel.tsx`, não em `progression.ts`** — `data/
  achievements.ts` já IMPORTA de `state/progression.ts` (`BADGE_FIRST_QUEST`/`BADGE_HALFWAY`/
  `BADGE_ALL_DONE`); se `progression.ts` importasse `ACHIEVEMENT_CATALOG` de volta pra decidir o
  "próximo objetivo", criaria um import circular. Mesmo padrão de `fedToday` em `PetPanel.tsx`:
  função pura pequena e específica de apresentação, sem teste de domínio (só `progression.ts`/
  `domain.ts` têm essa exigência, `docs/prompts/04-manutencao-clean-code.md §5`).
- **Ordem de prioridade emblema → cartão-postal → pet** — do "mais alcançável" pro "menos":
  emblema é conquista pura (só jogar), cartão-postal exige viajar até o planeta, pet exige moeda
  acumulada. Evita destacar um pet caro quando a criança ainda nem pegou o primeiro emblema.
  Mensagem de cartão-postal revela o NOME do planeta (`postcard.name` sem o prefixo "Saudações
  de") mas não a descrição/arte específica do cartão — mesmo nível de "spoiler" que o resto do
  jogo já mostra (o planeta em si é visível explorando o sistema solar; só a arte do cartão em si
  é surpresa, mantida como "???" na lista abaixo do destaque).
- **Cosméticos comprados com moeda deliberadamente fora de escopo** (decisão registrada antes de
  codar, `FEATURES.md`) — o documento pede "cosméticos conquistados", mas a maioria (chapéu,
  óculos, roupa, cabelo) é só comprada com moeda sem narrativa de conquista, e já tem seu próprio
  painel de loja mostrando possuído/bloqueado; replicar aqui duplicaria informação sem valor novo
  de coleção, e inflaria bastante o escopo (5+ catálogos diferentes).

## Pendências / dívidas conhecidas

Nenhuma nova. PR #45 teve 2 achados reais do Copilot corrigidos antes do merge (review "Approval
recommended" com 2 nits): `new Date().toISOString()` chamado dentro do laço de pets (uma vez por
item, repetido à toa) — movido pra uma variável `nowIso` calculada uma vez no topo do componente;
`STAGE_LABEL: Record<string, string>` (`PetPanel.tsx`) permissivo demais — trocado por
`Record<PetStage, string>`, obrigando cobrir todo estágio existente.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — todos os itens do `FEATURES.md` foram concluídos.

## O que o próximo laboratório deve desenvolver

`docs/market-metrics-engagement-backlog.md` §10 tem mais 2 itens não feitos ainda: item 6
("rotina diária saudável com pet" — já bastante coberto por `feedPet`/lab-138 login diário/lab-169
ciclo de vida; valeria conferir com o usuário se ainda falta algo específico, tipo uma missão
diária curta combinando pet+desafio educativo, antes de abrir um lab novo pra isso) e item 7
("desafios cooperativos fechados" — feature social nova, ainda não iniciada). Aguardar pedido novo
do usuário ou confirmação de qual desses dois puxar.

## Estado do repositório ao final

- Branch: a definir no momento do commit.
- `npx tsc -b`: limpo. `npm run test` (app): 152/152, sem teste novo (mudança de apresentação
  pura, sem lógica de domínio nova isolável em `progression.ts` — ver decisão técnica acima).
  `npm run build`: limpo, sem regressão de bundle.
- **Verificado ao vivo via Chrome real** (automação, perfil de teste local): teleportado pra perto
  da carteira de estudos (gatilho de proximidade que abre o painel, lab-93) — confirmado por
  screenshot: destaque "🎯 Próximo objetivo: Metade do Caminho" no topo (perfil de teste tinha só
  o emblema "Primeira Missão"); seção "Pets" nova mostrando "Gato Laranja ✓ 🧓 Idoso" (reaproveita
  exatamente o estágio combinado do lab-169) e os 3 pets não possuídos como "???"/custo em moedas.
