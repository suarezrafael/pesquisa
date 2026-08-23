# Laboratório 79 — backend comercial, Fase B (portal dos responsáveis)

Status: concluído
Início: 2026-08-23
Fim: 2026-08-23
Commit inicial: e8428b27968d0cb5e4c4b5e9985c112e3df203c5

## Objetivo do laboratório
Pedido do usuário: "fase b", precedido de uma pergunta sobre em qual linguagem o Worker foi
escrito (queria saber se dava pra trocar pra C#/.NET pra ele conseguir dar suporte — resposta:
TypeScript no Cloudflare Workers; C#/.NET exigiria migrar pra Azure Functions, usuário decidiu
manter TypeScript/Cloudflare).

## Funcionalidades planejadas
- [x] Rota `/familia` separada do jogo (não alcançável pelo fluxo normal da criança)
- [x] `vercel.json` com rewrite SPA (necessário pra `/familia` funcionar como URL direta)
- [x] Parental gate (conta de matemática simples)
- [x] Login/cadastro real do responsável via Neon Auth (Managed Better Auth)
- [x] Dashboard mínimo (e-mail da conta + "nenhuma assinatura ativa")
- [x] Testado ao vivo, fim a fim: cadastro → linha real no banco → sessão persiste → logout →
  login de novo — não só verificado por código

## Fora de escopo (explicitamente adiado)
- Qualquer coisa de pagamento/Stripe (Fase C).
- Criar a linha em `family_accounts` no cadastro — adiado pro momento em que algo realmente
  precisa dela (Fase C, ao criar o cliente Stripe), evitando escrever no banco sem um consumidor
  ainda.
- Migrar o backend pra C#/.NET no Azure — usuário decidiu manter TypeScript/Cloudflare.
