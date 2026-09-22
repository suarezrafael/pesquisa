# Contexto - Laboratorio 220 - Instancias para props estaticos da Terra

Preenchido em: 2026-09-21
Commit inicial: c8b23f7b1611c48765b0aa8137ecb1a0f0509f0f
PR: #104

## O que foi feito

- Criada uma fabrica pequena sobre `TransformNode.instantiateHierarchy`, preservando pivôs e nos
  intermediarios dos GLBs e convertendo folhas com geometria em `InstancedMesh`.
- O scatter geral Nature Kit da Terra, as rochas dedicadas do deserto e as rochas das montanhas
  passaram a compartilhar geometria e material por template.
- Colisores fisicos, cactos construidos por codigo, densidade, distribuicao e assentamento no
  relevo ficaram no caminho existente.
- Cada folha instanciada continua registrada no `ShadowGenerator`; matrizes estaticas continuam
  congeladas depois do posicionamento.
- A raiz glTF usada como fonte e normalizada para escala positiva, reproduzindo a aparencia dos
  clones historicos. Isso tambem mantem igual o sinal do determinante entre fonte e instancia;
  sem essa normalizacao o Babylon ativa `_actAsRegularMesh` e deixa de agrupar os desenhos.
- O teste automatizado cobre hierarquia, transformacoes, compartilhamento de geometria, leitura de
  vertices pelo assentamento e compatibilidade do determinante para batching.

## Comparacao antes/depois

Roteiro comparavel: cena Terra recem-iniciada, Edge 153, viewport 2552x867, DPR 1, renderer Intel
UHD/ANGLE D3D11, `hardwareScalingLevel=1.60`, amostra de 15 segundos. O antes foi capturado no
deploy imutavel do Lab 219; o depois, no build local do Lab 220.

| Metrica | Lab 219 | Lab 220 | Diferenca |
| --- | ---: | ---: | ---: |
| Draw calls medio | 3.492 | 3.236,57 | -255,43 (-7,3%) |
| Draw calls maximo | 3.518 | 3.303 | -215 (-6,1%) |
| Meshes totais | 2.264 | 2.264 | estavel |
| FPS medio | 0,98 | 0,98 | inconclusivo |
| Camera render | 71,97 ms | 74,33 ms | inconclusivo |
| Fisica | 1,13 ms | 1,76 ms | inconclusivo |

A automacao do Edge limita `requestAnimationFrame` a aproximadamente 1 FPS, o que distorce FPS,
tempo de quadro e tempos dos subsistemas. Como as duas versoes sofreram a mesma limitacao, a queda
de draw calls e um sinal direcional valido da mudanca estrutural, mas nao substitui a medicao em
Redmi Pad 2, Poco C75 e Android intermediario. A diferenca de meshes ativos refletiu pequenas
variacoes de enquadramento/spawn e nao foi usada como conclusao.

## Verificacao

- `npx vitest run src/world3d/staticHierarchyInstances.test.ts`: passou.
- `npx tsc -b --force`: passou.
- `npm run test -- --run`: 267/267 testes passaram.
- `npm run lint`: passou sem erro; permanecem os dois avisos preexistentes.
- `npm run build`: passou, incluindo geracao do service worker PWA.
- Edge: cena renderizada com arvores/rochas, controle de movimento respondendo e nenhum erro no
  console. Total de meshes e lista de diagnostico de assentamento permaneceram estaveis.

## Decisoes tecnicas

- Usar instancias Babylon, e nao thin instances, nesta primeira fatia: a hierarquia dos GLBs e a
  leitura de vertices por `settleMeshOnTerrain` continuam disponiveis com menor risco visual.
- Nao instanciar cactos, objetos interativos, NPCs ou props de outros planetas sem medicao propria.
- Nao reduzir quantidade, materiais ou sombras para inflar artificialmente o ganho.
- Manter o backlog 193 parcial: o grupo isolado melhorou, mas a Terra ainda supera 3,2 mil draw
  calls no roteiro desktop e a validacao nos aparelhos fisicos continua pendente.

## Proximo laboratorio recomendado

Lab 221 - classificar os draw calls restantes por grupo/cena e aplicar culling/enablement espacial
a uma unica familia estatica dominante da Terra. O lab deve comparar o mesmo relatorio antes e
depois e nao usar `freezeActiveMeshes()` global, pois o mundo possui objetos dinamicos.

Pergunta tecnica a responder: "depois dos props Nature Kit, qual grupo estatico ainda envia mais
draw calls sem contribuir para o que a crianca enxerga e pode ser ocultado com seguranca?"

## Pendencias

- Repetir a amostra antes/depois em Redmi Pad 2 e Poco C75 fisicos.
- Medir Marte e ao menos um planeta secundario antes de migrar seus props.
- Registrar o merge em `labs/CURRENT.md`.
