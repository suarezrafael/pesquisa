# Contexto — Laboratório 145 — Config sem hardcode no Worker de contas

Preenchido em: 2026-09-03
Commit inicial → final: ac6f1f8f25525d0f4ab9d5eff8b4a600655ad29e..HEAD

## O que foi feito

`app/server-accounts/src/index.ts`: as duas URLs que viviam como string literal no código-fonte
(`NEON_AUTH_JWKS_URL`, endpoint JWKS do Neon Auth; e o fallback de `origin` usado em
`/checkout`/`/billing-portal` quando a chamada não traz header `Origin`) foram movidas pra
`[vars]` em `wrangler.toml`, lidas via `env.NEON_AUTH_JWKS_URL`/`env.DEFAULT_ORIGIN`.
`createRemoteJWKSet` (biblioteca `jose`) precisa de uma URL na hora de criar o objeto — como isso
antes acontecia no escopo do MÓDULO (`env` não existe ainda nesse ponto), virou um cache lazy
(`getJwks(env)`, criado só na primeira chamada real, guardado numa variável de módulo depois
disso — mesmo efeito de cache "uma vez por isolate" de antes, só que adiado pro primeiro request).
`requireUserId` (usado por 11 handlers autenticados) ganhou um segundo parâmetro (`env`) pra poder
chamar `getJwks`.

## Decisões técnicas tomadas

- **`DEFAULT_ORIGIN` trocado pro domínio próprio** (`missaoaprendizado.com`), não só uma
  transcrição literal do valor antigo (`app-two-flax-92.vercel.app`) — os dois servem o MESMO site
  hoje (mesmo projeto Vercel, DNS do domínio próprio aponta pra lá), mas o domínio próprio é o
  destino final pretendido; não fazia sentido perpetuar o domínio de preview da Vercel como
  fallback configurável agora que existe um domínio de verdade. Efeito prático: quase nulo (o
  fallback só entra quando a chamada não tem header `Origin`, o que não acontece em uso normal via
  navegador — só em teste manual/curl, como usado pra validar este laboratório).
- **Cache lazy em vez de mover a criação do JWKS pro topo do módulo com um valor hardcoded
  temporário** — a alternativa óbvia seria manter `const jwks = createRemoteJWKSet(...)` no escopo
  do módulo, mas isso exigiria hardcodar a URL DE NOVO só pra inicializar antes de `env` existir,
  reintroduzindo o problema que este laboratório resolve. O cache lazy é a forma correta de
  "configurar uma vez por isolate" quando o valor de configuração só chega dentro do handler.
- **Não migrado pra `wrangler secret`** — nenhuma das duas é secreta: o endpoint JWKS é uma chave
  PÚBLICA de verificação de assinatura por definição (é o ponto todo do JWKS), e a origem de
  fallback é só a URL pública do próprio jogo. `[vars]` é o lugar certo — secrets são pra dado que
  não pode aparecer no `wrangler.toml` comitado.

## Pendências / dívidas conhecidas

- **Resto de G15 continua em aberto, de propósito** (ver `FEATURES.md`): trocar o DNS do domínio
  pro CNAME sugerido pela Vercel, e rotacionar a API key ampla do Neon usada pra provisionar. As
  duas exigem confirmação explícita do usuário antes de eu tocar nelas — são mudanças em
  infraestrutura de produção ao vivo (DNS) ou em credencial cujo blast radius inclui quebrar
  scripts administrativos existentes (API key). Nenhuma delas é um bug ativo hoje (DNS funciona,
  key ainda não vazou) — é dívida técnica documentada, não uma urgência.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma das planejadas para este laboratório — todas concluídas. O resto de G15 nunca esteve no
escopo (ver "Fora de escopo" em `FEATURES.md`).

## O que o próximo laboratório deve desenvolver

Sem pedido novo do usuário. Restam: o resto de G15 (DNS/rotação de chave, precisa de confirmação
explícita antes de qualquer ação) e a decisão de produto sobre consentimento parental pro
multiplayer (adiada no lab-144). Com isso, G6/G7/G8/G9/G10/G11(parcial)/G13/G14 já resolvidos —
G15 é o único item NUMERADO restante do backlog de `05-escala-e-viabilidade.md` (parcialmente
resolvido aqui), e G13 tem só o consentimento parental pendente.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`.
- `npx tsc --noEmit` (server-accounts): sem erros. `npm run test`: 64/64 (sem teste novo — mudança
  de configuração/plumbing, sem lógica de domínio nova).
- **Testado ao vivo, ponta a ponta, contra o banco de PRODUÇÃO real** (`wrangler dev`, que confirma
  visualmente as duas novas `[vars]` carregadas corretamente do `wrangler.toml`): duas contas de
  teste descartáveis criadas via `sign-up/email` direto no Neon Auth. Primeira: `GET
  /account/export` autenticado com um JWT real → `200`, prova que a verificação de assinatura via
  `getJwks(env)` (cache lazy, URL vinda de `env` em vez de hardcoded) funciona igual a antes.
  Segunda: `POST /checkout` SEM header `Origin` → `200` com uma URL de checkout do Stripe de
  verdade (Stripe teria recusado um `success_url`/`cancel_url` malformado tipo `undefined/familia`,
  então isso confirma que `env.DEFAULT_ORIGIN` chegou populado). As duas contas de teste foram
  excluídas depois (`POST /account/delete`, lab-144) — nenhum dado de teste ficou pra trás.
- Deploy: pendente — mesmo fluxo de sempre (push → PR → CI → merge → deploy dos 3 jobs).
