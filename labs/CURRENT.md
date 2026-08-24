# Laboratório atual

Ativo: nenhum — pronto pra `lab start` a qualquer momento.
Último concluído: labs/lab-88-protecao-contra-sobrecarga/ (pedido direto do usuário: auditoria de
DDoS/sobrecarga — corrigida a corrida real em `/pairing/redeem` (UPDATE atômico), código de
pareamento agora usa `crypto.getRandomValues()`, `/health` parou de consultar o banco. **Achado
crítico não previsto**: o binding nativo de Rate Limiting do Cloudflare Workers não bloqueia NADA
em produção nesta conta (funciona perfeitamente em `wrangler dev` local, mas 100/100 e 30/30
requisições passaram contra limites configurados em produção real) — motivo desconhecido, sem
ticket de suporte aberto ainda. Defesas reais para as rotas críticas usam mecanismos verificados
ao vivo: rate limiter próprio em Postgres para `/pairing/redeem` (8/60s, testado 8 passaram/12
bloqueados) e contagem de conexões `getWebSockets()` do próprio Durable Object para o relay (teto
15 por IP, testado 15 passaram/10 bloqueados) + limite de tamanho (4KB) e taxa de mensagem
(10 msg/s) por conexão. `/health`, `/client-error`, `/checkout`, `/pairing/generate` seguem
dependendo só do binding nativo não confiável — risco aceito, severidade menor. Ver
`labs/lab-88-protecao-contra-sobrecarga/CONTEXT.md` para os números completos e o raciocínio.)
Contexto do laboratório anterior: labs/lab-88-protecao-contra-sobrecarga/CONTEXT.md

**Duas correções de produção fora de um laboratório formal** (pedido direto do usuário no chat,
2026-08-24, não vale a pena um `labs/lab-NN/` próprio pelo tamanho, mas registrado aqui pra não
se perder):
1. **Domínio confiável do Neon Auth**: `https://missaoaprendizado.com` nunca tinha sido adicionado
   à lista de domínios confiáveis do Neon Auth (Configuration → Domains) — só
   `app-two-flax-92.vercel.app` estava lá desde a Fase B. Isso bloqueava QUALQUER cadastro/login
   feito a partir do domínio novo com `403 Invalid Origin` (o usuário achou que era senha
   esquecida; era isso). Corrigido adicionando o domínio na lista, direto no console do Neon
   (`console.neon.tech` → projeto `missao-aprender` → Auth → Configuration → Domains). **Se um
   domínio novo for apontado pro jogo no futuro, lembrar de adicionar ele aqui também** — não é
   automático.
2. **"Esqueci minha senha"** (`FamilyPortal.tsx`, `LoginScreen`) — não existia nenhum mecanismo de
   recuperação. Implementado com o que o servidor do Neon Auth já tinha configurado: plugin de
   e-mail-OTP (`authClient.forgetPassword.emailOtp({email})` pra pedir o código,
   `authClient.emailOtp.resetPassword({email, otp, password})` pra confirmar) — não é o fluxo de
   link mágico clássico do Better Auth (`forgetPassword`/`resetPassword` simples), que não está
   disponível nesta instância. Testado ao vivo: código de 6 dígitos chegou de verdade no e-mail do
   usuário (usa o provedor de e-mail compartilhado do próprio Neon, `auth@mail.myneon.app`, sem
   precisar configurar SMTP/Resend). Deployado em produção.

**G3 (endurecimento do relay) foi resolvido no lab-88** — limite de conexão por IP, tamanho e
taxa de mensagem, tudo testado ao vivo em produção. **G4 (apelido deixar de ser texto livre) e o
resto de G5 (lista branca completa de tipos de mensagem do relay) continuam pendentes** — próximo
passo recomendado, a menos que o usuário peça outra coisa.

**LEIA ISTO ANTES DE COMEÇAR O PRÓXIMO LABORATÓRIO**: o lab-85 tinha medido 38,2% da cota diária
pra 30 jogadores/30min e deixado como pendência decidir se "salas com teto de 12 jogadores" era o
próximo passo certo. O lab-86 descobriu que esse número estava errado por um fator de 20x — a
Cloudflare cobra mensagens WebSocket recebidas numa razão de 20:1 (confirmado na página oficial de
preços dos Durable Objects), então o número real é **~1,91%**. **Isso muda a prioridade**: não há
mais uma crise de cota de requests que justifique "salas" com urgência — o próximo passo real da
ordem de ataque de `docs/prompts/05-escala-e-viabilidade.md` seção 7 é **G3/G5 (endurecimento do
relay + socket autenticado) e G4 (apelido deixa de ser texto livre — o único achado com risco
legal/reputacional imediato)**. "Salas" volta pro backlog, sem urgência, até o produto ter uso
real o suficiente pra justificar (nesse ponto, também vale medir "Duration" — 13.000 GB-s/dia,
outro recurso que o lab-86 identificou como potencialmente mais apertado que requests pra uma
sala sempre ativa; ver `labs/lab-86-correcao-orcamento-cota/CONTEXT.md`). Ler esse CONTEXT.md
inteiro antes de continuar — tem a tabela de recálculo completa e as dúvidas que ainda ficaram em
aberto (cota por conta vs. por instância, tanto de requests quanto de duration).

**Comandos de teste (lab-83, contagem atualizada no lab-85)**: `cd app && npm run test` (31
testes: lógica de jogo + backoff/modo-solo de `multiplayer.ts`) e `cd app/server-accounts && npm
run test` (14 testes, lógica de entitlement/pareamento). Rodar antes de mexer em `progression.ts`,
`multiplayer.ts` ou `server-accounts/src/domain.ts`.

**Plano comercial completo**: `docs/plano-comercial-backend.md` — 6 fases (A, B, C e D
concluídas; E em andamento — parte de catálogo pronta, falta "Minha Casa"; F não iniciada). Ler
antes de continuar qualquer trabalho de contas/assinatura/cosméticos pagos. Backend confirmado
com o usuário como TypeScript/Cloudflare (não migra pra C#/.NET). Preço da assinatura confirmado:
R$ 4,99/mês.

**Pedido de "chat livre" recusado (2026-08-24)**: usuário pediu chat de texto livre entre
crianças. Não implementado — é requisito `[MUST]` de `docs/prompts/01-seguranca.md`/`prompt.md`
§11 (risco de assédio/vazamento de dado pessoal, exposição LGPD/ECA). Resposta dada: catálogo de
quick-chat bem maior (ver lab-82). Se o pedido voltar, reapresentar o mesmo argumento antes de
considerar qualquer coisa que pareça abrir texto livre de verdade.

**Jogo ao vivo**: https://app-two-flax-92.vercel.app **e também** https://missaoaprendizado.com
(domínio próprio, comprado pelo usuário em 2026-08-24 via Cloudflare Registrar — ver
"Infraestrutura nova fora do git" abaixo — DNS apontado direto pro mesmo projeto Vercel, hospedagem
não mudou). Rota `/familia` com portal dos responsáveis + assinatura real via Stripe modo teste +
gerador de código de pareamento; HUD do jogo com botão 🔗 pra digitar esse código.
**Relé de multiplayer ao vivo (Cloudflare)**: https://missao-aprender-relay-v2.rafaelvs.workers.dev
(documentado em `app/server-cf-relay/README.md`)
**Backend de contas (Cloudflare Worker)**: https://missao-aprender-accounts.rafaelvs.workers.dev
— rotas `/health`, `/checkout`, `/subscription`, `/billing-portal`, `/pairing/generate`,
`/pairing/redeem`, `/entitlement`, `/webhooks/stripe`; login/cadastro do responsável continua
falando direto com o Neon Auth, sem passar por aqui (documentado em
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

**Domínio `missaoaprendizado.com`** (2026-08-24): registrado pelo usuário via Cloudflare Registrar
(mesma conta Cloudflare dos Workers), US$10,46/ano, expira 23/08/2027, auto-renovação ativa por
padrão (desativável no dashboard Cloudflare). `missaoaprender.com` e `missaoaprender.com.br`
(o nome exato do jogo) já estavam registrados por terceiros — este foi o melhor disponível
preservando o nome. Zona DNS criada automaticamente na Cloudflare; dois registros A adicionados
manualmente (`@` e `www` → `76.76.21.21`, modo "DNS only"/sem proxy — obrigatório, já que quem
serve o site é o Vercel, não a Cloudflare) apontando pro mesmo projeto Vercel que já hospedava
`app-two-flax-92.vercel.app`. Vercel sugere trocar pro CNAME dele
(`86cbd73d3d7878f5.vercel-dns-017.com`) como otimização futura — não obrigatório, os registros A
atuais já funcionam (`vercel domains verify` confirma `ok: true`, `misconfigured: false`).

**Fly.io v1 (`missao-aprender-relay`)**: usuário pediu pra apagar, mas `flyctl apps destroy`
falhou — a conta Fly.io está com o trial expirado e a própria plataforma bloqueia TODA chamada de
API (inclusive apagar, que é grátis) até um cartão ser cadastrado. Sem contorno por CLI. O app já
está `suspended` (não roda/não é cobrado), só não pôde ser removido da conta.

**Decisões de produto já confirmadas** (não são mais pendências): preço R$ 4,99/mês; direção dos
cosméticos da Fase E inspirada em Brookhaven RP/Roblox (guarda-roupa amplo — já construído no
lab-82; casa pra montar — ainda não construída); biblioteca de material didático fica de fora dos
exclusivos, sempre grátis.

**Se o usuário reportar objetos/escolas flutuando de novo** (lab-75, lab-87): pedir um print com o
jogador parado bem perto do objeto — pro caso de escola, pedir também o NÚMERO dela (rótulo tipo
"14"), já corrigida em geral no lab-87 (`settleMeshOnTerrain` aplicado às escolas), mas sem
confirmação visual de uma escola especificamente afetada. Lembrar também que o sistema de chuva
dinâmica (`window.__forceRain(true/false)` em dev) pode deixar a cena inteira acinzentada por
20-90s — não confundir com bug de renderização antes de descartar isso. Se o usuário reportar
"manchas pretas no chão" de novo, checar primeiro se não é a chuva (lab-87 já ajustou
`shadowGenerator.bias`/`normalBias` pra shadow acne, sem confirmação visual completa).

**Pendência de verificação (lab-73)**: chapéu remoto foi confirmado ao vivo em duas abas; arma/
efeito de ataque compartilhado e colisão jogador-jogador só foram verificados por leitura de
código + build limpo, não ao vivo — ver `labs/lab-73-multiplayer-visual-e-personalizacao/
CONTEXT.md` pra detalhes.

Outros pedidos pendentes, sem mudança: (1) confirmar se a recompensa em moeda do combate atualiza
o HUD; (2) legibilidade de fonte — lab-87 aplicou `READABILITY_SCALE = 1.4` pra TODO aparelho
(antes só celular ganhava aumento); se voltar a ser reportada como insuficiente mesmo assim, o
próximo passo é revisar CONTRASTE (`outlineWidth`/`outlineColor`), não aumentar o tamanho de novo.

**Frentes de profissionalização ainda não construídas** (monitoramento de erro + analytics
básico concluídos no lab-84): (1) code-splitting de `World3D.tsx` (chunk de ~898KB/194KB gzip
depois do lab-87 separar `studentFigure.ts` — melhorou incidentalmente, mas /familia/termos/
privacidade ainda não carregam Babylon algum, que é o que G12 pede de verdade); (2) auditoria de
acessibilidade WCAG AA sistemática (além do item de contraste de fonte acima). Ambos ficam atrás
da prioridade de escala/viabilidade (`05-escala-e-viabilidade.md`, seção 7 itens 8 e 9).

**Módulos novos do lab-87** (útil pra quem for mexer em avatar/cosméticos): `world3d/
studentFigure.ts` tem a lógica de montar/vestir o boneco (extraída de `World3D.tsx` — importada
por ele E por `world3d/AvatarPreview3D.tsx`, o preview 3D da lojinha). Qualquer mudança na
aparência do boneco (novo chapéu, nova peça) deve ir em `studentFigure.ts`, não de volta pra
`World3D.tsx` — senão quebra o `lazy()` da lojinha de novo (ver `labs/lab-87-.../CONTEXT.md`,
seção "Decisões técnicas", pra entender por quê).

Para retomar o trabalho numa nova sessão, leia primeiro `labs/lab-88-protecao-contra-sobrecarga/
CONTEXT.md` (último laboratório concluído) e, se for mexer em multiplayer/escala,
`docs/prompts/05-escala-e-viabilidade.md` (leia o adendo no topo primeiro — os números do corpo do
documento estão desatualizados em 20x, ver `labs/lab-86-correcao-orcamento-cota/CONTEXT.md`).
