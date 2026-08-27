# Laboratório 100 — UI de gerenciar aparelhos por família (resto de G7)

Status: concluído
Início: 2026-08-26
Fim: 2026-08-26
Commit inicial: e7dd48bfe406bc5303629e41e83736deca3f340a

## Objetivo do laboratório
Fechar o item que ficou fora de escopo do lab-97 de propósito: hoje o responsável só consegue
"desvincular todos os aparelhos" de uma vez (`POST /entitlement/revoke-all`); não há como ver
quantos/quais aparelhos estão pareados nem revogar um específico (ex.: tirar só o aparelho antigo
do filho mais velho sem afetar o do mais novo). Escolhido pelo usuário logo após o lab-99, entre
G10/reconciliação Stripe/UI de aparelhos/NPS (`labs/lab-97-revogacao-token-pareamento/CONTEXT.md`,
"O que o próximo laboratório deve desenvolver").

## Investigado antes de planejar
- **`app/server-accounts/schema.sql`** já tem `entitlement_tokens` (`jti`, `family_account_id`,
  `issued_at`, `revoked_at` nullable) desde o lab-97 — não precisa de coluna nova, só de novas
  consultas/rotas em cima da tabela existente.
- **`handleRevokeAllDevices`** (`index.ts`) é o template de autenticação/autorização a seguir:
  `requireUserId` (JWT do Neon Auth do RESPONSÁVEL, nunca o token de entitlement da criança) +
  `findOrCreateFamilyAccount` pra achar o `family_account_id` de quem chama.
- **Sem fingerprint/user-agent registrado** (decisão explícita do lab-97, "Documentado como fora de
  escopo desde o início") — a identificação de cada aparelho na UI será só a data de pareamento
  (`issued_at`), não um nome de aparelho/navegador. Continua fora de escopo aqui também: registrar
  user-agent seria mais dado coletado do fluxo da criança sem necessidade clara, quando a data já
  resolve o caso de uso principal ("qual é o mais antigo/mais novo").
- **`app/src/components/FamilyPortal.tsx`**: `PairingCodeGenerator` já tem o padrão de
  confirmação em duas etapas (`revokeConfirming`/`handleRevokeAll`) e as classes CSS
  `.text-button`/`.secondary-button`/`.pairing-revoke-all` (lab-97) — a lista de aparelhos reaproveita
  o mesmo padrão visual, por item.
- Todas as rotas deste Worker são planas (`url.pathname === '/algo'`), sem parâmetro de caminho
  dinâmico em nenhum lugar — a rota de revogação individual segue o mesmo estilo (`jti` no corpo
  JSON, não na URL), consistente com o resto do arquivo.

## Funcionalidades planejadas
- [x] **`GET /entitlement/devices`** (`index.ts`, novo): autenticado como o responsável, devolve
  todos os tokens da família (`jti`, `issuedAt`, `revokedAt`) ordenados por `issued_at desc` — a UI
  decide o que mostrar (ativos com botão de revogar, revogados como histórico).
- [x] **`POST /entitlement/revoke`** (`index.ts`, novo): autenticado como o responsável, corpo
  `{ jti }`. Revoga SÓ se o `jti` pertencer à família de quem chama e ainda não estiver revogado
  (`where jti = ... and family_account_id = ... and revoked_at is null`) — mesma resposta genérica
  (404) tanto pra "não existe" quanto pra "não é seu", pra não vazar se um `jti` de outra família
  existe.
- [x] **`app/src/components/FamilyPortal.tsx`**: novo bloco "Aparelhos pareados" dentro de
  `PairingCodeGenerator`, listando aparelhos ativos com data de pareamento e botão de revogar
  individual (confirmação em duas etapas, mesmo padrão do "revogar todos"). Mantém o botão
  "Desvincular todos" existente — cobre o caso de uso diferente ("vazou o código, corta tudo") que
  a lista granular não substitui.
- [x] Testes de domínio: nenhuma lógica pura nova surgiu (confirmado ao implementar — é
  consulta/autorização SQL, sem cálculo). Os 36 testes existentes do Worker continuam passando.
- [x] Testado ao vivo contra produção real, usando a família real do próprio usuário (sem tocar na
  assinatura dela): pareados 2 códigos reais via a UI de `/familia` (sessão já autenticada no
  navegador), redimidos via `POST /pairing/redeem` (script), confirmando 2 aparelhos na lista.
  Revogado 1 aparelho pela UI (botão "Revogar" → "Confirmar revogação") — o item some da lista, o
  outro continua intacto. Confirmado via `GET /entitlement` com os dois tokens: o revogado devolve
  `401`, o outro `200`. Confirmado via JS na própria aba autenticada (token nunca sai do navegador):
  `POST /entitlement/revoke` com um `jti` inexistente devolve `404`; `GET /entitlement/devices` e
  `POST /entitlement/revoke` sem token devolvem `401`. Os dois aparelhos de teste foram revogados ao
  final (nenhum artefato de teste ficou pareado na conta real).

## Fora de escopo (explicitamente adiado)
- **Fingerprint/nome de aparelho** (ex.: "iPhone de Ana") — exigiria capturar user-agent ou pedir
  um apelido manual pro responsável; nenhum dos dois é necessário pro caso de uso principal
  (revogar o mais antigo/específico por data). Registrar como possível melhoria futura, não
  necessidade.
- **Job de reconciliação Stripe↔banco** (G8), **G10** (CI/CD), **NPS de responsáveis** — outras
  opções que o usuário considerou e não escolheu desta vez; continuam no backlog.
