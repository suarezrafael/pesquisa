# Contexto - Laboratorio 227 - Validacao de detalhe no Android

Preenchido em: 2026-09-23
Commit inicial -> final: 2bdbe1792b8915c2b16284baa1fb2529f9b46944..2af9c78aae3033eeed61227c4860ccf87f783c25

## O que foi feito

- O escopo de validacao do LOD dos professores foi registrado em `FEATURES.md`.
- A PR #114 mesclou apenas documentacao de transicao entre labs. O deploy da
  mesma implementacao 3D ficou disponivel no Vercel com build
  `2026-09-23T14:48:32.765Z`.
- Nenhuma coleta fisica nova nem mudanca no jogo ocorreu neste lab.

## Decisoes tecnicas tomadas

- Nao ajustar limites de distancia, geometria ou qualidade sem verificar se
  `simpleTeachersAvg` e maior que zero no tablet e sem comparar o mesmo percurso.
- Nao interpretar novo carimbo de build de uma PR so de documentacao como nova
  otimizacao 3D.

## Pendencias / dividas conhecidas

- Todos os criterios de aceite de `FEATURES.md` continuam abertos. O usuario pediu
  o proximo lab antes de fornecer as duas amostras e a observacao visual no tablet.
- A matriz Poco C75/outras cenas do backlog 191/193 tambem permanece pendente.

## Funcionalidades planejadas que NAO foram concluidas

- Coletar duas amostras Terra no Redmi Pad 2 com o mesmo percurso/energia e
  comparar FPS medio/p5, escala, escolas habilitadas e detalhe dos professores.
- Conferir visual proximo/distante e voo; corrigir limite/LOD somente se a
  evidencia mostrar que nao ativa ou piora a qualidade.
- Repetir coleta apos qualquer ajuste. Estes itens ficam aguardando dados do
  aparelho, sem ser marcados como implementados ou descartados.

## O que o proximo laboratorio deve desenvolver

- O Lab 228 pode seguir independentemente com o mapa de verbos e affordances do
  backlog UX 187. Quando chegarem as amostras fisicas, retomar esta validacao
  como pendencia do Lab 227 antes de afirmar ganho de FPS da PR #113.

## Estado do repositorio ao final

- Base publicada: `main` em `2af9c78aae3033eeed61227c4860ccf87f783c25`.
- Verificar LOD: abrir o jogo publicado no Redmi Pad 2, estabilizar o autoajuste
  e exportar duas coletas de `Medir 15 s`; conferir `earthSchools.simpleTeachersAvg`.
