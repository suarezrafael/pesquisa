# Contexto - Laboratorio 251 - Respostas variadas na arena Logica

Preenchido em: 2026-10-03
Commit inicial -> implementacao: c4d2d203cc81991d35ab4ecc952e2fdef0a45295..7d874e9559170cbcb121f0d6c57fad30224fb0af

## O que foi feito

- `app/src/state/logicGame.ts`: as seis rodadas do catalogo tinham a resposta
  correta sempre na opcao central. Cada tentativa agora embaralha as tres
  posicoes corretas, uma por rodada, e copia as alternativas antes de
  reposicionar a resposta. Nenhuma placa escolhida tres vezes resolve a arena.
- `app/src/state/logicGame.test.ts`: verifica a distribuicao, a variacao entre
  tentativas, a imutabilidade do catalogo e a impossibilidade de vencer com uma
  unica placa, alem de preservar o teste de erro sem perda de progresso.

## Decisoes tecnicas tomadas

- A regra fica no dominio, nao na cena Babylon. `World3D.tsx` ja renderiza
  `round.options` e valida a escolha com `round.answer`, portanto nao precisou
  mudar a interface nem a recompensa.
- A permutacao usa a fonte aleatoria ja injetavel em `createLogicGame`; cada
  resposta correta ocupa uma das tres posicoes por tentativa. Isso impede o
  atalho fixo sem acrescentar penalidade ou cronometro a crianca.

## Verificacao

- `app`: 368/368 testes, lint sem avisos, TypeScript/build/PWA bem-sucedidos.
- Vite local responde HTTP 200 em `http://127.0.0.1:5173/`.
- O jogo 3D nao foi testado no Redmi Pad 2 nesta sessao; testes de dominio e
  build nao comprovam ergonomia de toque nem retencao infantil.

## Pendencias / dividas conhecidas

- Lab 240 permanece aberto para validar entrada, selecao, Logica, saida e FPS
  no Redmi Pad 2. Nao fechar com emulador ou navegador desktop.
- O catalogo de Logica ainda tem seis sequencias fixas; ampliar conteudo e
  calibrar dificuldade so com playtest, para evitar repeticao sem presumir
  ganho de aprendizagem.

## Funcionalidades planejadas que NAO foram concluidas

- Nenhuma do escopo de codigo; validacao fisica continua em lab separado.

## O que o proximo laboratorio deve desenvolver

- Primeiro, executar `labs/lab-240-validacao-central-tablet/FEATURES.md` com
  dispositivo fisico e registrar o relato de criancas. Se o tablet ainda nao
  estiver disponivel, escolher um defeito reproduzivel ou prioridade de
  produto explicita; nao inventar otimizacao de FPS sem nova medicao.

## Estado do repositorio ao final

- Branch: `lab-251-logica-respostas-variadas`.
- Arquivos locais preexistentes `.github/copilot-instructions.md` e `.vscode/`
  nao foram modificados nem incluidos.
