# Laboratório 104 — deploy automático a partir do CI (resto de G10)

Status: concluído (secrets pendentes — ação do usuário, ver "Pendências")
Início: 2026-08-27
Fim: 2026-08-27
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
- [x] **`.github/workflows/ci.yml`**: job `app` ganhou um passo condicional de deploy (`vercel
  --prod --yes --token=...`, com `VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` como env); jobs
  `server-accounts`/`server-cf-relay` ganharam passo condicional `wrangler deploy` (com
  `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` como env). Todos gateados por
  `if: github.ref == 'refs/heads/main' && github.event_name == 'push'` — confirmado ao vivo que um
  push nesta branch de trabalho continua só rodando os testes (passo de deploy aparece "skipped",
  não falha nem tenta autenticar sem token).
- [x] **Documentação** (`README.md` raiz): seção "Deploy" reescrita descrevendo o novo fluxo (push
  no branch de trabalho → só testa; PR mesclado em `main` → testa E publica) e listando os 2
  secrets que o repositório GitHub precisa ter configurados.
- [x] **Tentativa de criar os tokens via CLI** (autorizado explicitamente pelo usuário) — os dois
  caminhos possíveis foram investigados e confirmados INVIÁVEIS, não só não tentados:
  - Cloudflare: a sessão OAuth local do `wrangler` (`wrangler whoami`) não tem o escopo "API
    Tokens: Edit" necessário pra criar um token novo via API — só permissões de Workers/conta.
  - Vercel: `vercel tokens add` devolveu `403 Cannot create tokens for this app` — a sessão CLI
    atual foi emitida por uma integração restrita que a própria Vercel bloqueia de mintar tokens
    pessoais novos (proteção deles contra escalonamento de privilégio).
  - Reaproveitar o token de sessão OAuth existente em vez de criar um novo foi descartado: expira/
    rotaciona automaticamente (quebraria o CI de forma imprevisível) e tem escopo muito mais amplo
    que o necessário (SSL, e-mail, IA, containers, etc.) — inseguro pra um secret de CI estático.
  - Confirmado com o usuário: os dois tokens precisam ser criados manualmente pelo painel (2
    minutos cada) — sem contorno seguro via CLI.
- [x] **PR rascunho aberto** (`#8`, `worktree-abstract-wobbling-owl` → `main`) acumulando todo o
  trabalho dos labs 78-104 — é o merge que vai de fato disparar o deploy automático pela primeira
  vez, quando o usuário decidir mesclar. CI na PR só roda os testes (evento `pull_request`, não
  `push` em `main`), então abrir o PR agora não arrisca nada mesmo sem os secrets configurados.

## Pendências (ação do usuário, fora do que uma sessão do Claude Code pode fazer)
- Criar `VERCEL_TOKEN` (vercel.com → Account Settings → Tokens) e `CLOUDFLARE_API_TOKEN`
  (dash.cloudflare.com → My Profile → API Tokens → template "Edit Cloudflare Workers"), configurar
  como GitHub Actions secrets deste repositório (`gh secret set <NOME>` ou pela UI do GitHub).
- Mesclar o PR `#8` quando pronto — só depois disso o deploy automático dispara de verdade pela
  primeira vez. Até lá, o deploy manual (`vercel --prod`/`wrangler deploy`, documentado no
  `README.md`) continua funcionando normalmente, sem nenhuma mudança.

## Fora de escopo (explicitamente adiado)
- **Ambiente de staging separado** e **rollback documentado** — as outras duas partes de G10,
  continuam fora de propósito (infraestrutura maior).
- **Smoke test pós-deploy** (ex.: `curl /health` depois de publicar, falhar o workflow se não
  responder) — extensão natural futura se o deploy automático se provar confiável primeiro.
- **Proteção de branch em `main`** (exigir PR/review antes de merge) — decisão de processo do
  usuário, não uma mudança de código; fora do escopo técnico deste laboratório.
