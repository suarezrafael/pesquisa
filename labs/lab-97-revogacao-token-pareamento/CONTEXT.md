# Contexto — Laboratório 97 — token de pareamento: jti, revogação e limite de aparelhos

Preenchido em: 2026-08-25
Commit inicial → final: fd2536536f8ae3e89f94a45fd23761ec47d38002..38af96b8e514171e17813bd5bd27be7bce1776c1

## O que foi feito
Corrigiu o resto de G7 (`docs/prompts/05-escala-e-viabilidade.md`, `[segurança/receita]`), escolhido
pelo usuário logo após o lab-96. Rate limit e a corrida de resgate duplo do código de 6 dígitos já
tinham sido corrigidos no lab-88; o que faltava era o token de entitlement em si ser puramente
stateless — uma vez emitido, válido por 180 dias sem nenhum jeito de invalidar antes da expiração.

- **`app/server-accounts/schema.sql`**: nova tabela `entitlement_tokens` (`jti` uuid chave
  primária, `family_account_id`, `issued_at`, `revoked_at` nullable) — cada linha é um token
  realmente emitido.
- **`app/server-accounts/src/domain.ts`**: `isTokenRevoked(jti, tokenRow)` — decide se um
  entitlement deve ser tratado como revogado, com a compatibilidade retroativa como regra central
  (token SEM `jti` nunca conta como revogado, não importa o que tenha na tabela). `isAtDeviceLimit`
  + `MAX_ACTIVE_DEVICES_PER_FAMILY = 3` (confirmado com o usuário). 8 testes novos.
- **`app/server-accounts/src/index.ts`**:
  - `handlePairingRedeem`: antes de emitir um token novo, conta quantos tokens não revogados a
    família já tem; se `isAtDeviceLimit`, revoga o mais antigo (`order by issued_at asc limit 1`)
    antes de prosseguir. Gera um `jti` de verdade (`crypto.randomUUID()`), grava em
    `entitlement_tokens`, inclui no JWT via `.setJti(jti)`.
  - `handleEntitlement`: extrai `payload.jti` depois de verificar a assinatura; se presente,
    consulta `entitlement_tokens` e usa `isTokenRevoked` pra decidir se recusa (`401`). Se ausente
    (token emitido antes deste laboratório), comportamento idêntico ao de antes.
  - Novo endpoint `POST /entitlement/revoke-all`, autenticado como o RESPONSÁVEL (`requireUserId`,
    JWT do Neon Auth — nunca pelo token de entitlement da criança), revoga todos os tokens não
    revogados da família de quem chama.
- **`app/src/components/FamilyPortal.tsx`**: botão "Desvincular todos os aparelhos" dentro de
  `PairingCodeGenerator`, com confirmação em duas etapas (não `window.confirm` nativo). Novo CSS
  em `index.css` (`.text-button`, `.secondary-button`, `.pairing-revoke-all`), reaproveitando a cor
  de erro já usada em `.field-hint-error`.
- **Migração aplicada no banco Neon de produção** e conferida direto (colunas/índices da tabela
  nova existem).
- **Worker e frontend deployados em produção**
  (`https://missao-aprender-accounts.rafaelvs.workers.dev`, `https://missaoaprendizado.com`).
- **Testado ao vivo, de ponta a ponta, contra produção de verdade**: usando uma família já
  existente no banco (sem tocar na assinatura/tokens reais dela — só criando e depois removendo
  registros de teste isolados), inseridos 4 códigos de pareamento sintéticos e resgatados em
  sequência contra o Worker real:
  - Os 3 primeiros redeems: todos não revogados.
  - No 4º redeem: o `jti` do 1º token apareceu com `revoked_at` preenchido automaticamente — o
    limite de 3 aparelhos evictando o mais antigo, exatamente como desenhado.
  - `GET /entitlement` com o token revogado: `401 {"active":false}`.
  - `GET /entitlement` com o token mais recente (não revogado): `200 {"active":true,
    "expiresAt":"2026-09-24T00:33:15.000Z"}` — confirma que a assinatura REAL dessa família
    (usada só de leitura) não foi alterada por nada deste teste.
  - `POST /entitlement/revoke-all` sem token: `401 {"error":"não autenticado"}` — endpoint
    corretamente fechado pra chamada anônima.
  - Códigos e tokens sintéticos removidos do banco ao final do teste.

## Decisões técnicas tomadas
- **Compatibilidade retroativa é a decisão central de todo o laboratório** — sem `isTokenRevoked`
  tratar a ausência de `jti` como "nunca revogado", QUALQUER família pagante com um token emitido
  antes deste laboratório (até 180 dias de gente pagando de verdade) perderia acesso no primeiro
  `/entitlement` depois do deploy. A troca é 100% transparente: tokens antigos continuam
  funcionando exatamente como antes até expirarem naturalmente; só tokens NOVOS (emitidos depois
  deste deploy) ganham a proteção de revogação.
- **Revogar o mais antigo automaticamente em vez de recusar o pareamento novo** — prioriza zero
  fricção pro caso comum (criança troca de aparelho) sobre uma UI de "gerenciar aparelhos" mais
  granular, que ficou fora de escopo (ver abaixo). Decisão de produto confirmada com o usuário
  junto com o número 3.
- **"Revogar todos" em vez de revogação por aparelho individual (v1)** — cobre o caso de uso
  principal ("meu código vazou, quero cortar tudo") sem precisar de uma tela nova de listar
  aparelhos pareados. Mais simples de implementar e testar, e o portal já tem o padrão de
  `authorizedFetch` pra reaproveitar.
- **Botão de confirmação em duas etapas em vez de `window.confirm` nativo** — não havia precedente
  desse padrão no código (procurado, não encontrado), e um diálogo nativo do navegador destoaria do
  resto do design do portal (`docs/prompts/02-design-profissional.md`).
- **Teste ao vivo usando uma família REAL já existente no banco, não uma sintética** — criar uma
  `family_accounts` do zero exigiria um `neon_auth."user"` de verdade (chave estrangeira), o que só
  existe via cadastro real no Neon Auth. Reaproveitar uma família existente (só lendo o estado dela,
  criando e depois apagando os PRÓPRIOS registros de teste) foi mais seguro e rápido que simular um
  cadastro completo — e por acaso ainda serviu de confirmação extra de que a assinatura de teste
  real dessa família continua intacta depois de tudo.

## Pendências / dívidas conhecidas
- **Sem UI de "gerenciar aparelhos"** (ver lista, revogar um específico) — só "revogar todos" existe
  hoje. Se o usuário quiser granularidade (ex.: um pai querendo tirar só o aparelho antigo do filho
  mais velho sem afetar o do mais novo), é o próximo passo natural.
- **"Limite de aparelhos" é por CONTAGEM de tokens emitidos, não por identidade de hardware** — não
  há fingerprint/user-agent/etc. registrado. Documentado como fora de escopo desde o início
  (`FEATURES.md`) — o rate limit de `/pairing/redeem` (lab-88) já limita bem quem consegue pedir um
  token em primeiro lugar (só quem tem o código).
- **`entitlement_tokens` não tem limpeza automática** de linhas antigas (tokens já expirados há
  muito tempo, revogados ou não) — mesma categoria de dívida menor já registrada pra
  `stripe_webhook_events` no lab-96. Não crítico no volume atual.

## Funcionalidades planejadas que NÃO foram concluídas
- Nenhuma — todos os itens de `FEATURES.md` foram concluídos e verificados (código, testes, deploy,
  teste ao vivo ponta a ponta contra produção real).

## O que o próximo laboratório deve desenvolver
- **UI de gerenciar aparelhos por família** (lista + revogação individual) — se o usuário quiser
  mais granularidade que "revogar todos".
- **Job de reconciliação Stripe↔banco** (G8, lab-96) e **bug de morros invisíveis** (lab-95)
  continuam em aberto, registrados em seus respectivos `CONTEXT.md`.
- Backlog normal de `prompt.md`/`05-escala-e-viabilidade.md` conforme prioridade do usuário. Da
  ordem de ataque original da auditoria de segurança, G3 a G9 estão todos resolvidos ou parcialmente
  resolvidos de propósito (G6, backup de progresso pago, aguardando decisão de produto) — os itens
  que restam são G10 (CI/CD) e G11 (observabilidade), ambos fora do escopo de qualquer laboratório
  até agora.

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`
- Como rodar/verificar o que foi construído neste laboratório:
  - `cd app/server-accounts && npm run test` — 29 testes de domínio, incluindo os 8 novos.
  - `npx tsc --noEmit` (`app/server-accounts/`) e `npx tsc -b` (`app/`) — typecheck limpo nos dois.
  - Produção: `curl https://missao-aprender-accounts.rafaelvs.workers.dev/health` deve responder
    `{"ok":true}`; o portal em `https://missaoaprendizado.com/familia` tem o botão "Desvincular
    todos os aparelhos" na seção de pareamento.
  - Schema já aplicado no banco Neon de produção, Worker e frontend já deployados — não é preciso
    rodar `npm run migrate`/`npm run deploy`/`vercel --prod` de novo pra ver o efeito deste
    laboratório.
