# Laboratorio 246 - Cancelar conclusao pendente da pergunta

Status: implementado; PR/revisao pendentes
Inicio: 2026-09-30
Fim: 2026-09-30 (implementacao local)
Commit inicial: 4c4fd3132af38623370869e0aa38fddd15a44133
Prioridade: P0 - integridade do progresso educativo

## Problema / hipotese

`QuestModal` agenda `onCorrect` 700 ms apos uma resposta correta, mas nao
cancela o temporizador quando o jogador fecha ou abandona a pergunta. Isso
pode conceder recompensa de uma pergunta ja fechada e interferir na proxima.
Origem: inspecao do codigo apos Lab 245; `QuestModal.tsx` e `App.tsx`.
Usuario: crianca que responde quizzes e acompanha progresso.

## Funcionalidades planejadas

- [x] Reproduzir em teste DOM o callback atrasado apos fechar e apos desmontar
  o modal sem acao de fechar.
- [x] Cancelar a conclusao pendente em ambos os caminhos e evitar agendar a
  recompensa mais de uma vez, preservando o feedback visual de 700 ms.
- [x] Confirmar resposta correta normal, alternativa errada, Escape, retorno
  de foco, suite, lint, build e smoke local sem alterar regras de pontuacao.

## Fora de escopo

- Alterar quantidade de XP/moedas, streak ou persistencia de progresso.
- Refatorar todos os fluxos de missao/quiz ou o hook global de modais.
- Declarar playtest fisico em Android concluido.

## Metricas esperadas

- Zero `onCorrect` apos fechar/desmontar durante os 700 ms.
- Uma unica conclusao apos 700 ms quando a pergunta permanece aberta.

## Riscos

- Fechar apos resposta correta agora cancela a recompensa intencionalmente;
  testar com usuario se a janela de 700 ms causa confusao, sem mudar a regra
  neste lab.
- O componente e reutilizado em escolinhas, planetas, cooperacao e desafios
  ambientais: validar o comportamento compartilhado com testes focalizados.
