# Contexto — Laboratório 80 — backend comercial, Fase C (pagamento de verdade)

Preenchido em: 2026-08-24
Commit inicial → final: a942768dc0c60497e6c11ad41b1850512d6cd933..f362f28

## O que foi feito
- **Produto Stripe criado em modo teste** ("Missão Aprender — Plano Família",
  `prod_V800jt0CR1rbcy`), Price recorrente mensal em BRL (`price_1U7k0BDLQrb3UkMn0MFvRcVf`,
  R$ 4,99), criado via UI do Stripe Dashboard (não pela API) porque a conta ainda não tinha o
  produto Billing habilitado — o wizard "Configure o Billing" precisou rodar uma vez primeiro
  (modelo de preço "Tarifa fixa" → integração "Formulário de checkout pré-construído").
- **Webhook do Stripe registrado** (`we_1U7kCLDLQrb3UkMn1TRXOhNL`) apontando pra
  `https://missao-aprender-accounts.rafaelvs.workers.dev/webhooks/stripe`, escutando
  `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`.
- **`app/server-accounts/src/index.ts`** ganhou:
  - `requireUserId` — verifica o JWT (Bearer) contra o JWKS do Neon Auth (`jose`,
    `createRemoteJWKSet` + `jwtVerify`), extrai `sub` como o id do responsável.
  - `findOrCreateFamilyAccount` — cria a linha em `family_accounts` no primeiro acesso
    autenticado (checkout ou consulta de status). Este é o consumidor real adiado desde a
    Fase B.
  - `POST /checkout` — cria a sessão do Stripe Checkout (modo assinatura), com
    `client_reference_id` = `family_account_id` (é assim que o webhook depois sabe a qual
    família vincular a assinatura, sem precisar de outro round-trip de autenticação).
  - `POST /webhooks/stripe` — verifica a assinatura (`stripe.webhooks.constructEventAsync`,
    `Stripe.createFetchHttpClient()` pro runtime de Workers) e faz upsert em `subscriptions`.
  - `GET /subscription` — status mais recente da família do usuário autenticado.
  - CORS liberado (`Access-Control-Allow-Origin: *`) só em `/checkout` e `/subscription` —
    autenticadas por Bearer token, não cookie, então não há superfície de CSRF em abrir a
    origem; `/webhooks/stripe` nunca é chamado por navegador, não precisa de CORS.
- **Segredos do Worker** (`wrangler secret put`): `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`. `STRIPE_PRICE_ID` é uma var comum (`[vars]` no `wrangler.toml`),
  não secreta — é só um identificador público do catálogo.
- **`FamilyPortal.tsx` Dashboard** reescrito: busca `GET /subscription` ao montar, mostra o
  status real (`Nenhuma assinatura ativa` / `Assinatura ativa` / `Pagamento pendente` /
  `Assinatura cancelada`), e um botão "Assinar por R$ 4,99/mês" que chama `POST /checkout` e
  redireciona pra URL do Stripe Checkout devolvida.
- **Testado ao vivo, fim a fim, em produção** (não só em dev): cadastro de responsável de
  teste → clicar assinar → pagar com cartão de teste do Stripe (`4242 4242 4242 4242`) →
  webhook `checkout.session.completed` disparou → linha real em `subscriptions` com
  `status = 'active'`, `stripe_customer_id`/`stripe_subscription_id` reais → Dashboard
  atualizado. Depois, cancelamento via API do Stripe (`DELETE /v1/subscriptions/:id`) →
  webhook `customer.subscription.deleted` disparou → `status` virou `'canceled'` no banco →
  Dashboard voltou a mostrar o botão de assinar. Conta de teste e linhas associadas
  (`family_accounts`, `subscriptions`, `neon_auth.user`/`session`/`account`) apagadas depois
  de confirmado, mesmo padrão do lab-79.

## Bug real encontrado testando ao vivo (corrigido antes de fechar o laboratório)
`authClient.token()` (método de cliente do plugin JWT do Better Auth, usado pra obter o JWT
de curta duração pro Worker) **não retornava um JWT** — retornava o mesmo formato de
`getSession()` (`{ data: { session, user }, error }`), sem nenhum campo `token` de JWT de
verdade. Confirmado ao vivo instrumentando o código real com `console.debug` (não só lendo o
código-fonte do SDK) e comparando com uma chamada manual `fetch('.../auth/token', {credentials:
'include'})`, que retornava o JWT correto. Causa raiz não identificada com certeza (o SDK
`@neondatabase/auth` reexporta o cliente genérico do `better-auth/client`, cujo proxy de
métodos dinâmicos deveria mapear `.token()` → `GET /token` corretamente pelo código-fonte lido
— mas o comportamento em runtime não bateu). Corrigido contornando o método do SDK: `FamilyPortal
.tsx` agora busca o JWT direto via `fetch(`${NEON_AUTH_URL}/token`, { credentials: 'include' })`,
a mesma chamada confirmada funcionando ao vivo. Sem esse teste ao vivo instrumentado (não só
verificado por tipo/build), o Worker teria ficado rejeitando toda chamada autenticada com 401
silenciosamente — o Dashboard simplesmente ficaria com o campo "Assinatura:" vazio, sem erro
visível pro responsável.

## Decisões técnicas tomadas
- **Não criar o `customer` do Stripe manualmente antes do Checkout** — deixa o próprio Stripe
  Checkout criar o `customer` (comportamento padrão em modo assinatura sem `customer` explícito
  na sessão), evitando um round-trip extra à API do Stripe só pra depois descartar se o
  responsável desistir do checkout.
- **`client_reference_id` em vez de metadata custom** — é o jeito idiomático do Stripe Checkout
  de carregar um identificador da aplicação através de todo o ciclo de vida da sessão/assinatura,
  sem precisar reimplementar isso com `metadata` manual em cada objeto.
- **Upsert de `subscriptions` por `stripe_subscription_id`, não por `family_account_id`** — uma
  família pode trocar de assinatura Stripe ao longo do tempo (cancelar e assinar de novo cria um
  novo `stripe_subscription_id`); indexar pelo id da assinatura evita sobrescrever histórico ou
  duplicar linhas incorretamente.
- **JWKS em vez de segredo compartilhado** — o Worker verifica o JWT com a chave pública do Neon
  Auth (`jose.createRemoteJWKSet`), sem precisar de nenhum segredo compartilhado entre os dois
  serviços — mais simples de rodar e sem um segredo a mais pra vazar.

## Pendências / dívidas conhecidas
- **Causa raiz do bug do `authClient.token()` não totalmente explicada** — funciona agora com a
  chamada direta ao endpoint, mas se o pacote `@neondatabase/auth`/`better-auth` for atualizado,
  vale testar se o método do SDK passou a funcionar (e simplificar de volta) ou se o bug persiste
  (nesse caso, considerar reportar upstream).
- **Nenhuma tela de "sucesso"/"cancelado" dedicada** — o retorno do Checkout
  (`/familia?assinatura=sucesso` ou `?assinatura=cancelada`) hoje só recai na mesma tela de
  Dashboard; o parâmetro na URL não é lido nem usado pra mostrar uma mensagem diferente. Baixo
  impacto (o status real já aparece via `/subscription`), mas poderia ser uma pequena melhoria de
  UX numa fase futura.
- **Nenhum Customer Portal do Stripe configurado** — cancelamento nesta fase só foi testado via
  API direta (`DELETE /v1/subscriptions/:id`), não existe ainda um jeito do responsável cancelar
  a própria assinatura pela UI do jogo. Fica como próxima melhoria natural (não bloqueia a Fase
  D/E).

## Funcionalidades planejadas que NÃO foram concluídas
Nenhuma das planejadas pra Fase C — todas concluídas e testadas ao vivo.

## O que o próximo laboratório deve desenvolver
- **Fase D — Pareamento com o jogo**: portal gera um código curto (6 dígitos), a criança digita
  esse código uma vez no jogo, o jogo troca por um token de entitlement local (`localStorage`),
  revalidado em background. Ver `docs/plano-comercial-backend.md` pro desenho completo.

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`.
- Worker em produção: `https://missao-aprender-accounts.rafaelvs.workers.dev` (rotas
  `/health`, `/checkout`, `/subscription`, `/webhooks/stripe`).
- Jogo em produção: `https://app-two-flax-92.vercel.app` (rota `/familia` com o Dashboard real
  de assinatura).
- Como verificar: acessar `/familia`, responder o parental gate, criar/entrar numa conta,
  clicar "Assinar por R$ 4,99/mês", completar o checkout do Stripe com um cartão de teste
  (`4242 4242 4242 4242`, validade/CVC quaisquer) — modo teste do Stripe, nenhuma cobrança real.
