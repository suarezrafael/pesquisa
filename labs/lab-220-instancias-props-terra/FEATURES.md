# Laboratorio 220 - Instancias para props estaticos da Terra

Status: concluido
Inicio: 2026-09-21
Fim: 2026-09-21
Commit inicial: c8b23f7b1611c48765b0aa8137ecb1a0f0509f0f
PR: #104

## Problema / hipotese

O baseline do Lab 219 mediu 2.315 draw calls medios e 45,59 ms de camera render no Android
emulado, contra apenas 0,56 ms de fisica. Arvores, flores, cogumelos e rochas estaticas do Nature
Kit ainda sao clonados como malhas completas. A hipotese e que instanciar as malhas-filhas de cada
template reduz submissao de draw calls sem diminuir densidade, textura, sombra ou colisao.

## Usuario beneficiado

Criancas jogando em tablets e celulares de entrada, especialmente Redmi Pad 2 e Poco C75, com
beneficio secundario para notebooks ao reduzir trabalho de CPU/GPU por quadro.

## Escopo

- Criar uma fabrica pequena para instanciar hierarquias Babylon, preservando pivôs e transformacoes
  do GLB e convertendo folhas com geometria em `InstancedMesh`.
- Migrar somente os props estaticos Nature Kit da Terra: scatter geral, rochas dedicadas do deserto
  e rochas das montanhas.
- Manter cactos construidos por codigo, colisores fisicos invisiveis, assentamento no relevo,
  sombras e quantidade visual atuais.
- Adicionar teste automatizado que prove compartilhamento da malha-fonte e preservacao da
  hierarquia/transformacoes.
- Comparar draw calls, meshes ativos e FPS com a captura de 15 segundos do Lab 219 no mesmo roteiro
  disponivel nesta maquina.

## Fora de escopo

- Thin instances para escolas, NPCs, moedas, pets, parkour ou objetos interativos/dinamicos.
- Converter props dos planetas visitaveis, que devem ser medidos separadamente.
- Reduzir contagem de objetos, remover sombras ou degradar materiais para produzir ganho artificial.
- Alterar fisica, monetizacao, multiplayer, chat ou progressao.

## Criterios de aceite

- Props migrados usam instancias Babylon para cada malha-filha compartilhada, sem clones de
  geometria no caminho novo.
- Posicao, escala, orientacao e assentamento visual permanecem equivalentes ao caminho anterior.
- Colisores continuam separados das malhas visuais e o avatar nao ganha plataformas invisiveis.
- Arvores/rochas continuam recebendo e projetando sombras conforme o perfil de qualidade atual.
- TypeScript, testes, lint e build passam; verificacao real no Edge nao apresenta erro de console.
- A medicao antes/depois e registrada, inclusive se o ganho do grupo isolado for pequeno.

## Metricas esperadas

- Reducao de draw calls medios e maximos na Terra.
- Reducao ou estabilidade de `cameraRenderTimeMs` e `activeMeshesEvaluationTimeMs`.
- FPS medio/p5 sem regressao; quantidade e qualidade visual preservadas.
- Sem aumento relevante de meshes totais ou memoria por duplicacao acidental de geometria.

## Riscos

- Instancias em hierarquias glTF podem perder transformacao de pivô ou orientacao se forem
  reconstruidas manualmente; usar `instantiateHierarchy` evita essa perda.
- Registrar cada instancia incorretamente no shadow map pode anular parte do ganho ou duplicar
  desenho; a verificacao deve incluir sombras e draw calls, nao apenas a cena principal.
- `settleMeshOnTerrain` precisa continuar lendo vertices da geometria-fonte atraves das instancias.
- O emulador nao substitui medicao posterior em Redmi/Poco fisico.

## Prioridade

P0, proxima acao indicada pelo Lab 219 e pelo backlog 193 depois do baseline de performance.

## Origem

- `labs/lab-219-captura-performance-mobile/CONTEXT.md`, proximo laboratorio recomendado.
- `docs/gameplay-market-expansion-backlog.md`, Lab 193.
- `docs/urgent-babylon-performance-lab.md`, reducao de draw calls com instances/thin instances.

## Implementacao entregue

- [x] Fabrica de hierarquia instanciada com teste automatizado.
- [x] Scatter geral Nature Kit da Terra migrado sem alterar distribuicao ou colisores.
- [x] Rochas Nature Kit do deserto e das montanhas migradas pelo mesmo caminho.
- [x] Sombras, relevo, colisao e equivalencia visual verificados no Edge.
- [x] Relatorio antes/depois registrado e backlog atualizado com o resultado real.

## Resultado medido

No mesmo Edge, viewport, renderer Intel e escala interna 1,60, a media caiu de 3.492 para
3.236,57 draw calls (-7,3%), e o maximo de 3.518 para 3.303 (-6,1%). A cena manteve 2.264 meshes
totais. O navegador automatizado limitou `requestAnimationFrame` a aproximadamente 1 FPS nas duas
versoes, portanto FPS e tempos de quadro desta comparacao nao servem como conclusao de hardware;
o ganho confirmado deste lab e a reducao de submissao de draw calls.
