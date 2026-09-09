# Contexto — Laboratório 166 — página familiar com proposta paga transparente

Preenchido em: 2026-09-09
Commit inicial → final: ac54d0dc18d7ee89ae3244e62cceee7bf800af8e..(PR aberto, ver seção final)

## O que foi feito

Terceiro item da sequência confirmada pelo usuário (`docs/market-metrics-engagement-backlog.md`),
renumerado de "Lab 165" no documento pra lab-166 real deste repositório.

- **`FamilyValueProp`** (nova função dentro de `app/src/components/FamilyPortal.tsx`, mesmo
  arquivo onde já vivem `ParentalGateScreen`/`LoginScreen`/`Dashboard`): inserida entre o portão de
  matemática e o login. Seções: 🔒 segurança (sem chat livre, sem PII da criança), 📚 aprendizagem
  sempre grátis, 💎 grátis vs pago (lista curta), 📄 exemplo ilustrativo do relatório semanal
  (texto estático, claramente marcado como exemplo — não um preview com dados reais), 💳
  cancelamento, links pra Política de Privacidade/Termos de Uso, e um único CTA ("Entrar / Criar
  conta") que leva pro `LoginScreen` já existente.
- **`FamilyPortal()`** reordenado: sessão já autenticada continua indo direto pro `Dashboard`
  (responsável que já assina não vê a tela nova de novo); só quem ainda não tem sessão vê
  `FamilyValueProp` antes do `LoginScreen`.
- **`Dashboard`** (pós-login): o botão "Assinar por R$ 4,99/mês", antes isolado sem contexto ao
  redor, ganhou um parágrafo curto reforçando a mesma mensagem de grátis-vs-pago.
- **3 eventos novos de analytics** (pendência já registrada em `docs/event-catalog.md` no lab-165):
  `family_landing_viewed` (`FamilyValueProp`, `useEffect` de montagem), `parent_signup_started`
  (clique em "Entrar / Criar conta"), `checkout_started` (`Dashboard.handleSubscribe`, disparado
  só depois de `/checkout` devolver uma URL válida, antes do redirect pro Stripe) —
  `productAnalytics.ts` ganhou as 3 funções, sem limite de "uma vez por sessão" (diferente dos
  eventos de ativação do lab-164 — aqui cada visita/clique é um evento próprio, mesmo padrão de
  `trackPlayClick`/`trackParentAreaClick`). `PRODUCT_EVENT_TYPES`
  (`server-accounts/src/domain.ts`) ganhou os 3 tipos novos.

## Decisões técnicas tomadas

- **Tela nova vive no MESMO arquivo `FamilyPortal.tsx`**, não um componente separado — segue a
  convenção já estabelecida nesse arquivo (todas as telas do fluxo familiar moram juntas ali).
- **Sessão existente pula a tela nova** — decisão deliberada: mostrar propaganda/proposta de valor
  pra quem já é assinante toda vez que abre `/familia` seria ruído, não reforço. A ordem de
  checagem em `FamilyPortal()` prioriza `session` sobre `valuePropSeen` por isso.
- **Preview de relatório é só texto estático, não interativo** — decisão já registrada no
  `FEATURES.md` antes de codar: o documento (`market-metrics-engagement-backlog.md`) tem um lab
  PRÓPRIO mais à frente na sequência ("Preview de relatório semanal antes da assinatura") pra um
  preview de verdade com dados — fazer isso aqui duplicaria trabalho e antecipava escopo de um lab
  que ainda nem foi confirmado como próximo pelo usuário.
- **Eventos sem limite de frequência** (diferente do lab-164): `family_landing_viewed`/
  `parent_signup_started`/`checkout_started` não têm flag de "uma vez por sessão" porque cada
  ocorrência real (visitou de novo, começou a criar conta de novo, iniciou outro checkout) é um
  dado útil pro funil — throttlar esconderia re-tentativas genuínas do responsável.

## Pendências / dívidas conhecidas

Nenhuma nova. As pendências do lab-165 (`docs/event-catalog.md`) continuam as mesmas, exceto que a
de `checkout_started`/`family_landing_viewed`/`parent_signup_started` agora está RESOLVIDA por
este lab — vale atualizar `docs/event-catalog.md` pra refletir isso (ver abaixo).

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — todos os itens do `FEATURES.md` deste laboratório foram concluídos.

## O que o próximo laboratório deve desenvolver

**lab-167** — mapa de habilidades e relatório de aprendizagem (doc: "Lab 166"), conforme sequência
já confirmada pelo usuário e registrada em `labs/CURRENT.md`. É o último dos 4 itens
originalmente priorizados nesta sessão (ativação → catálogo → página familiar → mapa de
habilidades); depois dele, o próximo passo natural (citado no próprio documento, seção 9) é
retomar a validação com o usuário sobre qual prioridade seguinte da lista mais longa do
`market-metrics-engagement-backlog.md` (álbum de conquistas, rotina do pet, perfil público —
alguns desses já parcialmente cobertos por labs sociais anteriores).

## Estado do repositório ao final

- Branch: a definir no momento do commit (mesmo padrão dos labs 163-165 — branch de PR a partir de
  `main`, sem worktree nesta sessão).
- `npx tsc -b`/`npm run build` (app): limpos, sem regressão de bundle (`FamilyPortal-*.js` continua
  lazy-loaded, mesmo padrão de sempre). `npm run test` (app): 136/136 (sem teste novo — mudança de
  UI/copy, fora do escopo de domínio puro coberto pelos testes do app). `npx tsc --noEmit`/
  `npm run test` (server-accounts): limpo, 98/98 (1 novo).
- **Verificado ao vivo** (`npm run dev` + Chrome real via automação): fluxo completo testado —
  portão de matemática → `FamilyValueProp` renderizando todas as 5 seções corretamente (screenshot
  confirmado) → clique em "Entrar / Criar conta" → `LoginScreen` aparece. Eventos confirmados
  disparando com o payload certo via monkey-patch de `window.fetch` (mesmo ambiente sem internet
  real de sempre): `family_landing_viewed` (2x — `<StrictMode>` duplica efeitos só em dev, não em
  produção, mesmo comportamento documentado do React) e `parent_signup_started` (1x, no clique).
  `checkout_started` NÃO verificado ao vivo (exigiria conta autenticada + assinatura elegível +
  checkout real do Stripe — fora do escopo prático desta verificação); confiança vem de ser a
  MESMA função `trackEvent` já comprovada pelos outros dois eventos, chamada de um ponto trivial
  (uma linha antes do redirect já existente).
