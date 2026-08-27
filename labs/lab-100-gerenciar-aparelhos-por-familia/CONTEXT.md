# Contexto — Laboratório 100 — UI de gerenciar aparelhos por família (resto de G7)

Preenchido em: 2026-08-26
Commit inicial → final: e7dd48bfe406bc5303629e41e83736deca3f340a..HEAD

## O que foi feito
Fechou o item que ficou fora de escopo do lab-97 de propósito: até aqui o responsável só conseguia
"desvincular todos os aparelhos" de uma vez; não havia como ver quantos/quais aparelhos estão
pareados nem revogar um específico. Escolhido pelo usuário logo após o lab-99, entre G10/
reconciliação Stripe/UI de aparelhos/NPS.

- **`app/server-accounts/src/index.ts`**:
  - `handleListDevices` (novo): autenticado via `requireUserId` (JWT do Neon Auth do
    RESPONSÁVEL), devolve todos os tokens de `entitlement_tokens` da família de quem chama
    (`jti`, `issuedAt`, `revokedAt`), ordenados por `issued_at desc`.
  - `handleRevokeDevice` (novo): autenticado do mesmo jeito, corpo `{ jti }`. O `update` só afeta
    a linha se `jti = ... and family_account_id = ... and revoked_at is null` — a checagem de
    família na MESMA query é o que impede revogar o aparelho de outra família; `404` genérico
    tanto pra "não existe" quanto pra "não é seu" (não vaza se um `jti` alheio existe).
  - Novas rotas: `GET /entitlement/devices`, `POST /entitlement/revoke` (corpo JSON com `jti`,
    seguindo o estilo já usado no resto do arquivo — rotas planas, sem parâmetro na URL).
  - Nenhuma tabela/coluna nova: reaproveita `entitlement_tokens` do lab-97 por completo.
- **`app/src/components/FamilyPortal.tsx`**: `PairingCodeGenerator` ganhou um bloco "Aparelhos
  pareados" (entre "Gerar código" e "Desvincular todos os aparelhos") — lista os aparelhos ATIVOS
  (`!revokedAt`) com a data de pareamento e um botão "Revogar" por item, com confirmação em duas
  etapas (`confirmingJti`/`handleRevokeDevice`, mesmo padrão do "revogar todos" do lab-97). A lista
  é recarregada (`loadDevices()`) depois de qualquer revogação — individual ou "revogar todos" —
  pra ficar sempre coerente com o servidor. Quando não há nenhum aparelho ativo, o bloco inteiro
  fica oculto (nenhuma lista vazia mostrada).
- **`app/src/index.css`**: `.device-list`/`.device-list-item` (novo) — mesmo separador visual do
  `.pairing-revoke-all` já existente, alinhado à esquerda por ser uma lista.
- **Deploy em produção**: Worker `server-accounts` e frontend, ambos sem bloqueio do classificador
  desta vez (só a migração/secret/deploy de infraestrutura NOVA costumam ser bloqueados; deploy de
  código sobre binding/schema já existentes passou direto).
- **Testado ao vivo, de ponta a ponta, contra produção real, usando a conta REAL do próprio
  usuário** (`rafaelv_s@hotmail.com`, sessão já autenticada no navegador via extensão Chrome —
  primeira vez neste projeto que a verificação ao vivo usa uma sessão de navegador real em vez de
  só chamadas de API por script, já que `GET /entitlement/devices`/`POST /entitlement/revoke`
  exigem um JWT de responsável de verdade, que nenhum script conseguiria forjar):
  - Gerados 2 códigos de pareamento pela UI do portal e resgatados via `POST /pairing/redeem`
    (script — esse endpoint nunca exigiu autenticação de responsável, só o código).
  - Recarregado o portal: bloco "Aparelhos pareados" apareceu com os 2 aparelhos, ordenados do
    mais recente pro mais antigo, cada um com "Revogar".
  - Clicado "Revogar" → "Confirmar revogação" no mais recente: o item sumiu da lista, mensagem
    "Aparelho revogado." apareceu, o outro aparelho continuou intacto.
  - Confirmado via `GET /entitlement` com os dois tokens (JWTs de entitlement capturados na
    resposta do `/pairing/redeem`): o token do aparelho revogado devolveu `401`, o do aparelho
    ainda ativo devolveu `200 {"active":true,...}`.
  - Confirmado via JavaScript executado DENTRO da própria aba autenticada (o JWT do responsável
    nunca saiu do navegador nem chegou até mim — a ferramenta de automação bloqueia
    explicitamente exfiltrar um JWT bruto): `POST /entitlement/revoke` com um `jti` inexistente
    (`00000000-...`) devolveu `404 {"error":"aparelho não encontrado"}`; `GET /entitlement/devices`
    com o token real devolveu `200` com os dois registros (um `revokedAt` preenchido, outro
    `null`) batendo exatamente com o que a UI mostrava.
  - Confirmado que `GET /entitlement/devices` e `POST /entitlement/revoke` SEM token devolvem
    `401` nos dois casos.
  - Revogado também o segundo (último) aparelho de teste ao final, deixando a conta real do
    usuário sem nenhum aparelho de teste pareado — a seção "Aparelhos pareados" voltou a ficar
    oculta (lista vazia).

## Decisões técnicas tomadas
- **Verificação ao vivo via sessão de navegador real (extensão Chrome), não só scripts** — os dois
  endpoints novos exigem um JWT de responsável assinado pelo Neon Auth (via JWKS), que nenhum
  script consegue forjar sem uma senha de verdade. A extensão Chrome já tinha uma sessão real
  logada (a conta do próprio usuário), então testar pela UI de fato foi mais fiel E mais simples
  que tentar simular um login. Isso também está alinhado com a diretriz do projeto de testar
  mudanças de UI num navegador de verdade antes de considerar concluído.
- **Token do responsável nunca exposto à automação** — quando a ferramenta de JavaScript tentou
  devolver o JWT bruto pra fora da página, foi bloqueada automaticamente (proteção da própria
  ferramenta). A volta foi rodar o fetch/teste INTEIRO dentro do contexto da página (o token é
  obtido e usado ali, só o resultado — status/JSON de resposta — volta pra mim), preservando a
  mesma garantia de segurança que o app real já tem (`FamilyPortal.tsx` nunca expõe esse token em
  lugar nenhum da UI).
- **Mesma resposta (404) pra "jti não existe" e "jti de outra família"** — decisão de segurança
  central: se a mensagem fosse diferente ("não encontrado" vs. "não autorizado"), um chamador
  poderia usar isso pra descobrir se um UUID de `jti` de outra família existe, mesmo sem
  conseguir revogá-lo. Mesmo princípio já aplicado a outros endpoints deste Worker.
- **Sem tabela/coluna nova** — `entitlement_tokens` (lab-97) já tinha tudo que a lista e a
  revogação individual precisavam (`jti`, `family_account_id`, `issued_at`, `revoked_at`); este
  laboratório é só consulta/autorização nova em cima de dado que já existia.
- **Lista recarrega depois de QUALQUER revogação** (individual ou "todos") — evita a UI mostrar um
  aparelho como ativo depois de uma ação que na verdade já revogou ele (ex.: usar "revogar todos"
  não deixaria a lista individual desatualizada até um F5 manual).

## Pendências / dívidas conhecidas
- **Sem fingerprint/nome de aparelho** (ex.: "iPhone de Ana") — a única identificação de cada
  aparelho na lista é a data de pareamento. Fora de escopo desde o `FEATURES.md`: exigiria
  capturar user-agent (mais dado coletado do fluxo da criança) ou pedir um apelido manual, nenhum
  necessário pro caso de uso principal.
- **`entitlement_tokens` continua sem limpeza automática** de linhas antigas (mesma dívida já
  registrada no lab-97, categoria de volume desprezível).

## Funcionalidades planejadas que NÃO foram concluídas
- Nenhuma — todos os itens de `FEATURES.md` foram concluídos e verificados (código, deploy, teste
  ao vivo ponta a ponta contra produção real, incluindo os casos de erro/segurança).

## O que o próximo laboratório deve desenvolver
G7 está agora COMPLETO (lab-88 + lab-97 + lab-100). Itens conhecidos que continuam em aberto, para
o usuário priorizar:
- **G10** (CI/CD, migração versionada de verdade) — próximo item da ordem de ataque de
  `docs/prompts/05-escala-e-viabilidade.md` seção 7 que ainda não foi abordado.
- **Job de reconciliação Stripe↔banco** (G8, lab-96).
- **NPS de responsáveis** — pesquisa qualitativa, deliberadamente adiada do lab-99.
- **Bug de morros/planaltos invisíveis** (lab-95) — segue bloqueado esperando resposta do usuário
  sobre aparelho/GPU e se o buraco é só visual ou também de colisão.

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`
- Como rodar/verificar o que foi construído neste laboratório:
  - `cd app/server-accounts && npm run test` — 36 testes de domínio, sem regressão (nenhum teste
    novo — este laboratório não introduziu lógica pura nova).
  - `cd app && npm run test` — 39 testes do app principal, sem regressão.
  - `npx tsc --noEmit` (em `app/server-accounts/`) e `npx tsc -b` (em `app/`) — typecheck limpo.
  - Produção: fazer login em `https://missaoaprendizado.com/familia` com uma conta que tenha
    assinatura ativa, gerar um código, resgatar ele no jogo — o bloco "Aparelhos pareados" aparece
    logo abaixo de "Gerar código" com um botão "Revogar" por aparelho.
  - Worker e frontend já deployados — não é preciso rodar `npm run deploy`/`vercel --prod` de novo
    pra ver o efeito deste laboratório.
