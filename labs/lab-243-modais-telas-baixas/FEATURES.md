# Laboratorio 243 - Modais acessiveis em telas baixas

Status: implementado; PR #131 em revisao, validacao fisica pendente
Inicio: 2026-09-27
Fim: 2026-09-27 (implementacao local)
Commit inicial: 5eb2675a3060ec8d8444b52f7e430ae7f02d6164
Prioridade: P0 - leitura e saida de interacoes bloqueadas

## Problema / hipotese

O playtest do Lab 242 em 844x390 encontrou o portao parental cortado acima
da tela. A regra compartilhada centraliza modais sem limitar sua altura.
Hipotese: limitar a modal ao viewport e permitir rolagem interna torna
perguntas e decisoes do responsavel acessiveis sem diminuir texto ou seguranca.
Usuarios beneficiados: crianca e responsavel em celular horizontal/tablet.
Origens: CONTEXT do Lab 242; UX 189/190; docs/prompts/02-design-profissional.md.

## Escopo e criterios de aceite

- [x] Modais cabem na altura disponivel, incluindo telas baixas e safe areas,
  com rolagem interna, sem rolagem horizontal ou texto cortado irrecuperavel.
- [x] Portao parental permite ler, recusar e fechar; trap de foco e Escape
  permanecem funcionais sem autorizar multiplayer durante o teste.
- [x] Perguntas, listas, apelido e vinculo familiar continuam acessiveis.
- [x] Lojinha e pets preservam preview fixo e acesso aos itens em tela baixa.
- [x] Testar desktop, tablet, celular vertical e horizontal; registrar medidas
  DOM e screenshots, suite, lint e build. Teclado virtual/touch fisicos pendentes.

## Fora de escopo

- Alterar consentimento, monetizacao, recompensas, persistencia ou motor 3D.
- Declarar concluido o playtest fisico do Lab 240 ou ganho de FPS/retencao.
- Refatorar os paineis nao modais de chat/ranking ou o hook de acessibilidade.

## Metricas esperadas

- Criterio local: zero modais fora do viewport nas dimensoes testadas;
  botoes de fechar/recusar e campos alcancaveis com rolagem/teclado.
- Playtest posterior: >=80% de 5-8 duplas leem e recusam sem ajuda em ate
  10 s; meta exploratoria, ainda nao medida com familias.

## Riscos

- Cabecalhos sticky ocuparem toda a altura: compactar apenas previews em
  telas baixas, mantendo dimensoes estaveis e botoes de pelo menos 44px.
- AutoFocus/teclado virtual rolarem o conteudo: testar alcance de cabecalho
  e saida, sem afirmar que emulacao equivale a IME Android fisico.
- Regressoes globais: conferir tipos de modal, foco e scroll da lojinha.
