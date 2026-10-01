# Laboratorio 245 - Leitura inicial em modais educativas e parentais

Status: concluido e publicado; teste fisico Android pendente
Inicio: 2026-09-28
Fim: 2026-09-29 (implementacao local)
Commit inicial: 2329f2e3dd60f1cd30a101d982cca5a7860ebf2e
Prioridade: P0 - foco visivel e compreensao antes da acao

## Problema / hipotese

Em 320x400, o portao parental coloca foco no campo numerico fora da area
visivel, enquanto a explicacao de seguranca ocupa o topo. A pergunta tambem
inicia foco no contenedor completo. Hipotese: iniciar no titulo estatico,
visivel e anunciado, preserva o contexto e a navegacao por teclado/rolagem.
Origem: labs/lab-244-retorno-foco-modais/CONTEXT.md (leitura longa e texto
ampliado); QA local em 320x400; WAI-ARIA APG Dialog Modal Pattern.
Usuarios: crianca que responde e responsavel que decide sobre multiplayer.

## Funcionalidades planejadas

- [x] Focar o titulo do portao e da pergunta ao abrir, mantendo o inicio do
  texto visivel e os controles posteriores alcancaveis por teclado.
- [x] Preservar Escape, retorno ao abridor, pilha de modais, escolha correta,
  desafio parental e ausencia de autorizacao automatica.
- [x] Testar DOM e navegador em desktop e tela baixa; conferir rolagem sem
  corte horizontal e build/lint/suite.

## Fora de escopo

- Mudar consentimento, dificuldade do desafio parental, recompensas ou 3D.
- Declarar playtest em Android fisico concluido.
- Refatorar globalmente todos os paineis ou adicionar preferencias persistidas.

## Metricas esperadas

- Foco inicial no titulo visivel em 320x400; campo, opcoes e fechar alcancaveis.
- Zero rolagem horizontal em 320 e 1280 CSS px; nenhum fluxo de autorizacao
  disparado durante o teste de leitura.

## Riscos

- Foco estatico precisa continuar dentro do dialog e funcionar com Tab/Escape.
- O portao sobre o ranking deve preservar a pilha corrigida no Lab 244.
