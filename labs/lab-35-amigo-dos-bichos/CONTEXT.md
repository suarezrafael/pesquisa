# Contexto — Laboratório 35 — Mini-game "Amigo dos Bichos"

Preenchido em: 2026-08-17

## O que foi feito

1. **`metSpecies` + `FRIEND_RADIUS`** (`src/world3d/World3D.tsx`, logo antes de `const critters:
   Critter[] = []`) — um `Set<CritterKind>` que registra quais espécies já foram "conhecidas"
   nesta sessão, e a constante de raio de interação (1,4 — bem mais perto que o raio de som de
   3,5 usado pro canto/latido/rosnado/grito, pra sentir como um gesto deliberado de se aproximar
   do bicho, não só passar perto por acaso).
2. **Checagem no loop de IA de vagar** (mesmo loop `for (const c of critters)` que já cuida do
   canto/latido/rosnado/grito/som engraçado) — a cada quadro, se o jogador está a menos de
   `FRIEND_RADIUS` de um bicho cuja espécie ainda não está em `metSpecies`: adiciona a espécie ao
   set, toca `playCoinCollect()` (o mesmo som satisfatório já usado pra moeda de verdade) e chama
   `onCollectCoinRef.current()` (soma no total de moedas de verdade, mesma função usada por toda
   coleta de moeda do jogo).

## Decisões técnicas tomadas

- **Checagem todo quadro, não por timer** — diferente dos sons de espécie (que usam um timer
  aleatório pra não disparar toda hora enquanto o jogador fica parado perto), a recompensa de
  amizade só pode disparar UMA vez por espécie no total (`metSpecies.has(c.kind)` bloqueia
  qualquer disparo repetido) — não há risco de "spam" a economizar, então a checagem simples a
  cada quadro é suficiente e mais direta.
- **Não persiste entre sessões — decisão deliberada, não descuido** — `metSpecies` é uma variável
  local ao `setup()`, recriada do zero a cada carregamento da página, igual a TODO o sistema de
  moedas do jogo (`coins`, com `collected: false` sempre no início — nenhuma moeda no jogo,
  incluindo as da Torre do Tesouro e do parkour, lembra que já foi coletada depois de recarregar
  a página). Manter essa mesma característica aqui evita introduzir uma inconsistência nova (um
  sistema de recompensa que se comporta diferente de todos os outros já existentes) — se no
  futuro alguém decidir que moedas devem persistir de verdade, essa mudança afeta o sistema
  inteiro de uma vez, não só este mini-game.
- **Reaproveita `onCollectCoinRef`/`playCoinCollect` em vez de um sistema de recompensa novo** —
  `Progress` (`src/types.ts`) já tem um campo `badges: string[]`, mas está amarrado à lógica de
  `badgesEarnedAt(completedCount)` (marcos de missões completadas, `src/state/progression.ts`) —
  estender esse sistema pra também cobrir "conheceu todas as 7 espécies" seria uma mudança na
  camada de domínio/progressão só pra um mini-game de escopo pequeno. Reaproveitar o mecanismo de
  moeda já existente entrega a mesma sensação de recompensa sem tocar `progression.ts`.

## Verificação feita

- `npm run build` passa (typecheck + build de produção, exit code 0).
- Recarregado ao vivo: `window.__critters` (hook de debug já existente, `dev`-only) confirma 39
  bichos no total, todas as 7 espécies (`coelho`, `esquilo`, `gato`, `passarinho`, `cachorro`,
  `onca`, `falcao`) presentes na cena.
- Console verificado sem erros na versão atual (um erro de HMR aparecendo no histórico era de uma
  tentativa de recarregamento a quente no MEIO de uma edição anterior, não do build final — sumiu
  depois de uma nova checagem).
- **Não testado**: caminhar de verdade até um bicho e confirmar a moeda sendo creditada (só a
  lógica/geometria foi verificada, não o gameplay real). Recomenda-se o usuário confirmar jogando.

## Pendências / dívidas conhecidas

Nenhuma nova.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma das planejadas para este laboratório.

## O que o próximo laboratório deve desenvolver

1. **Terceiro percurso de parkour** (escolhido pelo usuário junto com o mini-game, ainda
   pendente) — já existem dois (7 e 14 degraus, sequência reta de blocos); um terceiro precisa de
   uma variação de verdade pra valer a pena. Ideia levantada no lab-34: subir uma das montanhas
   novas (`PLATEAU_CENTERS`) em espiral, acompanhando o relevo de verdade da montanha em vez de
   flutuar num referencial tangente plano como os outros dois — mais complexo de calcular (precisa
   seguir a curvatura real do platô, não só um plano local), então vale medir o esforço antes de
   começar.
2. Testar ao vivo (jogando, não só por raycast/inspeção de cena) a Torre do Tesouro (lab-34) e o
   mini-game de bichos (este lab) — nenhum dos dois foi confirmado com movimento real do jogador
   ainda nesta sessão.
3. Se o usuário confirmar que o padrão da Torre do Tesouro funciona bem jogando, decidir se vale
   replicar prédios navegáveis pras 21 escolas (pendência já registrada no lab-34).

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl` (worktree isolado, ainda não mesclada em `main` —
  usuário pediu merge, mas esta sessão não pode mesclar em main). Pra mesclar manualmente:
  ```
  git checkout main
  git merge worktree-abstract-wobbling-owl
  ```
- Como rodar/verificar: `cd app && npm install && npm run dev`.
