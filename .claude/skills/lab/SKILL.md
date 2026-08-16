---
name: lab
description: Gerencia o fluxo de laboratórios (iterações) deste projeto — inicia um novo laboratório com uma lista de funcionalidades planejadas, encerra o laboratório atual gerando o arquivo de contexto para o próximo, ou mostra o status do laboratório em andamento. Use quando o usuário disser "iniciar laboratório", "novo lab", "encerrar laboratório", "fechar lab", "gerar contexto do próximo laboratório", "status do laboratório", ou pedir para retomar o trabalho a partir do último contexto salvo. Argumentos aceitos — start, wrap, status — deduza o modo pelo pedido do usuário se ele não usar essas palavras.
---

# Skill: lab

Este projeto organiza o desenvolvimento em **laboratórios** (`labs/lab-NN-slug/`), cada um com:
- `FEATURES.md` — o escopo planejado daquele laboratório.
- `CONTEXT.md` — escrito ao final, resume o que foi feito e o que o próximo laboratório deve fazer.

`labs/CURRENT.md` aponta sempre para o laboratório ativo. `labs/_templates/` tem os modelos.

Esta skill tem três modos. Decida o modo pelo `args` recebido ou pelo pedido do usuário
("iniciar"/"novo" → start; "encerrar"/"fechar"/"terminar" → wrap; "status"/"onde paramos" → status).
Se realmente ambíguo, pergunte ao usuário em vez de adivinhar.

## Modo `start` — iniciar um novo laboratório

1. Leia `labs/CURRENT.md` para achar o último laboratório (se houver).
2. Determine o próximo número (`lab-01`, `lab-02`, ...) e um slug curto em kebab-case para o tema
   do laboratório (ex.: `lab-02-cooperacao`). Se não estiver óbvio pelo contexto da conversa ou pelo
   `CONTEXT.md` anterior, pergunte ao usuário um título curto antes de criar a pasta.
3. Semeie a lista de funcionalidades:
   - Se existe um laboratório anterior com `CONTEXT.md` preenchido, use a seção
     "O que o próximo laboratório deve desenvolver" como base.
   - Se é o primeiro laboratório do projeto, semeie a partir do backlog P0 em `prompt.md` (seção 6),
     priorizando o que constrói o loop principal do jogo.
   - Sempre cite a origem de cada item (ex.: "prompt.md seção 6, P0" ou "CONTEXT.md do lab-01").
4. Rode `git rev-parse HEAD` e grave o SHA em "Commit inicial" — isso é o que permite ao modo `wrap`
   calcular exatamente o que mudou durante o laboratório.
5. Crie `labs/lab-NN-slug/FEATURES.md` a partir de `labs/_templates/FEATURES.md`, preenchido.
6. Atualize `labs/CURRENT.md` para apontar para o novo laboratório ativo.
7. Não crie `CONTEXT.md` ainda — ele só existe quando o laboratório é encerrado (modo `wrap`).
8. Responda ao usuário com o objetivo do laboratório e a checklist de funcionalidades planejadas.

## Modo `wrap` — encerrar o laboratório atual e gerar o contexto para o próximo

1. Leia `labs/CURRENT.md` para achar a pasta do laboratório ativo e leia seu `FEATURES.md`
   (incluindo o "Commit inicial").
2. Levante o que realmente mudou no repositório desde o commit inicial:
   `git log <commit-inicial>..HEAD --oneline` e `git diff <commit-inicial>..HEAD --stat`.
   Leia os arquivos relevantes que mudaram — não confie só nas mensagens de commit.
3. Para cada funcionalidade planejada em `FEATURES.md`, verifique nas mudanças reais se foi
   concluída, parcialmente feita ou não iniciada. Marque `[x]` só quando há evidência no código.
   Se estiver ambíguo se algo foi concluído, pergunte ao usuário — não presuma.
4. Escreva `labs/lab-NN-slug/CONTEXT.md` a partir de `labs/_templates/CONTEXT.md`, preenchendo:
   - O que foi feito (concreto, com caminhos de arquivo quando fizer sentido).
   - Decisões técnicas tomadas e o porquê (o "porquê" é o que mais importa para quem retomar depois).
   - Pendências / dívidas conhecidas.
   - Funcionalidades planejadas que não foram concluídas — decida com o usuário se migram para o
     próximo laboratório ou se foram descartadas (e por quê).
   - "O que o próximo laboratório deve desenvolver" — proponha com base no que ficou pendente aqui
     e na próxima prioridade do backlog em `prompt.md` (seção 6), mas confirme com o usuário antes
     de finalizar essa lista.
5. Atualize o cabeçalho de `FEATURES.md` (`Status: concluído`, `Fim: <data>`).
6. Atualize `labs/CURRENT.md` indicando que o laboratório foi concluído e apontando para o
   `CONTEXT.md` recém-criado como entrada para o próximo `lab start`.
7. Não crie o próximo laboratório automaticamente — ofereça ao usuário rodar o modo `start` em
   seguida, mas só execute se ele confirmar.

## Modo `status` — mostrar onde o projeto parou

1. Leia `labs/CURRENT.md` e o `FEATURES.md` do laboratório ativo (e o `CONTEXT.md` do anterior,
   se existir).
2. Responda de forma curta: objetivo do laboratório atual, checklist de funcionalidades com o que
   já está `[x]`, e o que falta.

## Regras gerais

- Nunca invente o que foi "feito" em `CONTEXT.md` — baseie-se em `git log`/`git diff` e na leitura
  real do código, nunca só na memória da conversa.
- Mantenha `labs/CURRENT.md` sempre atualizado — é o único arquivo que uma sessão nova precisa ler
  primeiro para saber o estado do projeto.
- Cada laboratório deve ser pequeno o suficiente para caber num `CONTEXT.md` legível — se a lista de
  funcionalidades planejadas parecer grande demais para uma iteração, sugira dividir em dois
  laboratórios.
