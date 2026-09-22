# Contexto - Laboratorio 223 - Instancias da estrutura das escolinhas

Preenchido em: 2026-09-22
Commit inicial: 5027387268f63c48b2d5ee4c56f651c608dc5fb5
PR: a abrir

## O que foi feito

- A primeira escolinha da Terra conserva as tres meshes normais de parede, fundacao e porta. As
  outras 29 estruturas usam `instantiateStaticHierarchy`, produzindo 3 meshes-fonte e 87
  `InstancedMesh` (3 x 29) que compartilham geometria e material.
- Cada parede, inclusive as instanciadas, recebe seu proprio `PhysicsAggregate` estatico do Havok.
  O pacote Babylon instalado trata `InstancedMesh` pela geometria de `sourceMesh`, portanto o
  colisor continua ajustado a cada escola sem uma caixa visual duplicada.
- Telhados permanecem meshes independentes porque cor e emissao mudam conforme tipo/estado da
  quest. Professores, labels, assentamento no relevo e culling por escola nao foram alterados.
- HUD, `window.__perf.earthSchools()` e relatorio de 15 segundos agora informam
  `structureSourceMeshes` e `structureInstanceMeshes`.
- O teste do helper cobre uma estrutura com tres folhas, compartilhamento de geometria/material e
  identificacao da parede-fonte usada para instalar o colisor.

## Comparacao antes/depois

O numero total de objetos da estrutura continua 90, mas as geometrias independentes cairam de 90
para 3 fontes compartilhadas. O perfil local permaneceu com 2.264 meshes totais e confirmou
`predios 3+87i`; nao foi criado template oculto adicional.

Uma leitura instantanea do HUD no Edge 153, viewport 2552x914, escala 1,60 e 20 escolas habilitadas
mostrou 2.163 draw calls no deploy do Lab 222 e 2.052 no Lab 223 local: -111 (-5,1%). O baseline
tinha sete meshes extras do perfil salvo, e camera/atividade da cena nao ficam perfeitamente
congeladas entre origens; por isso o numero e direcional, nao uma garantia de ganho em qualquer
quadro.

A amostra local de 15 segundos registrou 2.043,86 draw calls medios, 772,29 meshes ativos medios,
36,19 ms de camera render e 11,33 ms de render. A automacao limitou `requestAnimationFrame` a
aproximadamente 1 FPS, como nos labs anteriores; FPS real continua dependendo do Redmi Pad 2 e do
Poco C75 fisicos.

## Verificacao

- `npx vitest run src/world3d/staticHierarchyInstances.test.ts`: passou.
- `npx tsc -b --force`: passou.
- `npm run test -- --run`: 276/276 testes em 14 arquivos.
- `npm run lint`: passou sem erro; permanecem dois avisos preexistentes.
- `npm run build`: passou, incluindo o service worker PWA.
- Edge: Terra carregou, HUD confirmou `predios 3+87i`, 2.264 meshes e 20-22 escolas habilitadas;
  escolas e telhados renderizaram e o console permaneceu sem erros.

## Decisoes tecnicas

- Reutilizar o helper do Lab 220 e a primeira escola visivel como fonte, evitando uma fabrica ou
  template oculto adicional.
- Instanciar somente parede, fundacao e porta. O telhado possui estado visual por quest e nao pode
  compartilhar material congelado; o professor ja foi tratado no Lab 222.
- Manter um colisor por parede. Agregar colisores reduziria corpos, mas mudaria a semantica de
  culling/enablement e aumentaria o risco de colisao invisivel.
- Preservar a contagem total de meshes para isolar o efeito de compartilhamento, sem remover
  conteudo, sombra ou interacao para produzir uma melhora artificial.

## Proximo laboratorio recomendado

Lab 224 - auditar e congelar somente materiais realmente estaticos da Terra, com uma lista
explicita de exclusao para telhados, portais, feedbacks, agua, avatar, pets e outros materiais que
mudam durante o jogo. Pergunta tecnica: "quanto trabalho de CPU do Babylon pode ser removido por
`material.freeze()` sem interromper estados visuais, emissao, cosmeticos ou troca de qualidade?"

## Pendencias

- Repetir Labs 220-223 no Redmi Pad 2 e Poco C75 fisicos com o mesmo perfil, camera e roteiro.
- Dar uma volta completa na Terra para validar colisao de escolas instanciadas distantes da fonte
  `q01`, inclusive quando a escola-fonte entra e sai do culling.
- Medir Marte e ao menos um planeta secundario antes de aplicar a mesma tecnica fora da Terra.
