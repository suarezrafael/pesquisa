# Laboratório 173 — preview de relatório semanal antes da assinatura

Status: concluído
Início: 2026-09-10
Fim: 2026-09-10
Commit inicial: 2fefaf3837658bc0d63b73ab5b4b576c54718be9

## Objetivo do laboratório

`docs/market-metrics-engagement-backlog.md` §10 (ordem sugerida), item 8: "Lab 173 - Preview de
relatório semanal antes da assinatura". Mesmo item também citado em
`docs/product-discovery-backlog.md` (P1, item 8). Problema citado: "relatório é um dos benefícios
mais fortes para o responsável, mas precisa ser demonstrável antes da compra." O próprio
`lab-166-pagina-familiar-transparente/FEATURES.md` já registrou este item como "fora de escopo"
na época, explicitamente adiado pra este lab: "Preview de relatório COM DADOS REAIS/interativo —
só um exemplo estático/descritivo aqui; o preview de verdade é um lab próprio mais à frente."

## Estado atual levantado antes de planejar o escopo

- `FamilyValueProp` (`components/FamilyPortal.tsx`, lab-166) já mostra um exemplo do relatório —
  UMA frase itálica só, sempre visível, sem estrutura parecida com o e-mail de verdade.
- **Achado ao ler `docs/market-metrics-engagement-backlog.md` com atenção**: o texto do "Lab 173"
  pede EXPLICITAMENTE "dados fictícios claramente marcados" e lista como FORA de escopo "dados
  inventados como se fossem da criança" — ou seja, o preview NÃO deve usar o progresso real do
  perfil (ao contrário do que o comentário do lab-166 especulava sobre um "preview com dados
  reais"). Este lab segue o documento oficial (fonte de verdade da numeração dos labs), não a
  especulação do lab anterior.
- `buildWeeklyProgressEmail` (`server-accounts/src/domain.ts`, lab-119/167) é a fonte real do
  e-mail: nível/XP, missões concluídas, moedas, emblemas, e uma seção de ponto forte/pra praticar
  mais (`describeSkillFocus`). **NÃO inclui "tempo de jogo"** — o documento cita isso como parte
  do escopo, mas incluir um campo que o e-mail de VERDADE não tem seria a exata armadilha que o
  próprio documento cita como risco ("expectativa maior que a entrega real"); omitido de
  propósito.

## Funcionalidades planejadas

- [x] Expandir o exemplo de uma frase (lab-166) pra um cartão de preview estruturado, no mesmo
      formato do e-mail de verdade: nível/XP, missões concluídas, moedas, emblemas, ponto
      forte/pra praticar mais. Etiqueta "EXEMPLO — dados fictícios" visível no próprio cartão (não
      só uma legenda pequena abaixo).
- [x] Recolhido por padrão, atrás de um botão "👀 Ver exemplo do relatório semanal" — diferente do
      lab-166 (sempre visível), permite medir interesse real (clique) em vez de assumir que todo
      mundo lê.
- [x] Evento novo `weekly_report_preview_viewed` (`productAnalytics.ts` + allowlist
      `PRODUCT_EVENT_TYPES`, `server-accounts/src/domain.ts`) — métrica "clique em preview" citada
      no documento. `docs/event-catalog.md` atualizado.

## Fora de escopo (explicitamente adiado, citado no documento)

- Diagnóstico pedagógico formal, comparação com outras crianças.
- Dados reais da criança no preview (decisão confirmada acima) — nunca antes de assinar.
- "Tempo de jogo" — omitido de propósito, ver "Estado atual" acima.
