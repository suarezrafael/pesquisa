# Laboratório 78 — backend comercial, Fase A (fundação Neon + Cloudflare)

Status: concluído
Início: 2026-08-22
Fim: 2026-08-22
Commit inicial: 85512c74406a81ce13c433224b6b0e50337d3012

## Objetivo do laboratório
Pedido do usuário: "pode comecar" (a construção do plano de backend+contas descrito em
`docs/plano-comercial-backend.md`), com três restrições explícitas: preço baixo pra clientes
brasileiros, cosméticos novos e interessantes (skins/chapéus/decoração — não conteúdo educativo,
ver ressalva registrada na conversa), e confirmação de que a migração pro Cloudflare Pages e o
Neon (já logado via GitHub) podem ser usados. Este laboratório cobre só a **Fase A** do plano
(fundação): projeto Neon, schema, Neon Auth, Worker de contas.

## Funcionalidades planejadas
- [x] Projeto Neon criado na região São Paulo (baixa latência pro público brasileiro)
- [x] Neon Auth habilitado e verificado (schema `neon_auth` real, não suposto)
- [x] Schema próprio aplicado: `family_accounts`, `subscriptions`, `pairing_codes`
- [x] Novo Worker Cloudflare (`app/server-accounts/`) deployado com health-check
- [x] Conexão Worker → Neon verificada de ponta a ponta em produção (não só localmente)
- [x] `DATABASE_URL` configurado como secret, nunca comitado

## Fora de escopo (explicitamente adiado)
- Rotas reais de autenticação/pagamento/pareamento (Fases B-D do plano).
- Migração da hospedagem do front-end pro Cloudflare Pages (Fase F — só necessária no lançamento
  comercial de verdade, usuário confirmou que pode ser feita quando chegar a hora).
- Definição final de preço e lista de cosméticos exclusivos (decisão de produto do usuário,
  registrada como pendência).
