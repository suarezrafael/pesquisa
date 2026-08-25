# Laboratório 90 — corrige bypass de assinatura via cache local de entitlement

Status: em andamento
Início: 2026-08-24
Fim: -
Commit inicial: c54bcf05f240b7b485f15014b11ece7323708bb8

## Objetivo do laboratório
Fechar G6 de `docs/prompts/05-escala-e-viabilidade.md` (próximo item de maior severidade em
aberto, com `[receita]`, depois de G3/G4/G5 resolvidos nos labs 88-89): "editar uma chave de
`localStorage` libera todo o conteúdo de assinante".

Investigação confirmou que é um bug real e explorável, não só uma preocupação teórica:
`useEntitlement.ts:refresh()` chama `GET /entitlement` no Worker de contas a cada carregamento do
jogo pra revalidar o token salvo. O Worker (`server-accounts/src/index.ts:handleEntitlement`)
responde **401** com `{active: false}` sempre que o token não é um JWT válido assinado pelo
servidor (`jwtVerify` falha) — uma rejeição explícita e autoritativa, não uma falha de rede. Mas o
código do cliente trata QUALQUER resposta não-200 do mesmo jeito: `if (!res.ok) return`, mantendo
o que já estava em cache **sem sobrescrever**. Resultado: `localStorage.setItem('jogo-educativo:
entitlement', JSON.stringify({token: 'qualquer-coisa', active: true, expiresAt: null}))` (ação
trivial via devtools) libera todos os cosméticos de assinante permanentemente — a chamada de
revalidação roda, recebe o 401 correto, e ainda assim não corrige nada porque o código descarta a
resposta.

Isso não afeta a regra "cosméticos nunca ficam disponíveis via moeda" (`progression.ts:
unlockGeneric`, já coberta por teste — `unlockAvatar`/`unlockHat` recusam item `subscriptionOnly`
mesmo com moedas suficientes) — o problema é só na fonte de verdade do próprio flag de assinatura
ativa, que hoje é uma string editável no navegador sem verificação confiável.

## Funcionalidades planejadas
- [ ] **Corrigir `useEntitlement.refresh()`** para tratar um `401` do `/entitlement` como rejeição
  autoritativa (sobrescreve o cache pra `active: false` imediatamente), mantendo o comportamento
  atual de "preserva o cache" só pros casos que são de fato falha de rede/servidor (offline, 5xx) —
  não regredir a filosofia "funciona offline" já documentada no arquivo.
- [ ] **Extrair a decisão como função pura testável**, no espírito de
  `docs/prompts/03-arquitetura-sistema.md` (lógica de domínio separada de código de UI/rede) — algo
  como `shouldTrustCachedEntitlementOnFailure(status: number): boolean`, coberta por
  `npm run test`.
- [ ] **Teste ao vivo do exploit antes e depois da correção**: no dev server, editar
  `localStorage` manualmente pra simular o bypass, confirmar que hoje realmente libera os
  cosméticos (reproduzir o bug antes de corrigir), e confirmar que depois da correção o jogo volta
  sozinho pro estado correto assim que a revalidação roda.
- [ ] **Deploy do fix** (é só frontend — Vercel a partir do git, sem mudança no Worker).

## Fora de escopo (explicitamente adiado)
- **"Todo o progresso pago mora só no aparelho, sem backup"** — a outra metade de G6. Diferente do
  bug de entitlement acima (que é puramente um bug de confiança na fonte de verdade errada), isso
  exigiria sincronizar progresso de jogo (XP, moedas, cosméticos desbloqueados) com o backend,
  associado a uma identidade de família/criança — conflita diretamente com a decisão de arquitetura
  já documentada em `CLAUDE.md`/`README.md` de manter o jogo "frontend-only pra gameplay
  (`localStorage`, sem contas, sem PII de criança)" e amplia o dado retido sobre uma criança. É uma
  decisão de produto/privacidade própria (mesmo padrão de G4 no lab-89), não algo pra decidir
  sozinho numa auditoria de segurança — precisa de conversa com o usuário antes de qualquer
  implementação.
