# Contexto — Laboratório 104 — deploy automático a partir do CI (resto de G10)

Preenchido em: 2026-08-27
Commit inicial → final: 6795d2a684776f3f2344efd3a7091d1b2c6abbc9..HEAD

## O que foi feito
Fechou o item que ficou de fora do lab-101 de propósito: até aqui o CI só rodava testes, o deploy
continuava manual em todo laboratório. Escolhido pelo usuário logo após o lab-103.

- **Decisão de fluxo confirmada com o usuário antes de implementar**: achado ao investigar —
  `main` estava 86 commits atrás deste branch de worktree, TODO laboratório 78-103 tinha feito
  deploy manual direto daqui, nunca via `main`. Perguntado qual gatilho usar, o usuário escolheu
  **push em `main`** (o padrão correto), não o branch de trabalho atual. Isso muda o fluxo de
  produção: a partir de agora, publicar em produção exige um PR deste branch mesclado em `main`.
- **`.github/workflows/ci.yml`**: cada um dos 3 jobs ganhou um passo de deploy condicional
  (`if: github.ref == 'refs/heads/main' && github.event_name == 'push'`) no final, depois dos
  passos de teste já existentes (lab-101) — `app` roda `vercel --prod --yes --token=...` (com
  `VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` fixos no YAML, não são segredos, só identificadores do
  projeto, substituem o `.vercel/project.json` gitignored que o CI nunca teria); os dois Workers
  rodam `npm run deploy` (`wrangler deploy`) com `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID`.
- **`README.md`** (raiz): seção "Deploy" reescrita, descrevendo o fluxo automático novo e mantendo
  os comandos manuais documentados (sempre funcionam, independente do CI).
- **Tentativa de criar os dois tokens necessários via CLI, autorizada explicitamente pelo
  usuário** — investigado e confirmado INVIÁVEL nos dois casos (não só "não tentado"):
  - Cloudflare: `wrangler whoami` mostrou que a sessão OAuth local não tem o escopo "API Tokens:
    Edit" — sem ele, não dá pra chamar a API de criação de token da Cloudflare.
  - Vercel: `vercel tokens add github-actions-ci` devolveu `403 Cannot create tokens for this
    app` — a sessão CLI atual foi emitida por uma integração restrita (visível no próprio aviso
    do CLI, `<claude-code-hint... value="vercel@claude-plugins-official">`), que a Vercel
    explicitamente impede de mintar tokens pessoais novos.
  - Descartado reaproveitar o token de sessão OAuth já existente como secret de CI: expira/
    rotaciona automaticamente (quebraria o pipeline sem aviso) e tem escopo muito mais amplo que
    o necessário (SSL, e-mail, IA, containers, etc. — visto no `wrangler whoami` completo).
- **Confirmado ao vivo** que o gate funciona: um push nesta branch de trabalho (commit
  `430895d`) rodou os 3 jobs de teste normalmente e mostrou os passos de deploy como "skipped"
  (não tentou autenticar sem token, não falhou o job) — exatamente o comportamento esperado antes
  de qualquer coisa chegar em `main`.
- **PR rascunho `#8`** (`worktree-abstract-wobbling-owl` → `main`) aberto, acumulando o trabalho
  dos labs 78-104 (88 commits) — é o merge que vai disparar o deploy automático pela primeira vez
  quando o usuário decidir mesclar. Não foi mesclado por esta sessão (regra permanente: nunca
  mesclar/push em `main` diretamente).

## Decisões técnicas tomadas
- **Gatilho é `main`, não o branch de trabalho** — decisão de PROCESSO confirmada explicitamente
  com o usuário, não uma escolha técnica unilateral. Consequência real: o hábito dos labs 96-103
  (push direto no branch de worktree = já está em produção) muda a partir de agora — produção só
  reflete o que estiver em `main`.
- **IDs de projeto (Vercel org/project, Cloudflare account) hardcoded no YAML, não `secrets.*`** —
  não são credenciais (não autenticam nada sozinhos), só identificam ONDE publicar; tratá-los como
  segredo esconderia informação sem ganho de segurança real e dificultaria auditar o workflow.
- **Não reaproveitar tokens de sessão existentes como secrets de CI** — mesmo autorizado
  explicitamente pelo usuário a tentar via CLI, os dois caminhos possíveis (extrair o token OAuth
  do wrangler, ou contornar o bloqueio 403 da Vercel de algum jeito) foram descartados por razão
  técnica concreta (expiração automática) e de segurança (escopo excessivo), não por regra
  arbitrária — a alternativa seria um pipeline que quebra sem aviso ou um secret com poder de
  sobra num surface de ataque real (qualquer PR malicioso que rode nesse workflow).
- **PR aberto mesmo sem os secrets prontos** — seguro de fazer porque o CI de um `pull_request`
  nunca aciona o passo de deploy (só reage a `push` em `main` de verdade); abrir o PR agora não
  arrisca nada e já deixa o trabalho acumulado pronto pra revisão/merge quando o usuário quiser.

## Pendências / dívidas conhecidas
- **`VERCEL_TOKEN`/`CLOUDFLARE_API_TOKEN` ainda não configurados** — ação que só o usuário pode
  fazer (acesso às próprias contas); confirmado que não há contorno seguro via CLI. Até serem
  configurados, o passo de deploy de cada job falharia se algo fosse mesclado em `main` agora (os
  testes continuariam passando normalmente — só o deploy falha).
- **PR `#8` ainda não mesclado** — esta sessão não mescla `main` por regra permanente; é decisão
  do usuário quando/se mesclar.
- **Sem smoke test pós-deploy** — se o deploy "funcionar" (wrangler/vercel retornam sucesso) mas o
  serviço não responder de verdade depois, nada no workflow pegaria isso. Extensão natural futura.
- **Ambiente de staging separado** e **rollback documentado** — as outras duas partes de G10
  seguem fora de propósito, infraestrutura maior.

## Funcionalidades planejadas que NÃO foram concluídas
- Nenhuma dentro do controle desta sessão — os dois itens que restam (configurar os 2 secrets,
  mesclar o PR `#8`) são ações que só o usuário pode executar, já identificadas e documentadas.

## O que o próximo laboratório deve desenvolver
- **Configurar os secrets e mesclar o PR `#8`** — não é um laboratório novo, é a continuação
  direta deste, quando o usuário decidir. Depois disso, confirmar que o próximo push em `main`
  realmente publica os 3 alvos (ver `wrangler deployments list`/dashboard da Vercel).
- **Smoke test pós-deploy** — se o deploy automático se provar confiável, adicionar uma checagem
  de `/health` depois de publicar cada Worker.
- **Ambiente de staging separado**, **rollback documentado** (G10) e **bug de morros invisíveis**
  (lab-95, ainda bloqueado esperando resposta do usuário) continuam em aberto.

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`
- PR aberto: `#8` (rascunho), `worktree-abstract-wobbling-owl` → `main`, acumulando labs 78-104.
- Como rodar/verificar o que foi construído neste laboratório:
  - `gh run list` / aba Actions — qualquer push a esta branch continua rodando só os 3 jobs de
    teste, com o passo de deploy aparecendo "skipped" no final de cada um.
  - `gh secret list` — vazio hoje; depois de configurar `VERCEL_TOKEN`/`CLOUDFLARE_API_TOKEN`,
    devem aparecer os dois.
  - Deploy manual continua funcionando exatamente como antes (`README.md`, seção "Deploy") —
    nenhuma mudança nesse caminho.
