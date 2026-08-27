# Contexto — Laboratório 103 — NPS de responsáveis (resto de G11 / prompt.md §12)

Preenchido em: 2026-08-27
Commit inicial → final: 71eb65b104a963f5cb0bc0c7783fbfdf778c3cf1..HEAD

## O que foi feito
Fechou o último item de `prompt.md` §12 (métricas de product-market fit) que ainda faltava — D1/D7/
sessão/quests já tinham sido resolvidos no lab-99, NPS ficou de fora de propósito por ser um
mecanismo diferente (formulário direto ao responsável, não telemetria de evento anônima). Escolhido
pelo usuário logo após o lab-102.

- **`app/server-accounts/migrations/0002_nps_responses.sql`** (novo): tabela `nps_responses`
  (`id` uuid, `family_account_id`, `score` int com `check (score between 0 and 10)`, `comment` text
  nullable, `submitted_at`) + índice em `(family_account_id, submitted_at)`. Primeira migração de
  verdade depois do baseline do lab-101 — validou o fluxo versionado na prática: `npm run migrate`
  aplicou só o arquivo novo, `schema_migrations` registrou os dois (`0001_baseline.sql`,
  `0002_nps_responses.sql`) em ordem.
- **`app/server-accounts/src/domain.ts`**: `NPS_COOLDOWN_DAYS = 90`; `isValidNpsScore` (inteiro
  0-10); `shouldPromptForNps(lastSubmittedAt, now?)` (nunca respondeu OU cooldown vencido, aceita
  `Date` ou string — mesma lição do lab-102 sobre o driver do Neon devolver `Date`);
  `calculateNpsScore(scores)` (promotores 9-10/neutros 7-8/detratores 0-6 + score final em pontos
  percentuais, `null` sem nenhuma resposta pra não dividir por zero). 10 testes novos (total do
  Worker: 50).
- **`GET /nps/status`** e **`POST /nps`** (`index.ts`, ambos autenticados via `requireUserId`, JWT
  do RESPONSÁVEL): status devolve `{ shouldPrompt, lastSubmittedAt }`; submit valida `score`,
  corta `comment` em 1000 caracteres, insere. Novo `NPS_LIMITER` (5/60s, `wrangler.toml`) — baixo
  de propósito, autenticado e de frequência naturalmente rara (o widget só aparece a cada 90 dias).
- **`GET /admin/metrics`** (lab-99) ganhou um bloco `nps` — `calculateNpsScore` sobre os scores dos
  últimos `NPS_COOLDOWN_DAYS` dias.
- **`app/src/components/FamilyPortal.tsx`**: `NpsWidget` (novo componente) — busca `/nps/status`
  ao montar; se `shouldPrompt`, mostra `<select>` nativo de 0 a 10 (não 11 botões customizados —
  acessível/touch-friendly por padrão do navegador, sem desenhar 11 alvos de toque) + textarea de
  comentário opcional + "Enviar"/"Agora não" (dispensa só na sessão local, sem gravar nada).
  Depois de enviar, mostra "Obrigado pelo feedback! 💜". Renderizado dentro de `Dashboard`, gateado
  pela mesma condição de "Gerenciar assinatura" (`status !== 'none' && status !== 'loading'`) —
  só pergunta pra quem já teve alguma experiência real de assinatura.
- **`app/src/index.css`**: `.nps-widget`/`.nps-score-select`/`.nps-comment` (novo), reaproveitando
  o cartão `.pairing-code-box`.
- **Deploy em produção**: migração aplicada, Worker (com `NPS_LIMITER`) e frontend deployados.
- **Testado ao vivo, de ponta a ponta, contra produção real, usando a conta REAL do próprio
  usuário** (sessão de navegador autenticada via extensão Chrome, mesmo padrão do lab-100 — estes
  endpoints exigem um JWT de responsável que nenhum script consegue forjar): o widget apareceu no
  portal de verdade (`shouldPrompt: true`, nunca respondido antes); score 9 + comentário de teste
  preenchidos e enviados pela UI React de verdade (via `Object.getOwnPropertyDescriptor` +
  `dispatchEvent` pra disparar o `onChange` controlado, já que `<select>`/`<textarea>` não aceitam
  `.value =` direto num componente React controlado); tela de "Obrigado" confirmada visualmente.
  Em seguida, executado DENTRO da própria aba autenticada (o JWT nunca saiu do navegador):
  `GET /nps/status` → `shouldPrompt: false` com `lastSubmittedAt` preenchido; `POST /nps` com
  4 scores inválidos (`-1`, `11`, `7.5`, `"seven"`) → `400` nos 4; `GET /nps/status`/`POST /nps`
  sem token → `401` nos 2. `GET /admin/metrics` (com secret) devolveu
  `nps: {totalResponses: 1, promoters: 1, passives: 0, detractors: 0, score: 100}` — batendo
  exatamente com o esperado pra um único score 9 (promotor). Resposta de teste apagada do banco
  ao final.

## Decisões técnicas tomadas
- **Cooldown decidido pelo SERVIDOR (`GET /nps/status`), não por `localStorage`** — é sobre a
  FAMÍLIA (uma fonte de verdade única), não o aparelho/navegador; um responsável que troque de
  navegador ou limpe o cache não veria o widget de novo cedo demais por engano, e vice-versa.
- **`<select>` nativo em vez de 11 botões 0-10 customizados** — acessível/touch-friendly por
  padrão do navegador sem precisar desenhar 11 alvos de toque separados (requisito de
  `docs/prompts/02-design-profissional.md`), mantendo o widget genuinamente "curto"
  (`prompt.md` §12) tanto em código quanto em uso.
- **Gateado por `status !== 'none' && status !== 'loading'`** (a mesma condição de "Gerenciar
  assinatura"), não por `canPair` — faz sentido perguntar "recomendaria?" pra qualquer família que
  JÁ teve alguma experiência de assinatura (ativa, em trial, atrasada ou cancelada), não só quem
  está pareando um aparelho no momento.
- **`nps_responses` é append-only, sem "uma resposta por família" forçada no schema** — o cooldown
  de 90 dias já é reforçado pela UI (`shouldPromptForNps`); manter histórico completo permite ver
  tendência ao longo do tempo, e nada impede uma resposta manual fora do ciclo normal se um dia
  fizer sentido (ex.: via suporte).
- **Verificação ao vivo simulando digitação real na UI React**, não só chamadas de API diretas —
  setar `.value` diretamente num `<select>`/`<textarea>` controlado por React não dispara o
  `onChange` (React ignora a mudança do DOM feita por fora); usar o *setter* nativo do protótipo
  (`Object.getOwnPropertyDescriptor(...).set`) seguido de `dispatchEvent(new Event('change'/
  'input', {bubbles: true}))` é o jeito correto de simular uma interação real do usuário em um
  componente controlado — achado técnico útil pra qualquer teste ao vivo futuro de formulário
  React deste portal.

## Pendências / dívidas conhecidas
- **Sem e-mail/lembrete ativo pedindo NPS** — só o widget passivo no portal, mesma filosofia de
  "log visível, sem alerta ativo" dos labs 98/102. Sem canal de notificação configurado (Resend é
  Fase F do plano comercial).
- **Sem segmentação de NPS** (por tempo de assinatura, cosmético comprado, etc.) — só a métrica
  agregada simples que `prompt.md` §12 pede.
- **`GET /admin/metrics` continua JSON puro** — nenhum dashboard visual, mesma decisão do lab-99.

## Funcionalidades planejadas que NÃO foram concluídas
- Nenhuma — todos os itens de `FEATURES.md` foram concluídos e verificados (código, testes,
  migração, deploy, teste ao vivo ponta a ponta contra produção real, incluindo os casos de erro/
  segurança).

## O que o próximo laboratório deve desenvolver
`prompt.md` §12 (métricas de product-market fit) está agora COMPLETO (lab-99 + lab-103). Itens
conhecidos que continuam em aberto:
- **Deploy automático a partir do CI** — próximo passo natural depois do lab-101 (CI só roda
  testes hoje); precisa de decisão sobre quais secrets (Vercel/Cloudflare) ficam no GitHub Actions.
- **Ambiente de staging separado** e **rollback documentado** — partes de G10 deixadas de fora do
  lab-101 de propósito.
- **Bug de morros invisíveis** (lab-95) — segue bloqueado esperando resposta do usuário sobre
  aparelho/GPU e se o buraco é só visual ou também de colisão.

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`
- Como rodar/verificar o que foi construído neste laboratório:
  - `cd app/server-accounts && npm run test` — 50 testes de domínio (10 novos deste laboratório).
  - `cd app && npm run test` — 39 testes do app principal, sem regressão.
  - `npx tsc --noEmit` (em `app/server-accounts/`) e `npx tsc -b` (em `app/`) — typecheck limpo.
  - Produção: fazer login em `https://missaoaprendizado.com/familia` com uma conta que já teve
    assinatura — o widget de NPS aparece logo abaixo de "Vincular com o jogo" (só se ainda não
    tiver respondido nos últimos 90 dias).
  - `curl -H "x-admin-secret: <segredo>"
    https://missao-aprender-accounts.rafaelvs.workers.dev/admin/metrics` inclui o bloco `nps`.
  - Worker e frontend já deployados, migração já aplicada — não é preciso rodar `npm run
    migrate`/`npm run deploy`/`vercel --prod` de novo pra ver o efeito deste laboratório.
