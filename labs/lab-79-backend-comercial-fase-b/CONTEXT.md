# Contexto — Laboratório 79 — backend comercial, Fase B (portal dos responsáveis)

Preenchido em: 2026-08-23
Commit inicial → final: e8428b27968d0cb5e4c4b5e9985c112e3df203c5..c04ff29

## O que foi feito
- **Decisão de linguagem confirmada com o usuário antes de codificar**: perguntou se o Worker
  (`app/server-accounts/`) era C# e se dava pra trocar pra .NET. Resposta: é TypeScript rodando em
  Cloudflare Workers (V8 isolate) — não existe suporte real a .NET/C# nesse runtime; a alternativa
  seria migrar pra Azure Functions + ASP.NET Core (Option C do `prompt.md`), o que exigiria
  cadastrar cartão de crédito na conta Azure (verificado ao vivo na documentação oficial, e já
  mencionado no próprio `prompt.md`). Usuário escolheu manter TypeScript/Cloudflare.
- **Rota `/familia`**: `App.tsx` virou um roteador fino — a função `App` checa
  `window.location.pathname` e delega pra `GameApp` (o antigo corpo inteiro de `App`, renomeado)
  ou `FamilyPortal` (novo, lazy-loaded). Extrair pra um componente separado em vez de um `return`
  antecipado dentro do corpo antigo foi necessário pra não violar a regra de hooks do React (um
  `return` antes de `useProfile()`/`useProgress()`/etc. faria esses hooks rodarem condicionalmente
  entre pathnames diferentes).
- **`app/vercel.json`** (novo): rewrite `/(.*) → /index.html` — sem isso, acessar
  `https://.../familia` direto (não vindo de dentro do app) devolveria 404 no Vercel, já que é uma
  SPA sem esse arquivo antes.
- **`app/src/auth/neonAuthClient.ts`** (novo): `createAuthClient` do pacote
  `@neondatabase/neon-js/auth`, apontando pra `VITE_NEON_AUTH_URL` (novo `app/.env`, valor não
  secreto — é um endpoint público, só não documentado como constante direto no código pra poder
  trocar sem rebuild se precisar).
- **Endpoint real do Neon Auth descoberto por tentativa, não copiado da documentação**: o exemplo
  oficial (`https://ep-xxx.neonauth.us-east-2.aws.neon.build/...`) usa o domínio `neon.build`, que
  **não resolve** (`curl`: "Couldn't resolve host"). O domínio real é `neon.tech` — descoberto
  substituindo e confirmando com `curl` (`{"ok":true}` em `/neondb/auth/ok`) antes de escrever
  qualquer código contra ele. `endpoint_id` (`ep-cool-meadow-aclfdwm0`) veio de
  `neon_auth.project_config`, não de suposição.
- **`trusted_origins`** do projeto (tabela `neon_auth.project_config`) atualizado via SQL direta
  pra incluir `https://app-two-flax-92.vercel.app` — sem isso, o CORS do Better Auth bloquearia
  chamadas do domínio de produção (localhost já é liberado por padrão via `allow_localhost: true`).
- **`app/src/components/FamilyPortal.tsx`** (novo): `useParentalGate` (hook local, pergunta de
  multiplicação sorteada, sem persistência entre reloads — decisão consciente de simplicidade,
  não é segurança de verdade mesmo), `LoginScreen` (alterna cadastro/login,
  `authClient.signUp.email`/`signIn.email`), `Dashboard` (e-mail + placeholder de assinatura +
  sair). Reaproveita as classes CSS já existentes (`.screen.onboarding`, `.field`,
  `.primary-button`, `.nickname-generate-btn`) em vez de criar um sistema visual novo.
- **Testado ao vivo, não só verificado por tipo/build**: cadastro de um usuário de teste
  (`teste-lab79@missaoaprender.test`) → confirmado com uma query SQL direta que a linha existe de
  verdade em `neon_auth."user"` → reload da página manteve a sessão (cookie) sem pedir login de
  novo → clicar "Sair" voltou pra tela de login → login de novo com as mesmas credenciais
  funcionou. Conta de teste apagada (`user` + `session`) depois de confirmado.
- **Bundle**: `FamilyPortal` vira seu próprio chunk lazy (`FamilyPortal-*.js`, ~82KB gzip,
  confirmado no output do `npm run build`) — a criança, que nunca visita `/familia`, não paga esse
  custo.

## Bug real encontrado testando em produção (corrigido antes de fechar o laboratório)
Depois do primeiro deploy, testar `/familia` em produção com credenciais erradas travou o botão
em "Um momento..." pra sempre, com um `AuthApiError: Invalid email or password` aparecendo só
como EXCEÇÃO NÃO TRATADA no console — nunca uma mensagem pro usuário. Causa: `authClient.signIn
.email`/`signUp.email` **rejeita a promise** pra erros de autenticação (não resolve com `{ error
}` como os exemplos da documentação sugeriam). Corrigido com `try/catch/finally` em
`handleSubmit` (usando `isAuthApiError` do próprio pacote pra extrair a mensagem) e a mesma
proteção em `refreshSession`, por segurança. Sem esse teste ao vivo em produção (não só local),
esse bug teria ido pro ar sem ninguém notar até um responsável de verdade errar a senha.

## Decisões técnicas tomadas
- **`App` vira um roteador fino em vez de um `if` dentro do componente antigo** — evita violar a
  regra de hooks do React (hooks precisam rodar sempre na mesma ordem/quantidade a cada render do
  MESMO componente). Tecnicamente seria "seguro" em runtime aqui (o pathname nunca muda sem reload
  completo da página), mas o ESLint da regra de hooks não sabe disso e marcaria erro — e é frágil
  de qualquer forma. Separar em dois componentes (`GameApp`/`FamilyPortal`) resolve de vez.
- **Confirmar o endpoint real do Neon Auth com `curl` antes de escrever código** — a documentação
  oficial tinha um domínio (`neon.build`) que não resolve; se eu tivesse copiado o exemplo sem
  testar, o cadastro/login falharia silenciosamente (ou com erro de rede genérico) só na hora de
  testar ao vivo, depois de já ter escrito toda a UI.
- **Não criar a linha em `family_accounts` ainda** — nada consome esse dado até a Fase C (Stripe
  precisa de um `family_account_id` pra vincular o `customer`). Criar antes seria escrever no
  banco sem nenhum código que leia esse dado depois, adicionando uma tabela "murcha" sem uso.
- **Gate parental sem persistência entre reloads** — é um filtro de "não foi clique acidental de
  criança pequena", não segurança de verdade (a pergunta em si não impede um adulto malicioso);
  persistir isso (ex. `sessionStorage`) adicionaria complexidade sem valor de segurança real.

## Pendências / dívidas conhecidas
- Nenhuma rota do `server-accounts` Worker foi exercitada nesta fase — o login/cadastro fala
  direto com o Neon Auth gerenciado, sem passar pelo nosso backend. Isso é uma simplificação em
  relação ao desenho original do plano (que prometia `POST /auth/*` no nosso Worker), registrada
  e corrigida em `docs/plano-comercial-backend.md`. O Worker só entra em cena a partir da Fase C
  (checkout/webhook) e D (pareamento).
- `VITE_NEON_AUTH_URL` está hardcoded em `app/.env` com o `endpoint_id` específico deste projeto
  Neon (`ep-cool-meadow-aclfdwm0`) — se o projeto Neon for recriado/migrado algum dia, esse valor
  precisa ser atualizado manualmente (não há nada que descubra isso dinamicamente).
- **Nota pra quem testar `/familia` de novo**: um navegador que já visitou
  `app-two-flax-92.vercel.app` antes (PWA com service worker instalado) pode continuar mostrando o
  JOGO em `/familia` por um tempo, mesmo com o deploy novo já no ar — o service worker antigo
  precisa detectar e aplicar a atualização primeiro (mesmo mecanismo dos labs 69-71). Não é um bug
  desta fase; confirmado ao vivo limpando o service worker/cache manualmente que o código novo
  funciona certinho assim que a atualização é aplicada.

## Funcionalidades planejadas que NÃO foram concluídas
Nenhuma das planejadas pra Fase B — todas concluídas e testadas ao vivo.

## O que o próximo laboratório deve desenvolver
- **Fase C**: Stripe Checkout (modo teste) + webhook + tabela `subscriptions` — é também o
  momento certo de criar a linha em `family_accounts` (ao criar o `customer` no Stripe).
- Antes da Fase C: confirmar com o usuário o preço da assinatura (ainda pendente desde o plano
  original).

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`.
- Nova rota em produção (depois do deploy): `https://app-two-flax-92.vercel.app/familia`.
- Como verificar: acessar `/familia`, responder a conta do parental gate, criar uma conta de
  teste, confirmar que reabrir a página mantém a sessão.
