# Laboratório atual

Último concluído: labs/lab-102-reconciliacao-stripe-banco/ — resto de G8
(`docs/prompts/05-escala-e-viabilidade.md`, `[receita]`). Escolhido pelo usuário logo após o
lab-101, entre reconciliação Stripe/deploy automático/NPS/bug de morros invisíveis. Cloudflare Cron
Trigger (primeira vez neste projeto, `[triggers] crons = ["0 9 * * *"]`) reconsulta diariamente
cada assinatura já conhecida direto no Stripe e corrige qualquer divergência de `status`/
`current_period_end` no banco (via `upsertSubscription`, reaproveitada dos webhooks) — cobre o
caso de um webhook que falhe silenciosamente de um jeito que nem a reentrega do Stripe corrija.
**Achado real durante a implementação**: a primeira execução do job acusou uma divergência FALSA
numa assinatura genuína — o driver `@neondatabase/serverless` devolve `timestamptz` como objeto
`Date` de verdade em runtime, não `string` (apesar do tipo declarado em todo `index.ts`), e
comparar por igualdade de string direta sempre falhava mesmo pro mesmo instante. Corrigido com
`toComparableIso` (`domain.ts`, 4 testes novos, total do Worker 40). **Testado ao vivo contra
produção real com autorização explícita do usuário** (classificador bloqueou corromper dado real
de produção mesmo temporariamente): `status` de uma assinatura REAL alterado direto no banco pra
um valor errado, reconciliação detectou e corrigiu sozinha em segundos, confirmado por leitura
direta do banco. Não cobre uma assinatura cujo PRIMEIRO webhook nunca chegou (nenhuma linha
criada) — limitação conhecida. **G8 agora está COMPLETO** (lab-96 + lab-102). Ver
`labs/lab-102-reconciliacao-stripe-banco/CONTEXT.md` pro detalhe completo.

Antes desse: labs/lab-101-ci-e-migracao-versionada/ — G10
(`docs/prompts/05-escala-e-viabilidade.md`, `[operação]`). Escolhido pelo usuário logo após o
lab-100, entre G10/reconciliação Stripe/NPS/bug de morros invisíveis. Atacou as duas partes mais
contidas de G10: CI (GitHub Actions, `.github/workflows/ci.yml`, 3 jobs — `app`/`server-accounts`/
`server-cf-relay` — rodando os 88 testes deste repositório a cada push, hoje zero automação antes
disso) e migração de schema versionada (`schema.sql` reaplicado inteiro sem histórico virou
`migrations/0001_baseline.sql` + tabela `schema_migrations`, `migrate.mjs` reescrito pra aplicar só
o que é novo, cada migração numa transação). **CI de verdade pegou 2 bugs reais de "funciona na
minha máquina"** que nenhuma verificação manual anterior tinha pego: `npx tsc` e o Vitest nos dois
Workers estavam resolvendo TypeScript/config por busca ancestral acidental em `app/node_modules`
(pastas aninhadas) — corrigido com `typescript` como devDependency direta + `vitest.config.ts`
próprio em cada Worker. Migração aplicada em produção e confirmada (contagem de tabelas 7→8).
Confirmado ao vivo no GitHub Actions: 3 jobs verdes, sem avisos. "Ambiente de staging" e "rollback
documentado" ficaram fora de propósito (infraestrutura maior, laboratório próprio futuro). Ver
`labs/lab-101-ci-e-migracao-versionada/CONTEXT.md` pro detalhe completo.

Antes desse: labs/lab-100-gerenciar-aparelhos-por-familia/ — resto de G7
(`docs/prompts/05-escala-e-viabilidade.md`, `[segurança/receita]`). Escolhido pelo usuário logo após
o lab-99, entre G10/reconciliação Stripe/UI de aparelhos/NPS. Até aqui só existia "desvincular todos
os aparelhos" (lab-97) — sem jeito de ver quantos/quais aparelhos estão pareados nem revogar um
específico. Corrigido: novos endpoints `GET /entitlement/devices` (lista os tokens da família,
autenticado como responsável) e `POST /entitlement/revoke` (revoga um `jti` específico, só se
pertencer à família de quem chama — `404` genérico tanto pra "não existe" quanto pra "não é seu",
sem vazar informação). Reaproveita `entitlement_tokens` do lab-97 por completo, sem tabela/coluna
nova. Novo bloco "Aparelhos pareados" em `FamilyPortal.tsx`, com confirmação em duas etapas por
item, mesmo padrão do "revogar todos". **Testado ao vivo contra produção real usando a conta REAL
do próprio usuário** (primeira vez neste projeto que a verificação usa uma sessão de navegador
autenticada de verdade em vez de só scripts, já que os endpoints exigem um JWT de responsável que
nenhum script consegue forjar): 2 aparelhos pareados e listados corretamente, 1 revogado pela UI
(o outro continuou intacto, confirmado via `/entitlement`), `404` confirmado pra `jti` inexistente
e `401` confirmado sem token — tudo executado dentro da própria aba autenticada, sem o JWT do
responsável nunca sair do navegador. **G7 agora está COMPLETO** (lab-88 + lab-97 + lab-100). Ver
`labs/lab-100-gerenciar-aparelhos-por-familia/CONTEXT.md` pro detalhe completo.

Antes desse: labs/lab-99-analytics-de-produto/ — resto de G11 (`prompt.md` §12: D1/D7
retention, tempo médio por sessão, quests concluídas por usuário, taxa de retorno semanal).
Escolhido pelo usuário logo após o lab-98. Restrição central: privacidade infantil — identificador
100% anônimo (`crypto.randomUUID()`, `getOrCreateDeviceId()` em `storage.ts`, sem vínculo com
nome/e-mail/apelido), primeira vez que telemetria de gameplay sai do aparelho da criança (antes só
`localStorage`). Novo: `app/src/productAnalytics.ts` (mesmo padrão de `errorReporting.ts` — `fetch`
com `keepalive`, falha silenciosa) dispara `session_start`/`session_end` (com duração) e
`quest_completed` (só em conclusão GENUÍNA, não em replay de missão já concluída — bug pego e
corrigido antes de qualquer teste). Nova tabela `product_events` no Neon; `POST /events` (anônimo,
rate-limited) grava; `GET /admin/metrics` (protegido por header `x-admin-secret`) devolve D1/D7
retention, duração média de sessão, quests médias por dispositivo, total de dispositivos únicos —
tudo via CTEs SQL. **Testado ao vivo contra produção real**: `POST /events` real confirmado por
leitura direta do banco; 11 eventos sintéticos inseridos cobrindo 3 dispositivos/múltiplos dias,
`/admin/metrics` bateu exatamente com o cálculo manual (D1 66.67%, D7 33.33%, sessão média 90s,
1.5 quests/dispositivo); `401` confirmado sem/com secret errado. Três ações de infraestrutura
(migração do schema, `wrangler secret put`, deploy do Worker) precisaram de **autorização explícita
do usuário** cada uma, bloqueadas individualmente pelo classificador de modo automático (mesmo
padrão do lab-96 com a API do Stripe). NPS de responsáveis ficou fora de escopo de propósito
(mecanismo diferente, pesquisa qualitativa não evento) — laboratório próprio futuro. **G11 agora
está COMPLETO** (lab-98 + lab-99). Ver `labs/lab-99-analytics-de-produto/CONTEXT.md` pro detalhe
completo.

Antes desse: labs/lab-98-alarme-de-cota/ — parte de G11
(`docs/prompts/05-escala-e-viabilidade.md`, item 4 da ordem de ataque §7), escolhido pelo usuário
logo após o lab-97. Boa parte de G11 (observabilidade) já tinha sido resolvida no lab-84 (Web
Analytics, `/client-error`, logs de erro do relay) — faltava ALARME DE COTA de verdade: nenhum
mecanismo detectava se o relay se aproximava da cota gratuita de 100k requests/dia dos Durable
Objects, apesar de duas rodadas de recálculo manual de orçamento já terem acontecido (lab-85/86).
Corrigido: contador autocontado dentro do próprio Durable Object do relay (`state.storage`,
SQLite-backed, primeira vez usado de verdade neste Worker), usando a razão de cobrança 20:1 pra
mensagens WebSocket já documentada no lab-86 (cada conexão = 1 unidade, cada mensagem recebida =
1/20). Loga `[quota-alarm]` ao cruzar 50%/80%/100% da cota, uma vez por limiar por dia; novo
endpoint `GET /quota-status` (sem autenticação, só números agregados) pra consultar sem precisar
de `wrangler tail`. 13 testes novos (primeiro teste automatizado deste Worker). Deployado e
**testado ao vivo contra produção real**: 5 conexões + 145 mensagens via `scripts/load-test.mjs`
(script já existente do lab-85), `/quota-status` refletiu 12 unidades (esperado ~12,25) — contagem
persistindo e acompanhando tráfego real de ponta a ponta. Eventos de produto/retenção D1-D7
(`prompt.md` §12, a outra metade de G11) ficam fora de escopo, para um laboratório futuro. Ver
`labs/lab-98-alarme-de-cota/CONTEXT.md` pro detalhe completo.

Antes desse: labs/lab-97-revogacao-token-pareamento/ — resto de G7
(`docs/prompts/05-escala-e-viabilidade.md`, `[segurança/receita]`), escolhido pelo usuário logo
após o lab-96. Rate limit e a corrida de resgate duplo já tinham sido corrigidos no lab-88; faltava
o token de entitlement em si — uma vez emitido, válido por 180 dias sem NENHUM jeito de invalidar
antes da expiração (código vazado em grupo de WhatsApp virava assinatura compartilhada pelo tempo
todo). Corrigido: nova tabela `entitlement_tokens` (`jti` = chave primária) registra cada token
emitido; `handlePairingRedeem` gera um `jti` de verdade e, ao atingir o limite de **3 aparelhos por
família** (confirmado com o usuário), revoga o mais antigo automaticamente antes de emitir um novo
— zero fricção pra trocar de aparelho; `handleEntitlement` recusa um token revogado, mas mantém
COMPATIBILIDADE RETROATIVA total pra tokens emitidos antes deste laboratório (sem `jti`, sempre
tratados como válidos até a expiração natural — nenhuma família pagante perde acesso por causa
desta mudança). Novo endpoint `POST /entitlement/revoke-all` (autenticado como o responsável) +
botão "Desvincular todos os aparelhos" no portal, pra quando um código vazar. 8 testes novos
(Worker: 21→29). Migração aplicada, Worker e frontend deployados. **Testado ao vivo contra
produção real** com uma família já existente (sem mexer na assinatura dela): 4 pareamentos em
sequência confirmaram a revogação automática do mais antigo no 4º, e `/entitlement` recusando
(`401`) o token revogado enquanto aceita (`200`) o mais recente — assinatura real intacta. Ver
`labs/lab-97-revogacao-token-pareamento/CONTEXT.md` pro detalhe completo.

Antes desse: labs/lab-96-webhook-stripe-idempotencia/ — G8
(`docs/prompts/05-escala-e-viabilidade.md`, `[receita]`), escolhido pelo usuário entre G8/G7/
revisitar tamanho das escolinhas logo após o lab-95. `subscriptions.status` só aceitava 4 dos 8
status reais do Stripe (Pix/boleto nasce `incomplete` com frequência, o que quebrava o `insert` e
causava reenvio infinito); sem tabela de eventos processados (reentrega podia reaplicar a mesma
mudança); sem índice único em `stripe_subscription_id` (corrida real sob entrega concorrente); sem
proteção contra evento fora de ordem; `invoice.payment_failed` sem handler. Tudo corrigido:
`schema.sql` ampliado + índice único + tabela `stripe_webhook_events` + coluna
`last_event_created_at`; `domain.ts` ganhou `isValidSubscriptionStatus`/`isEventNewerThan` (7
testes novos, total do Worker 14→21); `invoice.payment_failed` tratado (descoberta no caminho: SDK
`stripe` 22.x não tem mais `invoice.subscription` no nível raiz, é
`invoice.parent.subscription_details.subscription` — conferido no `.d.ts`, não suposição).
Migração aplicada no banco Neon de produção e conferida direto; Worker deployado
(`https://missao-aprender-accounts.rafaelvs.workers.dev`). Endpoint de webhook do Stripe (modo
teste) não estava inscrito em `invoice.payment_failed` — corrigido via API com **autorização
explícita do usuário** (a primeira tentativa foi bloqueada pelo classificador de modo automático
por mexer em config de terceiro). **Testado ao vivo contra produção de verdade**: evento sintético
assinado enviado ao Worker real, idempotência confirmada (reentrega do mesmo `event.id` devolveu
`deduped:true`). Ver `labs/lab-96-webhook-stripe-idempotencia/CONTEXT.md` pro detalhe completo.

Antes desse: labs/lab-95-mais-missoes-e-escolinhas-menores/ (pedido do usuário 2026-08-25:
aumentar o número de missões além das 21 atuais + encolher as escolinhas pra não sobrecarregar o
planetinha). +9 missões novas (`q22`-`q30`) — concluído e deployado. Escolinhas ~20% menores —
tentado, causou um bug real em produção ("casas dentro da terra, só o telhado aparece"), revertido.
**O bug persistiu idêntico mesmo depois do revert** — não tinha relação com o tamanho.

Investigação passou por DUAS causas raiz erradas antes da certa: (1) achou que era timing de
inicialização do Havok (raycast físico "não pronto" no boot) — três tentativas de correção
diferentes não mudaram nada, byte a byte, provando que não era isso; (2) achou que reposicionar
escolas longe de rampa de platô íngreme bastava, usando a FÓRMULA de relevo pra decidir — passou
num teste de 30/30 escolas, foi deployado, e o usuário reportou o MESMO bug de novo (a fórmula não
bate com a malha real do planeta perto de rampa íngreme, então o teste não pegava o próprio erro).
**Causa raiz de verdade**: `settleMeshOnTerrain` incluía o TELHADO (beiral largo, não toca o chão)
e o PROFESSOR (deslocado do centro, tem seu próprio chão) na decisão de quanto descer o prédio
INTEIRO — os dois "vazavam" pra fora da pegada real das paredes e distorciam a conta. Corrigido
excluindo os dois da amostragem (`excludeFromSampling` em `settleMeshOnTerrain`) e trocando a busca
de posição mais plana pra usar raycast físico real em vez da fórmula. **Verificado exaustivamente
em 30/30 escolas** (folga média subiu de negativa/enterrada pra 0,86 de um máximo de 1,10) e
**confirmado pelo próprio usuário testando de novo**: "testei denovo agora ficou certo".

Logo em seguida, o usuário reportou um bug RELACIONADO **que ficou SEM RESOLVER**: morros/platôs
aparecendo invisíveis ("as casas que estão sobre o morro aparecem flutuando no espaço"). Causa
identificada: a malha do planeta (só 48 segmentos) dobra alguns triângulos sobre si mesma nas
rampas mais íngremes, invertendo a ordem de enrolamento — com culling de face traseira ligado
(padrão do material, nunca desligado pro planeta, diferente de outros materiais deste arquivo),
esses triângulos ficam invisíveis. Tentativa de correção: `planetMat.backFaceCulling = false`,
confirmada por A/B ao vivo NUM cenário de teste. **Mas o usuário testou de novo no local real e o
morro CONTINUA invisível.** Um carimbo de build foi adicionado ao HUD (`__BUILD_STAMP__`, a pedido
do usuário) e confirmou que ele está testando a versão certa — não é cache. Fui até o local exato
do print dele (mesmos números de escola visíveis) usando essa mesma versão e não consegui
reproduzir — tudo sólido do meu lado. Suspeita: algo específico do aparelho/GPU do usuário, ou um
buraco de geometria real (não só culling) visível só de um ângulo específico. Perguntei se dá pra
ANDAR através do buraco e qual aparelho ele usa — **sem resposta**; usuário pediu pra seguir pro
próximo laboratório. **Esse bug fica em aberto, não resolvido.**

Um diagnóstico temporário (`ENTERRADAS:...`) foi deixado no HUD, sempre visível inclusive em
produção, pra conseguir dado real do aparelho do usuário sem ferramenta de desenvolvedor — precisa
ser removido num próximo laboratório depois de confirmação continuada de que o afundamento não
voltou. Meta de "escolinhas menores" (tamanho) segue em aberto. Ver
`labs/lab-95-mais-missoes-e-escolinhas-menores/CONTEXT.md` pra timeline completa (vale a leitura
completa — tem a lição de por que um teste "passou" duas vezes antes de a correção estar realmente
certa, e as perguntas pendentes sobre o bug de morros invisíveis).

**Pedido maior do usuário (2026-08-24), dividido em vários laboratórios — TODOS OS 4 ITENS
CONCLUÍDOS** (registrado aqui como histórico):
1. Dashboard de progresso + lojinha responsiva → **lab-91, concluído**: painel em `/familia` lê
   `localStorage` local (mesmo aparelho/navegador da criança, sem mudança de arquitetura, sem
   dado de criança saindo do aparelho); `.avatar-shop-tab`/`.avatar-shop-action` corrigidos pro
   `[MUST]` de 44×44px (`docs/prompts/02-design-profissional.md`); abas com fade de borda em vez
   de corte de texto. Ver `labs/lab-91-dashboard-de-progresso-e-lojinha-mobile/CONTEXT.md`.
2. Mais itens colecionáveis (free + assinatura) → **lab-92, concluído**: novo eixo "Óculos"
   (`equippedGlassesId`, mesmo padrão do chapéu) — 2 itens free (moeda) + 2 exclusivos de
   assinante. Achado: `docs/plano-comercial-backend.md` já especificava esse eixo pra Fase E e
   nunca tinha sido construído. Verificado ao vivo inspecionando `window.__playerFigure.
   glassesMeshes` direto (câmera do preview 3D não girava no ambiente de automação — inspeção de
   cena foi mais confiável que screenshot). Visibilidade multiplayer NÃO testada ao vivo com duas
   abas (só paridade de código com o chapéu, já comprovado desde o lab-73) — ver
   `labs/lab-92-oculos-novo-eixo-de-colecionaveis/CONTEXT.md`.
3. "Centro de estudo"/carteira onde o boneco senta + acessa catálogo de conquistas → **lab-93,
   concluído**: carteira fixa perto do spawn (mesmo padrão das escolinhas), gatilho de proximidade
   abre um `AchievementsPanel` novo (reaproveita CSS de `.quest-list` sem nada novo), pose sentada
   congelada nos pivôs do boneco. **Achado importante**: a primeira versão gateava o bloco inteiro
   de física/input por `sittingAtDesk`, o que travava o jogador na carteira PRA SEMPRE (nem
   `RESET_DISTANCE` conseguia disparar, já que a posição parava de atualizar) — corrigido gateando
   só a recalculagem da pose, não física/input/posição. Ver
   `labs/lab-93-carteira-de-estudos-e-conquistas/CONTEXT.md` pro relato completo.
4. Brinde ao vencer o chefe de Marte (ETs + robô) → **lab-94, concluído**. Achado: não existe
   "chefe" de Marte — só os 6 inimigos regulares já existentes (3 ET + 3 robô); o pedido real é
   "derrotar todos", não uma luta de chefe nova. Virou um chapéu exclusivo ("Coroa de Herói de
   Marte" 🪐, `marsRewardOnly` em `hats.ts`) desbloqueado uma única vez ao limpar Marte pela
   primeira vez, nunca comprável com moeda (mesma proteção que já existe pra itens de assinante).
   Verificado ao vivo com um atalho de QA temporário (removido antes do commit) que mata os 6
   inimigos de uma vez — toast "Marte limpo!" + lojinha atualizando na hora confirmados. Ver
   `labs/lab-94-brinde-de-marte/CONTEXT.md`.
Último concluído: labs/lab-94-brinde-de-marte/ — ver acima.

Último antes desse: labs/lab-90-corrige-bypass-de-assinatura-local/ (G6, metade "bypass": um `401`
do `/entitlement` — o servidor recusando explicitamente um token inválido/forjado — era tratado
igual a uma falha de rede em `useEntitlement.refresh()` e descartado, então editar `localStorage`
manualmente pra `active: true` liberava todo cosmético de assinante PERMANENTEMENTE, mesmo com a
revalidação rodando certinho a cada sessão. Corrigido distinguindo 401 (rejeição autoritativa,
sobrescreve o cache) de outras falhas (rede/5xx, continua preservando o cache — filosofia
"funciona offline" preservada). Decisão pura extraída e testada
(`shouldTrustCachedEntitlementOnFailure`, 34 testes no total). Verificado ao vivo contra o Worker
de produção real (não mockado): token forjado injetado via `localStorage` foi corrigido sozinho
pra `active: false` no reload, lojinha mostrou os itens de assinante corretamente bloqueados.
Deploy em produção feito (`npx vercel --prod --yes`). A outra metade de G6 — progresso pago sem
backup/restauração — ficou explicitamente fora de escopo, precisa de conversa de produto/
privacidade própria antes de qualquer implementação. Ver
`labs/lab-90-corrige-bypass-de-assinatura-local/CONTEXT.md`.)
Contexto do laboratório anterior: labs/lab-94-brinde-de-marte/CONTEXT.md

**Ticket de suporte aberto com a Cloudflare (2026-08-24)** sobre o binding nativo de Rate Limiting
não bloquear nada em produção (achado do lab-88) — aguardando resposta. Não é bloqueador: as rotas
críticas já têm defesa verificada que não depende desse binding (ver `labs/
lab-88-protecao-contra-sobrecarga/CONTEXT.md`).

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

**G3 (lab-88), G4/G5 (lab-89) resolvidos. G6 parcialmente resolvido (lab-90). G7 resolvido
(lab-97). G8 resolvido (lab-96)**: o bypass de assinatura via `localStorage` está corrigido; a
falta de backup/restauração de progresso pago continua em aberto de propósito (precisa de conversa
de produto/privacidade, ver `labs/lab-90-.../CONTEXT.md`). G7 (token de pareamento sem `jti`/
revogação/limite de aparelhos) foi resolvido no lab-97, e a UI de gerenciar aparelhos individuais
(listar + revogar um específico) foi resolvida no lab-100 — **G7 está agora COMPLETO** — ver
`labs/lab-97-revogacao-token-pareamento/CONTEXT.md` e
`labs/lab-100-gerenciar-aparelhos-por-familia/CONTEXT.md`. G8 (webhook do Stripe sem idempotência,
`status` do schema não cobria todos os estados reais do Stripe/Pix) foi resolvido no lab-96 — ver
`labs/lab-96-webhook-stripe-idempotencia/CONTEXT.md`, e o **job de reconciliação Stripe↔banco**
(parte de G8 que tinha ficado fora de escopo do lab-96 de propósito, por exigir Cloudflare Cron
Triggers) foi resolvido no lab-102 — **G8 está agora COMPLETO**, ver
`labs/lab-102-reconciliacao-stripe-banco/CONTEXT.md`. G9 já foi resolvido no lab-88 (só o `.md` de
origem não foi atualizado pra refletir). Da ordem de ataque de
`docs/prompts/05-escala-e-viabilidade.md` seção 7, o que resta genuinamente sem solução agora é
deploy automático a partir do CI (próximo passo natural do lab-101) e as partes de G10 deixadas de
fora de propósito. **G10 (CI + migração versionada) foi resolvido no lab-101** —
"ambiente de staging" e "rollback documentado" (as outras duas partes de G10) continuam fora de
escopo de propósito, ver `labs/lab-101-ci-e-migracao-versionada/CONTEXT.md`. **G11 está agora
COMPLETO**: a parte de ALARME DE COTA foi resolvida no lab-98 (contador autocontado no relay)
e a parte de eventos de produto/retenção D1-D7 (`prompt.md` §12) foi resolvida no lab-99 (tabela
`product_events`, `POST /events`, `GET /admin/metrics`) — ver
`labs/lab-98-alarme-de-cota/CONTEXT.md` e `labs/lab-99-analytics-de-produto/CONTEXT.md`.

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

Para retomar o trabalho numa nova sessão, leia primeiro `labs/lab-102-reconciliacao-stripe-banco/
CONTEXT.md` (último laboratório concluído) e, se for mexer em multiplayer/escala,
`docs/prompts/05-escala-e-viabilidade.md` (leia o adendo no topo primeiro — os números do corpo do
documento estão desatualizados em 20x, ver `labs/lab-86-correcao-orcamento-cota/CONTEXT.md`).
