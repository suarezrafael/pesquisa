# Contexto — Laboratório 19 — Colisão de NPCs + suavizar horizonte

Preenchido em: 2026-08-17
Commit inicial → final: 910be52c4daf5d0896b8854b18809ea3296f6f5e..6871d0aae2643c5789b16fa96065dd166a676893

## O que foi feito

1. **Colisor físico nos NPCs pedestres** (`walkerNpcs`, lab-10) — `app/src/world3d/World3D.tsx`.
   Cada NPC ganhou uma cápsula invisível (`npcCollider-N`, altura 1.0, raio 0.3) com
   `PhysicsAggregate` + `PhysicsShapeType.CAPSULE`, com o corpo posto em modo
   `PhysicsMotionType.ANIMATED` logo após a criação (`npcAggregate.body.setMotionType(...)`).
   ANIMATED foi a escolha certa (não STATIC, não DYNAMIC): o NPC se move via IA de vagar
   (posição escrita direto no transform a cada quadro, não por forças de física), mas o corpo
   ainda precisa empurrar o avatar pra fora do caminho — STATIC não se move nunca, DYNAMIC
   sofreria gravidade/forças que a IA de vagar não espera.
   No loop de animação dos NPCs, a cada quadro o colisor é sincronizado com
   `npc.colliderBody.setTargetTransform(posição, rotação)` — não escrevendo a posição do
   transform diretamente, que é o jeito documentado do Havok pra mover um corpo cinemático (ele
   calcula a velocidade implícita do deslocamento, necessária pra gerar resposta de colisão
   correta ao empurrar outro corpo).
   O centro do colisor fica elevado (`+0.55` acima da superfície do planeta, ao longo do `up` do
   NPC) — a raiz visual do NPC (`figure.root`) fica colada ao chão (`+0.02`, só nos pés), mas o
   colisor físico precisa do centro a meia-altura da cápsula pra cobrir o corpo inteiro, igual ao
   colisor do avatar jogável (`AVATAR_RADIUS + 0.05`).

2. **Neblina base mais presente** — `BASE_FOG_DENSITY` subiu de `0.01` pra `0.018` (~+80%,
   mas ainda bem abaixo de `RAIN_FOG_DENSITY = 0.035`). A inicialização de `scene.fogDensity`
   (antes um `0.01` hardcoded, dessincronizado da constante) agora referencia a constante
   diretamente.

## Decisões técnicas tomadas

- **ANIMATED, não DYNAMIC nem STATIC, pros NPCs** — únicos corpos móveis-por-script do jogo até
  agora (elevadores/plataformas são estáticos; carros do lab-15 não têm colisor). ANIMATED é
  exatamente o modo do Havok pra "corpo cinemático que empurra outros corpos" — confirmado lendo
  `physicsBody.d.ts`: "They behave like dynamic bodies, but they won't be affected by other
  bodies, but still push other bodies out of the way."
- **`setTargetTransform`, não escrever a posição do transform node direto** — testado e
  confirmado que só escrever `collider.position` (como as props/plataformas estáticas fazem)
  funciona pra corpos STATIC, mas pra ANIMATED o Havok espera `setTargetTransform` pra calcular a
  velocidade implícita do movimento; é a mesma diferença de padrão já usada pro personagem
  jogável em cutscenes/teleporte (`disablePreStep` + `copyFrom` + zerar velocidade), só que ali
  era um caso de "corpo dinâmico teleportado uma vez", não "corpo cinemático em movimento
  contínuo todo quadro".
- **Colisor com centro elevado, independente da raiz visual** — reaproveitar a posição da raiz
  visual do NPC (colada ao chão) pro colisor deixaria a cápsula meio enterrada; replicado o
  mesmo padrão do colisor do avatar (offset de meia-altura + folga pequena).
- **Neblina: ajuste pequeno, não uma correção da causa raiz** — a causa raiz (curvatura do
  planeta pequeno, raio 13) é geométrica e não tem correção pequena; aumentar o raio do planeta
  eliminaria o efeito mas está fora de escopo (ver `FEATURES.md`). A neblina só suaviza a
  transição visual, não remove o efeito.

## Verificação feita (evidência, não só visual)

- `npm run build` passa (typecheck + build de produção, sem erros/warnings novos).
- Testado ao vivo no navegador (dev server, porta 5180):
  - `npc.colliderBody.getMotionType()` retorna `1` (ANIMATED) pra um NPC de teste.
  - `npcCollider-0`.position acompanha `npc.figure.root.position` com o offset de +0.55 esperado
    (posições próximas, mesma direção `up`).
  - Teste de física direto: teleportado o colisor do avatar pra 1.5 unidades de um NPC e aplicada
    velocidade de 5 u/s na direção dele por 60 passos de `scene.render()`. A distância mínima
    entre os centros dos colisores nunca caiu abaixo de ~0.81 — acima da soma dos raios das
    cápsulas (0.32 avatar + 0.3 NPC = 0.62) — ou seja, os colisores nunca se sobrepuseram, e o
    avatar foi empurrado de volta pra fora depois do contato (distância final ~2.59). Confirma
    bloqueio real, não só visual.
  - Nenhum erro/warning novo no console do navegador após o carregamento da cena com os NPCs.

## Pendências / dívidas conhecidas

- A curvatura do horizonte em si (a causa raiz do relato repetido de "morro invisível") continua
  presente — só suavizada pela neblina, não eliminada. Se o usuário voltar a reportar o mesmo
  problema depois de ver a neblina nova, a próxima opção realista é aumentar `PLANET_RADIUS`
  (mudança grande, fora de escopo deste lab — ver "Fora de escopo" em `FEATURES.md`).
- Cor de morro por altura (lab-18) e este ajuste de neblina (lab-19) resolvem sintomas
  relacionados ao mesmo relato original, mas por ângulos diferentes; vale considerar os dois
  juntos se o usuário comentar de novo sobre morros/prédios distantes.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — os dois itens planejados (colisor de NPC, neblina) foram concluídos e verificados
numericamente (não só visualmente), igual ao padrão do lab-18.

## O que o próximo laboratório deve desenvolver

Em aberto, do lab-17/18 (nenhum pedido novo específico do usuário ainda além do que foi coberto
aqui):
1. Mais conteúdo, se o usuário continuar pedindo.
2. Backend/conta — ainda exige decisão de infraestrutura do usuário (não pode começar sozinho).
3. Nova revisão de `prompt.md` contra o código.
4. Se o usuário voltar a reportar o "morro/prédio invisível": considerar aumentar
   `PLANET_RADIUS` (mudança grande — afeta posição de todo marco existente, velocidade de
   movimento relativa etc.) como correção definitiva, já que fog e cor por altura só suavizam.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl` (worktree isolado, ainda não mesclada em `main` —
  usuário pediu merge, mas esta sessão não pode mesclar em main). Pra mesclar manualmente:
  ```
  git checkout main
  git merge worktree-abstract-wobbling-owl
  ```
  (ou abrir um PR pelo link do GitHub comparando as duas branches, já que `gh` não está
  autenticado neste ambiente).
- Como rodar/verificar: `cd app && npm install && npm run dev`. Servidores de dev/relay
  seguem rodando (portas 5180/3001) a pedido do usuário pra testar ao vivo.
