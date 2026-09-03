# Laboratório 142 — Backup e restauração de progresso pra famílias assinantes

Status: concluído
Início: 2026-09-03
Fim: 2026-09-03
Commit inicial: 48859a1df33ae717828141328ce56d3714403117

## Objetivo do laboratório

Resolve G6 de `docs/prompts/05-escala-e-viabilidade.md`: "todo o progresso pago mora só no
aparelho — limpar dados do navegador apaga o que a família pagou, sem backup e sem restauração.
Isso é uma fila de suporte e de estorno esperando para acontecer, não só um detalhe de anti-cheat."
Confirmado com o usuário via `AskUserQuestion` antes de começar (item maior/mais delicado que os
labs anteriores — mexe em arquitetura de dado de cliente pagante, não só feature autocontida).

## Funcionalidades planejadas
- [x] `POST /progress-backup` (`app/server-accounts`) — grava o `Profile`+`Progress` inteiros do
  jogo (autenticado com o token de entitlement, mesmo padrão de `/progress-summary` do lab-119),
  uma linha por família, sempre sobrescrita.
- [x] `GET /progress-backup` — devolve o backup mais recente da família, ou 404 se nunca
  sincronizou nada.
- [x] Sincronização automática do lado do jogo (`syncProgressBackup`) no MESMO gatilho já usado
  pelo resumo semanal (lab-119): uma vez por sessão, só com entitlement ativo.
- [x] Fluxo de restauração: ao redimir um código de pareamento, o jogo checa se existe um backup
  pra essa família e, se existir, oferece trazer ele de volta (`PairingScreen.tsx`), substituindo
  o perfil/progresso locais.
- [x] Migração `0004_progress_backups.sql` aplicada em produção.
- [x] Atualização de `docs/plano-comercial-backend.md` documentando a relaxação da regra de
  privacidade (2ª vez, depois do lab-119) e por que este dado é mais amplo que o resumo.

## Fora de escopo (explicitamente adiado)
- Histórico de backups (só o mais recente é guardado, mesmo espírito de `progress_snapshots`).
- Mesclar automaticamente progresso local + backup (a restauração hoje é "tudo ou nada": aceita o
  backup inteiro ou mantém o que já está no aparelho).
- Backup pra famílias SEM assinatura ativa (mesma regra de `/progress-summary` — o backend nunca
  vê progresso de quem não paga).
