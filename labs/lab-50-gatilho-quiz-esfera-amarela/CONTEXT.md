# Contexto — Laboratório 50 — Quiz surpresa só dispara encostando na esfera amarela

Preenchido em: 2026-08-18

## O que foi feito

1. **Diagnóstico**: o gatilho de proximidade do quiz surpresa (`quizMarkers` loop, dentro do
   mesmo loop de física por quadro que já checa os portais das escolas) usava
   `TRIGGER_DISTANCE = 2,4` — a mesma constante compartilhada com os portais das 21 escolas. Faz
   sentido pras escolas (prédios grandes, "chegar perto" já é a interação esperada), mas não pra
   uma esfera pequena de 0,28 de raio: 2,4 de raio de gatilho é grande o bastante pra cobrir quase
   o andar inteiro, então o quiz abria assim que o jogador chegava no andar, bem antes de chegar
   perto da esfera visualmente.
2. **Correção**: nova constante `QT_QUIZ_TRIGGER_DISTANCE = 0,85`, calculada como raio da cápsula
   física do avatar (0,32) + raio da esfera do marcador (0,28) + uma margem pequena de caminhada
   (~0,25) — exige contato de verdade, não só estar no mesmo andar. `TRIGGER_DISTANCE` continua
   intocado, ainda usado só pelos portais das escolas.

## Decisões técnicas tomadas

- **Constante dedicada em vez de reduzir `TRIGGER_DISTANCE` global** — `TRIGGER_DISTANCE` é
  compartilhado com os portais das 21 escolas, que têm um comportamento de gatilho correto e já
  validado (chegar perto do prédio, não precisa encostar num objeto pequeno específico). Mudar o
  valor global quebraria esse outro sistema; uma constante nova e específica pro quiz mantém os
  dois comportamentos de gatilho independentes.
- **0,85 e não um valor menor ainda (tipo 0,6, exatamente a soma dos raios)** — uma margem pequena
  de caminhada evita que o gatilho fique frustrante de acertar (o jogador precisaria parar
  EXATAMENTE em cima do centro da esfera); 0,85 ainda exige aproximação clara e visível da esfera,
  sem exigir precisão de pixel.

## Pendências / dívidas conhecidas

- Nenhuma nova.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma das planejadas para este laboratório.

## O que o próximo laboratório deve desenvolver

1. Nenhum pedido novo pendente no momento em que este laboratório foi encerrado.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`. Usuário pediu explicitamente pra mesclar em `main` e
  apagar a branch — não é uma ação que esta sessão pode executar. Comando pra ele rodar:
  ```
  git checkout main
  git merge worktree-abstract-wobbling-owl
  git branch -d worktree-abstract-wobbling-owl   # só depois do merge
  ```
- Como rodar/verificar: `cd app && npm install && npm run dev`.
