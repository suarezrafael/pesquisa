# Laboratório 119 — Relatório semanal de progresso por e-mail (Fase F)

Status: concluído (pendente `RESEND_API_KEY` do usuário pro envio de verdade)
Início: 2026-08-29
Fim: 2026-08-29
Commit inicial: abcf848fd07b884549f6c307f34a1b6b55d17c01

## Objetivo do laboratório
Escolhido pelo usuário entre 3 opções de backlog. Fase F do plano comercial
(`docs/plano-comercial-backend.md`): responsáveis assinantes recebem um resumo semanal por e-mail
do progresso do filho (nível, missões concluídas, moedas, emblemas), via Resend (free tier).

## Investigado antes de planejar
- **Achado arquitetural central**: `docs/plano-comercial-backend.md` (linha ~109) documenta
  explicitamente "nenhuma tabela guarda nome/e-mail/progresso da criança — isso continua só no
  `localStorage` dela". O painel de progresso já existente em `/familia` (lab-91) funciona porque
  LÊ o `localStorage` direto no navegador (só funciona se o responsável abrir o portal no MESMO
  aparelho da criança) — um e-mail enviado pelo SERVIDOR, de forma assíncrona, não tem como usar
  esse truque: o dado precisa estar em algum lugar que o servidor consiga ler na hora de mandar.
- **Decisão confirmada com o usuário** (`AskUserQuestion`, 3 opções: sincronizar resumo mínimo /
  botão manual no portal / só status de assinatura): escolhida a sincronização de um resumo
  MÍNIMO — nível, XP total, moedas, contagem de missões concluídas, contagem de emblemas. Nunca
  respostas de quest, horário de atividade, apelido/emoji do avatar ou qualquer conteúdo bruto.
  Isto MUDA a regra "zero progresso no servidor" documentada acima — mudança consciente,
  autorizada pelo usuário, registrada aqui pra não se perder.
- `server-accounts/src/index.ts` já tem os dois pilares reaproveitáveis:
  - Verificação do token de entitlement (HMAC/HS256, `ENTITLEMENT_SECRET`) em `handleEntitlement`
    — o mesmo token que o jogo da criança já guarda localmente (`entitlementStorage.ts`) depois do
    pareamento serve pra autenticar o novo endpoint de sincronização, sem exigir login nenhum da
    criança.
  - Cron Trigger já existe (lab-102, reconciliação diária Stripe↔banco) — só precisa de uma
    segunda entrada em `[triggers] crons` (semanal) e um `if` em `scheduled()` que decide qual
    tarefa rodar a partir de `controller.cron`.
  - `neon_auth."user"` tem `email`/`name` (confirmado via `inspect.mjs` contra o banco real) —
    o endereço de e-mail do responsável já existe, só precisa de um `join` a partir de
    `family_accounts.owner_user_id`.
- `app/src/state/productAnalytics.ts` já tem o padrão exato pra disparar essa sincronização do
  lado do jogo (`fetch` com `keepalive`, falha silenciosa, nunca trava o jogo da criança) — só
  precisa adicionar o `Authorization: Bearer <token de entitlement>` (os eventos de produto de
  hoje são anônimos, sem token nenhum).
- Nenhuma dependência de SDK do Resend é necessária — a API deles é um `POST` HTTP simples
  (`https://api.resend.com/emails`), igual ao padrão já usado pro Stripe (`fetch` direto, sem SDK
  pesado desnecessário — na real o Stripe TEM SDK aqui, mas o Resend não precisa, é mais simples
  ainda que isso).

## Decisões técnicas tomadas
- **Sincronização só acontece com entitlement ATIVO** (`entitlement.active === true`) — cria um
  limite natural e já existente pro novo fluxo de dado: famílias nunca pareadas (sem token) ou com
  assinatura cancelada/inativa nunca mandam nada pro servidor. Isso também para de mandar dado
  automaticamente no momento em que a família cancela a assinatura (a próxima revalidação de
  entitlement, que já roda a cada carregamento do jogo, vira `active: false`, e a sincronização
  para de disparar).
- **Só recebe o e-mail quem tem assinatura ativa E já tem pelo menos um resumo sincronizado** —
  mesma lógica: sem sincronização (criança nunca abriu o jogo depois de parear), não tem o que
  mandar.
- **Resumo é OVERWRITE, não histórico** (`progress_snapshots`, uma linha por família, chave
  primária `family_account_id`) — não precisa de histórico de progresso pra este recurso (o
  e-mail semanal mostra o estado ATUAL, não uma comparação com a semana anterior — fora de escopo
  por simplicidade, ver "Fora de escopo").
- **E-mail enviado do sandbox do Resend** (`onboarding@resend.dev`) até o usuário verificar um
  domínio próprio — mesmo espírito do Stripe em modo teste (funciona de ponta a ponta, mas com uma
  limitação de ambiente conhecida e documentada, não escondida).
- **Sem link de descadastro/preferência** nesta primeira versão — MVP pra validar o fluxo
  ponta a ponta; ver "Fora de escopo"/pendências.

## Funcionalidades planejadas
- [x] `server-accounts/migrations/0003_progress_snapshots.sql`: tabela `progress_snapshots`
      (`family_account_id` PK, `level`, `total_xp`, `coins`, `quests_completed`, `badges_count`,
      `updated_at`). **Aplicada de verdade contra o banco de produção** (`npm run migrate`).
- [x] `server-accounts/src/domain.ts`: `isValidProgressSummary` (valida limites plausíveis dos 5
      números) + `buildWeeklyProgressEmail` (função pura, monta assunto/corpo a partir do resumo +
      nome do responsável) — ambas testáveis sem rede/banco.
- [x] `server-accounts/src/index.ts`:
  - `POST /progress-summary` (Bearer = token de entitlement, mesma verificação de
    `handleEntitlement`, incluindo checagem de revogação por `jti`) — valida e faz upsert em
    `progress_snapshots`.
  - `sendWeeklyProgressEmails(env)` — busca famílias com assinatura ativa + resumo sincronizado +
    e-mail do responsável (`distinct on` pra pegar a assinatura mais recente POR família — um
    `order by ... limit 1` cru, como usado em outras rotas de UMA família só, estava errado aqui),
    manda um e-mail por família via Resend.
  - `scheduled()` ganha um segundo Cron (semanal) e passa a decidir qual tarefa rodar comparando
    `controller.cron` contra `WEEKLY_EMAIL_CRON`.
  - Novo secret `RESEND_API_KEY` (ainda não configurado — ver "Pendências" no CONTEXT.md), nova
    var de rate limit `PROGRESS_SUMMARY_LIMITER`.
- [x] `app/src/state/useEntitlement.ts`: `syncProgressSummary(progress)` — mesmo padrão de
      `productAnalytics.ts` (fetch + keepalive + falha silenciosa), mas autenticado com o Bearer do
      entitlement.
- [x] `app/src/App.tsx`: dispara `syncProgressSummary(progress)` uma vez por sessão, quando
      `entitlement.active` vira `true`.
- [x] Testes novos em `server-accounts/src/domain.test.ts` (`isValidProgressSummary`,
      `buildWeeklyProgressEmail`) — suite do Worker: 47→59.
- [x] Verificação: `npm run test` nos dois pacotes (`app`: 47/47, `server-accounts`: 59/59),
      `npm run build` sem erros nos dois. **Endpoint `POST /progress-summary` testado ao vivo**
      contra o Worker real via `wrangler dev` + banco de produção real (token de entitlement
      assinado com o `ENTITLEMENT_SECRET` real, família real já existente): sem auth → 401, token
      inválido → 401, payload inválido → 400, payload válido → 204 + linha conferida direto no
      banco com os 5 números certos, depois REMOVIDA (era só um teste, não progresso de verdade
      daquela família). **Worker deployado em produção** com a migração já aplicada — só o envio
      de verdade do e-mail (Cron semanal, precisa de `RESEND_API_KEY`) não pôde ser testado
      ponta a ponta nesta sessão (ver "Pendências").

## Fora de escopo (explicitamente adiado)
- Histórico de progresso semana a semana / comparação com a semana anterior — só o estado atual.
- Link de descadastro/preferência de frequência do e-mail — MVP, revisar antes de um lançamento
  real de verdade (mencionar como pendência de conformidade, não bloqueia o teste do fluxo).
- Verificar domínio próprio no Resend (sair do sandbox `onboarding@resend.dev`) — decisão/ação do
  usuário, fora do que dá pra fazer nesta sessão sem a conta dele.
- Qualquer UI nova de "opt-in" explícito no portal — o gate natural já existente (só quem pareou E
  está com assinatura ativa entra no fluxo) foi considerado suficiente pra este MVP, dado que o
  usuário já escolheu conscientemente essa direção na pergunta de escopo.
