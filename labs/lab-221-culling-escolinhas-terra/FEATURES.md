# Laboratorio 221 - Culling das escolinhas da Terra

Status: concluido
Inicio: 2026-09-22
Fim: 2026-09-22
Commit inicial: 20c2f4c157bcfb3ccdf2bf430cf1edb7aefd4f6c
PR: #105

## Problema / hipotese

A Terra ainda mede mais de 3,2 mil draw calls no roteiro desktop do Lab 220. A maior familia
estatica restante sao as 30 escolinhas: cada unidade possui quatro malhas de predio e um professor
articulado com cerca de 16 malhas, aproximadamente 600 malhas no total. O frustum culling nao
elimina necessariamente objetos atras do proprio planeta. Desabilitar somente as escolas no
hemisferio comprovadamente oculto deve reduzir meshes ativos e draw calls sem retirar conteudo,
diminuir qualidade ou alterar interacao.

## Usuario beneficiado

Criancas jogando em celulares, tablets e notebooks com GPU integrada, especialmente aparelhos em
que o custo de camera/render e draw calls domina o quadro.

## Escopo

- Criar uma regra pura e testavel de oclusao pela esfera entre camera e topo da escola, com margem
  conservadora e histerese entre ocultar e reexibir.
- Aplicar a regra somente as 30 escolinhas e seus professores na Terra, em frequencia limitada.
- Desabilitar todas as escolinhas enquanto outro planeta ou interior estiver ativo; durante o voo,
  preservar a Terra completa para nao causar aparecimento/desaparecimento na transicao.
- Manter labels, feixe de ativacao, estado visual de progresso, colisores e gatilhos coerentes.
- Expor no diagnostico de performance a quantidade de escolas visiveis para auditar a decisao.
- Comparar o relatorio de 15 segundos com o deploy imutavel do Lab 220 no mesmo roteiro.

## Fora de escopo

- Instanciar professores ou predios, alterar seus materiais ou reduzir sua quantidade.
- Aplicar culling a NPCs, fauna, parkour, casas, loja ou planetas secundarios.
- Usar `scene.freezeActiveMeshes()`, octree global ou desligar fisica das escolas.
- Alterar missao, progressao, monetizacao, multiplayer ou conteudo educativo.

## Criterios de aceite

- Uma escola nunca e ocultada quando esta proxima do avatar ou dentro da margem visivel.
- A histerese impede alternancia quadro a quadro na fronteira de visibilidade.
- Escolas ocultas voltam antes de poderem ser vistas ou acionadas pela crianca.
- Labels e feixe acompanham o estado visual sem sobrescrever progresso/conclusao.
- O culling roda no maximo a 10 Hz e nao cria vetores temporarios por escola no loop.
- Testes, TypeScript, lint e build passam; Edge nao apresenta erro de console.
- Draw calls/meshes ativos antes e depois ficam registrados, mesmo se o ganho for pequeno.

## Metricas esperadas

- Menos escolas habilitadas quando a crianca esta em uma face da Terra.
- Reducao de meshes ativos e draw calls medios/maximos na cena Terra.
- Total de meshes estavel, provando que conteudo nao foi removido.
- FPS e tempos de render sem regressao em medicao fisica posterior.

## Riscos

- Margem agressiva pode fazer escola aparecer de repente perto do horizonte; usar limite
  conservador e histerese.
- `setEnabled(false)` no pai nao deve apagar o estado habilitado do feixe filho nem interferir em
  `applyPortalVisual`; verificar reentrada e primeira missao.
- Labels Babylon GUI vinculadas a malha podem precisar de sincronizacao explicita.
- Automacao do Edge limita FPS e nao substitui Redmi Pad 2/Poco C75 fisicos.

## Prioridade

P0, segunda fatia do backlog 193 e proximo laboratorio recomendado pelo Lab 220.

## Origem

- `labs/lab-220-instancias-props-terra/CONTEXT.md`.
- `docs/urgent-babylon-performance-lab.md`, culling/enablement por planeta/area.
- `docs/backlog-status.md`, backlog 193.

## Funcionalidades planejadas

- [x] Regra esferica com histerese coberta por testes automatizados.
- [x] Escolinhas/professores ocultos apenas quando o planeta bloqueia a linha de visao ou fora da Terra.
- [x] Labels, feixe, progresso, colisao e gatilho de missao preservados.
- [x] Contagem de escolas habilitadas incluida no diagnostico local.
- [x] Medicao antes/depois e verificacao real no Edge registradas.

## Resultado medido

No mesmo Edge, viewport 2552x867, renderer Intel e escala interna 1,60, 20 das 30 escolas ficaram
habilitadas no spawn. Draw calls medios caíram de 3.123,86 para 2.750,43 (-12,0%) e meshes ativos
de 903,07 para 816,71 (-9,6%), mantendo 2.264 meshes totais. A automacao limitou ambas as versoes
a aproximadamente 1 FPS; os ganhos confirmados sao a reducao estrutural de trabalho renderizado e
os tempos direcionais menores, nao uma conclusao de FPS em hardware fisico.
