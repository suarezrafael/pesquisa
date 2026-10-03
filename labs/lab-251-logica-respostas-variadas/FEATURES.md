# Laboratorio 251 - Respostas variadas na arena Logica

Status: em andamento
Inicio: 2026-10-03
Fim: -
Commit inicial: c4d2d203cc81991d35ab4ecc952e2fdef0a45295

## Objetivo do laboratorio

Impedir que a arena Logica possa ser vencida escolhendo sempre a placa central.
Variar a posicao da alternativa correta em cada tentativa sem mudar as
sequencias, a regra de erro ou as recompensas.

## Funcionalidades planejadas

- [ ] Distribuir a resposta correta entre as tres placas por tentativa, sem
  alterar o catalogo compartilhado (referencia: `app/src/state/logicGame.ts`;
  Labs 212-217 e `lab-239-logica-imersiva`).
- [ ] Testar que nenhuma placa isolada vence as tres rodadas, que cada rodada
  mantem uma resposta valida e que erro nao avanca (referencia:
  `docs/prompts/04-manutencao-clean-code.md` secao 5).
- [ ] Rodar testes, lint e build e registrar a pendencia do teste fisico da
  Central no Redmi Pad 2 (referencia: `lab-240-validacao-central-tablet`).

## Fora de escopo

- Novas sequencias, dificuldade adaptativa, mudanca de recompensa e telas 3D.
- Declarar a Central aprovada no tablet sem teste fisico.
