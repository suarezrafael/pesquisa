# Laboratório atual

Ativo: labs/lab-81-backend-comercial-fase-d/ (Fase D do plano de backend comercial — pareamento
do entitlement de assinatura com o cliente do jogo, código curto gerado no portal e digitado uma
vez pela criança)
Último concluído: labs/lab-80-backend-comercial-fase-c/ (Fase C — Stripe Checkout + webhook +
status real de assinatura no portal `/familia`, testado ao vivo de ponta a ponta)
Contexto do laboratório anterior: labs/lab-80-backend-comercial-fase-c/CONTEXT.md

**Plano comercial completo**: `docs/plano-comercial-backend.md` — 6 fases (A, B e C concluídas; D
em andamento; E-F não iniciadas). Ler antes de continuar qualquer trabalho de contas/assinatura/
cosméticos pagos. Backend confirmado com o usuário como TypeScript/Cloudflare (não migra pra
C#/.NET). Preço da assinatura confirmado: R$ 4,99/mês.

**Jogo ao vivo**: https://app-two-flax-92.vercel.app (rota `/familia` com portal dos responsáveis
+ assinatura real via Stripe, modo teste)
**Relé de multiplayer ao vivo (Cloudflare)**: https://missao-aprender-relay-v2.rafaelvs.workers.dev
(documentado em `app/server-cf-relay/README.md`)
**Backend de contas (Cloudflare Worker)**: https://missao-aprender-accounts.rafaelvs.workers.dev
— rotas `/health`, `/checkout`, `/subscription`, `/webhooks/stripe`; login/cadastro do
responsável continua falando direto com o Neon Auth, sem passar por aqui (documentado em
`app/server-accounts/README.md`)

Trabalho acontece numa branch de worktree (`worktree-abstract-wobbling-owl`), a partir de `main`.
**PR #5 foi mesclado pelo usuário** — a branch voltou a ficar alguns commits à frente da `main`
depois disso (trabalho de documentação + Fase A do backend). Esta sessão não pode mesclar/apagar
a branch diretamente; avise o usuário quando um novo PR fizer sentido.

**Infraestrutura nova fora do git** (não tem como "clonar" isso via código — documentado aqui pra
quem retomar saber que existe): projeto Neon `missao-aprender` (id `plain-waterfall-72629169`,
região São Paulo), conta `rafaelv_s@hotmail.com` (login GitHub). Uma API key pessoal do Neon
("missao-aprender-agent", escopo amplo — toda a conta, não só este projeto) foi usada pra
provisionar isso; considerar revogar/restringir antes de qualquer automação recorrente.

**Fly.io v1 (`missao-aprender-relay`)**: usuário pediu pra apagar, mas `flyctl apps destroy`
falhou — a conta Fly.io está com o trial expirado e a própria plataforma bloqueia TODA chamada de
API (inclusive apagar, que é grátis) até um cartão ser cadastrado. Sem contorno por CLI. O app já
está `suspended` (não roda/não é cobrado), só não pôde ser removido da conta.

**Decisões de produto pendentes (usuário)**, antes de avançar pra Fase E do backend comercial:
(1) lista exata de cosméticos exclusivos; (2) resolver se a "biblioteca de material didático"
mencionada pelo usuário fica de fora do gate de assinatura (recomendado, por causa da regra de
nunca gatear conteúdo pedagógico em `prompt.md` §15.1) ou não. Preço já confirmado: R$ 4,99/mês.

**Se o usuário reportar objetos flutuando de novo** (lab-75): pedir um print com o jogador parado
bem perto do objeto. Lembrar também que o sistema de chuva dinâmica
(`window.__forceRain(true/false)` em dev) pode deixar a cena inteira acinzentada por 20-90s — não
confundir com bug de renderização antes de descartar isso.

**Pendência de verificação (lab-73)**: chapéu remoto foi confirmado ao vivo em duas abas; arma/
efeito de ataque compartilhado e colisão jogador-jogador só foram verificados por leitura de
código + build limpo, não ao vivo — ver `labs/lab-73-multiplayer-visual-e-personalizacao/
CONTEXT.md` pra detalhes.

Outros pedidos pendentes, sem mudança: (1) confirmar se a recompensa em moeda do combate atualiza
o HUD; (2) se a legibilidade de fonte no celular voltar a ser reportada como insuficiente mesmo em
1.6x, o próximo passo é revisar CONTRASTE (`outlineWidth`/`outlineColor`), não aumentar o tamanho
de novo.

Para retomar o trabalho numa nova sessão, leia primeiro `labs/lab-81-backend-comercial-fase-d/
FEATURES.md` (laboratório ativo) e `labs/lab-80-backend-comercial-fase-c/CONTEXT.md` (o anterior).
