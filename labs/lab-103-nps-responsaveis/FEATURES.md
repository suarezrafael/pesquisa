# Laboratório 103 — NPS de responsáveis (resto de G11 / prompt.md §12)

Status: em andamento
Início: 2026-08-27
Fim: -
Commit inicial: 71eb65b104a963f5cb0bc0c7783fbfdf778c3cf1

## Objetivo do laboratório
`prompt.md` §12 lista "NPS de pais/responsáveis (curto)" entre as métricas de product-market fit,
junto com D1/D7/sessão/quests (todas já resolvidas no lab-99, exceto esta). Deliberadamente adiado
do lab-99 por ser um mecanismo diferente — pesquisa qualitativa direta ao responsável (formulário
no portal), não telemetria de evento anônima do aparelho da criança. Escolhido pelo usuário logo
após o lab-102, entre deploy automático/NPS/bug de morros invisíveis.

## Investigado antes de planejar
- **NPS (Net Promoter Score)**: pergunta padrão "de 0 a 10, o quanto você recomendaria [produto]
  pra outra pessoa" — 9-10 promotor, 7-8 neutro, 0-6 detrator. Score = %promotores − %detratores
  (pontos percentuais, -100 a 100).
- **Diferente de `product_events` (lab-99)**: aquilo é 100% anônimo, por `device_id`, nunca ligado
  a e-mail/família. NPS é justamente o oposto — o RESPONSÁVEL já autenticado no portal (`/familia`,
  Neon Auth) respondendo por conta própria, não a criança. Não há problema novo de privacidade
  infantil aqui: é dado do adulto, dado voluntariamente, sobre a experiência dele/da família com o
  produto.
- **`migrations/`** (lab-101): esta é a PRIMEIRA migração de schema de verdade depois do baseline
  — boa oportunidade de validar o fluxo versionado na prática (`migrations/0002_nps_responses.sql`).
- **`FamilyPortal.tsx`**: `Dashboard` já tem o padrão de `authorizedFetch` + estado local
  (`status`, `busy`, `error`) — o widget de NPS segue o mesmo padrão, componente próprio (como
  `PairingCodeGenerator`/`ChildProgressPanel`), não inline dentro de `Dashboard`.
- **Frequência**: perguntar TODA vez que o responsável abre o portal seria irritante. Cooldown de
  90 dias desde a última resposta (constante `NPS_COOLDOWN_DAYS`, pura/testável) — decidido pelo
  servidor (`GET /nps/status`), não por `localStorage` do navegador, porque é sobre a FAMÍLIA (uma
  fonte de verdade única, não por aparelho/navegador).
- **Só mostrar pra quem já teve alguma experiência real com o produto** — gateado por
  `status !== 'none' && status !== 'loading'` (mesma condição já usada por "Gerenciar assinatura"),
  não faz sentido perguntar "recomendaria?" pra quem nunca assinou.

## Funcionalidades planejadas
- [ ] **`app/server-accounts/migrations/0002_nps_responses.sql`** (novo): tabela `nps_responses`
  (`id` uuid, `family_account_id`, `score` int com `check (score between 0 and 10)`, `comment` text
  nullable, `submitted_at`) + índice em `(family_account_id, submitted_at)`.
- [ ] **`app/server-accounts/src/domain.ts`**: `NPS_COOLDOWN_DAYS = 90`; `isValidNpsScore(score)`
  (inteiro 0-10); `shouldPromptForNps(lastSubmittedAt, now?)` (nunca respondeu OU cooldown
  vencido); `calculateNpsScore(scores: number[])` (promotores/neutros/detratores + score final,
  `null` se não há respostas — evita dividir por zero).
- [ ] **`GET /nps/status`** (autenticado como responsável): `{ shouldPrompt, lastSubmittedAt }`.
- [ ] **`POST /nps`** (autenticado, corpo `{ score, comment? }`, `NPS_LIMITER` novo em
  `wrangler.toml`): valida `score`, limita `comment` a um tamanho razoável, insere.
- [ ] **`GET /admin/metrics`** (lab-99) ganha um bloco `nps` (score, contagem de
  promotores/neutros/detratores, total de respostas) — usa `calculateNpsScore` sobre os scores dos
  últimos 90 dias, mesmo protegido por `x-admin-secret` já existente.
- [ ] **`app/src/components/FamilyPortal.tsx`**: `NpsWidget` (novo componente) — busca
  `/nps/status` ao montar; se `shouldPrompt`, mostra um `<select>` de 0 a 10 + campo de comentário
  opcional + botão enviar, e um "Agora não" (dispensa só nesta sessão, sem gravar resposta
  nenhuma no servidor). Renderizado dentro de `Dashboard`, gateado pelo mesmo `canManageBilling`
  (já assinou ou assina).
- [ ] Testes de domínio pra `isValidNpsScore`/`shouldPromptForNps`/`calculateNpsScore`.
- [ ] Migração aplicada em produção via `npm run migrate` (primeira migração de verdade depois do
  baseline do lab-101) e confirmada.
- [ ] Deploy em produção (Worker + frontend).
- [ ] Testado ao vivo contra produção real: `GET /nps/status` antes de responder (`shouldPrompt:
  true`), `POST /nps` com um score de teste, `GET /nps/status` de novo (`shouldPrompt: false`,
  `lastSubmittedAt` preenchido), `GET /admin/metrics` refletindo a resposta no bloco `nps`. Testar
  também `score` inválido (`-1`, `11`, não-inteiro) devolvendo erro de validação. Resposta de teste
  removida do banco ao final.

## Fora de escopo (explicitamente adiado)
- **Enviar e-mail/lembrete pedindo NPS** — só um widget passivo no portal, sem nenhum canal de
  notificação novo (mesma filosofia de "log visível, sem alerta ativo" já usada nos labs 98/102).
- **Segmentar NPS por tempo de assinatura/cosmético comprado** — só a métrica agregada simples que
  `prompt.md` §12 pede; segmentação é uma extensão futura se o volume de resposta justificar.
- **Dashboard visual de NPS** — `GET /admin/metrics` continua JSON puro, mesma decisão do lab-99.
