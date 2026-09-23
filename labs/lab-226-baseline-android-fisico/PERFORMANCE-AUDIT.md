# Auditoria de desempenho e qualidade 3D

Data: 2026-09-22. Base: duas coletas do Redmi Pad 2 na Terra, registradas em `FEATURES.md`.

## Fatos medidos

- O render adaptativo elevou FPS medio de 11,45 para 22,25 e reduziu draw calls medias de
  1.937,52 para 427,26. A escala caiu de 1,60 para 1,40 (imagem potencialmente mais nitida).
- Na coleta recente, 2.282 meshes totais, 676 ativos em media, 393 materiais, 17,99 escolas
  habilitadas em media. A avaliacao de meshes custou 11,30 ms; camera/render 25,88/14,09 ms;
  fisica 0,79 ms; render targets 0 ms. Esses contadores podem se sobrepor.
- `gpuFrameTimeMs: 0` indica timer indisponivel. Nenhuma coleta mede heap JS, VRAM ou uso de
  CPU por funcao; nao ha evidencia de vazamento de memoria nem de saturacao exclusiva da GPU.
- Ainda nao foi verificada no tablet a qualidade de relevo, iluminacao e legendas com efeitos
  adaptativos no nivel 2. A meta de 30 FPS nao foi atingida.
- Nesta sessao o Edge local e a versao publicada mostraram ~1 FPS na mesma maquina; o
  ensaio desktop e invalido para medir ganho. A cena inicial renderizou, sem erros de
  console, e o teste automatizado cobriu congelamento/visibilidade das instancias.

## Codigo e decisao desta iteracao

- `World3D.tsx` ja limita atualizacoes de proximidade/ambiente a 10 Hz, instancia estruturas
  e professores, congela 45 materiais estaticos auditados e desliga passes caros conforme FPS.
  O loop de atualizacao do jogo ainda nao tinha tempo proprio na telemetria; o JSON agora
  inclui `gameUpdateTimeMs` medio/p95 para separar esse custo de selecao e render.
- As 30 escolas sao assentadas uma vez no relevo. Predio, telhado e professor nao mudam de
  posicao depois disso; so visibilidade e emissao do material mudam. Congelar suas matrizes
  apos criar todas as instancias evita recomputacao de transformacoes sem retirar geometria,
  sombras ou cor. `earthSchools.frozenTransformNodes` confirma quantos nos foram incluidos.
- O pulso do telhado criava uma `Color3` por escola desbloqueada por quadro. A cor existente
  agora e atualizada sem alocacao; o efeito visual permanece igual.
- O JSON passa a incluir numero de geometrias, texturas e vertices, pois contar meshes sozinho
  nao permite estimar memoria. Nao sera usado como estimativa de bytes de RAM/VRAM.

## Criterio de validacao no Redmi Pad 2

1. Duas amostras de 15 s na Terra, mesma orientacao/percurso, apos estabilizar autoajuste;
   anotar build, escala, efeitos, escolas habilitadas e temperatura/modo de energia.
2. Comparar FPS medio/p5, p95 de quadro, `activeMeshesEvaluationTimeMs`,
   `gameUpdateTimeMs`, draw calls e recursos com o baseline de 22,25 FPS/11,30 ms de
   avaliacao. Nao atribuir ganho a esta mudanca se escala, cena ou percurso diferirem muito.
3. Comparar capturas no mesmo ponto de camera: relevo visivel, telhados/professores no lugar,
   cores pulsando, legendas legiveis e colisao das escolas intacta. Se piorar FPS ou imagem,
   nao promover a mudanca so porque as matrizes ficaram congeladas.

## Proximos candidatos, nao implementados

- A coleta apos congelar matrizes registrou 28,29 FPS medios, mas 13,53 escolas
  habilitadas contra 17,99 antes; o ganho nao pode ser isolado. Avaliacao de meshes
  ainda custa 10,25 ms e o loop do jogo apenas 0,85 ms em media. Foi implementado
  um experimento adicional: no nivel adaptativo 2, professor distante usa duas
  meshes instanciadas em vez de 19 partes; perto continua completo. A validacao
  fisica de FPS e legibilidade segue pendente.
- Se o experimento nao reduzir avaliacao ou prejudicar a leitura visual, revisar
  limite de distancia e a forma simplificada antes de manter em producao.
- Se `gameUpdateTimeMs` dominar, usar um perfil de CPU no aparelho antes de mudar loops ou
  estruturas de dados. As novas contagens de recursos orientam uma auditoria de memoria;
  so propor compressao/texturas menores apos saber tamanhos e impacto visual.
- Nao aplicar `freezeActiveMeshes` global: avatar, pets, NPCs, missao, clima e interiores
  mudam de visibilidade. Nao ativar octree para todas as malhas sem classificar dinamicas;
  o indice espacial do Babylon pressupoe malhas estaticas e requer registrar as moveis.
- Nao usar `ScenePerformancePriority.Aggressive` como atalho: ele altera picking, culling e
  atualizacao de estado, riscos desnecessarios para um jogo interativo.

## Referencias primarias

- Babylon.js, [Optimizing Your Scene](https://github.com/BabylonJS/Documentation/blob/master/content/features/featuresDeepDive/scene/optimize_your_scene.md): custo de mesh candidates, congelamento de matrizes e limites dos modos de performance.
- Babylon.js, [Optimizing With Octrees](https://github.com/BabylonJS/Documentation/blob/master/content/features/featuresDeepDive/scene/optimizeOctrees.md): requisito de malhas estaticas e `dynamicContent`.
