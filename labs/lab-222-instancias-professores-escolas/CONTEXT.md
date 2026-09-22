# Contexto - Laboratorio 222 - Instancias dos professores das escolinhas

Preenchido em: 2026-09-22
Commit inicial: 715e806170f94fb6257d559f2841247894757613
PR: #106

## O que foi feito

- O professor completo da primeira escolinha da Terra permanece como a unica hierarquia de
  `Mesh` fonte. As outras 29 figuras sao criadas por `instantiateStaticHierarchy`, que preserva
  os pivos articulados e transforma as 19 folhas geometricas em `InstancedMesh`.
- Os 30 professores passaram de 30 conjuntos independentes de geometria e materiais para um
  conjunto fonte com 19 meshes e 551 instancias (19 x 29), sem aumentar os 2.264 meshes totais do
  perfil local usado no teste.
- Todas as instancias mantem o pai de sua escola, escala 0,92, posicao na porta, orientacao radial,
  sombras e o mesmo descarte por escola introduzido no Lab 221.
- O HUD e `window.__perf.earthSchools()` agora mostram escolas habilitadas, meshes-fonte e meshes
  instanciados dos professores. O relatorio de 15 segundos inclui os mesmos campos.
- O teste de `staticHierarchyInstances` cobre duas escolas independentes compartilhando geometria
  e material, inclusive quando a hierarquia fonte fica sob uma escola desabilitada.

## Comparacao antes/depois

Roteiro: Terra estabilizada, Edge 153, viewport 2552x867, DPR 1, Intel UHD/ANGLE D3D11, escala
1,60 e amostra de 15 segundos. O antes veio do deploy de producao imutavel do Lab 221; o depois,
do Vite local do Lab 222. O perfil salvo no baseline tinha sete meshes adicionais e a camera
habilitou 20 escolas; o perfil local tinha 2.264 meshes e habilitou 22. Portanto os percentuais
abaixo sao direcionais, nao um benchmark de laboratorio perfeitamente isolado. Mesmo com duas
escolas a mais, a reducao e grande demais para ser explicada pelos sete meshes de perfil.

| Metrica | Lab 221 | Lab 222 | Diferenca |
| --- | ---: | ---: | ---: |
| Escolas habilitadas | 20 | 22 | +2 |
| Draw calls medio | 2.726,87 | 1.681,00 | -1.045,87 (-38,4%) |
| Draw calls maximo | 2.781 | 1.750 | -1.031 (-37,1%) |
| Meshes ativos medio | 799,93 | 496,69 | -303,24 (-37,9%) |
| Meshes ativos maximo | 827 | 534 | -293 (-35,4%) |
| Camera render | 48,27 ms | 30,50 ms | -17,77 ms (-36,8%) |
| Render | 16,54 ms | 8,74 ms | -7,80 ms (-47,2%) |
| Avaliacao de meshes ativos | 7,29 ms | 6,34 ms | -0,95 ms (-13,0%) |

O navegador automatizado continuou limitando `requestAnimationFrame` a aproximadamente 1 FPS.
Por isso FPS nao e usado como criterio de sucesso; Redmi Pad 2 e Poco C75 fisicos continuam sendo
a validacao necessaria para fluidez real.

## Verificacao

- `npm run test -- --run`: 275/275 testes em 14 arquivos.
- `npx tsc -b --force`: passou.
- `npm run lint`: passou sem erro; permanecem dois avisos preexistentes.
- `npm run build`: passou, incluindo service worker PWA.
- Edge: Terra carregou, HUD confirmou `professores 19+551i`, medicao foi copiada, camera/zoom foram
  exercitados e nao houve erro no console.

## Decisoes tecnicas

- Reaproveitar `instantiateStaticHierarchy` do Lab 220 em vez de criar outra fabrica. Ela ja
  preserva hierarquia/pivos e tem cobertura automatizada.
- Usar a primeira figura visivel como fonte em vez de manter um template oculto adicional. Isso
  conserva a contagem total de meshes e evita memoria/objetos extras apenas para servir de molde.
- Manter os professores animados dos planetas secundarios fora do escopo: suas rotacoes e idle
  independentes nao cabem na mesma premissa de figura estatica.
- Registrar cada instancia no `ShadowGenerator`, repetindo o comportamento validado para props no
  Lab 220.

## Proximo laboratorio recomendado

Lab 223 - instanciar a estrutura visual repetida das escolinhas (porta, fundacao e paredes),
mantendo telhados com material dinamico por quest e separando colisores estaticos quando
necessario. Pergunta tecnica: "as geometrias repetidas restantes do predio reduzem draw calls sem
alterar colisao Havok, assentamento ou feedback de estado da missao?"

## Pendencias

- Repetir Labs 220-222 no Redmi Pad 2 e Poco C75 fisicos.
- Fazer uma volta completa na Terra para observar sombras e professores quando a escola fonte
  (`q01`) entra e sai do culling enquanto outras escolas continuam visiveis.
- O baseline automatizado usa perfis diferentes por origem; uma campanha fisica deve usar o mesmo
  perfil, camera e roteiro em builds imutaveis.
