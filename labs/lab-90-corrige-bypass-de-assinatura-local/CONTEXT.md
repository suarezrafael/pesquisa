# Contexto — Laboratório 90 — corrige bypass de assinatura via cache local de entitlement

Preenchido em: 2026-08-24
Commit inicial → final: c54bcf05f240b7b485f15014b11ece7323708bb8..HEAD

## O que foi feito
- **`app/src/state/entitlementStorage.ts`**: nova função `shouldTrustCachedEntitlementOnFailure(status:
  number): boolean` — `false` só para `401` (rejeição explícita do servidor), `true` para qualquer
  outro código de falha (rede/5xx/etc., preserva o comportamento "funciona offline" já existente).
- **`app/src/state/useEntitlement.ts`**: `refresh()` agora usa essa função. Antes: `if (!res.ok)
  return` descartava QUALQUER resposta não-200, inclusive um `401` que é o servidor dizendo
  explicitamente "este token não vale nada". Depois: um `401` sobrescreve o cache local pra
  `{token, active: false, expiresAt: null}` imediatamente; outros erros continuam preservando o
  cache como antes.
- **`app/src/state/entitlementStorage.test.ts`** (novo): 3 casos cobrindo a função pura — `401` →
  não confia no cache; `500`/`503` → confia; `404`/`429` → confia. Suíte total: 34 testes (`npm
  run test`).
- **Deploy em produção**: só frontend (`npx vercel --prod --yes`) — o Worker de contas
  (`server-accounts`) não precisou de nenhuma mudança, o bug era inteiramente do lado do cliente.

## O bug (confirmado real, não hipotético)
`useEntitlement.ts:refresh()` chama `GET /entitlement` a cada carregamento do jogo pra revalidar o
token de assinatura salvo. `server-accounts/src/index.ts:handleEntitlement` responde `401` com
`{active: false}` sempre que o `Authorization: Bearer <token>` não é um JWT válido assinado pelo
Worker (`jwtVerify` falha) — confirmado lendo o handler, é um JWT de verdade, não um lookup de
string opaca, então um token forjado nunca passa nessa verificação. O problema nunca foi
"forjar um token que o servidor aceite" (isso não dá pra fazer sem o segredo do servidor) — era
que o CLIENTE, ao receber a rejeição correta do servidor, **jogava a resposta fora** em vez de
aplicá-la: `if (!res.ok) return` tratava um `401` exatamente igual a uma queda de rede, então o
`{active: true}` que alguém tivesse editado direto no `localStorage` (ação trivial via devtools:
`localStorage.setItem('jogo-educativo:entitlement', JSON.stringify({token: 'qualquer-coisa',
active: true, expiresAt: null}))`) sobrevivia PARA SEMPRE, mesmo com a revalidação rodando
corretamente a cada sessão.

## Como foi verificado
Não foi feito um revert temporário de código pra "reproduzir o bug antes de corrigir" — a leitura
do código já deixava o mecanismo inequívoco (`if (!res.ok) return` incondicional, sem distinguir
401 de erro de rede). O que importa verificar de verdade é que a CORREÇÃO funciona fim a fim
contra o servidor real, não só em teste unitário isolado — e isso foi feito: no dev server local
(`.env` já aponta `VITE_ACCOUNTS_API_URL` pro Worker de produção), foi injetado no `localStorage`
um perfil válido de jogador + um entitlement forjado (`active: true`, token inexistente). Ao
recarregar a página, a chamada real de revalidação (contra o Worker de produção, não mockada)
recebeu o 401 real e o código corrigido reescreveu o `localStorage` sozinho pra `active: false` —
confirmado lendo o valor via `javascript_tool` depois do reload. Abrindo a lojinha (aba
"Chapéus"), os três itens de assinante (Coroa de Diamante, Boné Holográfico, Laço Estelar)
apareceram como `🔒 Assinantes`, não liberados — a UI reflete corretamente o estado corrigido.

## Decisões técnicas tomadas
- **Distinguir 401 de outros erros, não tratar toda falha igual.** A filosofia "funciona offline"
  documentada no arquivo original é uma decisão de produto válida (o jogo deve continuar
  utilizável numa viagem de carro sem internet, por exemplo) — o bug não estava em preservar cache
  em falha de rede, estava em não diferenciar isso de uma rejeição explícita e autoritativa do
  servidor. A correção é cirúrgica: só o caso 401 muda de comportamento.
- **Não foi feito nenhum revert de código pra demonstrar o bug ao vivo antes da correção** —
  decisão consciente de custo/benefício: o mecanismo do bug já estava provado por leitura de
  código (`if (!res.ok) return` sem distinção de status), e reverter/re-aplicar só pra gravar um
  "antes" ao vivo não mudaria a confiança no diagnóstico, só custaria tempo. O teste ao vivo focou
  onde realmente havia incerteza: se a correção se comporta bem contra o servidor real (não um
  mock), o que foi confirmado.
- **Não alterado o Worker de contas** — o `handleEntitlement` já estava correto (401 + `{active:
  false}` é exatamente a resposta certa); o bug inteiro era de confiança do lado do cliente na
  própria resposta do servidor.

## Pendências / dívidas conhecidas
- Nenhuma nova. A extração da função pura deixa a regra testável e documentada — se um dia a API
  de entitlement mudar de forma (ex.: passar a usar `403` em vez de `401` pra alguma variante de
  rejeição), só essa função precisa mudar.

## Funcionalidades planejadas que NÃO foram concluídas
- Nenhuma do escopo definido no `FEATURES.md` ficou de fora.

## O que o próximo laboratório deve desenvolver
Com G3 (lab-88), G4/G5 (lab-89) e a metade "bypass" de G6 (este laboratório) resolvidos, os itens
de `docs/prompts/05-escala-e-viabilidade.md` seção 7 ainda em aberto são:
- **A outra metade de G6** ("progresso pago mora só no aparelho, sem backup/restauração") —
  explicitamente fora de escopo aqui, precisa de uma conversa de produto/privacidade própria (ver
  "Fora de escopo" no `FEATURES.md` deste laboratório) antes de qualquer implementação, porque
  conflita com a decisão de arquitetura documentada de manter o jogo sem contas/sem PII de
  criança.
- **G7 (resgate de pareamento) — só PARCIALMENTE resolvido no lab-88.** A corrida (`select`+`update`
  virou `UPDATE` atômico) e a força bruta (rate limiter em Postgres, 8/60s) foram corrigidas — ver
  `labs/lab-88-protecao-contra-sobrecarga/CONTEXT.md`. Mas o resto do achado original **continua
  em aberto**: o token de entitlement não tem `jti`/revogação, não tem vínculo com aparelho, e não
  tem limite de quantos aparelhos por família podem resgatar o entitlement — "um código vazado em
  grupo de WhatsApp vira assinatura compartilhada por 6 meses" ainda é verdade hoje.
- **G8** (webhook do Stripe sem idempotência, `status` do schema restritivo demais pros estados
  reais do Stripe/Pix — `incomplete`, `unpaid`, etc.) — ainda não avaliado em nenhum laboratório
  desta rodada de segurança.
- **G9** (`/health` anônimo consumindo banco) — **já resolvido no lab-88** (resposta estática,
  sem consulta ao banco); o texto de `05-escala-e-viabilidade.md` em si ainda não foi atualizado
  pra refletir isso (dívida de documentação, não de código).

Recomendação: entre o que resta de G7 (revogação/vínculo de aparelho) e G8 (webhook do Stripe),
**G8 tem risco de receita mais direto e imediato** (divergência de estado de cobrança real, não
uma janela de compartilhamento) — seria o próximo item recomendado, mas vale confirmar com o
usuário qual prioridade importa mais antes de começar, já que os dois são de porte considerável.

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`
- Frontend deployado em produção (`https://missaoaprendizado.com`,
  `app-two-flax-92.vercel.app`) com o fix. Worker de contas não mudou, sem deploy necessário.
- Como verificar: `cd app && npm run test` (34 testes) e `npx tsc -b` (limpo). Verificação ao vivo
  documentada acima não é repetível sem reintroduzir o bug de propósito — não há um script de
  regressão automatizado pra isso porque exigiria mockar `fetch`/JWT do servidor; ficou registrado
  aqui como evidência manual em vez de teste automatizado.
