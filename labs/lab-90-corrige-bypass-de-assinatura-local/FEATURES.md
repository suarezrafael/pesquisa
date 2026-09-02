# Laboratório 90 — corrige bypass de assinatura via cache local de entitlement

Status: concluído
Início: 2026-08-24
Fim: 2026-08-24
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
- [x] **Corrigir `useEntitlement.refresh()`** para tratar um `401` do `/entitlement` como rejeição
  autoritativa (sobrescreve o cache pra `active: false` imediatamente), mantendo o comportamento
  atual de "preserva o cache" só pros casos que são de fato falha de rede/servidor (offline, 5xx).
- [x] **Extraída a decisão como função pura testável** — `shouldTrustCachedEntitlementOnFailure(status:
  number): boolean` em `app/src/state/entitlementStorage.ts`, coberta por 3 casos novos em
  `entitlementStorage.test.ts` (`npm run test`, agora 34 testes).
- [x] **Teste ao vivo da correção contra produção real** (não simulado): no dev server local,
  com `VITE_ACCOUNTS_API_URL` já apontando pro Worker de contas de produção (`.env`), injetado via
  `localStorage` um perfil válido + `{token: "token-forjado-nao-existe", active: true, expiresAt:
  null}`. Ao recarregar a página, a chamada real de revalidação recebeu o 401 real do Worker e o
  `localStorage` foi corrigido sozinho pra `active: false` — confirmado lendo o valor depois do
  reload. Abrindo a lojinha na aba "Chapéus", os itens de assinante (Coroa de Diamante, Boné
  Holográfico, Laço Estelar) apareceram corretamente como `🔒 Assinantes`, não liberados. Não foi
  reproduzido o bug ANTES da correção com um revert temporário de código — a leitura do código já
  deixava o mecanismo do bug inequívoco (`if (!res.ok) return` incondicional descartando até uma
  resposta 401 explícita), e o teste ao vivo pós-fix confirma que o caminho de correção funciona
  fim a fim contra o servidor real, que é o que importa pra fechar o achado.
- [x] **Deploy em produção**: frontend via `npx vercel --prod --yes` (após 4 tentativas com "fetch
  failed" transitório, mesmo padrão intermitente já visto antes nesta sessão) — confirmado
  `https://missaoaprendizado.com` e `app-two-flax-92.vercel.app` apontando pro novo build. Sem
  mudança no Worker de contas (o bug era só no cliente).

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
