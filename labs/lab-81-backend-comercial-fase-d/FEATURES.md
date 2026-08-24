# Laboratório 81 — backend comercial, Fase D (pareamento com o jogo)

Status: concluído
Início: 2026-08-24
Fim: 2026-08-24
Commit inicial: ca719138ebecae9e8e343375eda15c3971d69e55

## Objetivo do laboratório
Pedido do usuário: "pode avançar pra próxima fase" (Fase C confirmada funcionando). Ligar o
entitlement de assinatura ao cliente do jogo: o responsável gera um código curto no portal
`/familia`, a criança digita esse código UMA VEZ no jogo (nunca e-mail/senha), e o jogo passa a
saber localmente se a família tem assinatura ativa — sem nunca criar conta pra criança.
Referência: CONTEXT.md do lab-80, seção "O que o próximo laboratório deve desenvolver", e
`docs/plano-comercial-backend.md` (tabela de endpoints e princípio de design "a criança continua
anônima").

## Funcionalidades planejadas
- [x] `POST /pairing/generate` no Worker (autenticado, Bearer JWT do responsável) — gera uma
  linha em `pairing_codes` (código de 6 dígitos, expira em ~15min), devolve o código
- [x] `POST /pairing/redeem` no Worker (sem autenticação — quem chama é o jogo da criança) —
  troca um código válido/não expirado/não resgatado por um token de entitlement assinado
  (JWT curto, HMAC, verificável só pelo próprio Worker)
- [x] `GET /entitlement` no Worker — recebe o token de entitlement, responde
  `{ active: boolean, expiresAt }`; usado pro jogo revalidar em background
- [x] Botão "Gerar código" no Dashboard do portal (`FamilyPortal.tsx`), mostrando o código e
  contagem regressiva até expirar
- [x] Tela nova no jogo (botão 🔗 no HUD) pra digitar o código de pareamento uma vez — sem
  teclado de e-mail/senha
- [x] Módulo de domínio pro entitlement (`app/src/state/useEntitlement.ts` +
  `entitlementStorage.ts`), desacoplado do Babylon.js/UI, guardando o token em `localStorage` e
  revalidando em background (silencioso, cai pro cache local se offline — mesma filosofia do PWA
  já aplicada no projeto)
- [x] Testado ao vivo, fim a fim: gerar código no portal → digitar no jogo → jogo reconhece
  entitlement ativo → cancelar a assinatura via API do Stripe → próxima revalidação em background
  reflete o cancelamento

## Fora de escopo (explicitamente adiado)
- Qualquer cosmético de verdade gateado por esse entitlement (Fase E) — este laboratório só
  entrega o CANAL do entitlement chegando no client da criança, não o que ele desbloqueia.
- Sair do modo teste do Stripe / migrar hospedagem (Fase F).
