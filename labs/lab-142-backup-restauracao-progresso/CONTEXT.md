# Contexto — Laboratório 142 — Backup e restauração de progresso pra famílias assinantes

Preenchido em: 2026-09-03
Commit inicial → final: 48859a1df33ae717828141328ce56d3714403117..HEAD

## O que foi feito

**Backend (`app/server-accounts`)**: `progress_backups` (migração `0004`, uma linha por família,
sempre sobrescrita) guarda `profile`/`progress` como `jsonb`. `handleProgressBackupSave` (POST) e
`handleProgressBackupFetch` (GET) em `src/index.ts`, mesma autenticação de
`handleProgressSummary` (token de entitlement, checagem de revogação por `jti`) — `isValidProgressBackupPayload`
(`src/domain.ts`) valida só ESTRUTURALMENTE (profile/progress são objetos de verdade), não campo a
campo, de propósito (ver Decisões). Novo rate limiter `PROGRESS_BACKUP_LIMITER` (10/60s,
compartilhado entre as duas rotas).

**Frontend**: `useEntitlement.ts` ganhou `syncProgressBackup`/`fetchProgressBackup`, chamados no
MESMO efeito que já sincronizava o resumo semanal (`App.tsx`, uma vez por sessão com entitlement
ativo). `redeemCode` passou a devolver o token novo (não mais `boolean`) — necessário pra
`PairingScreen.tsx` checar na hora se existe backup pra oferecer, sem esperar um re-render.
`PairingScreen.tsx` ganhou um novo passo entre "código aceito" e "pronto": se achar um backup,
mostra "Achamos um progresso salvo! Nível X, moedas Y — Restaurar / Continuar sem restaurar".
Confirmando, `App.tsx` (`handleRestoreBackup`) grava o profile/progress restaurados direto no
`localStorage` (`saveProfile`/`saveProgress`, bypassando os setters de campo único de
`useProfile`/`useProgress`) e recarrega a página.

## Decisões técnicas tomadas

- **Validação ESTRUTURAL, não campo a campo** (`isValidProgressBackupPayload`) — diferente de
  `isValidProgressSummary` (5 números, cada um validado com teto plausível), este payload é o
  save inteiro. `server-accounts` é um pacote separado sem import de `app/src/types.ts` —
  replicar `Progress` campo a campo aqui criaria acoplamento de deploy (todo campo novo em
  `Progress` exigiria outro deploy deste Worker só pra aceitar backup de novo). Risco é diferente
  do resumo também: este dado nunca alimenta cálculo nenhum do servidor, só é guardado e devolvido
  pra MESMA família — um payload malformado só prejudicaria quem mandou.
- **Regra de privacidade relaxada pela SEGUNDA vez** (depois do lab-119) — registrado
  explicitamente em `docs/plano-comercial-backend.md`: diferente do resumo (que excluía nome/
  avatar de propósito), o backup PRECISA incluir isso pra uma restauração de verdade "devolver o
  que a família pagou" fazer sentido. Justificativa: o apelido já é gerado/filtrado
  (`data/nicknames.ts`/`nicknameFilter.ts`, não é o nome real da criança) e já é visível a OUTROS
  jogadores no multiplayer/ranking hoje — guardar o mesmo apelido, autenticado, não é uma
  superfície de exposição nova.
- **`redeemCode` devolve o token, não mais `boolean`** — mudança de contrato deliberada: sem o
  token de volta na hora, `PairingScreen.tsx` só conseguiria checar o backup depois de um
  re-render (o `entitlement` do fechamento do componente ainda estaria desatualizado
  imediatamente após `await onRedeem(...)`), atrasando a oferta de restauração por um ciclo a mais
  sem necessidade.
- **Restauração grava direto em `localStorage`, não pelos setters de `useProfile`/`useProgress`**
  — esses setters só sabem editar UM campo por vez (`equipHat`, `unlockFurniture` etc.); substituir
  o objeto INTEIRO por um restaurado é um caso genuinamente diferente, mais parecido com
  `switchActiveProfile` (troca de perfil) — que também prefere um `window.location.reload()` de
  verdade a tentar sincronizar manualmente todo o estado do React.
- **"Tudo ou nada", sem mesclar local + backup** — decisão consciente de manter o MVP simples;
  mesclar dois `Progress` de fontes diferentes (qual XP vence? qual conjunto de itens
  desbloqueados?) é um problema bem maior, fora de escopo aqui.

## Pendências / dívidas conhecidas

- **Fluxo de restauração só verificado via chamada direta ao backend** (curl real, ver Estado do
  repositório abaixo) — o CAMINHO COMPLETO pela UI (`PairingScreen.tsx` mostrando a pergunta,
  clicar "Restaurar", confirmar que o profile/progress do jogo realmente mudam após o reload) não
  foi verificado ao vivo nesta sessão — mesma limitação de ambiente de automação de navegador que
  já afetou os labs 140/141 (`document.hidden = true`, sem recuperar). Diferente daqueles labs,
  aqui pelo menos a parte mais arriscada (o BACKEND — autenticação, validação, upsert, rate limit)
  foi testada de ponta a ponta com uma família real via `wrangler dev` + curl, dado de teste
  removido depois (ver Estado do repositório) — só a última milha (UI React) ficou sem confirmação
  visual.
- **Restauração é "tudo ou nada"** (ver Decisões) — se um dia isso incomodar (ex.: família quer
  manter o progresso NOVO deste aparelho e só recuperar cosméticos comprados), precisa de desenho
  novo.
- **Achado do review automático do Copilot (PR #13, lab-149)**: `progress_backups` é uma linha por
  FAMÍLIA, mas `syncProgressBackup` só manda o perfil ATIVO — numa família com 2+ filhos
  compartilhando a assinatura, cada sessão sobrescreve o backup do irmão. Documentado com mais
  detalhe em `docs/plano-comercial-backend.md` (seção de atualização deste laboratório) — exige
  chave composta + UX de escolha de perfil na restauração, fora de escopo do que foi corrigido no
  lab-149 (só bugs de tamanho contido, não redesenho de schema).

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — todas concluídas (com a ressalva de verificação de UI ao vivo pendente, ver acima).

## O que o próximo laboratório deve desenvolver

Sem pedido novo. Reverificar a UI de restauração ao vivo assim que o ambiente de automação
permitir (ou pedir pro usuário testar manualmente: parear um perfil novo com um código de uma
família que já tenha assinatura ativa e progresso sincronizado, confirmar que a oferta de
restauração aparece e funciona).

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`.
- `npm run test` (app): 99/99 (sem teste novo — mudança de integração/UI, não lógica de domínio
  nova do lado do jogo).
- `npm run test` (server-accounts): 64/64 (5 testes novos, `isValidProgressBackupPayload`).
- `npm run build` (app) e `npx tsc --noEmit` (server-accounts): sem erros.
- **Backend verificado ao vivo de ponta a ponta**, contra o banco de produção real via
  `wrangler dev` local + token de entitlement assinado de verdade pra uma família já existente
  (mesma técnica do lab-119): `GET` sem backup → 404; sem token → 401 (GET e POST); payload
  malformado → 400; `POST` válido → 204 seguido de `GET` devolvendo exatamente os dados salvos;
  segundo `POST` confirmado SOBRESCREVENDO (não duplicando linha); payload de 60KB → 413; 11ª
  chamada em menos de 60s → 429 (rate limiter). Dado de teste removido da tabela depois
  (`delete from progress_backups where family_account_id = ...`).
- **UI de restauração NÃO verificada ao vivo** (ver Pendências).
- Migração `0004_progress_backups.sql` já aplicada em produção (`node migrate.mjs`, rodado nesta
  sessão).
- Deploy: pendente — mesmo fluxo dos labs anteriores (push → PR → CI → merge → deploy, os 3 jobs:
  `app`, `server-accounts`, `server-cf-relay`).
