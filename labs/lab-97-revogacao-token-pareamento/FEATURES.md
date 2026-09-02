# Laboratório 97 — token de pareamento: jti, revogação e limite de aparelhos

Status: concluído
Início: 2026-08-25
Fim: 2026-08-25
Commit inicial: fd2536536f8ae3e89f94a45fd23761ec47d38002

## Objetivo do laboratório
Corrigir o resto de G7 (`docs/prompts/05-escala-e-viabilidade.md`, `[segurança/receita]`), escolhido
pelo usuário logo após o lab-96. Do texto original de G7: "rate limit" e a corrida de duas
requisições simultâneas resgatando o mesmo código já foram corrigidos no lab-88 (rate limit
DB-backed em `pairing_redeem_attempts`, `UPDATE` atômico em vez de `select`+`update`). O que resta:
"o token não tem `jti`, não tem revogação, não tem vínculo com aparelho, não tem limite de
aparelhos por família: um código vazado em grupo de WhatsApp vira assinatura compartilhada por 6
meses" — hoje um JWT de entitlement, uma vez emitido, é válido por 180 dias sem NENHUMA forma de
invalidá-lo antes da expiração natural, não importa o que aconteça (código vazado, família cancela
suspeitando de abuso, etc.).

## Investigado antes de planejar
- **`handlePairingRedeem`** (`app/server-accounts/src/index.ts` ~L273): emite o JWT via `SignJWT`
  sem `jti`, sem registrar em lugar nenhum que aquele token foi emitido — puramente stateless, então
  não existe absolutamente nenhum jeito de invalidar um token específico antes de expirar.
- **`handleEntitlement`** (~L321): só verifica assinatura + `payload.sub` — não consulta nada além
  disso. Qualquer JWT validamente assinado por nós, não importa quantas cópias existam por aí,
  passa.
- **Cliente (`app/src/state/useEntitlement.ts`)**: o token é opaco pro cliente (só guarda a string) —
  adicionar `jti` dentro do JWT não exige NENHUMA mudança no client do jogo.
- **`FamilyPortal.tsx`**: já tem `authorizedFetch` (helper existente que anexa o JWT do Neon Auth do
  responsável, usado por `/pairing/generate`) — mesmo padrão serve pra um novo botão "desvincular
  todos os aparelhos".
- **`requireUserId`** (~L67) já verifica o JWT do Neon Auth via JWKS — reaproveitado pro novo
  endpoint de revogação (autenticado como o RESPONSÁVEL, não pelo token de entitlement da criança).
- **Decisão de produto confirmada com o usuário**: limite de **3 aparelhos** (tokens não revogados)
  simultâneos por família. Ao passar do limite, revoga o mais antigo automaticamente — zero fricção
  quando a criança troca de aparelho, sem precisar de UI de "gerenciar aparelhos" nesta primeira
  versão.
- **Compatibilidade com tokens já emitidos**: tokens ativos hoje (até 180 dias, famílias pagantes de
  verdade) não têm `jti` nem registro em tabela nenhuma. A verificação em `/entitlement` precisa
  tratar a AUSÊNCIA de `jti` como "token antigo, confia só na assinatura" (comportamento de hoje) —
  nunca invalidar de uma vez só tudo que já foi emitido antes deste laboratório.

## Funcionalidades planejadas
- [x] **`schema.sql`**: nova tabela `entitlement_tokens` (`jti` uuid chave primária,
  `family_account_id`, `issued_at`, `revoked_at` nullable). Aplicado no banco Neon de produção via
  `npm run migrate` e conferido direto (colunas + índices existem).
- [x] **`handlePairingRedeem`**: gera um `jti` (`crypto.randomUUID()`), registra em
  `entitlement_tokens` e inclui no JWT (`.setJti(jti)`). Antes de emitir, checa quantos tokens não
  revogados a família já tem — se atingiu o limite de 3, revoga o mais antigo primeiro.
- [x] **`handleEntitlement`**: depois de verificar assinatura/expiração, se o JWT tiver `jti`,
  consulta `entitlement_tokens` — se `revoked_at` não for nulo (ou o `jti` não existir na tabela,
  caso raro), trata como inativo. Se o JWT NÃO tiver `jti` (token emitido antes deste laboratório),
  mantém o comportamento de hoje (confia na assinatura/expiração) — `isTokenRevoked` (`domain.ts`)
  encapsula essa regra de compatibilidade.
- [x] **Novo endpoint `POST /entitlement/revoke-all`**: autenticado como o responsável
  (`requireUserId`), revoga (`revoked_at = now()`) todos os tokens não revogados da família dele.
  Conferido que exige autenticação (`401` sem Bearer token).
- [x] **`FamilyPortal.tsx`**: botão "Desvincular todos os aparelhos" (confirmação em duas etapas,
  sem `window.confirm` nativo — consistente com o resto do portal) chamando o endpoint acima. CSS
  novo (`.text-button`, `.secondary-button`, `.pairing-revoke-all`) em `index.css`, reaproveitando
  a cor de erro já usada em `.field-hint-error`.
- [x] Testes de domínio: `isTokenRevoked` (4 testes, cobrindo compatibilidade retroativa) e
  `isAtDeviceLimit`/`MAX_ACTIVE_DEVICES_PER_FAMILY` (4 testes) — total do Worker: 21 → 29, todos
  passando. `npx tsc --noEmit` (Worker) e `npx tsc -b` (app principal, por causa do
  `FamilyPortal.tsx`) limpos.
- [x] **Migração aplicada + Worker e frontend deployados em produção**
  (`https://missao-aprender-accounts.rafaelvs.workers.dev`, `https://missaoaprendizado.com`).
- [x] **Testado ao vivo contra produção real, de ponta a ponta** (não simulação): usando uma
  família já existente no banco (sem mexer na assinatura/tokens reais dela), inseridos 4 códigos de
  pareamento sintéticos e resgatados em sequência contra o Worker real. Resultado: os 3 primeiros
  tokens saíram todos não revogados; ao resgatar o 4º, o `jti` do 1º apareceu com `revoked_at`
  preenchido automaticamente — o limite de 3 aparelhos funcionando exatamente como desenhado.
  `/entitlement` com o token revogado devolveu `401 {"active":false}`; com o token mais recente
  devolveu `200 {"active":true,...}` (essa família tem assinatura de teste real ativa — nada foi
  alterado nela). Códigos e tokens de teste removidos do banco depois.

## Fora de escopo (explicitamente adiado)
- **UI de "gerenciar aparelhos"** (ver lista de dispositivos pareados, revogar um específico) — a
  v1 só tem "revogar todos", que já cobre o caso de uso principal (código vazado) sem precisar de
  uma tela nova. Fica pra um laboratório futuro se o usuário quiser granularidade por aparelho.
- **Vínculo real com identidade de aparelho** (fingerprint, user-agent, etc.) — o "limite de
  aparelhos" aqui é por CONTAGEM DE TOKENS emitidos, não por identificação de hardware; um usuário
  malicioso ainda pode, em teoria, pedir vários tokens até o limite. O rate limit de
  `/pairing/redeem` (lab-88) já dificulta isso na prática (só quem TEM o código consegue pedir um
  token).
- **Job de reconciliação Stripe↔banco** e **bug de morros invisíveis** (lab-95) continuam registrados
  em seus respectivos `CONTEXT.md`, não fazem parte deste laboratório.
