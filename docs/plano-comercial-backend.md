# Plano: backend + contas (fase comercial) — 100% grátis até o primeiro real de receita

Escrito em: 2026-08-22. Responde ao pedido do usuário: "faz um plano do back end + contas
primeiro, isso precisa ser primeiro 100% free na infra, procures server que de pra hospedar free
... estruture o plano. cosmeticos desbloqueaveis por assinatura", como continuação da análise de
`prompt.md` §15 (estratégia de monetização) feita antes deste documento.

Este plano cobre só a fundação (contas + entitlements). A implementação de cada fase vira um
laboratório próprio (`labs/lab-NN-slug/`) quando for construída — este documento é a referência
que amarra todos eles.

## Achado crítico antes de qualquer coisa: Vercel Hobby proíbe uso comercial

Pesquisa feita ao vivo (não de memória) na documentação oficial da Vercel, em 2026-08-22:

> "As stated in the fair use guidelines, the Hobby plan restricts users to **non-commercial,
> personal use only**." — [vercel.com/docs/plans/hobby](https://vercel.com/docs/plans/hobby)

O jogo está hospedado hoje no Vercel Hobby (`https://app-two-flax-92.vercel.app`). Isso é
perfeitamente válido enquanto o jogo é gratuito — mas **no dia em que a primeira assinatura for
cobrada de verdade, continuar no plano Hobby vira violação dos termos de uso**, não é uma zona
cinzenta. Isso vale pro projeto INTEIRO (não só pro endpoint que processa pagamento) — a Vercel
define pelo uso geral da conta, não por rota.

Duas opções, sem meio-termo:
1. **Migrar a hospedagem do front-end pra Cloudflare Pages** antes do lançamento comercial —
   grátis, sem essa restrição documentada (Cloudflare não anuncia o free tier como "só uso
   pessoal", diferente da Vercel), e já é o mesmo provedor do relé de multiplayer (`app/
   server-cf-relay/`) — consolida em uma conta só.
2. **Assinar o Vercel Pro (US$20/mês)** no dia do lançamento comercial — único custo fixo
   recorrente do plano inteiro, se optar por não migrar.

**Recomendação**: opção 1 (migrar pra Cloudflare Pages), porque bate com o objetivo explícito do
usuário ("100% free na infra") e reaproveita infraestrutura já validada neste projeto (o relé v2
já roda em Cloudflare Workers desde o lab-54). A migração em si é uma fase à parte deste plano
(Fase F), não bloqueia o trabalho de contas/backend, que pode continuar no Vercel Hobby durante
todo o desenvolvimento/teste (só precisa estar resolvida ANTES de cobrar a primeira assinatura de
verdade).

## Arquitetura proposta (tudo em camada gratuita)

| Camada | Serviço | Por quê |
|---|---|---|
| Front-end (jogo + portal `/familia`) | Cloudflare Pages (migrar do Vercel antes do lançamento comercial) | Grátis, sem restrição de uso comercial documentada, mesma conta do relé |
| Relé de multiplayer (inalterado) | Cloudflare Workers + Durable Objects (`app/server-cf-relay/`) | Já em produção desde o lab-54, sem mudança |
| API de contas/pagamento (nova) | Cloudflare Workers (`app/server-accounts/`, novo) | Mesma plataforma do relé — sem conta nova pra gerenciar; free tier: 100k requisições/dia, mais que suficiente pro volume de portal+webhook |
| Banco de dados | **Neon Postgres** (sugestão do usuário, confirmada como boa escolha) | Serverless, driver HTTP compatível com Workers (`@neondatabase/serverless` — desenhado pra edge, sem conexão TCP persistente) |
| Autenticação (só do responsável, nunca da criança) | **Neon Auth** (Managed Better Auth, incluído no Neon Free) | Até 60.000 usuários ativos/mês grátis, e-mail/senha + OAuth, dados ficam no schema `neon_auth` do mesmo Postgres — sem vendor extra só pra auth |
| Pagamento | Stripe Checkout | Já era o plano do `prompt.md` §15.3 — sem mensalidade, só taxa por transação |
| E-mail (relatório semanal — fase tardia, opcional) | Resend (free: 3.000 e-mails/mês) | Só entra na Fase F, não bloqueia o lançamento |

**Limites do Neon Free** (conferidos ao vivo, 2026-08-22): 0,5 GB de storage/projeto, 100 CU-horas/
mês (dá pra rodar um compute de 0,25 CU por ~400h), autoscale até 2 CU, 5 GB de egress/mês,
suspende o compute sozinho após 5 min de inatividade (não dá pra desligar essa suspensão no Free —
aceitável aqui, o tráfego é baixo: login de responsável + checkout + entitlement, nada em tempo
real). Isso é **muito** folgado pro volume esperado (dezenas/centenas de famílias, não milhares).

## Princípio de design: a criança continua anônima, só o responsável tem conta

Isso não é só uma escolha técnica — é o requisito de `docs/prompts/01-seguranca.md` (minimização
de dados) já aplicado neste projeto (apelido em vez de nome real, sem conta pra jogar). O desenho
abaixo preserva isso:

- **A criança nunca faz login.** O jogo continua exatamente como é hoje — perfil/progresso 100%
  local (`localStorage`), sem conta, sem e-mail, sem PII de criança em lugar nenhum.
- **Só o responsável tem conta** (Neon Auth, e-mail/senha), acessível SÓ pelo portal `/familia`,
  atrás do parental gate (pergunta de matemática simples, `prompt.md` §15.3.1) — nunca alcançável
  pelo fluxo normal de jogo da criança.
- **Vínculo por código de pareamento, não por login da criança**: o responsável gera um código no
  portal (ex. 6 dígitos, expira em 15 min); a criança digita esse código UMA VEZ no jogo (tela
  simples, sem teclado de e-mail/senha). O jogo troca o código por um **token de entitlement**
  assinado (JWT de vida curta, ex. 7 dias) e guarda só isso em `localStorage` — nenhum dado do
  responsável (e-mail, nome) chega no client da criança.
- O jogo revalida o token em background quando online (silencioso, sem bloquear a jogabilidade se
  a família estiver offline — mesma filosofia "funciona offline" já aplicada ao PWA) e cai pro
  cache local se a rede cair.

## Modelo de dados (Postgres/Neon)

```sql
-- gerenciado pelo Neon Auth, não criamos à mão:
-- schema neon_auth.* (usuários responsáveis, sessões) -- tabela real confirmada como
-- `neon_auth."user"` (minúsculo, singular), não `neon_auth.users` como uma suposição inicial.

create table family_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references neon_auth."user"(id),
  created_at timestamptz not null default now()
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  family_account_id uuid not null references family_accounts(id),
  stripe_customer_id text not null,
  stripe_subscription_id text,
  status text not null check (status in ('trialing','active','past_due','canceled')),
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create table pairing_codes (
  code text primary key,           -- 6 dígitos, curto de propósito (digitado à mão pela criança)
  family_account_id uuid not null references family_accounts(id),
  expires_at timestamptz not null,
  redeemed_at timestamptz
);
```

Nenhuma tabela guarda nome/e-mail da criança — isso continua só no `localStorage` dela, como hoje.

**Atualização (lab-119, Fase F)**: esta regra foi conscientemente RELAXADA pra viabilizar o
relatório semanal por e-mail — `progress_snapshots` guarda um RESUMO MÍNIMO de progresso (nível,
XP total, moedas, contagem de missões concluídas, contagem de emblemas; nunca resposta de quest,
apelido, avatar ou horário de atividade), uma linha por família, sempre sobrescrita. Só é
sincronizado enquanto a família tiver entitlement ativo (ver `POST /progress-summary` em
`app/server-accounts/README.md`) — sem assinatura, o jogo nunca chama esse endpoint. Decisão
registrada em `labs/lab-119-.../FEATURES.md`.

**Atualização (lab-142)**: a regra foi RELAXADA de novo, desta vez de forma mais ampla, pra
resolver G6 de `docs/prompts/05-escala-e-viabilidade.md` ("todo o progresso pago mora só no
aparelho — limpar dados apaga o que a família pagou, sem backup e sem restauração... fila de
suporte e de estorno esperando pra acontecer"). `progress_backups` guarda o `Profile`+`Progress`
INTEIROS (nome/apelido, avatar e equipados incluídos — diferente do resumo do lab-119, que
excluía isso de propósito) — decisão consciente de que, pra uma restauração de verdade "devolver
o que a família pagou" fazer sentido, precisa devolver o personagem inteiro, não só os números.
Justificativa de que isso não é uma exposição nova de privacidade: o apelido da criança já segue
o catálogo de `data/nicknames.ts`/`nicknameFilter.ts` (não é o nome real, mesmo raciocínio de
"identificador técnico, não dado pessoal" já usado em `docs/prompts/01-seguranca.md` pro id
anônimo de analytics), e já é visível a OUTROS jogadores no multiplayer/ranking hoje — guardar
esse mesmo apelido, criptografado em trânsito (HTTPS) e atrás do MESMO token de entitlement
autenticado já usado pra `/progress-summary`, não é uma superfície de exposição maior que a que
já existe. Mesma condição de antes (só com entitlement ativo). Ver `POST`/`GET /progress-backup`
em `app/server-accounts/README.md` e `labs/lab-142-.../FEATURES.md`.

## Endpoints (novo Worker `app/server-accounts/`)

| Rota | Quem chama | Função |
|---|---|---|
| ~~`POST /auth/*`~~ | Portal `/familia` | **Não existe no nosso Worker** — o client (`@neondatabase/neon-js/auth`) fala DIRETO com o endpoint gerenciado do Neon Auth (`https://<endpoint>.neonauth.<região>.aws.neon.tech/<db>/auth`), sem passar pelo nosso backend. Descoberto na Fase B: mais simples do que o desenho original previa. |
| `POST /checkout` | Portal, autenticado | Cria sessão Stripe Checkout pra `family_account_id`, devolve URL |
| `POST /webhooks/stripe` | Stripe (servidor a servidor) | Verifica assinatura, atualiza `subscriptions.status` |
| `POST /pairing/generate` | Portal, autenticado | Gera `pairing_codes` novo pra família |
| `POST /pairing/redeem` | Jogo (criança, uma vez) | Troca código por token de entitlement assinado |
| `GET /entitlement` | Jogo (background, com o token já emitido) | Revalida/renova o token; responde só `{ active: boolean, expiresAt }` |

## Regra inegociável (já em `prompt.md` §15.1, repetida aqui de propósito)

O entitlement **só** gateia cosméticos (skins/cores/chapéus exclusivos, cabelo exclusivo, moeda
bônus se vier a existir). **Nunca** gateia quest, progressão, cooperação ou qualquer conteúdo
pedagógico — a checagem de assinatura só pode aparecer no código da lojinha (`AvatarShop.tsx` e
os catálogos em `src/data/`), nunca em `quests.ts`/`progression.ts`.

## Catálogo de cosméticos (Fase E) — inspiração Roblox (Brookhaven RP e afins)

Direção de produto do usuário (2026-08-24): os itens exclusivos devem ter a "pegada" dos jogos de
roleplay/customização mais populares do Roblox — Brookhaven RP é a referência citada — cuja
mecânica central é exatamente a que já engaja essa faixa etária em escala: casa própria pra montar
e decorar, guarda-roupa com muitas opções, e autoexpressão via avatar. Isso complementa (não
substitui) o case do Prodigy (§15.2 do `prompt.md`) — Prodigy valida o FUNIL de assinatura
(portal separado, parental gate, upsell sobre conveniência); Brookhaven RP valida O QUE tem valor
percebido suficiente pra uma criança pedir a assinatura pros pais (colecionismo, personalização do
espaço pessoal, exibir pra amigos). Os dois modelos são compatíveis com a regra inegociável acima
— nenhum deles gateia o loop pedagógico.

**Regra explícita confirmada pelo usuário**: a biblioteca de material didático (mencionada no
plano original como possível item de assinatura) fica **de fora** dos exclusivos — sempre grátis,
sem exceção. Só cosméticos puramente visuais entram no gate.

### Extensão dos catálogos já existentes (avatares/chapéus/cores/cabelo)

Mesma estrutura de dados já usada em `app/src/data/{avatars,hats,customization}.ts` (cada item
tem `id`/`name`/`cost`/uma forma geométrica primitiva pro Babylon renderizar — nada de textura
foto-realista, mantém o estilo cartoon low-poly já estabelecido), só adicionando um novo campo
`subscriptionOnly?: boolean` em vez de `cost` pros itens exclusivos:

- **Chapéus novos**: Chapéu de Mago 🧙 (shape nova `wizard`, cone listrado com estrelas), Fone de
  Ouvido Gamer 🎧 (shape nova `headset`), Chifres de Dragão 🐉 (shape nova `horns`), Coroa de
  Diamante 💎 (variante brilhante da coroa já existente).
- **Óculos** (eixo de customização novo, mesmo padrão do chapéu — independente, `equippedGlassesId`):
  Óculos de Sol Estiloso 😎, Óculos de Realidade Virtual 🥽.
- **Roupas novas** (estende `SHIRT_COLOR_CATALOG`/`PANTS_COLOR_CATALOG`/`SHOE_COLOR_CATALOG` com
  padrões, não só cor sólida — precisa de um campo `pattern` novo no lugar de `colorRgb` puro):
  Camisa Holográfica (gradiente arco-íris), Calça Estelar (padrão de estrelas), Tênis "Led"
  (efeito de emissive pulsante, já existe suporte a emissive nos materiais do Babylon usados hoje).
- **Mochila voadora** 🎒✨ — mesma mochila existente, com uma pequena hélice/asas animadas.
- **Criaturas novas** (estende `avatars.ts`): Dragãozinho 🐲, Robô 🤖, Fênix 🔥.

### Feature nova: "Minha Casa" — maior aposta de engajamento desta fase

A mecânica mais pedida por quem joga jogos como Brookhaven RP é ter um espaço PRÓPRIO pra montar.
Proposta (a decidir em detalhe quando esta fase for construída, viraria seu próprio laboratório
dado o tamanho):

- **A casa em si é grátis pra todo mundo** (não é o cosmético — é uma área nova do jogo, mesmo
  espírito de "nunca gatear conteúdo/funcionalidade central", só que aplicado a uma feature social
  em vez de pedagógica). Cada jogador ganha um terreno/cômodo simples ao lado do mini-planeta.
  - Justificativa: dividir DIVERSÃO (autoexpressão, criatividade — deve continuar acessível) de
    CONVENIÊNCIA/EXCLUSIVIDADE (temas de mobília prontos, itens raros) é a mesma lógica já aplicada
    às quests — mantém a proposta educacional livre de crítica "pay-to-win" mesmo estendendo pra
    uma feature não-pedagógica.
- **Mobília avulsa** (cama, mesa, cadeira, tapete, planta, luminária) compra-se com moeda do jogo,
  igual chapéus/roupas hoje — grátis de assinatura, só custa progressão normal.
- **Sets temáticos exclusivos de assinante**: "Quarto Espacial" 🚀 (cama-nave, luminária-planeta,
  tapete de estrelas) e "Jardim Encantado" 🌷 (grama florida, banco de madeira, borboletas
  animadas) — só esses sets ficam atrás do entitlement, não a casa nem a mobília básica.
- **Ideia de expansão futura (P2, não desta fase)**: "modo visita" pra ver a casa de um amigo —
  exige a mesma revisão de segurança já aplicada ao chat fechado (`docs/prompts/01-seguranca.md`)
  antes de existir; não entra no escopo da Fase E.

### Por que isso funciona pra essa faixa etária (sem inventar estatística que não temos)

Os mecanismos por trás do sucesso desses jogos no Roblox são bem documentados qualitativamente:
autoexpressão via avatar, colecionismo (querer "completar" o catálogo), personalização de um
espaço que é seu, e exibição social (mostrar pra amigos o que você montou/vestiu). Não temos (nem
fabricamos) um número de conversão específico pra citar aqui — a validação de que ESSA MONETIZAÇÃO
funciona continua sendo o case do Prodigy (§15.2); esta seção só define O QUE colocar atrás do
gate pra maximizar o desejo de assinar, não se o modelo de assinatura funciona.

## Fases de implementação (cada uma vira um laboratório na hora de construir)

1. **Fase A — Fundação de dados ✅ concluída em 2026-08-22**: projeto Neon `missao-aprender`
   criado (região São Paulo, `aws-sa-east-1`), Neon Auth habilitado (schema `neon_auth`
   confirmado: `user`/`session`/`account`/etc.), schema próprio aplicado (`family_accounts`/
   `subscriptions`/`pairing_codes`), Worker `missao-aprender-accounts` deployado no Cloudflare
   com um health-check que prova a conexão de ponta a ponta (Worker → Neon via driver HTTP).
   Ver `app/server-accounts/README.md` e `labs/lab-78-.../CONTEXT.md` pro detalhe completo.
   Ajuste em relação ao critério original: não criei um responsável de teste de verdade (exigiria
   passar pelo fluxo real de signup do Better Auth, que só faz sentido com a UI da Fase B) — em
   vez disso, confirmei que o schema existe e é consultável, o que é suficiente pra fundação.
2. **Fase B — Portal `/familia` (somente leitura) ✅ concluída em 2026-08-23**: rota `/familia`
   (com rewrite SPA no `vercel.json`, code-splitted — a criança nunca baixa esse chunk), parental
   gate, login/cadastro real via Neon Auth (client direto no navegador, sem passar pelo nosso
   Worker — ver ajuste na tabela de endpoints acima), dashboard mostrando "sem assinatura ativa".
   Testado ao vivo de ponta a ponta (cadastro → linha real em `neon_auth.user` → sessão persiste
   entre reloads → logout → login de novo). Nenhuma mudança no jogo da criança. Ver
   `labs/lab-79-.../CONTEXT.md` pro detalhe completo.
3. **Fase C — Pagamento de verdade ✅ concluída em 2026-08-24**: preço confirmado pelo usuário
   (R$ 4,99/mês). Stripe Checkout (modo teste) + webhook + tabela `subscriptions` atualizando ao
   vivo, testado de ponta a ponta (assinar e cancelar refletem no portal em segundos). Ver
   `labs/lab-80-.../CONTEXT.md` pro detalhe completo, incluindo um bug real do SDK do Neon Auth
   encontrado e corrigido durante o teste ao vivo.
4. **Fase D — Pareamento com o jogo ✅ concluída em 2026-08-24**: portal gera um código de 6
   dígitos (`POST /pairing/generate`), a criança digita esse código uma vez no jogo
   (`POST /pairing/redeem`) e recebe um token de entitlement assinado por HMAC (não relacionado ao
   JWT do Neon Auth), guardado em `localStorage` e revalidado em background
   (`GET /entitlement`) contra o status real da assinatura. Testado ao vivo de ponta a ponta,
   incluindo cancelamento da assinatura refletindo no jogo na revalidação seguinte. Ver
   `labs/lab-81-.../CONTEXT.md` pro detalhe completo.
5. **Fase E — Cosmético de verdade gateado (parcialmente concluída em 2026-08-24)**: extensão
   dos catálogos existentes concluída — 3 criaturas, 3 chapéus e 4 cores marcados
   `subscriptionOnly`, escondidos/bloqueados na lojinha sem entitlement ativo (ver
   `labs/lab-82-.../CONTEXT.md`). Falta "Minha Casa" (feature nova, maior, ainda não iniciada —
   ver a seção "Catálogo de cosméticos (Fase E)" acima pro desenho).
6. **Fase F — Lançamento comercial (em andamento)**: relatório semanal por e-mail via Resend
   ✅ construído no lab-119 (`POST /progress-summary`, tabela `progress_snapshots`, Cron semanal em
   `app/server-accounts/src/index.ts`) — falta só o usuário configurar `RESEND_API_KEY` (secret,
   conta Resend própria) pro envio de verdade funcionar; o resto já está deployado em produção.
   Ainda faltam: migrar hospedagem do front-end pro Cloudflare Pages (ver achado crítico acima) OU
   assinar Vercel Pro, e sair do modo teste do Stripe. **Backup/restauração de progresso (G6 de
   `docs/prompts/05-escala-e-viabilidade.md`) ✅ construído no lab-142** (`POST`/`GET
   /progress-backup`, tabela `progress_backups`) — ver atualização de privacidade abaixo.

Cada fase é pequena o bastante pra ser 1-2 laboratórios, seguindo o mesmo convênio já usado no
resto do projeto (`labs/README.md`).

## Custo real neste plano

| Item | Custo até o lançamento | Custo depois de comercial |
|---|---|---|
| Neon (DB + Auth) | R$ 0 | R$ 0 (dentro dos limites do Free — folgado pro volume esperado) |
| Cloudflare Workers/Pages | R$ 0 | R$ 0 |
| Vercel (se não migrar) | R$ 0 | ~US$20/mês (viola ToS do Hobby se continuar aqui pago) |
| Stripe | R$ 0 (sem mensalidade) | só taxa por transação (confirmar % atual no dashboard Stripe na hora de configurar — varia por método de pagamento/região) |
| Resend (Fase F) | R$ 0 | R$ 0 até 3.000 e-mails/mês |

Ou seja: **o plano inteiro é R$ 0/mês até o dia do lançamento, e continua R$ 0/mês depois se a
Fase F migrar pra Cloudflare Pages** — só custa dinheiro se a opção escolhida for ficar no Vercel
Pro em vez de migrar.

## Pendências que exigem decisão do usuário (não técnicas — de produto)

- ~~Preço da assinatura~~ — confirmado pelo usuário: **R$ 4,99/mês** (abaixo da faixa sugerida em
  `prompt.md` §15.4, de propósito: "tem que ser bem barato pra clientes brasileiro").
- ~~Quais cosméticos ficam exclusivos~~ — direção confirmada pelo usuário em 2026-08-24: inspirado
  em Brookhaven RP/Roblox (casa pra montar, guarda-roupa amplo, muitos itens). Lista concreta
  proposta na seção "Catálogo de cosméticos (Fase E)" acima; itens exatos ainda podem ser
  refinados na hora de construir cada laboratório da fase.
- Se migra pra Cloudflare Pages (recomendado, mantém tudo grátis) ou aceita Vercel Pro na Fase F.
- ~~Biblioteca de material didático~~ — **confirmado pelo usuário em 2026-08-24: fica de fora dos
  exclusivos**, sempre grátis, sem exceção (nem a apresentação/organização, ao contrário da
  recomendação intermediária cogitada antes).
