# Laboratorio 228 - Mapa de verbos e affordances

Status: em andamento
Inicio: 2026-09-23
Fim: -
Commit inicial: 2af9c78aae3033eeed61227c4860ccf87f783c25

## Objetivo do laboratorio

Tornar explicito como uma crianca descobre as acoes possiveis no mundo, em
desktop e mobile. Auditar os verbos existentes antes de criar mais interativos,
identificar inconsistencias reais e entregar um padrao reutilizavel para os
proximos labs, sem adicionar poluicao visual ao jogo.

## Usuario e problema

- Crianca nova e recorrente: hoje ha muitos sistemas, mas nem toda acao pode ser
  reconhecida antes da aproximacao ou entendida depois do toque. A hipotese e
  que hints, entradas e feedback consistentes reduzam pedidos de ajuda no
  primeiro ciclo jogar + aprender + recompensa.

## Funcionalidades planejadas

- [x] Inventariar em `VERB-MAP.md` os verbos existentes (andar, pular, interagir,
  responder, comprar com moeda, equipar, cuidar, visitar, dirigir, voar, mover
  e reagir). Para cada um registrar objeto/cena, sinal antes da interacao, hint
  de proximidade, teclado/mouse/toque, feedback, estado concluido e referencia
  de codigo (origem: UX Lab 187 em `docs/growth-retention-monetization-backlog.md`).
- [ ] Percorrer a primeira sessao e um planeta secundario em desktop e viewport
  mobile; registrar evidencias visuais ou limitacoes do ambiente para entradas
  ausentes, labels sobrepostas, alvos pequenos e acoes sem feedback (origem:
  `docs/prompts/02-design-profissional.md`, secoes 1, 3 e 7).
- [x] Classificar inconsistencias por impacto na primeira missao e frequencia;
  abrir um backlog pequeno para corrigir as P0/P1 sem redesenhar todos os objetos
  neste lab (origem: UX Lab 187 e pesquisa de primeira sessao em
  `docs/market-metrics-engagement-backlog.md`).
- [x] Definir criterio reutilizavel para novos interativos: affordance antes,
  hint durante proximidade, feedback apos acao e paridade desktop/touch;
  diferenciar objeto decorativo de objeto acionavel. Revisar contra seguranca
  infantil, contraste e alvo de toque (origem:
  `docs/growth-retention-monetization-backlog.md` e `docs/prompts/01-seguranca.md`).

## Metricas e validacao

- Propor medicao de tempo ate primeira interacao, tempo ate primeira missao,
  pedidos de ajuda e taxa de ativacao em 10 minutos. Nao declarar melhora sem
  playtest com criancas; evitar eventos com PII.

## Fora de escopo

- Reescrever o sistema de input ou aplicar um redesign global de uma vez.
- Checkout, preco ou apelo comercial no fluxo infantil.
- Declarar o Lab 227 ou o backlog 191/193 concluidos sem dados Android fisicos.

## Progresso e limite de validacao

O inventario, a triagem e o contrato estao em `VERB-MAP.md`. O item de percurso
visual permanece aberto: Edge cobriu o mundo e a lojinha em desktop e viewports
1138x633/390x844, mas nao um perfil novo nem um planeta secundario; rendeu
1-2 FPS no ambiente automatizado e nao simulou gesto touch fisico. Nao marcar
o lab concluido antes dessas verificacoes e do playtest com criancas.
