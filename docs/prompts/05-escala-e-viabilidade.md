# Critérios de Escala e Viabilidade Comercial em Infraestrutura Gratuita

> ## ⚠️ Correção (2026-08-24, `labs/lab-86-correcao-orcamento-cota/CONTEXT.md`)
> O texto abaixo (seção 1, "A conta que ninguém fez ainda no repositório") calcula o teto da cota
> de Durable Objects tratando **1 mensagem WebSocket recebida = 1 request cobrado**. A página
> oficial de preços da Cloudflare (`developers.cloudflare.com/durable-objects/platform/pricing/`,
> verificada em 2026-08-24) documenta uma **razão de cobrança de 20:1** pra mensagens WebSocket
> recebidas ("100 WebSocket incoming messages would be charged as 5 requests for billing
> purposes") — mensagens enviadas (broadcast) não são cobradas. Isso muda o cálculo da seção 1 em
> 20x: em vez de "~13 crianças jogando 15 min esgotam a cota", o protocolo antigo (8,33 msg/s)
> levaria **~267 crianças jogando 15 min** pra esgotar os 100.000 requests/dia. Com as otimizações
> do lab-85 (envio por mudança + keepalive), uma sessão de 30 jogadores por 30 minutos consome
> **~1,9% da cota diária**, não os 38,2% que o lab-85 havia medido sem aplicar essa razão. O texto
> original abaixo não foi reescrito (preserva o trabalho original de quem trouxe este documento) —
> esta correção só avisa que os números de cota da seção 1 e o "Critério de aceite" da seção 3
> precisam ser lidos com o fator 20x em mente. O achado de G1 sobre o protocolo em si (mandar
> estado a 8,33 msg/s incondicional é um desperdício, deveria ser por mudança) continua válido e já
> foi implementado no lab-85 — só a URGÊNCIA/matemática da cota estava superestimada.
> **Recurso que passa a merecer mais atenção depois desta correção**: "Duration" (13.000 GB-s/dia,
> cobrada pelo tempo de parede em que o Durable Object está ativo, os 128MB de memória inteiros por
> instância) — se a sala global ficar ocupada por pelo menos um jogador ~24h/dia, isso sozinho já
> consome ~83% desse orçamento, um resultado que "salas" (múltiplas instâncias simultâneas) pode
> piorar em vez de ajudar, dependendo de quantas salas ficam ativas ao mesmo tempo. Ver
> `labs/lab-86-correcao-orcamento-cota/CONTEXT.md` pra a análise completa.

> **Destino sugerido no repo**: `docs/prompts/05-escala-e-viabilidade.md` (quinto documento da série
> `docs/prompts/`, mesma convenção `[MUST]`/`[SHOULD]` de `01-seguranca.md`).
>
> **Como usar como prompt**: cole este arquivo no início de uma sessão de programação, junto com
> `01-seguranca.md` e `03-arquitetura-sistema.md`. Ele define o que "escalar com saúde de graça"
> significa em número, não em adjetivo, e lista os buracos técnicos reais entre o estado atual do
> repositório e um produto digital que aguenta usuário pagante.

**Prompt de abertura de sessão (copiar/colar):**

```
Leia docs/prompts/05-escala-e-viabilidade.md, labs/CURRENT.md e docs/plano-comercial-backend.md.
Escolha UM requisito [MUST] ainda não atendido, na ordem da seção 7, e construa um laboratório
para ele seguindo a skill `lab`. Regras desta sessão:
1. Antes de escrever código, meça o estado atual (quota real no dashboard, tamanho de bundle,
   número de mensagens por sessão). Número medido vence estimativa.
2. Todo requisito atendido vira teste automatizado ou verificação reproduzível — não "conferi
   na mão".
3. Se o requisito exigir sair da camada gratuita, escreva o custo mensal estimado em R$ no
   CONTEXT.md e pare para decisão do usuário em vez de assumir.
4. Não abra chat de texto livre nem enfraqueça nenhum [MUST] de 01-seguranca.md.
```

---

## 1. Definição operacional de "escalar com saúde de graça"

O produto escala com saúde quando as quatro afirmações abaixo são simultaneamente verdadeiras. Um
sistema que só é barato porque ninguém usa não escala — só está ocioso.

- **[MUST] Teto conhecido**: para cada serviço gratuito existe um número escrito de "quantos
  usuários simultâneos / quantos jogadores-minuto por dia" cabem na cota, e esse número é derivado
  de medição real, não de estimativa.
- **[MUST] Degradação prevista**: quando uma cota estoura, o jogo continua jogável em modo solo e a
  criança recebe uma mensagem compreensível — nunca tela branca, erro técnico ou loop de reconexão.
- **[MUST] Aviso antes do teto**: alguém (humano) é avisado ao cruzar 70% de qualquer cota diária
  ou mensal, antes das crianças perceberem.
- **[MUST] Saída barata**: cada dependência gratuita tem um plano B documentado com custo mensal em
  reais e esforço de migração em horas; nenhuma decisão de arquitetura torna a saída cara.

### Cotas reais da stack atual (verificadas em 2026-08-24)

| Serviço | Camada | Limite que aperta primeiro | Consequência de estourar |
|---|---|---|---|
| Cloudflare Durable Objects (relay) | Free | **100.000 requests/dia**, contando mensagens WebSocket; duração 13.000 GB-s/dia; reset 00:00 UTC | operações do tipo excedido passam a **falhar com erro** |
| Cloudflare Workers (relay + contas) | Free | 100.000 req/dia, 10 ms de CPU por invocação | Error 1027 |
| Vercel (front-end) | Hobby | **Proíbe uso comercial** (pagamento/assinatura ativa já viola); 100 GB de transferência | violação de termos + possível suspensão |
| Neon Postgres | Free | **100 CU-horas/mês por projeto**, 0,5 GB storage, 5 GB egress; suspende compute após 5 min ocioso | compute suspenso **até o próximo ciclo** → paywall e entitlement param |
| Stripe | — | sem camada gratuita relevante; taxa por transação | — |

### A conta que ninguém fez ainda no repositório

`World3D.tsx` envia `sendState` a cada 0,12 s → **8,33 mensagens/segundo por jogador**. Contra a
cota de 100.000 requests/dia do Durable Object:

```
100.000 ÷ 8,33 ≈ 12.000 segundos = 3 h 20 min de jogo conectado por dia — somando TODOS os jogadores
```

Ou seja: **13 crianças jogando 15 minutos cada esgotam a cota do dia**. A partir daí o relay começa
a falhar, o cliente entra em `setTimeout(connect, 3000)` sem backoff nem jitter, e cada aparelho
conectado passa a martelar um serviço já sem cota — o pior comportamento possível exatamente no
momento de maior tráfego. Este é o **primeiro teto do produto**, muito antes de banda, banco ou
storage, e hoje ele não está escrito em lugar nenhum do repositório.

---

## 2. Achados da auditoria (branch `worktree-abstract-wobbling-owl`)

Cada achado tem evidência no código. "Coberto" = já existe tratamento; "não coberto" = não existe
código nem dívida registrada.

### G1 — Protocolo de tempo real sem orçamento de cota `[bloqueador de escala]`
`World3D.tsx:6478` envia estado completo a 8,33 Hz, sempre, mesmo com o jogador parado, mesmo sem
ninguém por perto, mesmo em planetas diferentes (Terra/Marte compartilham a mesma sala). Sem delta,
sem *area of interest*, sem envio-por-mudança, sem sala. `relay v2` retransmite para todos
(`broadcast`), custo O(N²) em banda.

### G2 — Reconexão sem backoff `[bloqueador de escala]`
`multiplayer.ts:onclose` → reconecta fixo a cada 3 s, indefinidamente, sem jitter, sem limite de
tentativas, sem circuito aberto. Cota esgotada vira tempestade de reconexão.

### G3 — Relay aceita qualquer conexão `[segurança]`
`server-cf-relay/src/index.ts:fetch` não verifica `Origin`, não exige token, não limita conexões por
IP, não limita tamanho de mensagem, não limita taxa por socket. Qualquer pessoa com a URL
(`app/.env.production`, pública no bundle) conecta e transmite para todas as crianças online.

### G4 — O `[MUST]` "sem texto livre" está furado pelo apelido `[segurança infantil]`
`Onboarding.tsx:47` é um `<input>` de texto livre (`maxLength={20}`), e esse apelido é transmitido
em todo `state` e todo `chat`, aparece sobre a cabeça do avatar e no balão de chat de todos os
jogadores. O relay valida `messageId` contra o catálogo fechado (correto) mas repassa `name` cru
(`name.slice(0, 40)`). Não existe lista de bloqueio, normalização (l33t/acentos), filtro de PII
(telefone, nome real, "meu insta é..."), nem caminho de denúncia/bloqueio. Uma criança pode digitar
o nome real e transmiti-lo a estranhos — exatamente o risco que `01-seguranca.md §1` proíbe.

### G5 — Repasse de mensagens agnóstico de esquema `[segurança]`
`broadcast(ws, { ...msg, id })` retransmite **qualquer** objeto JSON de tipo desconhecido. O README
trata isso como recurso ("não precisa mudar o servidor quando o cliente ganha campo novo"); em
produção com crianças é um canal arbitrário aberto entre clientes, e um vetor de custo (mensagem
grande × N destinatários).

### G6 — Entitlement e progresso são 100% do lado do cliente `[receita]`
`entitlementStorage.ts` grava `{token, active}` em `localStorage`; `AvatarShop.tsx:66` libera item
exclusivo com `opt.subscriptionOnly ? entitlementActive : ...`. Editar uma chave de `localStorage`
libera todo o conteúdo de assinante. Pior: **todo o progresso pago mora só no aparelho** — limpar
dados do navegador apaga o que a família pagou, sem backup e sem restauração. Isso é uma fila de
suporte e de estorno esperando para acontecer, não só um detalhe de anti-cheat.

### G7 — Resgate de pareamento sem limite de tentativa e com corrida `[segurança/receita]`
`/pairing/redeem` é anônimo, sem rate limit, sem contador de tentativas: código de 6 dígitos
(`domain.ts:generatePairingCode`, `Math.random`) com janela de 15 min é enumerável por força bruta a
partir de qualquer lugar. Além disso o resgate faz `select` e depois `update` em duas queries
separadas — duas requisições simultâneas com o mesmo código geram **dois tokens de 180 dias**. O
token não tem `jti`, não tem revogação, não tem vínculo com aparelho, não tem limite de aparelhos
por família: um código vazado em grupo de WhatsApp vira assinatura compartilhada por 6 meses.

### G8 — Webhook do Stripe sem idempotência e com esquema restritivo demais `[receita]`
`schema.sql` restringe `status` a `('trialing','active','past_due','canceled')`. O Stripe emite
também `incomplete`, `incomplete_expired`, `unpaid`, `paused` — e no Brasil, com Pix/boleto, a
assinatura nasce `incomplete` com frequência. Nesse caso o `insert` viola a *check constraint*, o
Worker devolve 500, o Stripe reenvia, e o estado do cliente diverge do estado cobrado. Não há
tabela de eventos processados (reentrega do Stripe reprocessa), não há proteção contra eventos fora
de ordem, não há índice único em `stripe_subscription_id`, não há job de reconciliação
Stripe↔banco, não há tratamento de `invoice.payment_failed`.

### G9 — `/health` anônimo consome o banco `[disponibilidade]`
`/health` é público e roda `select count(*) from family_accounts`: expõe número de famílias e
permite que qualquer um queime CU-horas do Neon. Pior sintoma, silencioso: colocar um monitor de
uptime batendo em `/health` a cada minuto impede a suspensão automática do compute →
0,25 CU × 720 h = 180 CU-h/mês contra uma cota de 100 → **compute suspenso no meio do mês** e
paywall inteiro fora do ar. `/entitlement` também vai ao banco em toda abertura do jogo, sem cache.

### G10 — Nenhum CI/CD, nenhum ambiente separado `[operação]`
Não existe `.github/` na branch. Os 36 testes do lab-83 só rodam se alguém lembrar. Deploy é
`vercel --prod` e `wrangler deploy` na mão, do laptop, direto em produção, sem staging, sem smoke
test, sem rollback documentado, sem migração versionada (só `schema.sql` + `migrate.mjs`, sem
histórico de migração). Isso contradiz `03-arquitetura-sistema.md §5` na prática.

### G11 — Observabilidade zero, contrariando um `[MUST]` já escrito `[operação]`
`03-arquitetura-sistema.md §6` marca **[MUST]** "erros são capturados e logados em algum lugar
visível". Hoje: nenhum Sentry, nenhum log estruturado, nenhum evento de produto, nenhum alarme de
cota, nenhuma métrica de retenção D1/D7 ou conversão (que `prompt.md §12` exige). O `catch {}` vazio
aparece em vários lugares do cliente. Toda a saga de performance do lab-66 ao lab-72 foi guiada por
um relato de um aparelho — não por telemetria.

### G12 — Entrega do cliente sem code splitting `[custo/UX]`
Um chunk de ~1,37 MB gzip: o portal do responsável (`/familia`, React puro) baixa Babylon + Havok
para exibir um formulário de assinatura — a página com maior valor comercial do produto é a mais
pesada. O PWA pré-cacheia até 12 MB (`vite.config.ts`), em plano de dados de celular, sem aviso.
`skipWaiting` + `clientsClaim` + recarga automática podem derrubar a criança no meio de um quiz.

### G13 — LGPD além da tela de privacidade `[legal]`
Existe `LegalPage.tsx` (bom), mas não existe: caminho de exclusão de conta e dados a pedido do
responsável (LGPD art. 18), política de retenção (`pairing_codes` nunca é purgada), registro de
consentimento parental para o multiplayer, nem exportação de dados. Apelido é dado pessoal quando a
criança digita o nome real (G4).

### G14 — Sem backup e sem teste de restauração `[continuidade]`
Neon Free tem janela de restauração de 6 horas. `family_accounts` e o vínculo família↔assinatura são
os únicos dados do sistema que representam dinheiro real e não têm exportação periódica. Perder o
banco = não saber quem pagou (o Stripe reconstrói a assinatura, não o vínculo com o token de
entitlement da criança).

### G15 — Configuração e acoplamento a fornecedor `[operação]`
`NEON_AUTH_JWKS_URL` e o fallback `https://app-two-flax-92.vercel.app` estão hardcoded no Worker
(contra o `[MUST]` de `03-arquitetura §5`); o DNS aponta para o IP fixo `76.76.21.21` da Vercel em
vez do CNAME recomendado; a chave de API do Neon usada para provisionar tem escopo de conta inteira
e continua ativa (registrado em `labs/CURRENT.md`, sem laboratório de rotação).

**Já coberto, não repetir**: proibição de uso comercial no Vercel Hobby (documentada em
`docs/plano-comercial-backend.md`, Fase F), parental gate (`FamilyPortal.tsx`), validação de chat no
servidor, Customer Portal do Stripe para cancelamento, separação domínio/motor 3D, caminho de
qualidade reduzida para tablet fraco.

---

## 3. Requisitos de tempo real e custo por jogador

- **[MUST] Orçamento por jogador-minuto documentado.** Antes de otimizar, medir uma sessão real de
  10 minutos no dashboard do Cloudflare e escrever em `docs/` quantos requests de Durable Object um
  jogador consome por minuto. Todo requisito abaixo é aceito contra esse número medido, não contra
  estimativa.
- **[MUST] Envio por mudança, não por relógio.** Não transmitir `state` quando posição, direção e
  aparência não mudaram além de um limiar; enviar *keepalive* raro (≥ 5 s) no lugar. Alvo: reduzir
  de 8,33 msg/s para ≤ 2 msg/s em movimento e ~0,2 msg/s parado.
- **[MUST] Separar estado contínuo de estado raro.** Posição/direção em uma mensagem enxuta;
  aparência (chapéu, cores, arma) só quando muda ou quando um jogador novo entra — hoje as duas
  viajam juntas 8 vezes por segundo.
- **[MUST] Salas com teto explícito.** Sala por região do mundo (Terra/Marte no mínimo) e teto de
  jogadores por sala (sugestão inicial: 12). Ao lotar, abrir sala nova. Isso limita o O(N²) de banda
  e o tempo de CPU do Durable Object (10 ms por invocação no plano Free).
- **[MUST] Reconexão com backoff exponencial + jitter** (ex.: 1 s → 2 s → 4 s → … → teto de 60 s),
  limite de tentativas por sessão e desistência silenciosa para modo solo. Sem isso, qualquer
  incidente vira auto-DDoS.
- **[MUST] Modo solo é o padrão funcional.** O jogo deve abrir, jogar, salvar e progredir com o
  relay 100% fora do ar (já é quase verdade — precisa de teste automatizado que prove).
- **[SHOULD] Interesse por proximidade**: não retransmitir estado de jogador a mais de X unidades de
  distância; o cliente já interpola, quem está longe não precisa de 2 Hz.
- **[SHOULD] Binário compacto** (posições em `Float32`/quantizadas) só depois que envio-por-mudança
  e salas estiverem feitos — ganho menor, complexidade maior.

**Critério de aceite**: um teste de carga sintético (N clientes falsos, script versionado no repo)
demonstra 30 jogadores simultâneos por 30 minutos consumindo menos de 20% da cota diária.

---

## 4. Requisitos de segurança, moderação e confiança

- **[MUST] Socket autenticado.** A conexão ao relay exige um token de sessão de curta duração
  (emitido pelo Worker de contas, anônimo para a criança). Isso dá, de uma vez: identidade estável
  para rate limit, capacidade de banir, e verificação de cosmético de assinante (ver abaixo).
- **[MUST] Limite por conexão no servidor**: mensagens/segundo, tamanho máximo de mensagem, e
  conexões por IP. Exceder = desconectar, não ignorar em silêncio.
- **[MUST] Lista branca de tipos de mensagem.** Remover o repasse genérico `{...msg, id}`: tipo
  desconhecido é descartado. Extensibilidade não pode custar um canal aberto entre crianças.
- **[MUST] Apelido deixa de ser texto livre** — a forma que fecha o furo de G4 sem tirar
  personalização: escolha guiada (adjetivo + animal + número, com botão de sortear) em vez de
  `<input>` cru. Se texto livre permanecer por decisão de produto, então: normalização + lista de
  bloqueio + detecção de padrão de PII (telefone, e-mail, arroba) **no servidor**, apelido
  reprovado nunca é transmitido, e existe caminho de denúncia visível à criança.
- **[MUST] Silenciar/bloquear + denunciar** acessível na HUD infantil, com efeito local imediato
  (não depender de moderação humana em tempo real).
- **[MUST] Cosmético de assinante verificado pelo servidor.** O relay carimba `isSubscriber` no
  broadcast a partir do token; o cliente só desenha item exclusivo em jogador remoto se o carimbo
  veio do servidor. Não é possível impedir um cliente adulterado de se enfeitar localmente — mas é
  possível garantir que **ninguém mais vê**, que é onde mora o valor social do cosmético.
- **[MUST] Resgate de pareamento endurecido**: `update ... where code = $1 and redeemed_at is null
  returning family_account_id` (uma query atômica, mata a corrida), rate limit por IP e por código,
  no máximo N tentativas antes de invalidar, código gerado com `crypto.getRandomValues` e alfabeto
  sem ambiguidade (sem 0/O, 1/I) em vez de `Math.random`.
- **[MUST] Token de entitlement com `jti` e revogação**, validade menor (30 dias) com renovação
  silenciosa, e teto de aparelhos por família (sugestão: 3, com tela de "desvincular aparelho" no
  portal).
- **[SHOULD] Cabeçalhos de segurança** no front (CSP, `Referrer-Policy`, `Permissions-Policy`) —
  hoje `vercel.json` só tem rewrite de SPA.

---

## 5. Requisitos de durabilidade de dados e receita

- **[MUST] Progresso salvo no servidor, por slot de criança, anônimo.** `localStorage` continua
  sendo cache offline; a fonte de verdade passa a ser o backend, com sincronização
  *last-write-wins* por campo e reconciliação de moedas por soma de eventos, não por sobrescrita.
  Sem isso, "paguei e perdi tudo ao trocar de celular" é um caminho garantido para estorno.
- **[MUST] Idempotência de webhook**: tabela `stripe_events(event_id primary key, processed_at)`,
  descarte de reentrega, e comparação de `created`/versão para ignorar evento fora de ordem.
- **[MUST] Aceitar todos os status do Stripe** no banco (remover a *check constraint* restritiva ou
  ampliá-la), e traduzir status → entitlement em **um** lugar (`domain.ts`, já testado).
- **[MUST] Reconciliação periódica** Stripe↔banco (cron do Worker, 1×/dia) reportando divergências —
  webhook perdido é questão de quando, não de se.
- **[MUST] `/health` não toca o banco.** Health público = estático; health com banco = autenticado e
  em rota separada. Nenhum monitor externo aponta para a rota que acorda o Postgres.
- **[MUST] Cache de entitlement** (Cache API ou KV, TTL de minutos) para que abrir o jogo não vire
  uma query no Neon por sessão. Atenção: KV Free tem só 1.000 escritas/dia — usar para leitura, não
  como banco.
- **[MUST] Exportação periódica de `family_accounts`/`subscriptions`** (JSON assinado, fora do Neon)
  e um teste de restauração executado ao menos uma vez, documentado num laboratório.
- **[SHOULD] Purga de `pairing_codes`** expirados por cron; hoje a tabela só cresce.
- **[SHOULD] Fluxo de inadimplência** (`past_due`): avisar o responsável no portal antes de cortar
  cosméticos, e nunca cortar no meio de uma sessão da criança.

---

## 6. Requisitos de operação: observabilidade, CI/CD e entrega

- **[MUST] Captura de erro no cliente e nos dois Workers** (Sentry free ou equivalente), com
  amostragem para caber na cota gratuita. Cumpre o `[MUST]` já escrito em
  `03-arquitetura-sistema.md §6` e hoje descumprido.
- **[MUST] Alarme de cota**: verificação diária (cron do Worker) de requests do Durable Object,
  requests do Worker e CU-horas do Neon, notificando ao cruzar 70%. "Descobrir pelo relato da
  criança" não é monitoramento.
- **[MUST] Eventos de produto mínimos**: sessão iniciada, quest concluída, loja aberta, código
  pareado, checkout iniciado/concluído, erro de pagamento. Sem isso, retenção D1/D7 e conversão —
  exigidas por `prompt.md §12` — continuam impossíveis de medir, e nenhuma decisão de conteúdo tem
  base.
- **[MUST] CI no GitHub Actions**: `tsc -b`, `oxlint`, os 36 testes existentes, build, e um teto de
  tamanho de bundle que falha o PR quando ultrapassado.
- **[MUST] Ambientes separados** para os dois Workers (`wrangler --env staging`) e projeto Neon de
  desenvolvimento (a camada Free permite vários projetos) — nunca testar migração em produção.
- **[MUST] Migrações versionadas** com histórico em tabela e execução no CI, não `schema.sql`
  aplicado à mão.
- **[MUST] Smoke test pós-deploy** (health dos Workers, uma conexão WebSocket real, uma leitura de
  entitlement) e rollback documentado em uma linha de comando.
- **[MUST] Code splitting**: `/familia`, `/termos`, `/privacidade` não carregam Babylon nem Havok.
  A rota de assinatura precisa abrir em segundos num celular fraco em 4G — é ela que converte.
- **[SHOULD] Orçamento de performance versionado** (tamanho de bundle inicial, tempo até jogável em
  aparelho de referência) verificado no CI.
- **[SHOULD] Atualização do service worker com consentimento**: nunca recarregar durante quiz ou
  combate; oferecer "nova versão disponível" e aplicar em momento seguro.
- **[SHOULD] Rotação da chave de API do Neon** de escopo de conta, hoje ativa e registrada como
  risco em `labs/CURRENT.md`.

---

## 7. Ordem de ataque recomendada

Cada item é um laboratório. A ordem é por "o que quebra primeiro se o produto der certo", não por
esforço.

1. **Orçamento e protocolo de tempo real** (G1, G2) — hoje o produto morre com 13 crianças/dia.
2. **Endurecimento do relay** (G3, G5) + **socket autenticado** — pré-requisito de tudo que vem
   depois em moderação e cosmético.
3. **Apelido e moderação** (G4) — é o `[MUST]` de segurança infantil que está furado hoje; é o único
   achado com risco legal e reputacional imediato.
4. **Observabilidade + alarme de cota** (G11) — sem isso, os itens 1 e 2 não são verificáveis e
   nenhum incidente é detectável.
5. **Pagamento resiliente** (G7, G8) — antes de sair do modo teste do Stripe, não depois.
6. **Progresso no servidor** (G6) — antes do primeiro pagante, para não ter que migrar dado de
   quem já pagou.
7. **CI/CD, ambientes e migrações** (G10) — deixa de ser opcional no momento em que existe cliente
   pagante e rollback vira urgência.
8. **Code splitting e entrega** (G12) — converte melhor e reduz banda.
9. **LGPD operacional e backup** (G13, G14) — exclusão de dados, retenção, exportação testada.
10. **Fase F do plano comercial** (migração para Cloudflare Pages) — já planejada; executar depois
    que 1–6 estiverem de pé, e nunca cobrar do primeiro cliente real antes dela.

---

## 8. Anti-requisitos (o que **não** fazer para "economizar")

- **[MUST NÃO] Chat de texto livre** entre crianças, em nenhuma forma, incluindo apelido livre
  transmitido a estranhos — decisão já registrada em `labs/CURRENT.md` (2026-08-24).
- **[MUST NÃO] Monitor de uptime batendo em rota que consulta o Neon** — mantém o compute acordado e
  queima a cota mensal inteira em silêncio.
- **[MUST NÃO] Usar Workers KV como banco de escrita** (1.000 escritas/dia na camada Free).
- **[MUST NÃO] Cobrar assinatura real com o front no Vercel Hobby** — é violação de termos, não
  detalhe de custo.
- **[MUST NÃO] Resolver esgotamento de cota aumentando a frequência de reconexão** ou removendo o
  modo solo como caminho de fallback.
- **[MUST NÃO] Tratar exclusividade de cosmético como problema de anti-cheat de cliente.** A
  garantia possível é social (o servidor carimba o que os outros veem), não local.

---

## 9. Checklist de aceite (usar ao fechar cada laboratório)

- [ ] O laboratório mediu a cota antes e depois, e o número está no `CONTEXT.md`?
- [ ] Existe teste automatizado ou script reproduzível que falha se a regressão voltar?
- [ ] Se a cota deste serviço esgotar hoje, a criança vê uma mensagem compreensível e continua
      jogando solo?
- [ ] Algum humano é avisado antes do teto?
- [ ] Nenhum `[MUST]` de `01-seguranca.md` foi enfraquecido para viabilizar a mudança?
- [ ] O custo mensal em R$ do plano B está escrito, mesmo que hoje seja R$ 0?
- [ ] Erros novos são capturados e visíveis, não engolidos em `catch {}`?

---

## 10. Conclusão honesta sobre "grátis para sempre"

Front-end estático, banco de contas e pagamento cabem confortavelmente na camada gratuita por muito
tempo — dezenas de milhares de carregamentos e centenas de famílias. **Multiplayer em tempo real não
cabe.** Mesmo com todas as otimizações da seção 3 (envio por mudança, salas, 2 Hz), a ordem de
grandeza sustentável em cota gratuita fica na casa de **100 a 150 crianças ativas por dia**. Acima
disso, o caminho barato e previsível é o plano pago do Workers (a partir de US$ 5/mês, com o excedente
de requests de Durable Object cobrado por milhão) — que, no protocolo otimizado, mantém mil usuários
diários na casa de dezenas de dólares por mês, não de centenas.

O requisito de produto que decorre disso não é técnico, é de expectativa: **o plano de negócio deve
saber em que número de crianças o custo deixa de ser zero, e a assinatura de R$ 4,99/mês deve cobrir
esse custo com folga antes de ele chegar.** Com o protocolo atual (8,33 msg/s), esse cruzamento
acontece cedo demais e a conta não fecha; com o protocolo da seção 3, ele acontece bem depois do
ponto em que a receita já existe. É por isso que a seção 7 começa pelo tempo real, e não pela
funcionalidade nova.
