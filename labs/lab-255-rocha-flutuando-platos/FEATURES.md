# Laboratório 255 — Rocha decorativa flutuando nos platôs (achado real, ao vivo)

Status: implementado
Início: 2026-10-04
Fim: 2026-10-04
Commit inicial: 533cd3d12fab3519336702478990f49871705ada
Prioridade: P0 — bug reportado pelo usuário com print em produção, mesma classe do lab-254

## Objetivo do laboratório

Depois do lab-254 (bounding info do `planet`) ir pra produção, o usuário testou de novo e
reportou que o sintoma "morro invisível" persistia — "nao funcionou ainda tem morros invisuveis,
trabalhe serio nisso destrave seus testes locais". Em vez de mais uma teoria especulativa sobre o
motor de renderização (culling/normais/shadow acme, já tentadas nos labs 95/124/151/254), este
laboratório exigiu desbloquear teste ao vivo de verdade no navegador (raycast real + leitura de
pixel real do canvas) para achar a causa de fato — e o usuário depois confirmou com um SEGUNDO
print, em produção, apontando exatamente pra uma rocha decorativa flutuando com uma fresta de céu
visível por baixo, perto do mesmo platô já investigado.

## Funcionalidades planejadas

- [x] Desbloquear teste ao vivo automatizado local — `waitForVisible()` (`World3D.tsx`) trava
  indefinidamente esperando um evento `visibilitychange` que nunca dispara no ambiente de
  automação; usado um bypass TEMPORÁRIO (revertido antes do commit) só pra investigar.
- [x] Validar ao vivo (raycast físico real contra o mesh `planet` + leitura de pixel real do
  canvas WebGL, não captura de tela) que as 3 correções anteriores (culling, two-sided lighting,
  bounding info) estão ativas e corretas em produção — confirmado, nenhum ponto "sólido mas
  invisível" encontrado em ~2400 pixels varridos no terreno `planet` em duas vistas diferentes.
- [x] Receber e investigar o print do usuário mostrando a rocha decorativa flutuando — reproduzido
  no mesmo platô (`mountainRock-0-3`, modelo `rock_largeA`) testado localmente.
- [x] Medir com raycast real (classe `Ray` do Babylon, obtida em runtime via
  `camera.getForwardRay().constructor` — sem import direto de `@babylonjs/core` no console)
  a variação real de altura do terreno dentro do footprint da própria rocha: ~1,23m de variação
  numa rocha de escala ~2,9, usando a MESMA amostragem (9 buckets XZ, vértice mais baixo de cada)
  que `settleMeshOnTerrain` já usa pra "assentar" a rocha.
- [x] Identificar a causa raiz: `settleMeshOnTerrain` (`World3D.tsx`) só garante que o ponto mais
  BAIXO amostrado encosta no chão — nunca verificou se o resto da silhueta (o "capacete" largo de
  `rock_largeA`/`rock_tallA`, que se projeta bem além da base) também fica sobre terreno próximo.
  Perto da borda de um platô, onde a altura cai rápido, isso deixa esse capacete pairando sobre um
  trecho de chão bem mais baixo — uma fresta de céu visível por baixo da rocha.
- [x] Corrigir reaproveitando `findFlatterUpReal` (já usado pros prédios desde o lab-134,
  desenhado justamente pra "qualquer prédio com footprint diferente") — agora chamado também pra
  cada rocha de montanha, com um raio angular calculado a partir da própria `scale` da rocha, antes
  de assentá-la.
- [x] Confirmar ao vivo que a correção reduz a variação medida da rocha testada (1,23m → 0,72m) e
  que a fresta de céu reportada pelo usuário já não aparece na mesma vista/ângulo do primeiro
  print (mountainRock-0-3 reposicionado pro `findFlatterUpReal`, visual conferido com zoom).
- [x] `npm run test` (377/377), `npm run lint` (zero avisos) e `npm run build` (tsc -b + build)
  sem regressão.
- [x] Reverter o bypass temporário de `waitForVisible()` antes do commit — não pode ir pra
  produção (quebraria o benchmark real de dispositivo em aba genuinamente em segundo plano).

## Fora de escopo (explicitamente adiado)

- Tornar a busca de `findFlatterUpReal` sempre encontrar uma variação abaixo do limite seguro —
  a função já documenta que isso nem sempre é possível ("sempre devolve alguma direção... mesmo
  que nenhum fique 100% dentro do limite seguro"); a rocha testada melhorou mas não zerou a
  variação. Se ainda sobrar uma fresta perceptível em algum platô depois do deploy, é o próximo
  passo (ex.: reduzir a escala máxima das rochas, ou apertar `MOUNTAIN_ROCK_SAFE_TERRAIN_VARIANCE`
  e o raio de busca de anéis).
- Mudar `settleMeshOnTerrain` pra verificar a silhueta inteira da rocha (não só o ponto mais
  baixo) — mudança bem mais invasiva, usada por vários tipos de prop; reaproveitar
  `findFlatterUpReal` (já existente, já testado) resolve a causa raiz (escolha de POSIÇÃO) sem
  mexer no algoritmo de assentamento em si.
- Qualquer mudança de jogabilidade, recompensa ou regra de missão.
