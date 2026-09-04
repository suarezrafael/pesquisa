# Laboratório 148 — Configura o RESEND_API_KEY (ativa o e-mail semanal, Fase F)

Status: concluído
Início: 2026-09-03
Fim: 2026-09-03
Commit inicial: e197d02325f571c52a783dccf586aa3cdf8ea9be

## Objetivo do laboratório

`sendWeeklyProgressEmails` (lab-119, Fase F) estava pronto e deployado desde então, mas nunca
enviava de verdade — faltava `RESEND_API_KEY`, dependente de uma conta Resend do próprio usuário
(algo que eu não posso criar por ele). Perguntado ao usuário qual dos itens restantes do backlog
resolver (G15 DNS/rotação de chave, consentimento multiplayer, ou configurar o Resend) —
escolhido: configurar o Resend.

## Funcionalidades planejadas
- [x] Usuário criou a conta Resend e gerou uma API key (escopo restrito a só enviar).
- [x] `RESEND_API_KEY` configurado via `wrangler secret put` em produção.
- [x] `RESEND_API_KEY` adicionado em `.dev.vars` (gitignored) pra testes locais.
- [x] Testado ao vivo: cron semanal disparado manualmente (`wrangler dev` local, contra o banco de
  produção real), e-mail de verdade enviado com sucesso (confirmado pelo log do próprio Worker:
  `[weekly-email] 1 enviado(s), 0 falha(s)`).
- [x] `app/server-accounts/README.md` e `docs/plano-comercial-backend.md` atualizados.

## Fora de escopo (documentado, não pedido pelo usuário nesta rodada)
- Verificar um domínio próprio (`missaoaprendizado.com`) no Resend — o remetente atual
  (`onboarding@resend.dev`, sandbox do Resend) só entrega pro e-mail da PRÓPRIA conta Resend até
  isso ser feito. Suficiente pra confirmar que o mecanismo funciona de ponta a ponta (testado com
  a única família elegível hoje, que é a conta de teste do usuário), mas não envia ainda pra
  famílias reais com outros e-mails. Exigiria adicionar registros DNS no domínio — mesma categoria
  de mudança em infraestrutura de produção do G15 (DNS), que o usuário já pediu pra não mexer sem
  confirmar antes.
