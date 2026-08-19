# Laboratório 21 — Apelido seguro no onboarding (não solicitar nome real)

Status: concluído
Início: 2026-08-17
Fim: 2026-08-17
Commit inicial: 6729272f239f41226fac142b57fb522dec067efa

## Objetivo do laboratório
Como sugerido em `labs/lab-20-ranking-local/CONTEXT.md` ("Nova revisão de `prompt.md` contra o
código"), revisei o backlog e os critérios de segurança (`docs/prompts/01-seguranca.md`) contra o
estado atual do jogo. A maioria dos itens **[MUST]** de autenticação/autorização/pagamento não se
aplica ainda (não existe conta/backend — item de infraestrutura ainda bloqueado pela decisão do
usuário). Mas um item **[MUST]** da seção 1 (segurança infantil, a prioridade máxima do documento)
já se aplica ao código atual e está sendo violado:

> "Nome de exibição pode ser um apelido gerado, não nome real." (`docs/prompts/01-seguranca.md` §1)

`src/components/Onboarding.tsx` pede "Seu nome" com placeholder "Digite seu nome" — um convite
direto pra criança digitar o nome real dela. Esse nome depois:
- fica visível pra qualquer outro jogador conectado na mesma rede local (multiplayer, lab-06) —
  aparece flutuando acima do avatar de cada jogador remoto;
- aparece no painel de ranking (lab-20), visível a todos os conectados;
- é enviado em mensagens de chat (lab-12) junto com cada `messageId`.

Ou seja, um nome real digitado aqui hoje já vaza pra qualquer outro dispositivo na mesma rede —
não é uma dívida teórica, é o comportamento atual. É um item MUST de segurança infantil, não uma
feature nova; trato como correção, não como polimento opcional.

## Funcionalidades planejadas
- [x] `Onboarding.tsx`: trocar o rótulo/placeholder de "nome" pra "apelido de explorador(a)",
      deixando claro que não deve ser o nome real (linguagem apropriada pra criança de ~10 anos,
      não um aviso legal).
- [x] Gerador de apelido (`src/data/nicknames.ts`, novo, mesmo padrão de catálogo fechado de
      `chatMessages.ts`) — combina adjetivo + animal/tema de aventura + número, ex.
      "RaposaCorajosa42". Botão "🎲 Gerar apelido" no onboarding preenche o campo automaticamente;
      criança ainda pode editar/digitar o próprio apelido (não é travado só no gerador — o
      objetivo é desencorajar nome real, não impedir customização).
- [x] Verificação: `npm run build` passa; testado no navegador (perfil temporário limpo com
      backup/restauração) — gerar apelido, criar perfil, confirmado via `localStorage` que o
      apelido gerado foi salvo corretamente. Ver `CONTEXT.md`.

## Fora de escopo (explicitamente adiado)
- Trocar perfis já criados (`localStorage`) — só afeta onboarding de perfil novo; não migra
  nomes já salvos de sessões anteriores (fora do MVP de um laboratório pequeno, e sem uma forma
  de saber se um nome salvo é real ou não).
- Qualquer item MUST de autenticação/pagamento/RLS de `01-seguranca.md` §2–4 — todos dependem de
  conta/backend, que segue bloqueado por decisão de infraestrutura do usuário.
