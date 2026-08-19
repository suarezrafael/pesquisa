# Contexto — Laboratório 26 — Missão no bioma do deserto

Preenchido em: 2026-08-17
Commit inicial → final: 61c961812a68d9247a9cbc75a811ee3e97d55318..d148a711c2883db5c65c54eab8e3f95635d54ce2

## O que foi feito

1. **`q21` — "O Oásis Escondido"** (`src/data/quests.ts`) — missão de leitura, tema de deserto,
   desbloqueada só depois de q20 (a antiga "Missão Final"), como um bônus de exploração pra quem
   já terminou a trilha principal. Recompensa maior que q20 (40 XP / 20 moedas vs. 35/18) — coerente
   com ser um "extra" pós-conclusão, não uma missão do meio da trilha normal.
2. **`QUEST_FIXED_UP`** (`World3D.tsx`, novo, perto de `DESERT_CENTER_DIR`) — mapa `id da missão →
   direção fixa`, consultado dentro de `quests.forEach` (loop que monta as escolas): se a missão
   tiver entrada nesse mapa, usa essa posição fixa em vez da fórmula de ângulo áureo por índice.
   Só `q21` está nesse mapa hoje, apontando pro próprio `DESERT_CENTER_DIR` — o centro exato do
   bioma, que o scatter de props do deserto (lab-23) nunca ocupa (só espalha cactos/rochas a
   partir de 25% do raio pra fora, nunca no centro).

## Decisões técnicas tomadas

- **Posição fixa só pra `q21`, não uma mudança geral do algoritmo** — decisão central deste lab,
  já prevista desde o `FEATURES.md`: generalizar o mecanismo de posição fixa pra qualquer missão
  sem um segundo caso de uso real seria especulativo (YAGNI). `QUEST_FIXED_UP` é um `Record`
  pequeno — dá pra adicionar mais entradas no futuro se surgir outro caso real, sem precisar de
  nenhuma refatoração.
- **Escola no centro exato do bioma, não numa borda** — o centro é a única posição do deserto
  GARANTIDAMENTE livre de props por construção (o scatter dedicado do lab-23 usa
  `radiusFrac = 0.25 + ...` como raio mínimo, nunca gera um ponto no centro exato); qualquer outra
  posição dentro do raio exigiria checar folga contra os 10-12 props espalhados ali, sem
  necessidade já que o centro resolve isso de graça.
- **Bônus pós-"Missão Final", não uma missão no meio da trilha** — `q21` unlocked só depois de
  `q20` (que já se chama "Missão Final") — trocar `q20` de posição/nome pra acomodar isso
  quebraria a mensagem "você terminou!" que `q20` já dá; um bônus depois é mais simples e não
  exige tocar em nada do que já existe.

## Verificação feita (evidência, não só visual)

- `npm run build` passa (typecheck + build de produção).
- Testado ao vivo no navegador, consulta direta a dados da cena:
  - `scene.getTransformNodeByName('school-q21').position` — ângulo até `DESERT_CENTER_DIR`
    calculado em ~0.0000009° (essencialmente zero, dentro do erro de ponto flutuante) — confirma
    que a escola nasceu exatamente no centro do bioma, não em outro lugar por engano.
  - `school-q01`/`school-q20` continuam em posições normais (coordenadas não-nulas, não
    colapsadas/`NaN`) — confirma que adicionar `q21` e a lógica de `QUEST_FIXED_UP` não quebrou
    as escolas existentes (elas só sofrem o deslocamento pequeno já esperado de `quests.length`
    mudar de 20 pra 21, mesmo efeito colateral que qualquer adição de missão já causava antes
    deste lab, não uma regressão nova).
  - Distância da escola até o prop de deserto mais próximo (10 cactos/rochas checados) = 0,98 —
    fora da malha da escola (paredes 1,6×1,4), sem sobreposição visível.

## Pendências / dívidas conhecidas

- A distância escola-prop mais próxima (0,98) é relativamente justa — não há colisão/sobreposição
  confirmada, mas se o usuário achar visualmente apertado ao jogar, dá pra aumentar levemente o
  `radiusFrac` mínimo do scatter de deserto (lab-23) ou adicionar uma pequena exclusão ao redor do
  centro nesse scatter. Não é um bug, só uma folga menor do que a maioria das outras composições
  do mapa.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — as duas funcionalidades planejadas (nova missão, posição fixa) foram concluídas e
verificadas.

## O que o próximo laboratório deve desenvolver

Em aberto, sem pedido novo específico do usuário ainda:
1. Mais customização de avatar (sugestão pendente desde lab-23/lab-24) — próxima opção de
   "mais conteúdo/customização" ainda não explorada.
2. Backend/conta — ainda exige decisão de infraestrutura do usuário (não pode começar sozinho).
3. Se o usuário voltar a reportar o "morro/prédio invisível" (curvatura de horizonte, ver
   `labs/lab-19-colisao-npc-neblina/CONTEXT.md`): considerar aumentar `PLANET_RADIUS`.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl` (worktree isolado, ainda não mesclada em `main` —
  usuário pediu merge, mas esta sessão não pode mesclar em main). Pra mesclar manualmente:
  ```
  git checkout main
  git merge worktree-abstract-wobbling-owl
  ```
- Como rodar/verificar: `cd app && npm install && npm run dev`. Servidores de dev/relay seguem
  rodando (portas 5180/3001).
