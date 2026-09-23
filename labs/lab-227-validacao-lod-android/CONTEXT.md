# Contexto - Laboratorio 227 - Validacao de detalhe no Android

Preenchido em: 2026-09-23
Commit inicial -> final: 2bdbe1792b8915c2b16284baa1fb2529f9b46944..2af9c78aae3033eeed61227c4860ccf87f783c25

## O que foi feito

- O escopo de validacao do LOD dos professores foi registrado em `FEATURES.md`.
- A PR #114 mesclou apenas documentacao de transicao entre labs. O deploy da
  mesma implementacao 3D ficou disponivel no Vercel com build
  `2026-09-23T14:48:32.765Z`.
- Apos a abertura do Lab 228, chegou uma coleta fisica do Redmi Pad 2 para
  esse build: 30,44 FPS medios, p5 25,38, escala 1,15, 15,28 escolas habilitadas
  em media e `simpleTeachersAvg: 0`. O LOD nao ativou nessa amostra.
- O ajuste experimental por tamanho projetado ficou na PR #116, separado da
  PR #115 do Lab 228. Ainda nao ha coleta fisica da PR #116.

## Decisoes tecnicas tomadas

- Nao ajustar limites de distancia, geometria ou qualidade sem verificar se
  `simpleTeachersAvg` e maior que zero no tablet e sem comparar o mesmo percurso.
- Nao interpretar novo carimbo de build de uma PR so de documentacao como nova
  otimizacao 3D.

## Pendencias / dividas conhecidas

- Falta uma segunda coleta comparavel do build publicado, observacao visual e
  medicao apos a PR #116. Os 30,44 FPS nao demonstram ganho do LOD, que ficou
  inativo na amostra.
- A matriz Poco C75/outras cenas do backlog 191/193 tambem permanece pendente.

## Funcionalidades planejadas que NAO foram concluidas

- Coletar mais uma amostra Terra no Redmi Pad 2 com o mesmo percurso/energia e
  comparar FPS medio/p5, escala, escolas habilitadas e detalhe dos professores.
- Conferir visual proximo/distante e voo; o LOD de distancia nao ativou na
  primeira amostra, e a alternativa da PR #116 precisa de validacao fisica.
- Repetir coleta apos qualquer ajuste. Estes itens ficam aguardando dados do
  aparelho, sem ser marcados como implementados ou descartados.

## O que o proximo laboratorio deve desenvolver

- O Lab 228 pode seguir independentemente com o mapa de verbos e affordances do
  backlog UX 187. Validar a PR #116 no tablet antes de afirmar ganho de FPS.

## Estado do repositorio ao final

- Base publicada: `main` em `2af9c78aae3033eeed61227c4860ccf87f783c25`.
- Verificar LOD: abrir o jogo publicado no Redmi Pad 2, estabilizar o autoajuste
  e exportar duas coletas de `Medir 15 s`; conferir `earthSchools.simpleTeachersAvg`.
