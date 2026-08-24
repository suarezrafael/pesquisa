# Laboratório 83 — profissionalização do produto

Status: concluído
Início: 2026-08-24
Fim: 2026-08-24
Commit inicial: d8e2eca

## Objetivo do laboratório
Pedido do usuário: "pode continuar a evolução do produto, foque em profissionalizar o jogo como
produto." Pedido aberto — antes de codificar, investiguei (fork de pesquisa, somente leitura) o
que faltava pra esse objetivo: páginas legais, testes automatizados, monitoramento de erro,
analytics, acessibilidade, tamanho de bundle. Priorizei o que é mais urgente pra um produto que já
pede conta e cobra pagamento real de responsáveis (ainda que em modo teste do Stripe): páginas
legais + fechar um buraco real de autoatendimento (cancelamento) + testes na lógica de dinheiro/
entitlement, que os próprios docs do projeto já marcavam como obrigatória a partir de agora.

## Funcionalidades planejadas
- [x] Termos de Uso (`/termos`) e Política de Privacidade (`/privacidade`) — conteúdo refletindo
  as práticas reais do produto (não texto genérico), linkados no cadastro do responsável
- [x] Customer Portal do Stripe (`POST /billing-portal`) — responsável ganha um jeito de
  autoatendimento pra gerenciar forma de pagamento, ver faturas e cancelar, sem precisar de
  suporte manual (também fecha uma exigência do CDC de cancelamento fácil)
- [x] Primeiro test runner do projeto (Vitest) em `app/` e `app/server-accounts/`, cumprindo o
  requisito `[MUST]` de `docs/prompts/04-manutencao-clean-code.md` §5 pra lógica de domínio
  (recompensa, entitlement) que já passou do ponto de "trivialmente conferível a olho"
- [x] Extração de lógica pura pra `app/server-accounts/src/domain.ts` (entitlement/pareamento),
  necessária pra poder testar sem mockar banco/rede
- [x] Bug real de segurança de negócio corrigido: itens `subscriptionOnly` podiam ser obtidos de
  graça via `unlockXxx` (a checagem só existia na renderização condicional da loja, não na
  camada de domínio) — corrigido e coberto por teste de regressão
- [x] `CLAUDE.md` atualizado (estava referenciando um estado sem backend, já defasado desde o
  lab-78)
- [x] Deploy em produção e testado ao vivo: páginas legais renderizando, assinatura → portal de
  faturamento → cancelamento real refletindo no banco via webhook

## Fora de escopo (explicitamente adiado)
- Monitoramento de erro (Sentry ou similar) — identificado na pesquisa, não implementado.
- Analytics (retenção D1/D7, conversão) — identificado na pesquisa, não implementado.
- Code-splitting do `World3D.tsx` (bundle de 1,37MB gzip) — identificado, escopo maior.
- Auditoria sistemática de acessibilidade (WCAG AA) além do item de contraste já rastreado.
