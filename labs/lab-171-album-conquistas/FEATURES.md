# Laboratório 171 — álbum central de conquistas e coleções

Status: concluído
Início: 2026-09-10
Fim: 2026-09-10
Commit inicial: 7615d603fd71eaece23dbbd42cf004b832ad43cf

## Objetivo do laboratório

`docs/market-metrics-engagement-backlog.md` §10 (ordem sugerida dos próximos labs), item 5:
"lab-167-album-central-conquistas" no documento — renumerado pra lab-171, já que o lab-167 REAL
deste repositório já foi usado pro mapa de habilidades (mesmo motivo de renumeração dos labs
164-170 anteriores). Detalhe do item em §"Lab 167 - Álbum central de conquistas e coleções":
"tela de álbum com medalhas, pets, cosméticos conquistados, planetas visitados e conquistas
educativas; destacar próximos itens ganháveis grátis."

## Estado atual levantado antes de planejar o escopo

- `AchievementsPanel.tsx` (lab-93/141) já existe e já mostra 2 das coleções pedidas: emblemas
  (`ACHIEVEMENT_CATALOG`, 3 itens) e cartões-postais por planeta (`POSTCARD_CATALOG`, 7 itens,
  bloqueado = "???"). Faltam: **pets** (coleção nova) e um destaque de "**próximo objetivo**"
  (item bloqueado mais próximo, pedido explícito do critério de aceite do documento).
- **Cosméticos deliberadamente fora de escopo** (ver "Fora de escopo" abaixo) — o documento pede
  "cosméticos conquistados", mas a maioria (chapéu/óculos/cabelo/cor de roupa) é só comprada com
  moeda sem narrativa de "conquista", e já tem seu próprio painel de loja mostrando
  possuído/bloqueado; adicionar aqui duplicaria informação sem valor novo de coleção.
- `data/achievements.ts` IMPORTA de `state/progression.ts` (`BADGE_FIRST_QUEST` etc.) — qualquer
  lógica de "próximo objetivo" que precise ler `ACHIEVEMENT_CATALOG` NÃO pode morar em
  `progression.ts` (criaria import circular). Fica em `AchievementsPanel.tsx` mesmo, mesmo padrão
  já usado por `fedToday` em `PetPanel.tsx` (função pura pequena, específica de apresentação, no
  próprio arquivo do componente).

## Funcionalidades planejadas

- [x] Nova seção "Pets" em `AchievementsPanel.tsx` (`PET_CATALOG`) — mesmo padrão visual de
      cartões-postais: possuído mostra nome/emoji/estágio atual (`petStageFor`/`petLifecycleStage`/
      `petAgeYears`, já existem em `progression.ts`), não possuído mostra "???"/bloqueado.
- [x] Destaque "🎯 Próximo objetivo" no topo do painel — primeiro item AINDA bloqueado, em ordem de
      prioridade emblema → cartão-postal → pet (emblemas são conquista pura, sem custo; cartões
      exigem viajar; pets exigem moeda — ordem do "mais alcançável" pro "menos").
- [x] Nenhum teste de domínio novo — confirmado: nenhuma lógica migrou pra `progression.ts` (import
      circular evitado, ver nota acima); `nextObjective` fica em `AchievementsPanel.tsx`, mesmo
      padrão não-testado de `fedToday` em `PetPanel.tsx` (função pura local de apresentação).

## Fora de escopo (explicitamente adiado)

- Cosméticos comprados com moeda (chapéu, óculos, roupa, cabelo) — sem narrativa de "conquista",
  já visíveis nas próprias lojas.
- Qualquer alteração em COMO um pet/emblema/cartão é ganho — só exibição no álbum.
- Ranking público ou compartilhamento do álbum — explicitamente fora de escopo no documento.
