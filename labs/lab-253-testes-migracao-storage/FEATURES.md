# Laboratório 253 — Cobertura de teste para a migração de perfil legado (storage.ts)

Status: concluído
Início: 2026-10-04
Fim: 2026-10-04
Commit inicial: 8912e123b695780704bbf4c16076695f67e20e3c
Prioridade: manutenção — integridade de dados salvos, zero risco de comportamento

## Objetivo do laboratório

Auditoria de código (sem dispositivo/playtest/assinatura disponíveis): `app/src/state/
storage.ts` é a camada de persistência real do jogo — perfil e progresso de cada criança — e não
tinha NENHUM teste direto, apesar de conter `migrateLegacyProfileIfNeeded`, a lógica de migração
de save legado (perfil único por aparelho, antes do lab-108) pro sistema de múltiplos perfis. O
próprio código-fonte documenta um bug real já corrigido nessa função (migração duplicada ao
trocar de perfil) sem nenhum teste de regressão protegendo essa correção.

## Funcionalidades planejadas

- [x] Cobrir `migrateLegacyProfileIfNeeded` (via `listProfiles`/`loadProfile`/`loadProgress`,
  que a exercem internamente — a função em si não é exportada): instalação nova sem migrar nada,
  migração completa (perfil+progresso+tutorial+último acesso), migração parcial (só perfil),
  JSON corrompido não migra nem lança, a chave legada nunca é apagada (copia, não move).
- [x] Teste de regressão para o bug documentado: migração duplicada quando o perfil ativo é
  limpo ("Trocar perfil") depois da primeira migração — confirmado que o teste falha se o guard
  for revertido pro código antigo (comparação por `getActiveProfileId()` em vez do roster).
- [x] Confirmar `npm run test` (377/377), `npm run lint` (zero avisos) e `npm run build` sem
  regressão.

## Fora de escopo (explicitamente adiado)

- Qualquer mudança de comportamento em `storage.ts` — este lab é só teste, zero linha de
  produção alterada.
- Cobertura dos outros arquivos de `state/` sem teste direto (`useEntitlement.ts`,
  `usePlayerIdentity.ts`, `usePlayerPublicProfile.ts`, `useProfile.ts`, `useProgress.ts`) — são
  hooks React finos sobre I/O (fetch/DOM), mesma categoria que o próprio projeto já decide não
  testar diretamente (ver comentário em `useFriendRequests.test.ts`); `storage.ts` foi escolhido
  por ser a única PERSISTÊNCIA de verdade sem teste, com lógica de migração complexa e um bug
  histórico documentado.
