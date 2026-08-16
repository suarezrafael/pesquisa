# Laboratórios

Este projeto é desenvolvido em iterações chamadas **laboratórios**. Cada laboratório é uma pasta
`labs/lab-NN-slug/` com dois arquivos:

- **`FEATURES.md`** — lista de funcionalidades planejadas para aquele laboratório (o escopo).
- **`CONTEXT.md`** — escrito ao final do laboratório: o que foi feito, decisões tomadas, pendências
  e o que o **próximo** laboratório deve desenvolver. É o arquivo que permite retomar o trabalho numa
  sessão nova (ou com outro laboratório de IA) sem perder contexto.

`labs/CURRENT.md` sempre aponta para o laboratório ativo — é o primeiro arquivo a ler para saber
onde o projeto parou.

`labs/_templates/` contém os modelos de `FEATURES.md` e `CONTEXT.md` usados para criar um novo laboratório.

Use a skill `lab` (`.claude/skills/lab/SKILL.md`) para automatizar a criação, o encerramento e a
consulta de status dos laboratórios — ver instruções nesse arquivo.
