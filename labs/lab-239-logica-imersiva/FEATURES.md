# Laboratorio 239 - Logica imersiva na Central de Jogos

Status: implementado; validacao da arena no tablet pendente
Inicio: 2026-09-24
Fim: 2026-09-25
Commit inicial: 1a9ee9d1b8836a4e92744545fb8189026badd64f

## Objetivo do laboratorio

O portal Logica deve oferecer um jogo espacial proprio dentro da Central de Jogos,
como os outros tres portais, em vez de abrir o quiz em painel da ponte. Testar se
uma sequencia numerica manipulavel no mundo torna a aprendizagem mais integrada a
exploracao; a aderencia real ainda depende de playtest com criancas.

## Funcionalidades planejadas

- [x] Criar tres rodadas de padroes logicos com alternativas, sem cronometro ou
  penalidade por erro, em modulo de dominio testado (referencia: backlog de
  jogabilidade, Labs 212-217; `docs/prompts/03-arquitetura-sistema.md`).
- [x] Exibir sequencia e escolhas em objetos 3D na Central de Jogos, com interacao
  por proximidade/E e por toque curto nas placas (referencia: retorno infantil dos
  Labs 237-238 e UX 188).
- [x] Creditar conclusao, moedas e trofeus pela mesma regra das outras arenas;
  manter o desafio da ponte fora da Central intacto e aceitar o novo ID na
  telemetria do Worker (referencia: backlog Lab 217).
- [x] Verificar teste, TypeScript, lint, build e navegador; documentar pendencia de
  playtest no tablet (referencia: `docs/prompts/04-manutencao-clean-code.md`).

## Fora de escopo

- Chat, monetizacao, conta, novas missoes da ponte e alteracoes nas outras arenas.
- Afirmar ganho de retencao sem medicao com criancas.
