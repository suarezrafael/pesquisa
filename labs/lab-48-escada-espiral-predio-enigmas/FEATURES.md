# Laboratório 48 — Escada em espiral no Prédio dos Enigmas

Status: concluído
Início: 2026-08-18
Fim: 2026-08-18
Commit inicial: d953afe

## Objetivo do laboratório
Usuário continuou vendo a escada "do mesmo lado" mesmo depois do zigue-zague do lab-47: "o
predio ainda esta com a escadas bugadas no mesmo lado tem que colocar a escada do mesmo jeito
que fez o parkour em degraus espiral" — pedido explícito de uma escada em ESPIRAL, com degraus
individuais no estilo das plataformas do parkour.

## Funcionalidades planejadas
- [x] **Escada em espiral de verdade**: 12 degraus por andar (30° cada), girando 360° completo
      ao redor de um eixo central por andar — nunca repete o mesmo ângulo dentro de uma subida,
      resolvendo "mesmo lado" definitivamente (diferente do zigue-zague do lab-47, que ainda
      tinha 2 lances retos, cada um numa direção fixa).
- [x] **Degraus no estilo parkour** (pedido explícito: "do mesmo jeito que fez o parkour") —
      cada degrau é uma plataforma rasa independente (`width: 0,55, height: 0,12, depth: 0,42`),
      mesmo princípio visual das plataformas do parkour (`parkourPlatform`/`parkour4Platform`),
      só que dispostas em espiral em vez de em linha reta com gaps de pulo.
- [x] **Colisão confiável**: aplicando a lição do lab-47 (degraus com colisor BOX individual
      prendem a cápsula do avatar), os degraus aqui também são só visuais (`collide: false`). A
      subida de verdade é uma rampa HELICOIDAL aproximada por 12 segmentos retos curtos e
      invisíveis por andar (36 no total), cada um girado (yaw) tangente ao círculo naquele ponto
      e inclinado (pitch) pra cobrir a subida do trecho.
- [x] Prédio alargado (`QT_WIDTH` 3,4→4,0) pra caber um poço de escada circular em vez da faixa
      reta estreita anterior — ainda confirmado sem sobrepor a rua (folga de borda ~0,31, positiva).
- [x] Build (typecheck + produção) passa.
- [x] Verificação ao vivo ANTES de reportar (lição do lab-47, usuário pediu "testar antes"):
      raycast sistemático ao longo dos 3 andares — 36 segmentos de rampa amostrados, TODOS
      batendo no segmento esperado em sequência crescente e contínua (sem saltos, sem buracos,
      sem bater no segmento errado), incluindo a transição suave entre o fim de um andar e o
      início do próximo. Confirmado visualmente: marcadores de quiz aparecendo em posições X,Z
      bem diferentes entre si (não mais alinhados na mesma coluna/linha). Checklist de regressão
      completo: 21 escolas, 39 bichos, torre, 8 lasers, 48 rochas de montanha, 65 props gerais, 7
      props do deserto — tudo presente, sem erros no console.

## Fora de escopo (explicitamente adiado)
- Abertura circular perfeita no piso de cada andar (usa a mesma exclusão retangular do poço já
  usada nos laboratórios anteriores, generosa o bastante pra cobrir o raio da espiral — não é uma
  abertura circular geometricamente precisa, mas funcionalmente equivalente e visualmente
  aceitável pro estilo baixo-poli do jogo).
