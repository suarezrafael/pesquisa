# Laboratório 144 — LGPD: exclusão de conta, exportação de dados, retenção de pairing_codes

Status: concluído
Início: 2026-09-03
Fim: 2026-09-03
Commit inicial: d1a32505baba8c477657e58d93b840e2461e255e

## Objetivo do laboratório

Resolve G13 de `docs/prompts/05-escala-e-viabilidade.md`: "Existe `LegalPage.tsx` (bom), mas não
existe: caminho de exclusão de conta e dados a pedido do responsável (LGPD art. 18), política de
retenção (`pairing_codes` nunca é purgada), registro de consentimento parental para o multiplayer,
nem exportação de dados." Escolhido pelo usuário via `AskUserQuestion` sobre G13 vs. G15 (config/
infra) — G13 fica inteiramente dentro do código do jogo/backend, sem tocar infraestrutura de
produção ao vivo (DNS, rotação de credencial), diferente de partes de G15.

## Funcionalidades planejadas
- [x] `GET /account/export` (`app/server-accounts`) — devolve tudo que o Worker guarda sobre o
  responsável autenticado e sua família (identidade + assinaturas + códigos de pareamento +
  tokens de entitlement + respostas de NPS + resumo/backup de progresso).
- [x] `POST /account/delete` — cancela qualquer assinatura Stripe ativa e apaga, numa única
  transação, todas as tabelas ligadas à família e o próprio usuário do Neon Auth (`neon_auth.
  "user"`/`session`/`account`).
- [x] Retenção de `pairing_codes`: purga automática (30 dias após expirar) via o Cron diário já
  existente (mesmo horário da reconciliação Stripe, 09:00 UTC).
- [x] Painel "Meus dados" no portal (`FamilyPortal.tsx`) — botão de exportação (baixa um `.json`)
  e exclusão (confirmação em duas etapas, mesmo padrão de "desvincular todos os aparelhos").
- [x] Política de Privacidade (`LegalPage.tsx` §5/§6) atualizada — já prometia os dois por e-mail;
  agora descreve o caminho self-service real, mantendo o e-mail como alternativa.
- [x] `docs/plano-comercial-backend.md` e `app/server-accounts/README.md` atualizados.

## Fora de escopo (explicitamente adiado)
- **Consentimento parental específico pro multiplayer** (também citado em G13) — não é só mais um
  endpoint: exige decidir QUANDO capturar (cadastro? primeiro pareamento?), O QUE exatamente está
  sendo consentido (o portal já tem o parental gate + Termos/Privacidade aceitos no cadastro —
  falta clareza sobre se isso já basta ou se precisa de um consentimento SEPARADO e explícito só
  pro multiplayer), e como tratar as famílias que já existem hoje sem esse registro. Decisão de
  produto, não só técnica — ver `CONTEXT.md`.
- G4 (apelido/texto livre — já tem `nicknameFilter.ts`, mas não é o assunto deste laboratório) e
  G15 (config/infra) continuam fora, não pedidos nesta rodada.
- Exportação/exclusão não cobrem `product_events` (100% anônimo por `device_id`, sem vínculo com
  família — segue documentado assim desde o lab-99) nem dados que só existem no `localStorage` da
  criança (fora do alcance do backend por desenho).
