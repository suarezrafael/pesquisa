# Laboratório atual

**EM ANDAMENTO: labs/lab-116-corrige-camera-decolagem-foguete/** — pedido do usuário: "a viagem
do foguete pra ida pros outros planetas ta um pouco bugada a camera, fica uma visao dentro da
terra. na volta pra terra ta ok." Causa raiz encontrada: a câmera do foguete fica "atrás da cauda"
(pedido do lab-61), o que durante a decolagem (nariz travado apontando pra longe do planeta de
partida) aponta a câmera DIRETO PRA DENTRO do planeta principal (raio 13) — só é visível nele
porque é o único corpo com `backFaceCulling = false` (lab-95). Ver
`labs/lab-116-corrige-camera-decolagem-foguete/FEATURES.md` pro escopo completo.

Último concluído: labs/lab-115-escolinhas-sistema-solar/ — pedido do usuário: "crie escolinhas com
perguntas tbm nos planetas novos para ampliar a elevação dos níveis, e quanto mais longe o planeta
mais alto deve ser o nível do usuário." Cada um dos 6 planetas novos da frente Sistema Solar
(Mercúrio/Vênus/Júpiter/Saturno/Urano/Netuno) ganhou uma escolinha com pergunta de astronomia REAL
sobre o próprio planeta (`data/planetQuests.ts`, novo) — XP/moeda de verdade via
`applyPlanetQuestCompletion` (`progression.ts`, novo), isolado em `completedPlanetQuestIds`
(NUNCA em `completedQuestIds`/badges do planeta principal — mesmo espírito de isolamento do Quiz
Surpresa, mas com XP de verdade, já que o pedido é explicitamente "ampliar a elevação dos níveis").
Nível mínimo pra viajar (`requiredLevel` em `DESTINATION_PLANETS`) escalando com a distância REAL
ao Sol: Mercúrio=2, Vênus=3, Júpiter=5, Saturno=7, Urano=9, Netuno=11 — Marte e o planeta principal
ficam de fora do requisito (já alcançáveis sem restrição desde antes desta frente, mudar isso agora
alteraria comportamento já em produção). Escolinha simplificada (totem + professor, não a
estrutura completa com paredes/telhado do planeta principal) — os 6 planetas são esferas
PERFEITAS, sem risco de "escolinha enterrada" (bug do lab-95, específico do relevo irregular do
planeta principal). `PlanetPickerPanel.tsx` mostra 🔒 + nível necessário nos planetas ainda
bloqueados (reaproveita `.avatar-shop-tag.subscription-lock` já existente, zero CSS novo).
**Verificado ao vivo**: em nível 1, só Marte tem "Viajar" (os 6 novos mostram cadeado com o nível
certo); depois de subir pra nível 2 respondendo 2 missões reais do planeta principal, Mercúrio
libera "Viajar" enquanto Vênus+ continuam bloqueados; viagem completa até Mercúrio, escolinha
"Escolinha de Mercúrio" abriu certinho pela proximidade, resposta correta creditou +30 XP/+16
moedas (bônus de Semana da Recompensa Dupla 2x aplicado sobre 15 XP/8 moedas base) — confirmado por
leitura direta do `localStorage`: `completedQuestIds` do planeta principal INTACTO (só `q01`/`q02`,
a escolinha de planeta não entrou ali), `badges` intacto, `completedPlanetQuestIds: ["planet-
mercurio"]` isolado corretamente; reaproximar do totem já respondido não reabre o modal (idempotente).
`npm run test`: 47/47 (3 testes novos). `npm run build` sem erros. **Nota de transparência**: a
verificação usou o perfil de dev local "EspertoFoguete81" (criado 2026-08-20, antes desta sessão) —
seu progresso avançou de verdade (XP 0→70, moedas 2→38) pra alcançar nível 2 legitimamente; uma
tentativa de setar XP direto via `localStorage` foi bloqueada pelo classificador de modo automático
(mesmo tipo de proteção contra adulteração de save identificada no lab-90), então não foi possível
restaurar o valor original depois — save local de dev, sem dado de produção/banco envolvido. Ver
`labs/lab-115-escolinhas-sistema-solar/CONTEXT.md`.

Antes desse: labs/lab-114-sistema-solar-urano-netuno/ — ÚLTIMO laboratório da frente "Sistema
Solar": os dois gigantes de gelo, feitos juntos (incrementos pequenos sobre o padrão já
estabelecido). Urano com faixas rotacionadas 90° na MALHA do chão (`Quaternion.RotationAxis`,
nunca no `landingUp` — física/voo do foguete intocados), reflete o eixo de rotação real bem
tombado (~98°); Netuno com Grande Mancha Escura (decalque fixo, análogo à Mancha Vermelha de
Júpiter). **Com isso, os 8 planetas reais do sistema solar estão completos no jogo** — frente
"Sistema Solar" (labs 110-114) encerrada. **Verificado ao vivo**: seletor mostra os 7 destinos
(3 linhas de grade); Urano com viagem de IDA E VOLTA completa confirmada (posição + rotação da
malha conferida via `rotationQuaternion`, batendo exatamente com a rotação de 90° esperada);
Netuno com viagem de ida confirmada (chão/Mancha/moedas presentes, azul profundo nítido no
screenshot). Sem erro de console. `npm run test`: 44/44. `npm run build` sem erros. Ver
`labs/lab-114-sistema-solar-urano-netuno/CONTEXT.md`.

Antes desse: labs/lab-113-sistema-solar-saturno/ — quarto planeta novo da frente "Sistema
Solar", segundo gigante gasoso. Reaproveita a técnica de faixas do lab-112 (Júpiter, paleta mais
pálida/dourada) + ANEL novo (`CreateTorus` achatado no eixo Y, `scaling.y=0.02`, translúcido,
decorativo, sem física) — mesma primitiva do anel sonoro de combate de Marte, escala bem maior.
Sem rocha/cratera/combate. Raio 17 (um pouco menor que Júpiter=20), centro `(-58,0,58)`.
**Verificado ao vivo**: seletor mostra os 5 destinos; viagem completa pra Saturno confirmada por
inspeção da cena (posição do avatar, chão/anel/8 moedas presentes) e por medição direta da
bounding box do anel (disco de ~55 unidades de diâmetro, batendo com o cálculo esperado) — o
screenshot não mostrou o anel claramente por ângulo de câmera (perto do polo de pouso, anel no
equador fica fora de vista ali, geometria real não bug). A correção de `keysDown['e']` travado
(achado no lab-112) funcionou de primeira nesta verificação. `npm run test`: 44/44. `npm run
build` sem erros. **Deploy real (Vercel) pendente**: usuário pediu deploy manual em produção
durante este laboratório — Vercel falhou ("Not authorized", mesma restrição de CLI do lab-104,
consegue LER o projeto mas não fazer deploy). Cloudflare Pages paralelo atualizado DUAS vezes
nesta sessão (até Júpiter, depois até Saturno) —
https://missao-aprender-jogo.pages.dev tem tudo até este laboratório. Ver
`labs/lab-113-sistema-solar-saturno/CONTEXT.md`.

Antes desse: labs/lab-112-sistema-solar-jupiter/ — terceiro planeta novo da frente "Sistema
Solar", primeiro gigante gasoso. Faixas horizontais proceduralmente geradas (`DynamicTexture`,
técnica nova, reaproveitável em Saturno/Urano/Netuno) + Grande Mancha Vermelha (decalque fixo, não
sorteado). Sem rocha/cratera (Júpiter não tem superfície sólida), sem combate. Raio 20 (maior que o
planeta principal=13 — é o maior planeta do sistema solar de verdade), centro diagonal
`(58,0,-58)`. **Verificado ao vivo**: seletor mostra os 4 destinos (quebra pra 2ª linha de grade);
viagem completa pra Júpiter confirmada por inspeção da cena (posição do avatar batendo com
raio+avatar, textura de faixas presente, Mancha Vermelha e 8 moedas presentes) e visualmente
(faixa de cor clara no screenshot). **Achado de ferramenta durante a verificação (não bug do
produto)**: `keysDown['e']` pode ficar travado `true` por um par keydown/keyup incompleto de uma
automação anterior, fazendo o interact nunca disparar silenciosamente — corrigido despachando
`keyup` explícito antes do teste, registrado na memória do projeto. `npm run test`: 44/44.
`npm run build` sem erros. Ver `labs/lab-112-sistema-solar-jupiter/CONTEXT.md`.

Antes desse: labs/lab-111-sistema-solar-venus/ — segundo planeta novo da frente "Sistema
Solar" (continuação do lab-110). Superfície vulcânica alaranjada + atmosfera translúcida
amarelo-esbranquiçada decorativa (característica visual mais reconhecível de Vênus, sem física,
sem afetar luz/céu globais), sem cratera nenhuma (ao contrário de Mercúrio — decisão deliberada,
vulcanismo real de Vênus apaga crateras), sem combate. Raio 7 (entre Marte=6 e o planeta
principal=13), centro no eixo Y `(0,58,0)` — mutuamente ortogonal a Marte (Z) e Mercúrio (X). Zero
mudança na arquitetura genérica do lab-110 (`boardRocket`/`landRocket`/`PlanetPickerPanel`) — só
registrar constantes + `buildVenusIfNeeded()` + um `case` no dispatcher. **Verificado ao vivo**: os
3 destinos aparecem no seletor; viagem de IDA pra Vênus confirmada por inspeção direta da cena
(posição do avatar, chão/atmosfera/rochas/moedas todos presentes, visual da atmosfera confirmado
por screenshot), sem erro de console. A viagem de VOLTA não foi confirmada ao vivo nesta sessão
(deriva de posição na automação) — risco considerado desprezível, é código genérico idêntico ao já
comprovado pra Marte/Mercúrio no lab-110. `npm run test`: 44/44. `npm run build` sem erros. Ver
`labs/lab-111-sistema-solar-venus/CONTEXT.md`.

Antes desse: labs/lab-110-sistema-solar-selecao-de-planeta/ — pedido novo do usuário: ampliar
o mundo pra incluir todos os planetas do sistema solar (hoje só tinha Marte), renderizados sob
demanda ao viajar de foguete, com um seletor de destino ao embarcar. Escopo de cada planeta novo
confirmado com o usuário: moedas escondidas, sem combate (Marte continua sendo o único com
inimigos). Primeiro de vários laboratórios — este entregou a arquitetura genérica de múltiplos
destinos (`currentPlanetId: string | null` + registro `DESTINATION_PLANETS`, substitui o antigo
`onSecondPlanet: boolean` fixo) + `PlanetPickerPanel.tsx` (seletor "Pra onde vamos?", aberto ao
embarcar no foguete principal) + Mercúrio (esfera cinza-acastanhada, crateras via decalque de
geometria, rochas, 6 moedas escondidas, sem combate). **Marte verificado ao vivo como IDÊNTICO**
ao comportamento pré-refatoração (health bar, "5 marcianos restantes", anel sonoro, estação
alienígena, tudo confirmado numa viagem de ida e volta completa) — a refatoração generalizou só o
ESTADO/dispatch, sem tocar uma linha do conteúdo de `buildMarsIfNeeded` (ex-`buildSecondPlanetIfNeeded`).
Achado de ferramenta (não do produto): a aba de automação ficava `hidden` durante os ~9s de voo,
travando o `dt` do Babylon — contornado forçando `engine._deltaTime` manualmente, técnica salva na
memória do projeto pra reuso futuro. `npm run test`: 44/44 (sem teste novo — nada aqui é lógica de
domínio pura). `npm run build` sem erros. Ver
`labs/lab-110-sistema-solar-selecao-de-planeta/CONTEXT.md`.

Antes desse: labs/lab-109-cloudflare-pages-paralelo/ — resto de Fase F, escolhido pelo usuário
entre as opções restantes de backlog. `docs/plano-comercial-backend.md` recomenda migrar a
hospedagem do front-end pra Cloudflare Pages antes do lançamento comercial (Vercel Hobby proíbe uso
comercial). Escopo confirmado com o usuário: deploy NOVO e PARALELO, sem mexer no site ao vivo nem
no DNS — `missaoaprendizado.com` continua na Vercel até uma decisão futura separada. Projeto
`missao-aprender-jogo` criado na mesma conta Cloudflare dos Workers, build publicado sem NENHUMA
mudança de código (front-end já fala com os Workers via URL absoluta, `VITE_*` embutida em tempo de
build). **Live em https://missao-aprender-jogo.pages.dev** — verificado ao vivo: onboarding, mundo
3D, 627 arquivos estáticos servidos com `200`, sem erro de console. Conectividade cruzada com os
Workers não foi 100% confirmada ao vivo (fetch direto do navegador falhou "Failed to fetch" — mas
o MESMO erro acontece a partir da origem Vercel de PRODUÇÃO já em uso, e `curl` fora do navegador
confirma o Worker saudável, `200 {"ok":true}` — conclusão: restrição do ambiente de automação desta
sessão em alcançar `*.workers.dev`, não uma falha real; CORS do Worker já é `*` desde antes). Corte
de DNS/desligar Vercel fica explicitamente como decisão e ação FUTURA do usuário, não executada
nesta sessão. Ver `labs/lab-109-cloudflare-pages-paralelo/CONTEXT.md`.

Antes desse: labs/lab-108-multiplos-perfis-por-familia/ — última das 4 frentes de backlog de
produto do lab-104 (Minha Casa completa nos labs 105-107; esta era a única restante totalmente
construível em código, sem credencial nova nem decisão que só o usuário pode tomar). Permite dois
irmãos compartilhando o mesmo tablet terem cada um seu próprio perfil/progresso — antes, o jogo
tinha um único perfil fixo por aparelho (`localStorage` sem conceito de "qual criança"). Sistema de
slots em `storage.ts` (roster + perfil ativo, chaves com id embutido), migração ADITIVA e NUNCA
destrutiva do perfil legado (chaves antigas nunca apagadas), `ProfilePicker.tsx` novo ("Quem vai
jogar?"), botão 🔁 no HUD. Assinatura/entitlement continuam por APARELHO, não por criança —
`entitlementStorage.ts` intocado de propósito. **2 bugs reais pegos e corrigidos antes/durante a
verificação, nenhum chegou a ir pro usuário**: (1) o botão de trocar perfil só aparecia com 2+
perfis já criados — beco sem saída, já que ele é a ÚNICA porta pro "+ Novo perfil"; corrigido pra
sempre visível. (2) a guarda de migração usava o id ativo (que "Trocar perfil" apaga de propósito)
em vez do roster — cada troca de perfil disparava uma SEGUNDA migração do perfil legado (nunca
apagado), duplicando dados a cada troca; corrigido pra guardar pelo roster (nunca esvaziado).
**Verificado ao vivo** num dispositivo de dev real com um perfil pré-existente ("Duda", sessão
anterior): migração não-destrutiva confirmada, segundo perfil criado e confirmado isolado (moeda/
progresso não vazam entre perfis), troca sem perda de dado dos dois lados, sem erro de console —
perfil de teste removido ao final, devolvendo o aparelho ao estado original. `npm run test`: 44/44
(sem teste novo — `storage.ts` é I/O, não lógica de domínio pura). `npm run build` sem erros. Ver
`labs/lab-108-multiplos-perfis-por-familia/CONTEXT.md`.

Antes desse: labs/lab-107-minha-casa-sets-assinante/ — os dois sets temáticos exclusivos de
assinante ("Quarto Espacial" 🚀: cama-nave/luminária-planeta/tapete de estrelas; "Jardim Encantado"
🌷: grama florida/banco de madeira/borboletas animadas), última peça de "Minha Casa" planejada em
`docs/plano-comercial-backend.md`. 6 itens novos em `furniture.ts` (`cost: 0, subscriptionOnly:
true`) — zero mudança de domínio (`unlockGeneric` já rejeitava `subscriptionOnly` desde o lab-92).
`MyHousePanel` ganhou `entitlementActive` e a mesma expressão `usable = subscriptionOnly ?
entitlementActive : owned` já usada em `AvatarShop.tsx`. 2 testes de regressão novos (suite 44/44).
**Verificado ao vivo** o estado SEM assinatura (6 itens com 👑 e "🔒 Assinantes", sem regressão nos
5 itens grátis/compráveis) — o estado COM assinatura não foi simulado ao vivo de propósito (exigiria
token real ou adulterar `localStorage`/rede do jeito que o lab-90 já identificou como bypass
perigoso); confiança vem de paridade literal com `AvatarShop.tsx`, já em produção há vários labs.
**Com isso, "Minha Casa" está completa** (casa base grátis + mobília comprável + 2 sets exclusivos)
— só falta o "modo visita" (P2, precisa de revisão de segurança infantil própria). Ver
`labs/lab-107-minha-casa-sets-assinante/CONTEXT.md`.

Antes desse: labs/lab-106-minha-casa-mobilia-compravel/ — continuação direta do lab-105:
trocou o placeholder de mobília do `MyHousePanel` por compra de verdade com moeda. Novo
`app/src/data/furniture.ts` (5 itens, 6-20 moedas, campo `subscriptionOnly?` já previsto pro
próximo passo), `Progress.unlockedFurnitureIds`, `unlockFurniture` em `progression.ts`/
`useProgress.ts` (mesmo `unlockGeneric` de chapéus/óculos, zero regra nova). `MyHousePanel`
reaproveita as classes `.avatar-shop-*` de `AvatarShop.tsx` (grade de compra, botão desabilitado
sem moeda, tag "✓ Tem") — sem conceito de "equipar" (mobília não é peça do boneco, só possuída ou
não). 3 testes novos em `progression.test.ts` (suite total 42/42). **Verificado ao vivo**
(`npm run dev` + `window.__debugTeleport`): compra desconta moeda e persiste em
`localStorage`. **Nota de transparência**: a verificação usou o perfil local real "DudaDuda"
(porta 5174) — seus `coins` foram sobrescritos pra 100 pra testar sem grind, valor original não
anotado antes da sobrescrita (perda mínima, é só save local de teste, nada em produção/banco). Os
2 conjuntos exclusivos de assinante ("Quarto Espacial", "Jardim Encantado") ficam pro próximo
laboratório desta frente. Ver `labs/lab-106-minha-casa-mobilia-compravel/CONTEXT.md`.

Antes desse: labs/lab-105-minha-casa-plot-base/ — primeira fatia de "Minha Casa"
(`docs/plano-comercial-backend.md`, catálogo Fase E, item que faltava construir). Escolhido pelo
usuário entre 4 frentes de backlog de produto (Minha Casa / Fase F Stripe produção / e-mail semanal
via Resend / múltiplos perfis por família). **Correção de arquitetura feita durante a investigação,
antes de implementar**: a premissa inicial era espaço 3D andável de verdade, mas o código real
mostrou que NENHUM prédio deste jogo tem interior andável — todo prédio/objeto interage por gatilho
de proximidade abrindo um painel 2D (escolas → quiz, carteira → conquistas, loja → lojinha). Minha
Casa seguiu o MESMO padrão: fachada sólida (`World3D.tsx`, mesma técnica de construção das
escolinhas — paredes com `PhysicsAggregate`, fundação, telhado, `settleMeshOnTerrain`) perto do
spawn (espelhada em relação à carteira de estudos), gatilho de proximidade abre `MyHousePanel.tsx`
(painel novo, reaproveita CSS de `AchievementsPanel`) com 3 itens placeholder de mobília ("chega em
um próximo laboratório"). Mobília comprável com moeda e os 2 conjuntos exclusivos de assinante
("Quarto Espacial", "Jardim Encantado") ficam para laboratórios seguintes. **Verificado ao vivo**
com `npm run dev` local + teleporte de QA (`window.__debugTeleport`, dev-only): casa visível com
rótulo 🏠, painel abre/fecha/reabre corretamente (histerese confirmada), física da parede confirmada
(`physicsBody` estático). `npm run build` (typecheck + produção) passou sem erros. Ver
`labs/lab-105-minha-casa-plot-base/CONTEXT.md` pro detalhe completo.

Último concluído (secrets pendentes — ação do usuário): labs/lab-104-deploy-automatico-ci/ — resto
de G10 (deploy automático a partir do CI). Escolhido pelo usuário logo após o lab-103, entre
deploy automático/bug de morros invisíveis/staging separado. **Decisão de fluxo confirmada com o
usuário**: gatilho é push em `main` (padrão correto), não o branch de trabalho — achado ao
investigar: `main` estava 86 commits atrás deste branch, todo laboratório 78-103 fez deploy manual
direto daqui, nunca via `main`. A partir de agora, publicar em produção exige um PR deste branch
mesclado em `main`; push direto no branch de trabalho continua só rodando os testes (lab-101,
confirmado ao vivo: passo de deploy aparece "skipped", não falha sem token). **Tentativa de criar
os 2 tokens necessários via CLI (autorizada pelo usuário) confirmada INVIÁVEL nos dois casos**:
Cloudflare (sessão OAuth sem escopo "API Tokens: Edit") e Vercel (`vercel tokens add` → `403
Cannot create tokens for this app`, sessão restrita por integração) — sem contorno seguro,
reaproveitar tokens de sessão existentes foi descartado (expiração automática + escopo excessivo).
**PR rascunho `#8`** aberto (`worktree-abstract-wobbling-owl` → `main`, 88 commits, labs 78-104) —
usuário decidiu deixar a configuração dos secrets pra depois; PR seguro de existir sem eles (CI de
PR só testa, nunca dispara deploy). Ver `labs/lab-104-deploy-automatico-ci/CONTEXT.md` pro detalhe
completo.

Último concluído: labs/lab-103-nps-responsaveis/ — resto de G11/`prompt.md` §12 (NPS de pais/
responsáveis). Escolhido pelo usuário logo após o lab-102, entre deploy automático/NPS/bug de
morros invisíveis. Diferente de `product_events` (lab-99, 100% anônimo) — o responsável já
autenticado no portal responde por conta própria, sem problema novo de privacidade infantil. Nova
tabela `nps_responses` (primeira migração de verdade depois do baseline do lab-101, validou o
fluxo versionado na prática), endpoints `GET /nps/status`/`POST /nps` (autenticados,
`NPS_LIMITER` novo), widget no portal (`<select>` nativo 0-10, não 11 botões customizados) com
cooldown de 90 dias decidido pelo SERVIDOR (não `localStorage` — é sobre a família, não o
navegador), bloco `nps` em `GET /admin/metrics`. **Testado ao vivo contra produção real usando a
conta REAL do próprio usuário** (mesmo padrão do lab-100 — endpoints exigem JWT de responsável):
score enviado pela UI React de verdade (setter nativo + `dispatchEvent` pra disparar `onChange`
num componente controlado — React ignora `.value =` direto vindo de fora), `shouldPrompt` virou
`false` depois, 4 scores inválidos rejeitados com `400`, sem token rejeitado com `401`,
`/admin/metrics` refletiu a resposta (`score: 100`, 1 promotor). **`prompt.md` §12 (métricas de
PMF) está agora COMPLETO** (lab-99 + lab-103). Ver `labs/lab-103-nps-responsaveis/CONTEXT.md` pro
detalhe completo.

Antes desse: labs/lab-102-reconciliacao-stripe-banco/ — resto de G8
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

**Projeto Cloudflare Pages `missao-aprender-jogo`** (lab-109, 2026-08-29): deploy PARALELO do
front-end, mesma conta Cloudflare dos Workers — https://missao-aprender-jogo.pages.dev. Não é
produção ainda (Vercel continua sendo o site ao vivo, `missaoaprendizado.com` não aponta pra cá) —
existe pronto e verificado, esperando decisão do usuário de fazer o corte de DNS de verdade (ver
`labs/lab-109-cloudflare-pages-paralelo/CONTEXT.md`). Publicado manualmente
(`wrangler pages deploy dist --project-name=missao-aprender-jogo --branch=main`, de dentro de
`app/`) — sem automação de CI ainda, de propósito. **Reaproveitado como via alternativa de deploy**
durante os labs 112-113 (2026-08-29), depois de o deploy direto no Vercel falhar com "Not
authorized" — atualizado duas vezes nesta sessão (até Júpiter, depois até Saturno), então está
sempre um passo à frente do site real enquanto o bloqueio do Vercel não for resolvido.

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

Para retomar o trabalho numa nova sessão, leia primeiro
`labs/lab-115-escolinhas-sistema-solar/CONTEXT.md` (último laboratório concluído — os 6 planetas
novos do Sistema Solar ganharam escolinha de astronomia + nível mínimo por distância; a frente
"Sistema Solar" em si, incluindo essa camada de progressão, está completa conforme pedido pelo
usuário). Itens de backlog em aberto continuam os mesmos de antes (todos esperando ação do
usuário, sem mudança neste laboratório). **Deploy real (Vercel) pendente**: usuário pediu publicar
em produção durante o lab-113 — deploy direto no Vercel (domínio real) falhou com "Not authorized"
(mesma restrição de CLI do lab-104: sessão consegue LER o projeto Vercel, não consegue fazer
deploy nele — provável limite de segurança da integração, não uma configuração errada). Cloudflare
Pages paralelo (lab-109, https://missao-aprender-jogo.pages.dev) foi atualizado pela última vez ao
final do lab-114 — ainda não inclui as escolinhas/nível mínimo deste laboratório (redeploy pendente
se o usuário quiser esse ambiente atualizado). O deploy real continua exigindo o usuário rodar
`npx vercel --prod --yes` na própria máquina, ou configurar os secrets do lab-104 e mesclar o PR
`#8`. Lembrar também que
`labs/lab-104-deploy-automatico-ci/CONTEXT.md` continua com pendências do
usuário: secrets `VERCEL_TOKEN`/`CLOUDFLARE_API_TOKEN` e merge do PR `#8` ainda não feitos. Se for
mexer em multiplayer/escala,
`docs/prompts/05-escala-e-viabilidade.md` (leia o adendo no topo primeiro — os números do corpo do
documento estão desatualizados em 20x, ver `labs/lab-86-correcao-orcamento-cota/CONTEXT.md`).
