# Contexto — Laboratório 36 — Terceiro parkour: torre em espiral

Preenchido em: 2026-08-17

## O que foi feito

1. **`PARKOUR3_*`** (`src/world3d/World3D.tsx`, logo depois da recompensa do segundo parkour) —
   mesma técnica de referencial tangente local fixo dos outros dois (`PARKOUR3_ANCHOR_UP` +
   `Cross`/`Cross` pra achar `forward`/`right`), mas em vez de avançar reto com zigue-zague
   lateral, cada degrau gira ao redor do eixo `PARKOUR3_ANCHOR_UP` (`Math.cos(angle)`/
   `Math.sin(angle)` combinando `right`/`forward`) com o raio encolhendo a cada degrau
   (`PARKOUR3_RADIUS_START = 1.8` → `PARKOUR3_RADIUS_END = 0.6`) — uma espiral que fica mais
   estreita conforme sobe, como uma torre em caracol.
2. **12 degraus, 1,5 volta completa** (`PARKOUR3_STEPS = 12`, `PARKOUR3_REVOLUTIONS = 1.5`,
   `PARKOUR3_ANGLE_STEP = 2π×1.5/12 = 45°` por degrau) — sobe `PARKOUR3_HEIGHT_STEP × (STEPS-1) =
   0,85 × 11 ≈ 9,35` unidades no total, mais alto que os outros dois (7 e 14 degraus) apesar de
   menos degraus que o segundo, porque a espiral ganha altura girando em vez de avançar reto por
   uma distância enorme.
3. **6 moedas no topo**, espalhadas em círculo ao redor do último degrau (`rotateAroundAxis` com
   ângulos uniformemente distribuídos, `2π/6` cada) — o maior leque dos três desafios de parkour
   até agora, coerente com ser o mais alto/mais impressionante de completar.

## Decisões técnicas tomadas

- **Espaçamento verificado ANTES de escrever qualquer código de cena** — diferente de alguns
  ajustes anteriores desta sessão (ex.: a rampa da Torre do Tesouro, lab-34, onde o erro só foi
  descoberto DEPOIS de construído, por raycast), aqui o espaçamento (distâncias 3D entre degraus
  consecutivos) foi calculado e verificado num script Node isolado, fora do app, ANTES de
  escrever `PARKOUR3_*` — encontrou o pior caso (1,59, entre o degrau 0 e 1, onde o raio ainda
  está no máximo) comparado contra o alcance já comprovado dos outros dois parkours (~2,1-2,36,
  documentado nos comentários deles). Só depois de confirmar que cabia dentro da faixa segura o
  código de cena foi escrito.
- **Espiral em vez de "seguir o relevo real da montanha"** — a ideia original levantada no
  lab-34/35 era literalmente acompanhar a superfície de uma montanha existente
  (`PLATEAU_CENTERS`) subindo. Decidido usar um referencial tangente local fixo (igual aos outros
  dois parkours) em vez disso: muito mais simples de calcular (não precisa amostrar
  `terrainHeight` ao longo do trajeto nem lidar com a curvatura real do platô), reaproveita a
  técnica já comprovada duas vezes nesta sessão, e ainda entrega uma variação de verdade (espiral
  vs ziguezague) sem o risco extra de uma abordagem nova e mais complexa. A "montanha" nesta
  versão é só o local de fundo/tema — o desafio em si é uma torre flutuante, igual aos outros
  dois (que também não tocam o chão embaixo deles em nenhum ponto além da âncora).
- **Recompensa cresce com a altura, não é fixa** — 1 moeda (primeiro parkour, 7 degraus) → 5
  moedas (segundo, 14 degraus) → 6 moedas (terceiro, 12 degraus mas ~9,35 de altura, o maior
  ganho vertical dos três) — mantém o princípio "desafio maior vale mais" já estabelecido nos
  labs 33/34, calibrado pela ALTURA alcançada, não só pela contagem de degraus (o terceiro tem
  menos degraus que o segundo mas sobe mais, então ainda merece uma recompensa comparável/maior).

## Verificação feita

- `npm run build` passa (typecheck + build de produção, exit code 0).
- Recarregado ao vivo: as 12 malhas `parkour3Platform-*` confirmadas presentes, todas com
  `physicsBody` (colisão real).
- Distâncias 3D REAIS entre plataformas consecutivas, medidas na cena via
  `getAbsolutePosition()`/`Vector3.Distance` (não só o cálculo do script de planejamento):
  1,59 → 1,52 → 1,45 → 1,38 → 1,32 → 1,26 → 1,20 → 1,14 → 1,09 → 1,04 → 0,99 — bate EXATAMENTE
  com a previsão do script de antes de escrever o código (mesmos valores, arredondamento igual),
  confirmando que a implementação em Babylon corresponde ao plano matemático sem erro de tradução
  (diferente do que aconteceu com a rampa da torre no lab-34, onde a implementação inicial não
  bateu com o plano).
- 6/6 moedas do topo confirmadas presentes na cena.
- **Não testado**: subir a espiral de verdade jogando (pulando de plataforma em plataforma) — só
  geometria/física confirmadas, não o gameplay real.

## Pendências / dívidas conhecidas

- Nenhum dos três desafios de parkour, nem a Torre do Tesouro (lab-34), foi testado com
  movimento real do jogador nesta sessão — toda a verificação foi por raycast/inspeção de cena.
  Recomenda-se fortemente uma sessão de playtesting real antes do próximo lote de mudanças
  grandes nessas áreas.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma das planejadas para este laboratório.

## O que o próximo laboratório deve desenvolver

1. **Playtesting real** de tudo construído nesta sessão (labs 31-36) — river removal, montanhas,
   escolas com colisão, Torre do Tesouro, mini-game de bichos, os três parkours. Toda a
   verificação até agora foi por raycast/build/inspeção de cena; nenhuma dessas features passou
   por uma sessão de jogo real de ponta a ponta.
2. Se o usuário confirmar que a Torre do Tesouro funciona bem jogando (pendência do lab-34) —
   decidir se vale replicar o padrão de prédio navegável pras 21 escolas.
3. Nenhum pedido novo do usuário pendente no momento — próximo laboratório deve começar
   perguntando o que fazer a seguir, ou revisitando o backlog do `prompt.md` (seção 6) se o
   usuário não tiver uma direção específica.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl` (worktree isolado, ainda não mesclada em `main` —
  usuário pediu merge, mas esta sessão não pode mesclar em main). Pra mesclar manualmente:
  ```
  git checkout main
  git merge worktree-abstract-wobbling-owl
  ```
- Como rodar/verificar: `cd app && npm install && npm run dev`.
