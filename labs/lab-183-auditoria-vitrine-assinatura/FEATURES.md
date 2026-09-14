# Laboratório 183 — Auditoria da vitrine adulta de assinatura

Status: concluído
Início: 2026-09-14
Fim: 2026-09-14
Commit inicial: 9bd2221bcf2fe5eebaf8692a6562b22034ba1acf

## Objetivo do laboratório

Auditar (não reconstruir) a vitrine de assinatura já existente (labs 166/173) contra a experiência
infantil: provar que a separação criança/responsável e a ausência de pressão de compra continuam
valendo depois de várias features novas terem sido adicionadas por cima, e corrigir só as lacunas
concretas encontradas — não redesenhar a vitrine do zero.

Origem: `docs/growth-retention-monetization-backlog.md`, "Lab 183", item 9 da ordem sugerida,
próximo item recomendado após o lab-182 (`CONTEXT.md` do lab-182).

## Funcionalidades planejadas

- [x] Auditar `TitleScreen`/tela inicial: nenhum CHECKOUT/PREÇO/URGÊNCIA visível pra quem ainda não
  passou pelo portão parental (backlog: "Fora de escopo — pedir compra no fluxo infantil"). **Conforme,
  sem achado** — a tela TEM uma menção informativa a "assinatura" (sinal de confiança "Assinatura só
  para itens visuais", não-transacional, sem preço/CTA/urgência ao lado), que é exatamente o tipo de
  divulgação que o critério do backlog permite; nenhum preço/checkout aparece nela.
- [x] Auditar `AvatarShop`/lojinha de cosméticos: textos de item premium (`subscriptionOnly`) não
  incentivam compra com linguagem voltada à criança nem escondem que é "coisa de assinatura" atrás
  de copy ambígua. **Conforme, sem achado** — mesmo padrão em `MyHousePanel.tsx` (mobília
  exclusiva), tag "🔒 Assinantes" sem preço em R$ nenhum visível (a loja tem botões de compra, mas só
  com moeda do próprio jogo — nunca dinheiro real; economia interna já auditada/aceita antes deste
  lab, fora do que o critério "sem checkout infantil" cobre).
- [x] Auditar `/familia` (`FamilyPortal.tsx`, `FamilyValueProp`, `Dashboard`): responsável continua
  vendo preço, benefícios, cancelamento e a regra de aprendizagem sempre grátis com clareza — sem
  nenhuma peça que tenha ficado desatualizada ou contraditória depois dos labs 176-182.
  (referência: `docs/plano-comercial-backend.md`, regra inegociável de gating cosmético-only)
  **Conforme, sem achado de copy** — texto do bônus do evento semanal (lab-182) confirmado
  atualizado.
- [x] Auditar o preview do relatório semanal exemplo (lab-173) e qualquer CTA adulto novo
  introduzido por labs recentes (166/173 em diante) contra o mesmo checklist. **2 achados reais**:
  `PairingScreen.tsx` (CTA "Abrir área dos responsáveis") tinha 2 links `target="_blank"` sem
  `noopener` explícito (inconsistente com a convenção do resto do repo) e sem indicar "abre em nova
  aba" no nome acessível — ambos corrigidos. Ver `CONTEXT.md` pro detalhe e a ressalva sobre o
  `noopener` não ser um furo de segurança ativo em navegador atualizado.
- [x] Auditar textos de item premium em todo catálogo de cosméticos por clareza "grátis vs. pago"
  (nenhum item educacional/de progresso pode parecer bloqueado por assinatura). **Conforme** —
  catálogos (`hats.ts` etc.) só têm nome/emoji/geometria, sem copy de venda por item.
- [x] Conferir cobertura de métricas: `parent_value_comprehension_rate` (se ainda não existir,
  avaliar se cabe neste lab ou é product research fora de escopo de código),
  `weekly_report_preview_viewed` (já existe, lab-173 — só confirmar que continua disparando),
  `checkout_started_from_parent_area` (conferir se equivale ao `checkout_started` já existente do
  lab-166 ou se falta um evento dedicado), zero entrada direta de checkout a partir de superfície
  infantil (auditoria de código, não evento novo). **Reconciliado** — ver `CONTEXT.md` pro
  detalhe dos 4 itens.
- [x] Corrigir só as lacunas concretas encontradas na auditoria acima (copy, evento faltando,
  contradição entre telas) — sem adicionar escopo novo de monetização. **2 correções aplicadas em
  `PairingScreen.tsx`** (`noopener` + `aria-label` de nova aba nos 2 links).

## Fora de escopo (explicitamente adiado)

- Pedir compra no fluxo infantil, bloquear escola/quest atrás de assinatura, ou qualquer forma de
  urgência artificial (contagem regressiva, "oferta por tempo limitado") — proibido pelo backlog.
- Redesenhar a vitrine adulta do zero — este lab é auditoria + correção pontual, não uma feature
  nova.
- Pesquisa com usuário real (parent_value_comprehension_rate como estudo qualitativo) — fora de
  escopo de laboratório de código, mesma exclusão já registrada em labs anteriores (185, 178 etc.)
  para itens de pesquisa pura.
