# Laboratório atual

Ativo: nenhum (aguardando o próximo `lab start` — ver recomendação abaixo)
Último concluído: labs/lab-85-protocolo-tempo-real/ (envio-por-mudança + reconexão com
backoff/jitter em `multiplayer.ts`/`World3D.tsx`; 11,8x menos requests medido ao vivo com script
de carga próprio; testado com duas abas reais contra o relay de produção antes do deploy)
Contexto do laboratório anterior: labs/lab-85-protocolo-tempo-real/CONTEXT.md

**LEIA ISTO ANTES DE COMEÇAR O PRÓXIMO LABORATÓRIO**: o lab-85 mediu ao vivo (script de carga
versionado em `app/server-cf-relay/scripts/load-test.mjs`) que envio-por-mudança + backoff
sozinhos cortam a carga do relay em **11,8x**, mas ainda ficam em **38,2%** da cota diária pra 30
jogadores/30min — acima dos 20% que `docs/prompts/05-escala-e-viabilidade.md` seção 3 pede como
critério de aceite. O próximo passo óbvio da ordem de ataque (seção 7) é "salas com teto de 12
jogadores", MAS **antes de implementar isso, resolver uma dúvida real e não respondida**: não está
claro nos docs oficiais da Cloudflare se a cota de 100.000 requests/dia de Durable Objects é **por
conta** (um bucket só, compartilhado por tudo) ou **por instância de Durable Object**. Se for por
conta, dividir em salas não aumenta a cota total disponível — só ajuda com CPU/duração/fan-out, não
com contagem de requests, que é o problema principal. Ver "O que o próximo laboratório deve
desenvolver" em `labs/lab-85-protocolo-tempo-real/CONTEXT.md` pra como investigar isso antes de
codar. Depois disso, a ordem segue com G3-G5 (endurecimento do relay + moderação de apelido — este
último é o único achado com risco legal/reputacional imediato).

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

**Frentes de profissionalização ainda não construídas** (monitoramento de erro + analytics
básico concluídos no lab-84): (1) code-splitting de `World3D.tsx` (chunk de 6,4MB / 1,37MB gzip);
(2) auditoria de acessibilidade WCAG AA sistemática (além do item de contraste de fonte acima).
Ambos ficam atrás da prioridade de escala/viabilidade descrita acima (`05-escala-e-viabilidade.md`)
na ordem de ataque recomendada (seção 7 do documento, itens 8 e 9).

Para retomar o trabalho numa nova sessão, leia primeiro `labs/lab-85-protocolo-tempo-real/
CONTEXT.md` (último laboratório concluído, com a dúvida de escala em aberto) e
`docs/prompts/05-escala-e-viabilidade.md` (a motivação original, com os números).
