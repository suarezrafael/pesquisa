# Laboratorio 244 - Retorno de foco ao fechar modais

Status: implementado; PR #132 em revisao, validacao fisica pendente
Inicio: 2026-09-27
Fim: 2026-09-27 (implementacao local)
Commit inicial: f919cfdc1aaa2e508c07cfe77a91fff0fdf3d264
Prioridade: P1 - continuidade da interacao por teclado

## Problema / hipotese

No Lab 243, fechar a modal por mouse deixou o foco na pagina. O hook captura
o foco depois da montagem; autofocus e inert podem apagar a referencia do
botao de origem. Hipotese: lembrar o ultimo foco externo antes de abrir a
modal devolve continuidade ao jogador, sem enfraquecer o isolamento.
Usuarios: crianca/responsavel usando teclado ou tecnologia assistiva.
Origens: CONTEXT do Lab 243; docs/prompts/02-design-profissional.md secao 3;
contrato existente do useModalA11y, introduzido no Lab 121.

## Escopo e criterios de aceite

- [x] Recordar a origem antes de autofocus/inert, apenas em memoria durante
  a vida do jogo; ignorar foco em dialogs/painel ativo e alvos removidos.
- [x] Fechar por botao/Escape devolve foco ao abridor valido sem scroll
  inesperado; campos com autofocus continuam recebendo foco ao abrir.
  Portao parental aberto sobre o ranking recebe foco no campo apos registro.
- [x] Painel concorrente fica com foco ao fechar outro; ao esvaziar a pilha,
  restaurar a origem anterior ao primeiro painel, mesmo fora da ordem LIFO.
- [x] Trap Tab/Shift+Tab, bloqueio de escape de foco e callback atualizado
  continuam corretos; StrictMode e listeners limpos ao desmontar.
- [x] Testes de integracao DOM e QA real no navegador (desktop/tela baixa),
  lint/build/auditoria registrados em CONTEXT.md.
- [ ] Conferir CI do HEAD e review Copilot overview/inline/threads antes de
  declarar PR pronta; achado de libc no lockfile corrigido, CI final pendente.

## Fora de escopo

- Alterar autorizacao parental, chat, assinatura, recompensas ou motor 3D.
- Novas arenas sem o playtest fisico da jornada da Central.
- Declarar teste Android/IME ou resultado de aprendizagem/retencao aprovado.

## Metricas esperadas

- Zero perdas de foco nos ciclos de abrir/fechar testados; nenhuma fuga de
  Tab nem fechamento de dois paineis por um Escape.
- Pergunta para playtest futuro: o jogador retoma a interacao sem procurar
  novamente o controle? Registrar intervencoes e tempo, nao estimar retencao.

## Riscos

- Historico antigo apontar para outra tela: validar conexao e disponibilidade
  antes de restaurar e limpar a referencia ao desmontar o jogo.
- Pilha/StrictMode interferirem entre paineis: testes de montagem, fechamento
  fora de ordem e callback atual; manter o listener compartilhado existente.
- DOM emulado nao reproduz inert/layout: complementar com navegador real.
