# Contexto — Laboratório 151 — Morros/platôs invisíveis (retomada 3, lab-95/lab-124)

Preenchido em: 2026-09-04
Commit inicial → final: 8244f6479253468c3921a84491fc81b33d015b4a..HEAD

## O que foi feito

Retomou pela 3ª vez o bug de "morros/platôs invisíveis" — usuário confirmou que **ainda ocorre**
no mesmo aparelho (Android/Chrome) mesmo depois das duas correções do lab-124, e que o morro
continua **sólido** (só renderização, física correta).

**Passo 1 — medição ao vivo (refutou a hipótese principal)**: adicionado um diagnóstico temporário
em `World3D.tsx` (removido antes do commit) medindo a ÁREA real (não só o comprimento da normal,
já coberto pelo lab-124) dos triângulos da malha do planeta perto de cada `PLATEAU_CENTERS`.
Resultado, rodado no dev server via navegador: **0 triângulos com área abaixo do limiar (~0,015)
em 3954 verificados**. Isso descarta "triângulo genuinamente dobrado/degenerado" como causa —
diferente do que a leitura do código sugeria antes de medir.

**Passo 2 — mudança especulativa (aprovada explicitamente pelo usuário, sabendo do risco e sem
confirmação prévia de que resolve)**: reduzida a `height` de todos os 12 `PLATEAU_CENTERS` em
`World3D.tsx`, mantendo `radius`/`dir` intactos (evita qualquer risco de sobrepor um marco vizinho
já posicionado com folga medida). Cada altura foi recalculada pra trazer a inclinação MÁXIMA da
rampa (fórmula: `1,5 × height ÷ (radius × PLANET_RADIUS)`, o pico da derivada do smoothstep em
`terrainHeight`) de ~0,73-0,87 — todas próximas ou acima do limiar de 0,8 já documentado desde o
lab-95 como "rampa íngreme demais" — pra ~0,64-0,67, uniformemente. Alturas antigas → novas:
3.2→2.6, 2.6→2.3, 2.8→2.1, 2.2→2.0, 2.4→1.8, 2.0→1.7, 2.3→1.9, 1.8→1.6, 2.0→1.7, 1.9→1.6, 2.1→1.6,
1.8→1.5 (na ordem do array).

## Decisões técnicas tomadas

- **Reduzir altura em vez de aumentar raio**: aumentar o raio (também reduziria a inclinação)
  cresceria a PEGADA de cada platô na base — risco real de invadir o espaço de marcos vizinhos
  num mapa já densamente ocupado (folga mínima entre montanhas de só 18,6°). Reduzir altura não
  toca a pegada, só o quão alto o topo fica — risco bem menor de regressão.
- **Não mudar o perfil do smoothstep** (ex.: trocar por uma curva "mais suave"): checado antes de
  descartar — `smootherstep` (6t⁵-15t⁴+10t³) tem derivada de PICO maior (1,875) que o smoothstep
  atual (1,5), pioraria a inclinação máxima em vez de melhorar. Uma rampa linear teria inclinação
  de pico menor, mas cria uma dobra (descontinuidade de derivada) exatamente na borda do platô —
  risco de reintroduzir a MESMA classe de bug de normal quebrada que o lab-124 corrigiu.
- **Não aumentar segmentos da esfera**: mantido fora de escopo pelo mesmo motivo dos labs 95/124
  (custo de performance global, pior em mobile — o próprio dispositivo afetado).
- **Diagnóstico de área removida do commit final** — mesmo padrão do lab-124 (medir, confirmar/
  descartar, depois limpar o código de diagnóstico antes de commitar).

## Pendências / dívidas conhecidas

- **Sem confirmação de que resolve o bug real** — o usuário pediu explicitamente pra tentar mesmo
  sem confirmação prévia (a hipótese de "triângulo degenerado" foi refutada por medição; a
  hipótese revisada — polígono fino demais EM TELA num ângulo de visão quase de perfil, numa GPU
  móvel com rasterização menos robusta pra esse caso — não é reproduzível neste ambiente, Chrome
  desktop, nem antes nem depois da mudança).
- Se o usuário reportar que o bug PERSISTE depois de testar em produção no mesmo aparelho, os
  próximos passos ficam mais restritos: já foram tentadas 3 categorias de correção (lighting/
  normal no lab-124, geometria/inclinação aqui) sem sinal de progresso confirmado. Nesse caso, a
  recomendação registrada nesta sessão é parar de adivinhar e pedir um PRINT do bug acontecendo
  (com o número da escolinha/platô mais próximo) antes de qualquer 4ª tentativa — mesmo pedido que
  o lab-124 já tinha deixado registrado e que não foi possível atender ainda.
- `ENTERRADAS:...` no HUD de debug continua sem remover (mesma pendência dos labs 95/124/149) —
  comparação ao vivo (antes/depois desta mudança, mesmo perfil salvo) mostrou valores praticamente
  idênticos, confirmando que a redução de altura dos platôs não afeta a posição das escolas (elas
  já evitam ativamente as rampas íngremes via `findFlatterUpReal`).

## Funcionalidades planejadas que NÃO foram concluídas

Todas as funcionalidades planejadas em `FEATURES.md` foram concluídas (medição + mudança +
verificação de regressão). A única coisa que ficou de fora foi a CONFIRMAÇÃO do usuário no
aparelho real — que não é uma tarefa de laboratório, depende de teste em produção.

## O que o próximo laboratório deve desenvolver

Sem prioridade única — depende do resultado do teste do usuário em produção:
- Se o bug sumiu: fechar de vez esse capítulo, considerar remover o diagnóstico `ENTERRADAS` do
  HUD (pendência antiga).
- Se persistir: pedir o print + número da escolinha/platô mais próximo antes de qualquer nova
  tentativa de código — não adivinhar uma 4ª vez sem esse dado.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`.
- `npx tsc -b` (app): sem erros. `npm run test` (app): 101/101 (sem teste novo — mudança de dado
  de geometria 3D pura, já coberta implicitamente pelos testes de domínio existentes que não usam
  `PLATEAU_CENTERS`).
- Verificado ao vivo (dev server local + navegador, Chrome desktop): diagnóstico de área
  confirmou 0 triângulos degenerados antes da mudança; depois da mudança, teleporte real pro topo
  de um platô (o mais alto, 2,6 de altura nova) mostra terreno renderizando normalmente, sem
  buraco/patch invisível, sem erro de console; comparação do HUD `ENTERRADAS` antes/depois (stash/
  pop do diff) confirmou valores praticamente idênticos, sem regressão nas escolas.
- Como verificar de novo: `cd app && npm run dev`, andar/teleportar pelos platôs (ver
  `PLATEAU_CENTERS` em `World3D.tsx`) observando ângulos variados. Confirmação definitiva do bug
  relatado depende do usuário testar em produção no mesmo aparelho Android/Chrome de sempre.
- **Copilot review no PR #22**: achou 1 achado real — comentários históricos do lab-95 (linhas
  ~750 e ~3628) citavam os valores antigos de altura/inclinação dos platôs, ficando inconsistentes
  com o código depois da redução de altura deste laboratório. Corrigido (commit `b8a235d`) antes de
  mergear.
- **Deploy**: PR #22 mergeado em `main` (commit `cfdc3ca`), os 3 jobs de CI/CD verdes, app ao vivo
  (`https://app-two-flax-92.vercel.app`) respondendo `200` pós-deploy.
