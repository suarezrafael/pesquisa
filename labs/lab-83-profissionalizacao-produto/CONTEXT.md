# Contexto — Laboratório 83 — profissionalização do produto

Preenchido em: 2026-08-24
Commit inicial → final: d8e2eca..9987fcd

## O que foi feito

### Investigação antes de codificar
Pedido do usuário era aberto ("profissionalizar o jogo como produto"). Em vez de adivinhar,
rodei uma investigação só de leitura (fork) cobrindo: páginas legais, testes, monitoramento de
erro, analytics, acessibilidade, tamanho de bundle, monitoramento de uptime. Achados: nenhuma
dessas frentes existia. Priorizei o que é mais urgente pra um produto que já pede conta e cobra
pagamento real (mesmo em modo teste): páginas legais, autoatendimento de cobrança, e testes na
lógica de dinheiro — as outras (Sentry, analytics, code-splitting, auditoria de acessibilidade)
ficaram documentadas como próximos passos, não esquecidas.

### Páginas legais
`app/src/components/LegalPage.tsx` (novo) — Termos de Uso e Política de Privacidade, rotas
`/termos` e `/privacidade` (mesmo padrão de lazy-load de `/familia`, a criança nunca baixa esse
chunk). Conteúdo escrito refletindo as práticas REAIS do produto, verificadas no código antes de
escrever (não suposição):
- Privacidade: dado da criança fica só em `localStorage`, nunca vira identidade; subprocessadores
  reais (Neon, Stripe, Cloudflare) listados um a um; direitos LGPD.
- Termos: núcleo educativo sempre grátis, assinatura só cosmética, cobrança/cancelamento via
  Stripe, e o **direito de arrependimento de 7 dias** (art. 49 do CDC, aplicável porque a
  contratação é fora de estabelecimento físico) — item que eu não teria incluído sem checar a
  legislação brasileira aplicável a assinaturas online.
- Linkado no formulário de cadastro do responsável em `FamilyPortal.tsx` (`LoginScreen`).
- **Nota pro usuário**: escrevi como advogado faria pra um produto neste estágio, mas não sou
  advogado — recomendo revisão jurídica antes de sair do modo teste do Stripe e cobrar de
  verdade. O e-mail de contato usado (`contato@missaoaprendizado.com`) é um placeholder — precisa
  existir de verdade antes do lançamento.

### Customer Portal do Stripe (autoatendimento de cobrança)
Antes deste laboratório, cancelar uma assinatura exigia chamar a API do Stripe manualmente (só eu
conseguia fazer isso, testando). Isso não é aceitável pra um produto de verdade — e é uma
exigência de fato do CDC (cancelamento tem que ser tão fácil quanto a contratação).
- `app/server-accounts/src/index.ts`: `POST /billing-portal` (autenticado com o JWT do
  responsável) busca o `stripe_customer_id` mais recente da família e cria uma sessão do
  `stripe.billingPortal.sessions.create`, devolvendo a URL hospedada pelo próprio Stripe.
- `FamilyPortal.tsx` Dashboard: botão "Gerenciar assinatura / cancelar", visível sempre que já
  existiu alguma assinatura (`status !== 'none'`).
- **Testado ao vivo, ponta a ponta**: assinei com cartão de teste → cliquei em "Gerenciar
  assinatura" → o Customer Portal real do Stripe abriu mostrando plano, valor, próxima data de
  cobrança, forma de pagamento e histórico de fatura → percorri o fluxo de cancelamento até a
  tela final do Stripe. Pra confirmar que o *webhook* (código nosso) processa corretamente um
  cancelamento vindo de qualquer caminho, cancelei via API direta (mesmo padrão dos labs
  anteriores) e confirmei que o portal `/familia` já mostrava "Assinatura cancelada" na consulta
  seguinte.

### Primeiro test runner do projeto
`docs/prompts/04-manutencao-clean-code.md` §5 é explícito: lógica de domínio de recompensa/
entitlement tem que ter teste unitário assim que passar de "trivialmente conferível a olho" — e
depois dos labs 78-82 (Stripe, JWT de entitlement, cosméticos exclusivos) isso já tinha passado
faz tempo.
- **`app/`**: Vitest instalado, `npm run test` roda `app/src/state/progression.test.ts` (22
  testes) cobrindo cálculo de nível/XP, recompensa de quest com/sem multiplicador de evento
  semanal, não duplicar recompensa numa quest já completada, badges, e — o mais importante — que
  nenhum item `subscriptionOnly` pode ser desbloqueado via `unlockXxx` mesmo com moedas de sobra.
- **`app/server-accounts/`**: Vitest instalado, `npm run test` roda `src/domain.test.ts` (14
  testes) cobrindo `isEntitlementActive` (quais status do Stripe contam como assinatura ativa),
  `isPairingCodeUsable` (código de pareamento só uma vez, só dentro do prazo, limite inclusivo),
  `generatePairingCode` (sempre 6 dígitos), `toIsoOrNull`.
- Lógica extraída pra `app/server-accounts/src/domain.ts` — sem I/O, sem import de
  `neon`/`Stripe`/`jose`, seguindo `docs/prompts/03-arquitetura-sistema.md` §1. As rotas em
  `index.ts` agora chamam essas funções em vez de repetir a checagem inline.

### Bug real de negócio encontrado e corrigido
Ao ler `progression.ts` pra decidir o que testar, percebi que `unlockAvatar`/`unlockHat`/
`unlockGeneric` (usado por camisa/calça/sapato/mochila/cabelo) **não sabiam nada sobre
`subscriptionOnly`** — só verificavam `coins >= cost`. Como todo item exclusivo de assinante tem
`cost: 0` (mesma convenção do item padrão grátis de cada catálogo), chamar `unlockShirtColor(
progress, 'camisa_holografica')` diretamente teria liberado o item de graça pra sempre, sem
nenhuma assinatura. A lojinha (`AvatarShop.tsx`) nunca expõe um botão de compra pra esses itens,
então isso não era explorável pela UI atual — mas a regra de negócio real precisa morar na camada
de domínio, não só na renderização condicional de um componente (é exatamente o tipo de coisa que
`docs/prompts/04-manutencao-clean-code.md` §5 pede pra cobrir com teste). Corrigido adicionando
`if (item.subscriptionOnly) return null` (e equivalente pra avatar/chapéu) antes de qualquer outra
checagem, coberto por 6 testes de regressão (um por catálogo).

### `CLAUDE.md` atualizado
Estava descrevendo o projeto como "no backend/database" e o §15 do `prompt.md` como "planejado,
não implementado" — desatualizado desde o lab-78 (backend comercial). Corrigido, com referência
cruzada pra `docs/plano-comercial-backend.md` e a nova seção de comandos de teste.

## Decisões técnicas tomadas
- **Vitest em vez de Jest** — já é o padrão do ecossistema Vite (mesmo `vite.config.ts` é
  reaproveitado automaticamente), zero configuração extra necessária pros testes de lógica pura
  deste laboratório (sem DOM, sem `jsdom`).
- **Dois `package.json`/dois `npm run test` separados** (`app/` e `app/server-accounts/`) em vez
  de um workspace único — mantém a mesma separação de deploy já existente entre o jogo e o Worker,
  sem introduzir uma ferramenta de monorepo só pra isso.
- **Extrair `domain.ts` no Worker antes de testar, não depois** — testar `handleEntitlement`
  inteiro exigiria mockar `neon`/JWT/rede; a regra de negócio real (quais status contam como
  ativo) é pura e não deveria depender disso pra ser testável.
- **Não implementar Sentry/analytics/code-splitting agora** — cada um é uma frente própria,
  maior que cabe num laboratório junto com o resto; documentados como próximos passos em vez de
  meio-feitos.

## Pendências / dívidas conhecidas
- **E-mail de contato nas páginas legais é placeholder** (`contato@missaoaprendizado.com`) —
  precisa existir de verdade (caixa de entrada configurada) antes do lançamento comercial.
- **Conteúdo legal não revisado por advogado** — funcional pro estágio atual (modo teste), mas
  recomendado revisão profissional antes de sair do modo teste do Stripe.
- **Sem monitoramento de erro (Sentry) nem analytics** — identificado, não implementado.
- **`World3D.tsx` continua um chunk de 1,37MB gzip** — identificado, não resolvido (seria um
  laboratório à parte, envolve dividir um arquivo de 7500+ linhas).
- **Sem auditoria sistemática de acessibilidade** (WCAG AA) além do item de contraste de fonte já
  rastreado em `labs/CURRENT.md`.

## Funcionalidades planejadas que NÃO foram concluídas
Nenhuma das planejadas para este laboratório — os itens fora de escopo (Sentry, analytics,
code-splitting, auditoria de acessibilidade) foram explicitamente excluídos desde o início (ver
`FEATURES.md`), não abandonados no meio.

## O que o próximo laboratório deve desenvolver
Sem uma prioridade única óbvia — depende do que o usuário quiser priorizar entre:
1. Monitoramento de erro (Sentry) — barato de configurar, alto valor pra pegar bug em produção
   antes de um usuário reportar.
2. Analytics básico (retenção D1/D7, conversão) — as métricas que `prompt.md` §12/§15.4 já
   listam como necessárias pra validar o modelo de negócio, hoje impossíveis de medir.
3. Continuar a Fase E do plano comercial ("Minha Casa", ver `docs/plano-comercial-backend.md`).
4. Code-splitting de `World3D.tsx` — melhora tempo de carregamento, mas é refatoração grande
   num arquivo crítico; fazer só com a rede de segurança de mais testes.

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`.
- Jogo em produção: `https://app-two-flax-92.vercel.app` e `https://missaoaprendizado.com` —
  `/termos`, `/privacidade` novos; portal `/familia` com botão de gerenciar assinatura.
- Worker em produção: `https://missao-aprender-accounts.rafaelvs.workers.dev` — rota nova
  `/billing-portal`.
- Como verificar: rodar `cd app && npm run test` e `cd app/server-accounts && npm run test`
  (36 testes no total); acessar `/termos` e `/privacidade`; assinar em `/familia` e clicar em
  "Gerenciar assinatura / cancelar" pra ver o Customer Portal real do Stripe.
