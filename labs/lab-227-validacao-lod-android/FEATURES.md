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
