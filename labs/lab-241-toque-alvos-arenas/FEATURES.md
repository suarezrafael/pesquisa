# Laboratorio 241 - Toque direto nos alvos das arenas

Status: implementado; revisao de PR e validacao fisica pendentes
Inicio: 2026-09-26
Fim: 2026-09-26 (implementacao local)
Commit inicial: 4d038fd

## Objetivo do laboratorio

Eliminar a diferenca de interacao entre as quatro arenas da Central: cartas,
placas e letras visiveis devem aceitar toque curto ou clique, sem exigir que o
avatar fique exatamente ao lado. A alternativa de proximidade/E permanece.
Hipotese: reduzir dificuldade de selecao relatada pelo usuario; nao afirmar
ganho de engajamento sem o playtest pendente do Lab 240.

## Funcionalidades planejadas

- [x] Reutilizar os registros de alvos e callbacks das arenas para toque direto
  em Memoria (cartas e sequencia), Contar, Soletrar e Logica (referencia:
  UX 188, Labs 237-239 e relato de dificuldade de selecionar Memoria).
- [x] Ignorar alvos desabilitados, invisiveis ou nao selecionaveis, preservando
  os indices do pool, countdown e regras de recompensa (referencia:
  `docs/prompts/03-arquitetura-sistema.md`).
- [x] Testar resolucao de alvo/portal e executar suite, lint e build; verificar
  o navegador e documentar separadamente o teste fisico pendente (referencia:
  `docs/prompts/04-manutencao-clean-code.md`; Lab 240).
- [x] Disponibilizar entrada de QA por F8 apenas em desenvolvimento para testar
  o interior sem simular caminhada; isso nao valida a porta externa (referencia:
  hooks de QA dev existentes em `World3D.tsx`; pendencia de navegador do Lab 239).
- [x] Corrigir a orientacao inicial da Central: nascer no centro olhando para os
  portais, com ponto de mirada que deixe as placas abaixo do HUD, em vez de
  olhar para o lado oposto (referencia: defeito reproduzido
  no navegador durante o Lab 241, relacionado a UX 190).
- [x] Manter instrucao/resultado da arena ativa visiveis mesmo ao responder de
  longe por toque; esconder ao trocar de arena ou sair (referencia: defeito
  observado no fluxo de Contar, Lab 241).
- [x] Evitar corte das mensagens de resultado com largura limitada, quebra de
  linha e texto curto; apresentar sequencia de Logica da esquerda para a direita
  vista do saguao (referencia: verificacao visual no navegador, Lab 241).
- [x] Separar E e setas da camera em telas de ate 450px de altura, preservando
  os tamanhos de toque (referencia: sobreposicao reproduzida em 844x390).
- [x] Corrigir alcance das perguntas das escolinhas dos planetas secundarios:
  considerar altura do avatar e deslocamento do professor; testar histerese,
  filtrar planeta/progresso e sinalizar quest concluida (referencia: relato do
  usuario de perguntas que nao abrem perto da placa/personagem em 2026-09-26).

## Criterios de aceite

- Um toque curto seleciona apenas um alvo visivel da arena ativa durante playing.
- Slots ocultos, outra arena e objetos decorativos nao recebem respostas.
- Arraste, pinca e pointercancel continuam sem selecionar respostas ou portais.
- O toque usa as mesmas regras, travas e recompensas da tecla E.
- Nenhuma malha ou textura e acrescentada; picking ocorre apenas no toque.
  O ponto de mirada da Central usa um vetor reutilizado, sem alocacao por quadro.
- Escolinha secundaria permite aproximacao ao lado do professor, sem reabrir
  continuamente ao fechar a pergunta. Perguntas concluidas mostram marca de
  conclusao e continuam sem duplicar recompensa. Confirmacao no tablet pendente.

## Fora de escopo

- Recompensas novas, mudancas de dificuldade ou controles de camera. O ajuste
  de nascimento, orientacao e mirada e restrito a Central; demais cenas intactas.
- Assinatura, PR #125 e declarar aprovado o playtest fisico do Lab 240.
