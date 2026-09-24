# Laboratorio 229 - Linguagem de interativos por entrada

Status: encerrado administrativamente com pendencias (entrega parcial)
Inicio: 2026-09-23
Fim: 2026-09-23
Commit inicial: 14da8e028dea81c9ecdc9c12209172c68c2ef2e1

## Objetivo do laboratorio

Fazer a dica de proximidade corresponder ao comando que a crianca pode usar:
tecla E no teclado ou botao E na tela de toque. E a primeira fatia do UX 188;
o mapa e as evidencias estao no `VERB-MAP.md` do Lab 228.

## Funcionalidades planejadas

- [x] Definir uma funcao pequena e testavel para a copia da acao em teclado e
  toque, com verbos curtos e consistentes (origem: `labs/lab-228-mapa-verbos/
  VERB-MAP.md`, achado P0; UX 188 em `docs/growth-retention-monetization-backlog.md`).
- [x] Aplicar em carro, foguete principal/de retorno, entrada/saida da casa e
  portais do hub/centro de jogos; manter dicas ocultas fora de alcance e sem
  rotulo de acao executavel para portal bloqueado (origem: UX 188 e Lab 228).
- [ ] Validar texto em desktop e viewport touch, legibilidade no mundo e
  funcionamento do mesmo `handleInteractPress` para E/botao E; rodar testes,
  lint e build. Se o ambiente nao simular touch real, registrar o limite
  sem declarar playtest feito (origem: `docs/prompts/02-design-profissional.md`).

## Metricas e validacao

- No playtest com 5-8 criancas, medir se consegue entrar no carro/casa/portal
  sem ajuda e tempo ate primeira interacao. Nenhum ganho e afirmado sem dados.
- Guardrails: nenhuma nova coleta de PII, compra ou mensagem que pressione a
  crianca; nao degradar FPS por atualizar texto a cada quadro.

## Fora de escopo

- Redesenhar todos os objetos, chat, monetizacao ou engine de input.
- Encerrar UX 187/188 por completo sem o playtest e a matriz de cenas.
- Mesclar a PR #116 de LOD sem medicao no Redmi Pad 2.

## Evidencia ate agora

- `interactionHint.ts` centraliza a escolha teclado/toque e a frase; `World3D`
  usa o helper na construcao das labels, sem trabalho novo por quadro.
- A mesma regra cobre carro, foguetes, casa, portais/arenas do centro de jogos,
  marcos cooperativos e texto da mochila. Portal bloqueado diz apenas `Em breve`.
- Edge local renderizou o mundo e o HUD em viewport padrao, 1138x633 e
  390x844. O botao E permaneceu visivel. O ambiente rodou a ~1 FPS: nao foi
  possivel chegar a um alvo especifico para avaliar sobreposicao de label;
  viewport nao equivale a gesto touch fisico. Item visual permanece aberto.
- Testes locais: 292/292; lint sem avisos novos; build passou. PR #118
  mesclada em `9dda215`; CI da main passou e publicou Vercel, Pages e Workers.
- O usuario confirmou que o botao E funcionou no Redmi Pad 2 com o build
  `2026-09-23T18:18:14.381Z`. A amostra de 15 s registrou 29,7 FPS medios e
  p5 23,64. Isso nao valida a legibilidade da dica de proximidade nem mede
  ganho de performance deste lab.
