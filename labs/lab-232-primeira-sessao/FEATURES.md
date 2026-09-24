# Laboratorio 232 - Primeira sessao jogavel

Status: implementado, playtest touch pendente
Inicio: 2026-09-23
Fim: -
Commit inicial: 1417859cce701dcb72fed8a5b526b41aed87c8a1

## Objetivo

Reduzir a leitura antes de jogar e guiar a primeira acao no mundo sem bloquear
a exploracao (UX 190 de `docs/growth-retention-monetization-backlog.md`).

## Escopo desta fatia

- [x] Trocar as quatro telas obrigatorias por uma entrada curta; manter o tutorial
  completo acessivel pelo botao de ajuda.
- [x] Mostrar objetivos contextuais de movimento, primeira missao e recompensa,
  apenas para um perfil que entrou sem missao concluida.
- [x] Ocultar a dica durante modais/carregamento e apos 15 segundos da primeira
  recompensa ou uma segunda missao.
- [x] Cobrir a progressao do guia com testes unitarios, build e lint.
- [ ] Validar legibilidade e fluxo com criancas em desktop e tablet fisico.

## Fora de escopo

- Tutorial longo, narrativa, alteracoes em recompensa, monetizacao ou dados
  pessoais.
- O pedido posterior de controle touch da camera, reservado ao lab seguinte.

## Metricas e guardrails

Observar `time_to_first_control`, `time_to_first_learning_challenge`,
`time_to_first_reward` e `activation_cycle_completed` ja instrumentados. Nao
prometer melhora causal antes de playtest; errar uma missao nao pune nem bloqueia.
