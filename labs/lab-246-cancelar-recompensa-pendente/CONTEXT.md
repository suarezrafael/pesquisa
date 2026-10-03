# Contexto do Laboratorio 246

Data: 2026-09-30
Base: 4c4fd3132af38623370869e0aa38fddd15a44133 (Lab 245 publicado)
Codigo: 28c2eca
PR: https://github.com/suarezrafael/pesquisa/pull/135

## Problema confirmado

- `QuestModal` agendava `onCorrect` para 700 ms depois da resposta, sem
  cancelar ao fechar ou desmontar. O callback podia agir depois do retorno
  ao mundo; um clique rapido duplicado podia agendar duas conclusoes.
- Teste DOM escrito antes da correcao: 3 falhas (fechar, desmontar, duplicar)
  e 1 caminho normal aprovado. Isso confirmou o comportamento, nao apenas
  uma hipotese por leitura de codigo.

## Implementado

- `QuestModal.tsx`: um `completionTimer` por instancia. Fechar pelo botao ou
  Escape cancela o timer antes de chamar `onClose`; desmontar tambem cancela.
  O timer e limpo antes de `onCorrect`; ativacoes repetidas nao agendam outra
  conclusao. Os 700 ms de feedback visual permanecem inalterados.
- `QuestModal.test.tsx`: 6 testes DOM cobrindo fechar, desmontar, Escape,
  retorno ao abridor, errar e corrigir, conclusao apos 699/700 ms e clique
  duplicado.
- `App.tsx`, XP/moedas, streak, armazenamento e contratos de quest intocados.

## Validacao

- Teste focalizado: 6/6. Suite completa: 356/356 em 32 arquivos.
- Lint: zero erros, dois avisos preexistentes (PetPanel.tsx:46 e
  server-accounts/src/domain.test.ts:923).
- Build: TypeScript, Vite e PWA passaram. Aviso preexistente de chunks
  maiores que 500 kB. Primeiro build revelou apenas tipo generico do mock
  no teste novo; corrigido e build completo repetido com sucesso.
- Navegador local em 5174: mundo 3D carregou, HUD acessivel. Nao foi
  alcancada uma pergunta 3D nesse smoke; o ciclo da pergunta foi verificado
  nos testes DOM. O FPS observado com build concorrente nao e baseline.
- `git log` desde a base: 28c2eca. `git diff --stat`: so
  `QuestModal.tsx` e `QuestModal.test.tsx` no commit de codigo.

## Achado do review automatico do Copilot (PR #135)

- Severidade alta: `App.tsx` substituia `activeEnvironmentalChallenge`
  (quest+attemptId) em memoria sem desmontar o `QuestModal` quando um
  landmark novo era aberto por cima de um ja ativo. A instancia React era
  reaproveitada — `feedback`/`selectedId`/`completionTimer` da tentativa
  antiga (ex.: "correct", que desabilita as opcoes) ficavam presos na
  tentativa nova, travando-a sem possibilidade de resposta.
- Corrigido com `key={activeEnvironmentalChallenge.attemptId}` no
  `QuestModal` desse chamador (unico com repro concreto documentado em
  `App.tsx:191-198`/`396-401`); a troca de `key` forca desmontagem e
  remontagem a cada tentativa, resetando o estado interno e cancelando o
  timer antigo pelo proprio efeito de limpeza do `QuestModal`.
- Teste de regressao novo em `QuestModal.test.tsx` (`AttemptHarness`)
  reproduz o padrao de key-por-tentativa: responde certo na tentativa 1,
  substitui pela tentativa 2 antes dos 700 ms, confirma opcoes destravadas
  e `onCorrect` nao chamado pelo timer antigo. Suite: 357/357 em 32
  arquivos (6 -> 7 testes em `QuestModal.test.tsx`).
- Os outros quatro usos de `QuestModal` (`activeQuest`, `activeSurpriseQuiz`,
  `activePlanetQuest`, `activeCoopQuest`) nao tem caminho de substituicao em
  memoria documentado/reproduzido — ficam sem `key` por ora; revisar se
  algum caminho assim for encontrado.

## Pendencias e riscos

- Playtest real em escolinha/planeta no Redmi Pad 2: fechar logo apos acertar,
  reabrir e confirmar se a resposta precisa ser refeita sem surpresa.
- A politica deste lab trata fechamento antes dos 700 ms como abandono da
  conclusao. Pode frustrar quem acertou e fechou por engano; se observado,
  discutir UX de recompensa imediata ou impedir fechamento nessa janela,
  sem reintroduzir callbacks atrasados.
- Outros modais com callbacks temporizados nao foram auditados neste lab.

## Publicacao

- PR #135 mesclada (squash) em `3f84977`, apos resposta ao achado do Copilot
  acima. CI em `main` (run 37129285538) passou 3/3 jobs (app, server-accounts,
  server-cf-relay) — e isso JÁ inclui o deploy automático para produção
  (Vercel + Cloudflare Pages/Workers, passo `Deploy to Vercel (production)`/
  `Deploy to Cloudflare Pages (production)` em `.github/workflows/ci.yml`,
  secrets `VERCEL_TOKEN`/`CLOUDFLARE_API_TOKEN` configurados desde o
  lab-104). Correção a um erro desta mesma sessão: a nota original aqui
  dizia "deploy não verificado" por achar que precisava rodar `vercel
  --prod` manualmente — não precisa; o CI já faz isso a cada push em
  `main`, e o log do job confirma o deploy bem-sucedido.
- Teste fisico Android (Redmi Pad 2) continua pendente, acumulado dos labs
  238-246.

## Proxima prioridade proposta

- Playtest fisico de pergunta, Central e teclado virtual com criancas e
  responsaveis. Pergunta: a transicao resposta correta -> recompensa e clara
  e evita perda acidental de progresso?
- Sem dispositivo, auditar callbacks temporizados de outros paineis apenas
  quando houver caminho concreto de efeito tardio reproduzivel.

## Repositorio

- Branch `lab-246-cancelar-recompensa-pendente`.
- `.github/copilot-instructions.md` e `.vscode/` locais nao incluidos.
