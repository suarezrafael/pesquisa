# Laboratorio 252 - Alternativas embaralhadas nas perguntas

Status: concluído
Inicio: 2026-10-03
Fim: 2026-10-03
Commit inicial: d620866223710233b8593ea72dc638185b59e3bb

## Objetivo do laboratorio

Impedir que a posicao original da alternativa correta vire um atalho para
responder as perguntas dos planetas e das demais missoes. Em
`planetQuests.ts`, 35 das 36 respostas corretas estao na primeira posicao.

## Funcionalidades planejadas

- [x] Embaralhar apenas a ordem visual das alternativas ao abrir `QuestModal`,
  sem mutar o catalogo nem alterar IDs, validacao ou recompensas (referencia:
  `app/src/data/planetQuests.ts`, Lab 251 e backlog Labs 212-217).
- [x] Manter a ordem estavel enquanto a mesma pergunta esta aberta e reiniciar
  somente com nova tentativa (referencia: `QuestModal` e Labs 246-247).
- [x] Testar as invariantes, o fluxo de erro/acerto e o cancelamento de
  recompensa; rodar testes, lint e build (referencia:
  `docs/prompts/03-arquitetura-sistema.md` e `04-manutencao-clean-code.md`).

## Fora de escopo

- Revisar fatos astronomicos, ampliar o catalogo ou mudar dificuldade.
- Declarar ganho de aprendizagem/retencao sem playtest; Lab 240 continua
  pendente de teste fisico no Redmi Pad 2.
