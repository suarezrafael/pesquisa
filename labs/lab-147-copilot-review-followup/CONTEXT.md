# Contexto — Laboratório 147 — Follow-up do review automático do Copilot (PRs 14-16)

Preenchido em: 2026-09-03
Commit inicial → final: 093052e2caeee6c2be76a08a2e4e58b6a0b6d873..HEAD

## O que foi feito

Lido `gh api repos/.../pulls/{14,15,16}/comments` (a API não estava sendo consultada antes de
mergear — os 3 PRs recentes tinham review "🟡 Changes recommended" nunca lidos). Todos os achados
foram avaliados e os válidos corrigidos — ver lista completa em `FEATURES.md`. Destaque de
segurança: PR #16 apontou que `success_url`/`cancel_url` do Stripe eram montados a partir do
header `Origin` sem checagem nenhuma — como essa rota não tem CORS restrito (é autenticada por
Bearer token, não por cookie, então o CORS aberto `*` não é o problema de verdade aqui) e `Origin`
é um header que uma chamada FORA de navegador pode setar livremente (`fetch()` num navegador de
verdade bloqueia setar esse header manualmente, mas `curl`/qualquer cliente HTTP direto não), um
atacante com uma conta de responsável válida (self-registro é livre) podia gerar uma sessão de
checkout cujo redirecionamento pós-pagamento aponta pra um domínio dele — phishing depois de um
pagamento real. `resolveTrustedOrigin` (`domain.ts`, nova função pura testada) resolve isso com
uma allowlist.

## Decisões técnicas tomadas

- **Allowlist de origem em `[vars]` (`ALLOWED_ORIGINS`), não hardcoded** — mesmo princípio do
  lab-145 (G15): muda sem precisar editar/redeployar o código se um domínio novo entrar (ex.:
  cortar o DNS pro Cloudflare Pages de verdade, ver G15 pendente).
- **`resolveTrustedOrigin` como função pura em `domain.ts`, não inline em `index.ts`** — mesmo
  padrão já estabelecido pro resto da lógica de negócio deste Worker (`isEntitlementActive`,
  `isPairingCodeUsable`, etc.) — testável sem mockar `Request`/`env`.
- **`getJwks` corrigido mesmo sendo baixo risco real HOJE** (este Worker sempre recebe o mesmo
  `env`, vindo de um `wrangler.toml` fixo por deploy) — o Copilot está certo que é um bug latente;
  o custo de corrigir é uma comparação de string a mais por chamada, desprezível.
- **Cron não-reconhecido continua rodando a reconciliação (não vira erro fatal)** — mesmo raciocínio
  de antes (comportamento "seguro" já testado pros 3 crons reais), só que agora com aviso
  (`console.error`) em vez de silêncio total — visível em `wrangler tail`/painel de Logs.
- **`Promise.allSettled` em vez de `try/catch` por tarefa** — mais simples de ler que dois blocos
  `try/catch` separados, mesmo resultado (as duas tarefas sempre rodam até o fim, erro de cada uma
  logado individualmente).

## Pendências / dívidas conhecidas

- `ALLOWED_ORIGINS` precisa ser atualizado manualmente (`wrangler.toml` + redeploy) se um domínio
  novo passar a servir o front-end — aceitável, é uma lista curta e muda raramente (mesma cadência
  de mudança de `DEFAULT_ORIGIN`, que já tinha essa característica).
- Não foi feita uma auditoria retroativa de PRs anteriores ao #14 — o pedido do usuário foi
  interpretado como "leia os comentários do Copilot daqui pra frente, e resolva o que ainda está
  em aberto na sessão atual", não uma varredura histórica completa do repositório.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — todos os achados avaliados foram corrigidos ou (nenhum caso aqui) descartados com
justificativa.

## O que o próximo laboratório deve desenvolver

Sem pedido novo do usuário. **A partir de agora, ler os comentários do Copilot faz parte do fluxo
de qualquer PR desta sessão** — antes de considerar um laboratório fechado (e principalmente antes
de mergear), checar `gh pr view <N> --json reviews` e `gh api repos/.../pulls/<N>/comments` como
mais um passo do checklist, junto de CI verde e testes passando.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`.
- `npx tsc --noEmit` (server-accounts) e `npx tsc -b` (app): sem erros.
- `npm run test` (server-accounts): 68/68 (4 testes novos, `resolveTrustedOrigin`).
- `npm run test` (app): 99/99 (sem teste novo — `FamilyPortal.tsx` é I/O de browser puro, sem
  lógica de domínio isolável).
- **Testado ao vivo contra o banco de PRODUÇÃO real** (`wrangler dev`, conta de teste descartável
  criada via Neon Auth): `/checkout` com `Origin: https://evil.example` → sessão Stripe criada
  normalmente, mas `success_url`/`cancel_url` confirmados (consultando a sessão direto na API do
  Stripe com a secret key) apontando pro `DEFAULT_ORIGIN` configurado, NÃO pro domínio malicioso;
  o mesmo teste com `Origin: https://app-two-flax-92.vercel.app` (na allowlist) confirmou que a
  origem confiável CONTINUA sendo respeitada normalmente. Cron diário disparado local
  (`/cdn-cgi/local/scheduled`) confirmado rodando reconciliação+purga sem erro; disparado com um
  cron string não reconhecido, confirmado o log de aviso novo aparecendo. Conta de teste excluída
  depois via `/account/delete` (lab-144).
- Deploy: PR #18 (que passou a acumular o resto do lab-146 + este laboratório, ver seu histórico
  de edição) mergeado em `main` (commit `82e1e81`), os 3 jobs de CI/CD verdes — desta vez o
  workflow `CI` disparou normalmente pro push em `main` (a anomalia registrada em
  `labs/lab-146-.../CONTEXT.md`, onde o merge do PR #17 não disparou nenhuma `run`, não se repetiu
  aqui). `GET /health` confirmado `200`; `POST /checkout` sem autenticação confirmado `401` (rota
  viva, código novo no ar).
