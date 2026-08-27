# Laboratório 104 — deploy automático a partir do CI (resto de G10)

Status: em andamento
Início: 2026-08-27
Fim: -
Commit inicial: 6795d2a684776f3f2344efd3a7091d1b2c6abbc9

## Objetivo do laboratório
Próximo passo natural depois do lab-101: hoje o CI só roda testes, o deploy (`vercel --prod`/
`wrangler deploy`) continua manual, do laptop, feito ao final de cada laboratório. Escolhido pelo
usuário logo após o lab-103, entre deploy automático/bug de morros invisíveis/staging separado.

## Decisão de fluxo (confirmada com o usuário antes de implementar)
**Achado ao investigar**: `main` está 86 commits atrás deste branch de worktree — TODOS os
laboratórios 78-103 fizeram deploy manual direto deste branch, sem nunca passar por `main`.
Perguntado ao usuário qual gatilho usar: **push em `main`** (o padrão correto/estável), não o
branch de trabalho atual. Isso muda o fluxo: a partir de agora, um laboratório só vai pra produção
de verdade quando um PR desse branch for mesclado em `main` — push direto no branch de worktree
continua rodando os TESTES (já fazia isso desde o lab-101), mas não publica mais nada sozinho (na
prática não publicava mesmo, porque o mecanismo novo só reage a `main`).

## Investigado antes de planejar
- **`app/.vercel/project.json`** (gitignored, nunca commitado) tem `projectId`/`orgId` — não são
  segredos (são só identificadores), mas o CI (checkout limpo) nunca vai ter esse arquivo. A CLI da
  Vercel aceita `VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` como variável de ambiente em vez do arquivo de
  link — padrão oficial documentado pra uso em CI.
- **`wrangler whoami`** confirma uma ÚNICA conta Cloudflare (`354311826c2a9d7954df9674fa2f4ce5`) —
  não é segredo (é só um identificador de conta), mas passado explícito pra `wrangler deploy` no
  CI evita qualquer ambiguidade (hoje o `wrangler` local resolve isso sozinho via sessão OAuth
  interativa, que não existe no CI).
- **Segredos de verdade que faltam** (não posso gerar sozinho — exigem acesso às contas
  Vercel/Cloudflare do usuário): `VERCEL_TOKEN` (vercel.com → Account Settings → Tokens) e
  `CLOUDFLARE_API_TOKEN` (dash.cloudflare.com → My Profile → API Tokens → template "Edit
  Cloudflare Workers"). Pedido ao usuário criar e configurar via `gh secret set` ou pela UI do
  GitHub diretamente — nunca colar o valor do token no chat, por prudência de segurança.
- **`.github/workflows/ci.yml`** (lab-101) já roda os 3 jobs de teste em todo push/PR — o deploy
  entra como passo NOVO no final de cada job, condicionado a `github.ref ==
  'refs/heads/main' && github.event_name == 'push'`, e só é alcançado se os passos de teste
  anteriores no mesmo job passarem (comportamento padrão do GitHub Actions — um passo que falha
  aborta os seguintes).

## Funcionalidades planejadas
- [ ] **`.github/workflows/ci.yml`**: job `app` ganha um passo condicional de deploy (`vercel
  --prod --yes --token=...`, com `VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` como env); jobs
  `server-accounts`/`server-cf-relay` ganham passo condicional `wrangler deploy` (com
  `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` como env). Todos gateados por
  `if: github.ref == 'refs/heads/main' && github.event_name == 'push'`.
- [ ] **Documentação** (README.md raiz ou `app/server-accounts/README.md`/`app/README.md`,
  conforme fizer mais sentido): descreve o novo fluxo (push no branch de trabalho → só testa; PR
  mesclado em `main` → testa E publica) e lista os 2 secrets que o repositório GitHub precisa ter
  configurados (`VERCEL_TOKEN`, `CLOUDFLARE_API_TOKEN`) pra o deploy automático funcionar.
- [ ] **Pedido ao usuário**: criar os dois tokens nas respectivas contas e configurar como GitHub
  Actions secrets (`gh secret set VERCEL_TOKEN` / `gh secret set CLOUDFLARE_API_TOKEN`, ou pela UI
  do GitHub) — ação que só ele pode fazer (acesso às próprias contas).
- [ ] **Verificação**: com os secrets configurados, abrir um PR deste branch de worktree pra
  `main` (rascunho — esta sessão não mescla `main` sozinha, é decisão do usuário) e confirmar que,
  ao ser mesclado, o workflow dispara o deploy de verdade nos 3 alvos (Vercel + 2 Workers).

## Fora de escopo (explicitamente adiado)
- **Ambiente de staging separado** e **rollback documentado** — as outras duas partes de G10,
  continuam fora de propósito (infraestrutura maior).
- **Smoke test pós-deploy** (ex.: `curl /health` depois de publicar, falhar o workflow se não
  responder) — extensão natural futura se o deploy automático se provar confiável primeiro.
- **Proteção de branch em `main`** (exigir PR/review antes de merge) — decisão de processo do
  usuário, não uma mudança de código; fora do escopo técnico deste laboratório.
