# Contexto — Laboratório 81 — backend comercial, Fase D (pareamento com o jogo)

Preenchido em: 2026-08-24
Commit inicial → final: ca719138ebecae9e8e343375eda15c3971d69e55..5a32d13

## O que foi feito
- **`app/server-accounts/src/index.ts`** ganhou três rotas novas:
  - `POST /pairing/generate` (autenticado com o JWT do Neon Auth, igual `/checkout`) — gera um
    código numérico de 6 dígitos (`generatePairingCode`), insere em `pairing_codes` com
    `expires_at` 15 minutos à frente, com até 5 tentativas em caso de colisão de chave primária.
  - `POST /pairing/redeem` (sem autenticação — é a criança chamando, sem conta) — valida o código
    (existe, não expirado, não resgatado ainda), marca `redeemed_at = now()`, e assina um token de
    entitlement novo (`jose.SignJWT`, HS256, `sub` = `family_account_id`, validade 180 dias).
  - `GET /entitlement` (Bearer = token de entitlement, **não** o JWT do Neon Auth — são dois
    tokens diferentes que passam pelo mesmo header `Authorization`) — verifica a assinatura HMAC,
    consulta o status mais recente em `subscriptions` pra aquela família, responde
    `{ active, expiresAt }` com a verdade atual (não com o que estava no token na hora de emitir).
  - Novo secret `ENTITLEMENT_SECRET` (gerado com `crypto.randomBytes(32)`, configurado via
    `wrangler secret put` em produção e em `.dev.vars` local).
- **`app/src/state/entitlementStorage.ts`** (novo) — `loadEntitlement`/`saveEntitlement`/
  `clearEntitlement`, mesmo padrão de `state/storage.ts` (perfil/progresso), guardando só
  `{ token, active, expiresAt }` em `localStorage`, chave própria (`jogo-educativo:entitlement`).
- **`app/src/state/useEntitlement.ts`** (novo) — hook de domínio, desacoplado de UI/Babylon
  (`docs/prompts/03-arquitetura-sistema.md` §1): `redeemCode(code)` troca o código por um token
  via `/pairing/redeem` e já revalida em seguida; `refresh()` chama `/entitlement` em background
  (no mount, se já existir um token salvo) e SÓ atualiza o estado numa resposta explícita do
  servidor — erro de rede mantém o cache local, mesma filosofia "funciona offline" do PWA.
- **`app/src/components/PairingScreen.tsx`** (novo) — tela que a criança usa pra digitar o
  código, reaproveitando as classes `.modal-overlay`/`.modal`/`.field`/`.primary-button` já
  existentes. Três estados visuais: formulário (digitar código), "código aceito" (acabou de
  parear agora) e "já vinculada" (entitlement já estava ativo quando a tela abriu).
- **Botão novo no HUD** (`app/src/world3d/HudHeader.tsx`, prop `onOpenPairing`, ícone 🔗,
  aria-label "Vincular assinatura da família") — passado por `World3D.tsx` como prop simples
  (não precisou do padrão de `useRef` que `onOpenShop` usa, porque não é chamado de dentro da
  cena 3D, só do próprio HUD React).
- **`app/src/App.tsx`** — `useEntitlement()` chamado em `GameApp` (antes dos `return` condicionais,
  regra de hooks), novo estado `showPairing`, `PairingScreen` renderizado condicionalmente,
  incluído em `suspendTriggers` (pausa o mundo 3D enquanto o modal está aberto, mesmo padrão dos
  outros overlays).
- **`FamilyPortal.tsx`** ganhou `PairingCodeGenerator` (só aparece quando `status` é `active` ou
  `trialing`) — botão "Gerar código", mostra o código com `letter-spacing` grande e uma contagem
  regressiva mm:ss (`setInterval` de 1s, limpo no `useEffect` cleanup), troca pra "Gerar novo
  código" quando expira.
- **CSS novo** (`app/src/index.css`): `.pairing-code-box`/`.pairing-code`, reaproveitando as
  variáveis de design já existentes (`--primary`, `--primary-dark`, `--card`).
- **Testado ao vivo, fim a fim** (não só em dev, contra o Worker e banco reais de produção):
  criar conta de teste → assinar (Stripe test card) → gerar código no portal → abrir o jogo numa
  aba separada, sem nenhuma conta → digitar o código na tela nova → confirmado
  "Assinatura da família já vinculada!" e `localStorage` com `active: true` + `expiresAt` real →
  recarregar o jogo confirma persistência → cancelar a assinatura via API do Stripe
  (`DELETE /v1/subscriptions/:id`) → recarregar o jogo confirma `active: false` na próxima
  revalidação em background → tentar resgatar o mesmo código de novo confirma rejeição
  ("código inválido ou expirado", código já tinha `redeemed_at`). Conta e dados de teste apagados
  depois, mesmo padrão dos labs anteriores.

## Decisões técnicas tomadas
- **Token de entitlement assinado com segredo próprio (HMAC/HS256), não reaproveitando o JWKS do
  Neon Auth** — o Neon Auth só sabe assinar tokens pra usuários responsáveis que têm conta lá; a
  criança nunca tem conta, então precisa de um token emitido pelo NOSSO Worker, verificável só por
  ele mesmo. Simétrico (HS256) é suficiente aqui porque quem assina e quem verifica é sempre o
  mesmo serviço — não há motivo pra complexidade de chave assimétrica.
- **`GET /entitlement` consulta o banco a cada chamada, não confia só no que está dentro do
  token** — o token prova "esse dispositivo foi pareado com essa família", mas não prova "a
  assinatura ainda está ativa hoje". Validade longa (180 dias) no token + verificação de status
  em tempo real no banco é o que permite ao jogo saber a verdade atual sem precisar de um novo
  pareamento toda vez que o responsável cancela ou reativa a assinatura.
- **Código de 6 dígitos, sem letras, sem caractere especial** — critério é ser digitável por uma
  criança pequena num teclado touch, não ser resistente a força bruta; a segurança de verdade está
  na janela curta de validade (15min) e no uso único, não no tamanho do espaço de busca.
- **`onOpenPairing` passado como prop simples em `World3D.tsx`, sem o padrão `useRef` usado por
  `onOpenShop`** — esse padrão existe só porque a lojinha também abre a partir de um gatilho
  DENTRO da cena Babylon (andar perto do balcão), que precisa de uma referência estável pra não
  capturar uma closure desatualizada. O pareamento só abre a partir do próprio HUD React, que já
  re-renderiza normalmente — não precisa da mesma solução.
- **Geração de código no portal só aparece com assinatura ativa/em teste** — pra não confundir um
  responsável que ainda não assinou com uma funcionalidade que não vai desbloquear nada ainda
  (nenhum cosmético é gateado de verdade até a Fase E).

## Pendências / dívidas conhecidas
- **Nenhuma UI pra "desvincular" o jogo** — `useEntitlement` já expõe `unpair()`, mas não há botão
  em lugar nenhum que o chame. Baixo impacto agora (nada é gateado ainda), mas vale adicionar
  quando a Fase E tornar isso mais visível (ex. família que troca de dispositivo).
- **Código de pareamento não é invalidado quando um novo é gerado** — gerar um segundo código não
  invalida o primeiro (ambos ficam válidos até expirar ou serem usados). Não é um risco real dado
  a janela de 15min, mas é uma simplificação consciente, não descoberta por acidente.

## Funcionalidades planejadas que NÃO foram concluídas
Nenhuma das planejadas pra Fase D — todas concluídas e testadas ao vivo.

## O que o próximo laboratório deve desenvolver
- **Fase E — Cosmético de verdade gateado**: 1-2 itens novos na lojinha (`AvatarShop.tsx`,
  catálogos em `app/src/data/`) marcados como exclusivos de assinante, consultando
  `entitlement.active` (já disponível via `useEntitlement()`) pra decidir se aparecem
  desbloqueados. Decisões de produto ainda pendentes do usuário: lista exata dos itens exclusivos,
  e se a "biblioteca de material didático" mencionada por ele fica de fora do gate (recomendado,
  ver `docs/plano-comercial-backend.md`).

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`.
- Worker em produção: `https://missao-aprender-accounts.rafaelvs.workers.dev` — rotas
  `/health`, `/checkout`, `/subscription`, `/pairing/generate`, `/pairing/redeem`,
  `/entitlement`, `/webhooks/stripe`.
- Jogo em produção: `https://app-two-flax-92.vercel.app` — HUD com o botão 🔗 novo; portal
  `/familia` com o gerador de código na Dashboard (visível só com assinatura ativa/em teste).
- Como verificar: assinar em `/familia` (Stripe test mode), gerar um código, abrir o jogo (pode
  ser noutro navegador/aba anônima, já que a criança não tem conta), clicar no 🔗 do HUD e digitar
  o código — deve confirmar o vínculo na hora.
