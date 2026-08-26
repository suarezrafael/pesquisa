# Laboratório 97 — token de pareamento: jti, revogação e limite de aparelhos

Status: em andamento
Início: 2026-08-25
Fim: -
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
- [ ] **`schema.sql`**: nova tabela `entitlement_tokens` (`jti` uuid chave primária,
  `family_account_id`, `issued_at`, `revoked_at` nullable).
- [ ] **`handlePairingRedeem`**: gera um `jti` (`crypto.randomUUID()`), registra em
  `entitlement_tokens` e inclui no JWT (`.setJti(jti)`). Antes de emitir, checa quantos tokens não
  revogados a família já tem — se atingiu o limite de 3, revoga o mais antigo primeiro.
- [ ] **`handleEntitlement`**: depois de verificar assinatura/expiração, se o JWT tiver `jti`,
  consulta `entitlement_tokens` — se `revoked_at` não for nulo (ou o `jti` não existir na tabela,
  caso raro), trata como inativo. Se o JWT NÃO tiver `jti` (token emitido antes deste laboratório),
  mantém o comportamento de hoje (confia na assinatura/expiração).
- [ ] **Novo endpoint `POST /entitlement/revoke-all`**: autenticado como o responsável
  (`requireUserId`), revoga (`revoked_at = now()`) todos os tokens não revogados da família dele.
- [ ] **`FamilyPortal.tsx`**: botão "Desvincular todos os aparelhos" (com confirmação — ação
  destrutiva do ponto de vista da criança, que precisaria parear de novo) chamando o endpoint acima.
- [ ] Testes de domínio pra qualquer lógica pura extraída (ex.: "este token está revogado dado o
  jti do JWT e a linha do banco, se houver" — decide o comportamento de compatibilidade).
- [ ] Testado ao vivo contra produção real: parear um código, confirmar que `/entitlement` funciona;
  revogar via `/entitlement/revoke-all`; confirmar que o MESMO token agora falha; parear de novo e
  confirmar que funciona de novo (novo `jti`); simular 4 pareamentos seguidos da mesma família e
  confirmar que o mais antigo é revogado automaticamente no 4º.

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
