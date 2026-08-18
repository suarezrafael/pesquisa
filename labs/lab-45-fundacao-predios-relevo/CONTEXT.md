# Contexto — Laboratório 45 — Fundação funda em prédios (causa raiz real do "casa flutuando")

Preenchido em: 2026-08-18

## O que foi feito

1. **Diagnóstico correto, finalmente** — depois do lab-44 verificar exaustivamente o ponto de
   ÂNCORA de cada objeto (schools, props, rochas, gatos) e encontrar folga ~0 em tudo, o usuário
   insistiu que ainda via casas flutuando e pediu explicitamente pra examinar "a superfície do
   planeta, como as coisas ficam sobre ela" — não mais objeto por objeto. Isso levou a testar os
   4 CANTOS do footprint de cada escola (não só o centro/âncora) contra o chão real via raycast:
   9 das 21 escolas com gap > 0,4 unidade num dos cantos, pior caso `school-q13` (+0,756).
2. **Causa raiz**: `surfacePos = localUp.scale(terrainGroundRadial(...))` amostra o terreno em UM
   ponto (o centro do prédio) e usa esse mesmo ponto pra definir a ORIENTAÇÃO da caixa inteira
   (`alignmentQuaternion(localUp)`). A caixa de paredes (1,6 largura x 1,4 profundidade) é rígida
   — se o relevo variar mais do que a espessura de qualquer material visual dentro desse
   footprint (bem comum perto de encostas/bases de montanha), um canto fica no ar (chão visível
   embaixo, exatamente a queixa do usuário) enquanto o oposto afunda na grama (invisível, por
   isso nunca reportado como bug).
3. **Correção**: fundação — uma segunda caixa, mais funda (altura 1,6, cobrindo com folga os
   0,756 do pior caso observado) e ligeiramente mais larga que as paredes/loja/torre, parented ao
   mesmo nó `base`. Não tenta inclinar a caixa original pra seguir o relevo (mais simples, sem
   risco de desalinhar porta/telhado/professor) — só garante que sempre existe material sólido
   entre a caixa original e o chão real, não importa a direção da variação do relevo.
   Aplicado em: 21 escolas (`labs/lab-*` → `World3D.tsx`, dentro de `quests.forEach`), loja
   (`shopBase`) e torre (`towerBase`).
4. **Também presente neste commit** (encontrado já escrito no working tree, de uma iteração
   anterior desta mesma sessão longa que não chegou a ser commitada antes da compactação do
   contexto): `settleMeshOnTerrain`, que troca o antigo colisor esférico das rochas de montanha
   (que ultrapassava a silhueta irregular da rocha, criando rampas invisíveis ao redor dela) por
   assentamento direto amostrando os vértices da própria malha (grid 3x3 sobre o bounding box em
   plano tangente, pega o ponto mais baixo de cada célula, testa contra `terrainGroundRadial` e
   desce o objeto o suficiente pra cobrir o maior gap encontrado). Mesma classe de problema
   (objeto rígido vs. relevo variável), solução mais geral que preparar fundação manualmente pra
   cada tipo de objeto.

## Decisões técnicas tomadas

- **Fundação (caixa mais funda) em vez de inclinar/deformar a caixa original pra seguir o
  relevo** — mais simples de implementar e sem risco de desalinhar elementos que dependem da
  orientação original da caixa (porta, telhado, professor, balcão da loja, rampa da torre). O
  custo é a fundação eventualmente "aparecer" como um pequeno degrau de terra/pedra na lateral do
  prédio em terreno muito inclinado — aceitável visualmente (parece uma fundação de verdade) e
  muito melhor que um gap com céu visível embaixo do prédio.
- **Profundidade 1,6 (margem sobre o pior caso observado de 0,756)** — dá folga confortável pra
  variações de relevo maiores que as observadas hoje (o mapa pode ganhar mais montanhas/relevo em
  laboratórios futuros); calibrar de novo se algum prédio futuro aparecer com gap > 1,4.

## Pendências / dívidas conhecidas

- Nenhuma nova. Se o usuário ainda reportar flutuação depois deste laboratório, a hipótese mais
  provável agora é build antigo em cache (ver lab-44) — a causa raiz estrutural (caixa rígida vs.
  relevo variável) foi endereçada tanto pra prédios (fundação) quanto pra rochas de montanha
  (`settleMeshOnTerrain`).

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma das planejadas para este laboratório.

## O que o próximo laboratório deve desenvolver

Pedido do usuário já recebido pro próximo laboratório: um prédio de 4 andares subível por escada
(não rampa, diferente da Torre do Tesouro), com as paredes ficando quase transparentes quando a
câmera está perto/dentro do prédio (pra dar pra ver a escada subindo), e um pequeno quiz surpresa
em cada andar. Ver `labs/lab-46-*/FEATURES.md` (a ser criado).

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`. Usuário pediu explicitamente pra mesclar em `main` e
  apagar a branch — não é uma ação que esta sessão pode executar (`main`/merge são reservados ao
  usuário). Comando pra ele rodar:
  ```
  git checkout main
  git merge worktree-abstract-wobbling-owl
  git branch -d worktree-abstract-wobbling-owl   # só depois do merge
  ```
- Como rodar/verificar: `cd app && npm install && npm run dev`.
