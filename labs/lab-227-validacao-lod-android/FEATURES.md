# Laboratorio 227 - Validacao de detalhe no Android

Status: em andamento
Inicio: 2026-09-23
Fim: -
Commit inicial: 2bdbe1792b8915c2b16284baa1fb2529f9b46944

## Objetivo do laboratorio

Determinar se o detalhe simplificado dos professores realmente reduz custo de
render no Redmi Pad 2 sem prejudicar a aparencia das escolas. Ajustar somente o
limite ou a representacao do professor se a medicao e a observacao justificarem.

## Funcionalidades planejadas

- [ ] Coletar duas amostras de 15 s na Terra com o codigo da PR #113
  (build de referencia `2026-09-23T12:51:14.064Z`, ou build posterior sem alteracao
  no 3D), apos estabilizar o autoajuste, no mesmo percurso e
  modo de energia. Registrar FPS medio/p5, quadro p95, escala, nivel de efeitos,
  escolas habilitadas e `detailedTeachersAvg`/`simpleTeachersAvg` (origem: Lab
  226 `CONTEXT.md`; backlog 191/193 em `docs/backlog-status.md`).
- [ ] Conferir no tablet professor completo perto da escola, forma simplificada
  longe, ausencia de piscada na troca e leitura do telhado/numero da missao. Testar
  tambem voo de foguete (origem: Lab 226 `FEATURES.md`; `docs/prompts/02-design-profissional.md`).
- [ ] Se `simpleTeachersAvg` ficar em zero ou a transicao for perceptivelmente
  ruim, ajustar um unico limite/LOD guiado pelo tamanho projetado na tela,
  preservando modelo completo no desktop; adicionar teste para a regra (origem:
  Lab 226 `CONTEXT.md`; `app/src/world3d/teacherDetail.ts`).
- [ ] Repetir coleta no mesmo aparelho/cenario apos qualquer mudanca e registrar
  resultado como ganho, neutralidade ou regressao com ressalva de cenas diferentes.
  Nao afirmar meta de 30 FPS sem p5 e qualidade aceitaveis (origem: Lab 226
  `PERFORMANCE-AUDIT.md`).

## Fora de escopo

- Trocar motor 3D, reduzir resolucao de forma fixa ou piorar visual proximo.
- Coletar telemetria automaticamente, dados pessoais ou dados da crianca.
- Declarar backlog 191/193 concluido antes da matriz Poco C75/outras cenas.

## Primeira coleta fisica recebida

- Redmi Pad 2, Terra, build `2026-09-23T14:48:32.765Z`, 15,0 s / 458 amostras,
  Mali-G57 MC2, viewport 1138x633, DPR 2,25, nivel adaptativo 2.
- FPS medio 30,44, p5 25,38, quadro p95 35,80 ms, escala 1,15, 15,28
  escolas habilitadas em media. `simpleTeachersAvg: 0` e
  `detailedTeachersAvg: 15,28`: o LOD anterior nao ativou nesta coleta.
- A coleta anterior registrou 28,29 FPS/p5 23,58, escala 1,40 e 13,53 escolas
  habilitadas. Cena/percurso e resolucao efetiva diferem; nao atribuir a mudanca
  de FPS ao LOD. O p5 ainda fica abaixo de 30 FPS.

## Ajuste experimental apos a coleta

- Substituir distancia fixa de 25/30 unidades por tamanho aparente aproximado
  calculado a partir da altura do viewport e FOV vertical. Simplificar abaixo
  de 42 px e voltar ao detalhe acima de 50 px; manter nivel adaptativo 2 como
  unica condicao de ativacao.
- Validar com novo JSON se `simpleTeachersAvg` sobe acima de zero sem perda
  perceptivel de legibilidade; se nao ativar ou piorar o visual, reavaliar o
  criterio antes de promover como ganho de performance.
