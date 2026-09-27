# Contexto - Laboratorio 241 - Toque direto nos alvos das arenas

Preenchido em: 2026-09-26
Commit inicial -> implementacao: 4d038fd..4ad9ef3

## O que foi feito

- `gameCenterTap.ts` resolve o alvo visivel/habilitado da arena ativa ou um
  portal. `World3D.tsx` encaminha o indice original ao callback existente de
  Memoria, Contar, Soletrar ou Logica, preservando regras e recompensas.
- Central nasce no centro olhando para as placas, com mirada levemente adiante
  usando vetor reutilizado. F8 entra na Central apenas em desenvolvimento.
- Status nao depende mais da proximidade da placa: largura limitada, quebra de
  linha e recompensas em linhas separadas; troca/saida escondem status anterior.
- Sequencia de Logica aparece da esquerda para a direita vista do saguao.
- `planetSchoolTrigger.ts` corrige alcance de 1.2 para 1.8: a base da placa fica
  afastada do professor (0.85, 0, 0.4) e do centro do avatar (altura 0.6).
  Preserva histerese de saida 3.6, filtra planeta/progresso e limita a abertura a
  uma pergunta por iteracao desse registro. Placas concluidas mostram check.

## Decisoes tecnicas tomadas

- Reutilizar pools/callbacks em vez de criar uma segunda regra de resposta para
  o touch. Indices de cartas ocultas nao sao compactados no modo sequencia.
- Picking apenas no toque curto; filtro de arraste/pinca/cancelamento existente
  permanece. Nenhuma nova malha, textura, post-process ou alocacao de vetor na
  atualizacao da camera da Central.
- Pergunta cancelada nao reabre enquanto ainda estiver dentro do raio de saida:
  afastar-se e retornar continua necessario para evitar loop de modais.
- Questoes concluidas nao voltam a pagar nem reaparecem como perguntas pendentes.
  Nao ha mudanca de assinatura, dados pessoais ou progressao educacional.

## Verificacao

- Suite app: 318 testes / 28 arquivos passaram; 10 testes novos cobrem resolucao
  de toque e proximidade/histerese das escolinhas.
- Lint passou com dois avisos preexistentes: PetPanel.tsx (Fast Refresh) e teste
  de server-accounts (variavel nao usada). Build/TypeScript/PWA passaram; aviso
  preexistente de tamanho dos chunks permanece.
- Navegador local: Memoria/cartas completada por cliques; Contar avancou uma
  rodada; Soletrar completado por cliques e creditou 3 moedas/trofeu; troca para
  Logica ocultou resultado anterior e clique avancou rodada. Arraste de camera
  nao respondeu. Enquadramento/status conferidos em 1280x720 e 1138x633.
- Entrada por F8 valida interior, NAO a caminhada pela porta externa. Clique de
  mouse em viewport de tablet NAO equivale a touch/pinca fisicos.
- Correcao das escolinhas secundarias validada por testes geometricos, nao por
  visita fisica no tablet. O planeta/dispositivo do relato ainda nao foi informado.

## Pendencias / dividas conhecidas

- Revisar comentarios do Copilot e CI da PR antes de declarar pronta para merge.
- Lab 240 continua pendente: porta externa, partida completa das quatro arenas,
  memoria/sequencia, pinca e controles no Redmi Pad 2.
- Confirmar perguntas ao lado da placa/professor em um planeta secundario,
  cancelar/afastar/retornar, responder e conferir marca de conclusao.
- Nenhum ganho de FPS ou engajamento foi medido neste laboratorio.
- `World3D.tsx` continua monolitico; mudancas limitadas aos registros existentes.

## Funcionalidades planejadas que NAO foram concluidas

- Nenhuma implementacao planejada ficou sem codigo; validacoes fisicas acima
  continuam abertas e nao devem ser contadas como aprovadas.

## O que o proximo laboratorio deve desenvolver

- Proposta, sujeita a confirmacao: concluir o playtest do Lab 240 e corrigir
  defeitos reproduzidos, antes de adicionar mais arenas ou recompensas.

## Estado do repositorio ao final

- Branch: `lab-241-toque-alvos-arenas`, baseada no inicio documental do Lab 240.
- PR #125 (entitlement, draft) nao alterada; arquivos locais nao relacionados
  `.github/copilot-instructions.md` e `.vscode/` nao incluidos.
- Verificar em `app/`: `npm run test`, `npm run lint`, `npm run build`.
- Servidor local: http://127.0.0.1:5174/; F8 somente em desenvolvimento.
