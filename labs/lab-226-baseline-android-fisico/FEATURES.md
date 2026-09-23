# Laboratorio 226 - Baseline Android fisico

Status: em andamento
Inicio: 2026-09-22
Fim: -
Commit inicial: 4b242896698b1e56c9c8a5323026b834a0588d3e

## Objetivo do laboratorio

Medir o jogo em Redmi Pad 2, Poco C75 e, se disponivel, um Android intermediario com o mesmo
roteiro. Identificar com dados qual cena e qual familia de custo devem orientar a proxima
otimizacao de camera/render, sem sacrificar legibilidade ou conteudo educativo.

## Primeira coleta recebida (Redmi Pad 2)

- Build `2026-09-22T22:31:59.915Z`, Terra, Chrome Android/WebGL2, Mali-G57 MC2,
  viewport 1138x633, DPR 2.25. JSON enviado pelo usuario em 2026-09-22.
- 15,1 s / 173 amostras: FPS medio 11,45, p5 10,62, p1 10,26; quadro medio 84,48 ms,
  p95 91,60 ms. Draw calls medias 1.937,52, meshes ativos medios 676,66, avaliacao de
  meshes 13,39 ms, camera/render 66,73/23,58 ms, render targets 8,30 ms, fisica 0,55 ms.
- O benchmark classificou a GPU como `strong` e aplicou `full`, incluindo SSAO, glow,
  MSAA 4x e sombra 1024; seis ciclos de autoajuste chegaram a escala 1,60 e ainda mediram
  11,32 FPS no ultimo ciclo. Isso evidencia que reduzir apenas resolucao e insuficiente.
- `gpuFrameTimeMs: 0` significa timer GPU indisponivel. Os tempos de camera, render e
  render targets nao sao fatias aditivas. Ha apenas uma coleta fisica ate aqui; o gargalo
  especifico ainda precisa de confirmacao com antes/depois no mesmo aparelho.

## Experimento de render adaptativo

- O perfil inicial continua vindo do benchmark; depois de medir a cena real, abaixo de
  30 FPS desliga SSAO e glow e reduz MSAA a 1. Abaixo de 20 FPS tambem descarta o shadow map.
  O ajuste e unidirecional na sessao para evitar alocacoes repetidas e cintilacao.
- O perfil completo permanece em maquinas que sustentem >=30 FPS. A escala automatica
  existente continua independente. `qualityProfile.adaptiveEffectTier` e os campos
  `effective*` no JSON identificam o estado efetivo, nao apenas o perfil inicial.
- Hipotese: retirar passes extras diminui draw calls e tempo de camera no Redmi Pad 2,
  permitindo FPS maior sem borrar mais a imagem. A primeira coleta apos o deploy apoia
  essa hipotese, mas falta repeticao e verificacao visual no tablet.
- Repetir duas coletas de 15 s na Terra no mesmo percurso apos publicar esta branch:
  comparar FPS medio/p5/p1, p95 de quadro, draw calls, render targets, escala e legibilidade.
  Registrar separadamente se `adaptiveEffectTier` chegou a 2. Confirmar no desktop que
  continua em 0 e sem regressao visual.
- Verificacao funcional local no Edge: a cena seguiu visivel e interativa apos a mudanca,
  com contador instantaneo caindo de cerca de 1.950 para cerca de 500 draw calls e FPS
  instantaneo na faixa de 40-46. Nao e comparacao controlada nem resultado Android.

## Primeira coleta apos o deploy (Redmi Pad 2)

- Build `2026-09-23T00:22:38.999Z`, Terra, mesmo renderer Mali-G57 MC2, viewport 1138x633
  e DPR 2.25 do baseline. JSON enviado pelo usuario; 15,0 s / 334 amostras.
- `adaptiveEffectTier: 2`: SSAO, glow e sombras desligados, MSAA efetivo 1. O perfil
  inicial continua `full`, mas o ajuste mediu a cena real e chegou a escala 1,40 apos
  tres ciclos (baseline anterior: escala 1,60 apos seis ciclos).
- Antes -> depois: FPS medio 11,45 -> 22,25 (+94,3%); p5 10,62 -> 18,28; p1 10,26 ->
  16,58; quadro medio 84,48 -> 42,61 ms; quadro p95 91,60 -> 51,60 ms. Draw calls
  medias 1.937,52 -> 427,26 (-78,0%).
- Camera/render 66,73/23,58 -> 25,88/14,09 ms; render targets 8,30 -> 0 ms; fisica
  0,55 -> 0,79 ms. Avaliacao de meshes 13,39 -> 11,30 ms e meshes ativos medios
  676,66 -> 676,43. Escolas habilitadas medias 15,95 -> 17,99, portanto a melhora
  nao veio de mostrar menos escolas nesta amostra.
- Leitura: o ganho direcional e grande no mesmo aparelho/cena e com mais escolas visiveis,
  mas nao e A/B controlado (percursos e tempo de aquecimento podem diferir). A escala
  menor tambem significa mais nitidez potencial, ainda nao julgada visualmente pelo usuario.
  `gpuFrameTimeMs: 0` continua sendo timer indisponivel. Nao somar contadores de tempo
  sobrepostos para explicar o quadro inteiro.
- Proxima decisao: repetir duas vezes na mesma build/percurso; coletar centro de jogos e
  Marte e Poco C75 antes de escolher outra reducao. Se 20-23 FPS se mantiver na Terra,
  investigar o custo de avaliacao de meshes e de render remanescente, preservando
  professores, pistas de quest e legibilidade. Nao afirmar meta de 30 FPS atingida.

## Experimento de CPU e qualidade

- Auditoria, riscos e roteiro em `PERFORMANCE-AUDIT.md`.
- Congelar matrizes de todas as hierarquias das escolas somente apos assentamento e criacao
  de todas as instancias; atualizar cor de emissao do telhado sem alocar a cada quadro.
- Acrescentar ao JSON tempo do loop do jogo e contagens de recursos para distinguir CPU de
  selecao/render e orientar a proxima auditoria de memoria. Nenhuma qualidade sera reduzida
  nesta iteracao; o autoajuste pode escolher escala mais nitida caso o FPS melhore.
- A mudanca fica experimental ate comparacao fisica no Redmi Pad 2 e QA de escolas/relevo.

## Coleta apos congelar matrizes (Redmi Pad 2)

- Build `2026-09-23T02:35:50.273Z`, Terra, mesmo Mali-G57 MC2, viewport 1138x633,
  DPR 2.25, escala 1,40 e `adaptiveEffectTier: 2`; 15,1 s / 426 amostras.
- FPS medio 22,25 -> 28,29 (+27,1%); p5 18,28 -> 23,58; quadro p95 51,60 -> 39,70 ms.
  `activeMeshesEvaluationTimeMs` 11,30 -> 10,25 ms; `cameraRenderTimeMs` 25,88 ->
  24,05 ms. `gameUpdateTimeMs` medio 0,85 ms/p95 1,80 ms; 1.236 geometrias,
  12 texturas, 1.003.991 vertices e 1.020 transform nodes congelados.
- Comparacao nao controlada: escolas habilitadas medias cairam de 17,99 para 13,53,
  meshes ativos de 676,43 para 596,54 e draw calls de 427,26 para 389,23. A cena/
  camera mais leve pode explicar parte importante do ganho; nao atribuir +27,1% ao
  congelamento sem repetir o mesmo percurso. O p5 ainda nao atinge 30 FPS.

## Experimento de detalhe dos professores distantes

- Cada escola tem um professor estatico de 19 meshes; no nivel adaptativo 2,
  professores alem de 30 unidades da camera trocam para silhueta de corpo/cabeca
  com duas meshes compartilhadas por instancias. Abaixo de 25 unidades, voltam
  ao modelo completo; a faixa intermediaria evita piscadas. Nos niveis 0/1,
  todos continuam completos. Escolas, quizzes, colisoes e gatilhos nao mudam.
- O JSON passa a incluir `earthSchools.detailedTeachersAvg` e
  `earthSchools.simpleTeachersAvg`. A hipotese e reduzir avaliacao/draw calls de
  detalhes pequenos na tela e preservar professor reconhecivel quando proximo.
  Comparar no Redmi no mesmo percurso e nivel 2 antes de afirmar ganho; inspecionar
  a troca aproximando-se de uma escola e durante o voo de foguete.

## Funcionalidades planejadas

- [ ] Coletar amostras reais de 15 segundos na Terra, no centro de jogos e em Marte ou outro
  planeta secundario, em pelo menos Redmi Pad 2 e Poco C75 (referencia: Lab 225 `CONTEXT.md`,
  Lab 219 `CONTEXT.md` e backlog 191).
- [ ] Conferir dispositivo, build, cena, perfil, escala e numero de ciclos do autoajuste em cada
  JSON; rejeitar amostras de carregamento, aba em segundo plano ou cena errada (referencia: Lab
  219 `CONTEXT.md` e Lab 225 `qualityProfile.ts`).
- [ ] Comparar FPS medio/p5/p1, tempo de quadro p95, draw calls, meshes ativos, camera/render,
  render targets, fisica e tempo de GPU quando disponivel. Identificar uma familia de custo com
  evidencia em pelo menos duas amostras do mesmo aparelho/cena (referencia: backlog 193).
- [x] Implementar um ajuste pequeno de passes de render com base no FPS da cena real, sem
  alterar a regra de jogo nem o perfil inicial do desktop; compilar, testar e verificar no Edge.
- [ ] Comparar antes/depois no Redmi Pad 2 com duas novas amostras da Terra e revisar nitidez,
  iluminacao, relevo e texto no proprio aparelho. Depois expandir a matriz ao Poco C75 e cenas
  adicionais (referencia: Lab 225 `CONTEXT.md`).
- [x] Auditar CPU, memoria, estrutura de malhas e alternativas do Babylon; aplicar congelamento
  apenas nas hierarquias estaticas das escolas e eliminar alocacao por quadro no pulso do telhado.
- [ ] Validar no Redmi Pad 2 se a otimizacao de CPU melhora FPS/escala sem perder qualidade.
- [ ] Validar no Redmi Pad 2 o detalhe adaptativo dos professores contra a build
  `2026-09-23T02:35:50.273Z`, com o mesmo percurso e verificacao visual.

## Como coletar

1. Abra o jogo publicado em `https://app-two-flax-92.vercel.app` no aparelho real. Se o HUD ainda
   nao mostrar `perfil economy` ou `perfil full`, feche todas as abas/PWA do jogo e abra de novo.
   Anote o `build` do HUD; as amostras de baseline devem ter o mesmo build.
2. Em cada cena, espere o carregamento terminar e jogue por cerca de 15 segundos antes de medir,
   para o autoajuste ter tempo de executar. Deixe o aparelho na mesma orientacao e no mesmo modo
   de energia durante todas as medicoes; evite alternar de aplicativo enquanto mede.
3. Abra o painel de FPS e toque em `Medir 15 s`. Para a Terra, comece no ponto de nascimento e
   mova camera/avatar normalmente. Repita o mesmo caminho na segunda medicao. Depois repita no
   centro de jogos e em Marte (ou informe qual planeta secundario foi usado).
4. Toque em `Copiar JSON` e envie o texto ou o arquivo baixado caso a copia falhe. Comece com as
   duas amostras da Terra em cada aparelho; as outras cenas completam a matriz depois.
5. Nao inclua nome da crianca, conta, endereco ou outros dados pessoais no envio. O JSON de FPS
   ja inclui somente metadados tecnicos do dispositivo e da cena.

## Criterios de leitura

- Duas amostras por aparelho/cena; mesma versao e percurso parecido antes de comparar resultados.
- `qualityProfile.gpuTierSource` deve ser `benchmark` em producao; registrar se `gpuTier` e
  `hardwareScalingLevel` diferirem entre amostras do mesmo aparelho.
- `gpuFrameTimeMs = 0` significa medicao GPU indisponivel, nao custo zero. Os contadores de
  camera/render/render targets podem se sobrepor; nao somar como se fossem fatias independentes.
- Uma melhora so sera afirmada apos comparacao antes/depois no mesmo aparelho e cena. Amostras do
  Edge ou Android Emulator servem para verificar comportamento, nao para estimar FPS fisico.

## Fora de escopo

- Alterar densidade/geometria ou reduzir mais a resolucao sem antes/depois Android fisico.
- Coletar telemetria automaticamente ou enviar dados da crianca ao backend.
- Marcar o backlog 191 como concluido com apenas amostras desktop/emuladas.
