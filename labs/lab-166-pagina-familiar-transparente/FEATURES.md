# Laboratório 166 — página familiar com proposta paga transparente

Status: em andamento
Início: 2026-09-09
Fim: -
Commit inicial: ac54d0dc18d7ee89ae3244e62cceee7bf800af8e

## Objetivo do laboratório

Terceiro item da sequência confirmada pelo usuário
(`docs/market-metrics-engagement-backlog.md`, seção 6, "Lab 165" no documento — **renumerado para
lab-166**, mesmo motivo de renumeração dos labs 164/165 já feitos). Também é o item #2 do backlog
mais antigo (`docs/business-analyst-prompt-backlog.md` §4, P0: "Área do responsável antes da
monetização" / "Pré-venda responsável antes do login").

Problema citado no documento (seção 6, "Lab 165"): "responsáveis precisam entender em até 10
segundos que o jogo é educativo, seguro, sem chat livre e sem compras abusivas; também precisam
entender que a assinatura não bloqueia aprendizagem" — hoje, ANTES de logar, o responsável só vê um
portão de matemática (`ParentalGateScreen`) sem nenhuma explicação, e só descobre preço/benefícios
DEPOIS de criar conta, no `Dashboard`, como um botão isolado ("Assinar por R$ 4,99/mês") sem nenhum
contexto ao redor.

## Estado atual levantado antes de planejar o escopo (`app/src/components/FamilyPortal.tsx`)

- Fluxo hoje: `ParentalGateScreen` (só a conta de matemática, zero copy de valor) →
  `LoginScreen` (formulário de entrar/criar conta, só um link pra Política de Privacidade) →
  `Dashboard` (pós-login: progresso da criança, status de assinatura, botão "Assinar por
  R$ 4,99/mês" sem lista de benefícios ao redor, gerenciar assinatura, NPS, exportar/excluir dados).
- **Nenhuma seção de segurança/aprendizagem/preço/cancelamento aparece ANTES do login** — o
  responsável precisa criar conta pra descobrir qualquer coisa sobre o produto, exatamente o
  problema citado no documento e no `business-analyst-prompt-backlog.md` item #2.
- `docs/event-catalog.md` (lab-165) já registrou como pendência: `family_landing_viewed`/
  `parent_signup_started`/`checkout_started` ainda não existem como evento — este é o lab que os
  cria, porque é quem mexe nesse fluxo.
- Preço (R$ 4,99/mês) e a regra inegociável (assinatura só gateia cosmético, nunca conteúdo
  educativo/progresso/cooperação) já estão confirmados e documentados em
  `docs/plano-comercial-backend.md` — este lab só torna isso VISÍVEL pro responsável antes de
  logar, não muda preço nem cria checkout novo.

## Funcionalidades planejadas

- [ ] Nova tela de "proposta de valor" (`FamilyValueProp`, dentro de `FamilyPortal.tsx`) inserida
      ENTRE o portão de matemática (`ParentalGateScreen`, já existente, intacto) e o login
      (`LoginScreen`) — seções citadas no documento: segurança (sem chat livre, sem PII da
      criança), aprendizagem sempre grátis, comparação grátis vs pago (só cosmético/conveniência),
      preço (R$ 4,99/mês), cancelamento, link pra privacidade, ausência explícita de pay-to-win.
- [ ] Exemplo BREVE do relatório semanal (uma descrição/mockup simples do que o responsável recebe
      — não o preview interativo com dados reais, isso é escopo de um lab de "preview de relatório"
      mais à frente na sequência do documento, fora deste).
- [ ] CTA único pra continuar ("Entrar / Criar conta"), levando pro `LoginScreen` já existente —
      sem checkout novo, sem desconto, sem campanha (explicitamente fora de escopo no documento).
- [ ] `Dashboard` (pós-login) ganha uma lista curta de benefícios ao lado do botão "Assinar", em
      vez do botão isolado de hoje — reforça a mesma mensagem pra quem já passou da tela nova.
- [ ] 3 eventos novos de analytics (pendência já registrada em `docs/event-catalog.md`, lab-165):
      `family_landing_viewed` (tela de proposta de valor exibida), `parent_signup_started` (clique
      em "Entrar / Criar conta"), `checkout_started` (`handleSubscribe` recebe uma URL de checkout
      válida, antes do redirect) — allowlist `PRODUCT_EVENT_TYPES` (`server-accounts/src/domain.ts`)
      ganha os 3 tipos novos, mesmo padrão dos labs 161/164.

## Fora de escopo (explicitamente adiado, citado no documento)

- Checkout novo, desconto, plano anual, teste de preço, campanha paga.
- Coleta de qualquer dado sensível novo (nome real da criança, e-mail dela, etc.).
- Preview de relatório COM DADOS REAIS/interativo — só um exemplo estático/descritivo aqui; o
  preview de verdade é um lab próprio mais à frente no documento.
- Mapa de habilidades (isso é o lab-167, próximo da sequência).
- Qualquer mudança em `docs/plano-comercial-backend.md`/preço/regra de entitlement.

## Critérios de aceite (citados do documento, seção 6)

Responsável consegue diferenciar grátis e pago sem ler termos longos; CTA de assinatura aparece
apenas no fluxo adulto; preço e benefícios são claros.

## Métricas esperadas (citadas do documento)

`parent_area_click_rate` (já existe), `family_landing_viewed`/`parent_signup_rate`/
`checkout_started_rate` (novos deste lab); compreensão 8/10 em teste moderado (pesquisa qualitativa,
fora do código).

## Riscos citados no documento

Copy parecer promessa pedagógica não comprovada; excesso de informação; preço aparecer perto demais
do fluxo infantil (mitigado: a tela nova só existe DEPOIS do portão de matemática, nunca antes).
