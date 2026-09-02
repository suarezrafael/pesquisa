# Laboratório 80 — backend comercial, Fase C (pagamento de verdade)

Status: concluído
Início: 2026-08-23
Fim: 2026-08-24
Commit inicial: a942768dc0c60497e6c11ad41b1850512d6cd933

## Objetivo do laboratório
Pedido do usuário: "fase c, plano de R$ 4,99". Ligar o Stripe Checkout (modo teste) de ponta a
ponta: o responsável assina no portal `/familia`, o Worker `server-accounts` recebe o webhook do
Stripe e atualiza `subscriptions`, e o portal reflete o status real (não mais o placeholder da
Fase B).

## Funcionalidades planejadas
- [x] Produto + Price recorrente no Stripe (R$ 4,99/mês, BRL, modo teste) — via
  `docs/plano-comercial-backend.md`, preço confirmado pelo usuário nesta sessão
- [x] Verificação de JWT no Worker (JWKS do Neon Auth) — nenhuma rota nova aceita e-mail/senha
- [x] `POST /checkout` — cria a linha em `family_accounts` (primeiro consumidor real desse dado,
  adiado desde a Fase B) e a sessão do Stripe Checkout
- [x] `POST /webhooks/stripe` — verifica assinatura, trata `checkout.session.completed`,
  `customer.subscription.updated`, `customer.subscription.deleted`
- [x] `GET /subscription` — status real pro portal consultar
- [x] `FamilyPortal.tsx` Dashboard mostrando status real + botão "Assinar por R$ 4,99/mês"
- [x] Testado ao vivo, fim a fim, em modo teste do Stripe (não só verificado por tipo/build)

## Fora de escopo (explicitamente adiado)
- Pareamento com o jogo (Fase D) — o entitlement ainda não chega no client da criança.
- Cosmético de verdade gateado (Fase E).
- Sair do modo teste do Stripe / migrar hospedagem (Fase F).
