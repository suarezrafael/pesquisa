# Contexto — Laboratório 109 — Cloudflare Pages em paralelo (resto de Fase F)

Preenchido em: 2026-08-29
Commit inicial → final: a03044bd4b2841423a60e8b53640026ffc8dbb9c..HEAD

## O que foi feito
Escolhido pelo usuário entre as opções restantes de backlog (Fase F/secrets do lab-104/bug de
morros invisíveis), com escopo confirmado explicitamente na pergunta: deploy NOVO e PARALELO em
Cloudflare Pages, sem mexer no site ao vivo (Vercel) nem no DNS de `missaoaprendizado.com`.

- **Projeto Cloudflare Pages criado**: `missao-aprender-jogo`, na mesma conta Cloudflare já usada
  pelos Workers (`missao-aprender-accounts`, `missao-aprender-relay-v2`) — consolidando infra numa
  conta só, como recomendado em `docs/plano-comercial-backend.md`.
- **Build publicado**: `npm run build` (mesmo comando de sempre, `app/dist`) +
  `wrangler pages deploy dist --project-name=missao-aprender-jogo --branch=main`. 627 arquivos,
  deploy em ~6s. URL de produção do projeto:
  **https://missao-aprender-jogo.pages.dev**
- **Nenhuma mudança de código foi necessária** — o front-end já fala com os Workers via URL
  ABSOLUTA (`import.meta.env.VITE_ACCOUNTS_API_URL`/`VITE_RELAY_URL`/`VITE_NEON_AUTH_URL`,
  embutida em tempo de build via `app/.env`/`.env.production`, já commitados — são só URLs
  públicas, não segredo), então o MESMO artefato de build que já vai pro Vercel funciona sem
  ajuste nenhum em qualquer origem nova.
- **Verificado ao vivo** na URL `.pages.dev`: tela título → onboarding → criação de perfil → mundo
  3D carregando e renderizando (HUD, boneco, planeta) → sem erro de console → todos os 627
  arquivos estáticos servidos com `200` (sem problema de MIME/roteamento de SPA, um erro comum
  migrando de um provedor pra outro).

## Decisões técnicas tomadas
- **Vercel continua sendo produção** — este laboratório não desliga nada que já funciona; o
  Cloudflare Pages existe hoje só como uma opção pronta e verificada, esperando a decisão do
  usuário de fazer o corte de verdade (trocar DNS).
- **Sem automação de deploy via CI nesta fatia** — decisão deliberada pra não ter DOIS pipelines de
  deploy automático pro mesmo front-end brigando um com o outro antes de decidir qual é o
  definitivo. Quando o usuário decidir migrar de verdade, o próximo laboratório natural é adaptar
  o passo de deploy do `app` em `.github/workflows/ci.yml` (lab-104) pra `wrangler pages deploy`
  em vez de `vercel --prod` — mesmo padrão condicional (`if: github.ref == 'refs/heads/main' && ...`)
  já em uso.
- **Achado durante a verificação, não é bug deste laboratório**: tentei confirmar conectividade
  cruzada de verdade fazendo um `fetch()` direto pro Worker de contas (`/health`) dentro do
  navegador, tanto a partir do Cloudflare Pages quanto (pra comparar) a partir da origem VERCEL DE
  PRODUÇÃO já em uso — os dois falharam identicamente com `TypeError: Failed to fetch`. Como o
  MESMO erro acontece na origem que já está em produção real (não introduzida por mim), e um
  `curl` direto (fora do navegador) ao mesmo endpoint devolveu `200 {"ok":true}` na hora, concluí
  que é uma restrição do AMBIENTE DE AUTOMAÇÃO de navegador desta sessão em alcançar domínios
  `*.workers.dev` diretamente — não uma falha real do site, do Cloudflare Pages, nem do Worker.
  CORS do Worker já é `*` (liberado desde antes deste laboratório), então a arquitetura não
  depende de qual origem serve o front-end — só não consegui confirmar isso com um fetch de
  dentro do navegador automatizado nesta sessão especificamente.

## Pendências / dívidas conhecidas
- Um perfil de teste ("CFPagesTest") foi criado durante a verificação, na origem
  `missao-aprender-jogo.pages.dev` — inofensivo (não é um domínio real com usuários, é o projeto
  novo recém-criado, ninguém mais vai visitar essa URL até o usuário decidir usá-la), mas fica
  registrado por transparência.
- Conectividade cruzada de verdade (fetch do navegador pro Worker) não foi confirmada AO VIVO
  nesta sessão pela limitação do ambiente de automação explicada acima — recomendo o usuário
  abrir `https://missao-aprender-jogo.pages.dev` no próprio navegador e testar o fluxo de
  pareamento/entitlement (`/familia`) antes de decidir migrar de verdade, já que essa parte
  específica não foi 100% confirmada ao vivo (a arquitetura/CORS indicam que deve funcionar, mas
  "deveria funcionar" não é o mesmo que "confirmado").

## Funcionalidades planejadas que NÃO foram concluídas
- Nenhuma das planejadas para este laboratório.

## O que o próximo laboratório deve desenvolver
- **Corte de produção pra Cloudflare Pages** (ação e decisão do usuário, não desta sessão): testar
  `https://missao-aprender-jogo.pages.dev` de verdade (incluindo `/familia` e pareamento, ver
  pendência acima) e, se aprovado, trocar os registros DNS de `missaoaprendizado.com` na
  Cloudflare (mesma zona já usada pelos Workers) pra apontar pro Cloudflare Pages em vez da Vercel,
  e então desligar/pausar o projeto Vercel. Fora de escopo desta sessão de propósito (mudança de
  DNS em domínio ao vivo tem risco real de derrubar o site se feita errada).
- **Automatizar o deploy do Pages via CI** — só depois do corte acima, adaptando o passo de deploy
  do `app` em `.github/workflows/ci.yml` (lab-104).
- Sair do modo teste do Stripe, e-mail semanal via Resend (as outras duas partes de Fase F) —
  decisões/credenciais separadas.
- Bug de morros invisíveis (lab-95) e secrets do lab-104 continuam em aberto, esperando o usuário.

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`
- Nenhuma mudança de código neste repositório — só infraestrutura nova fora do git (mesmo padrão
  documentado em `labs/CURRENT.md`, seção "Infraestrutura nova fora do git").
- Como verificar o que foi construído: abrir `https://missao-aprender-jogo.pages.dev` — site
  completo funcionando, deploy independente do Vercel/produção atual. `npx wrangler pages
  deployment list --project-name=missao-aprender-jogo` (de dentro de `app/`) lista os deploys.
