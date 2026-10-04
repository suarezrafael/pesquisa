# Contexto — Laboratório 253 — Teste da migração de perfil legado

Preenchido em: 2026-10-04
Commit inicial → final: 8912e123b695780704bbf4c16076695f67e20e3c..(ver PR)

## O que foi feito

- `app/src/state/storage.test.ts` (novo, `@vitest-environment jsdom` — mesmo padrão já usado em
  `QuestModal.test.tsx`/`useHeartbeat.entitlementTransition.test.tsx` quando um teste precisa de
  globais de browser, aqui `localStorage`): 6 testes cobrindo
  `migrateLegacyProfileIfNeeded` através da API pública (`listProfiles`/`loadProfile`/
  `loadProgress`/`hasTutorialBeenSeen`/`loadLastPlayedAt`/`getActiveProfileId`/
  `clearActiveProfile`):
  1. Instalação nova (sem chave legada) não migra nada.
  2. Save legado completo (perfil+progresso+tutorial+último acesso) migra corretamente —
     roster, perfil, progresso e as duas flags de data conferidos.
  3. Save legado parcial (só perfil) migra sem travar; os campos ausentes caem nos defaults
     (`emptyProgress`, `hasTutorialBeenSeen() === false`, `loadLastPlayedAt() === null`).
  4. JSON corrompido na chave legada não migra e não lança — `listProfiles()` continua
     devolvendo `[]`, a chave legada permanece intocada.
  5. A migração COPIA o save legado — a chave original (`jogo-educativo:profile`) continua
     legível depois, nunca é removida.
  6. **Regressão do bug documentado no próprio `storage.ts`**: migrar uma vez, depois chamar
     `clearActiveProfile()` (o que o botão "Trocar perfil" faz) e migrar de novo não duplica o
     perfil no roster.

## Verificação de que o teste de regressão é real, não cosmético

Reverti temporariamente o guard de `migrateLegacyProfileIfNeeded` de `if (loadRoster().length >
0) return` para `if (getActiveProfileId()) return` (a versão antiga, com o bug que o comentário
no código descreve) e confirmei que exatamente o teste 6 falha — um segundo perfil aparece no
roster com um `id` novo, diferente do primeiro. Revertido antes de rodar a suite completa; `git
diff` confirma que `storage.ts` não tem nenhuma mudança neste lab.

## Achado do review automático do Copilot na PR #153

1 achado real, corrigido antes do merge: o teste de migração completa chamava `listProfiles()`
antes de `loadProfile()`, mascarando uma regressão em que a migração fosse removida
especificamente de `loadProfile()` — `listProfiles()` já teria migrado por conta própria antes
desse teste conseguir notar. `App.tsx` chama `useProfile()` (que lê via `loadProfile()`) ANTES
de `listProfiles()` na ordem real de inicialização (linha ~111 vs. ~268), então `loadProfile()`
é o ponto de entrada que de fato protege o startup real. Reordenado pra chamar `loadProfile()`
primeiro; confirmei manualmente que o teste falha se a chamada a `migrateLegacyProfileIfNeeded()`
for removida de dentro de `loadProfile()` especificamente (revertido antes do commit final).

## Decisões técnicas tomadas

- **Testar via API pública, não a função interna.** `migrateLegacyProfileIfNeeded` não é
  exportada de propósito (é um detalhe de implementação); testar pelos pontos de entrada reais
  (`listProfiles` etc.) prova o comportamento que o resto do app de fato observa, sem acoplar o
  teste a uma função que pode ser renomeada/inlined sem mudar nenhum contrato externo.
- **Chaves legadas duplicadas como literais no teste, com comentário de sincronia.** As
  constantes (`LEGACY_PROFILE_KEY` etc.) são privadas em `storage.ts`; exportá-las só pra teste
  ampliaria a superfície pública por um motivo fraco. O comentário no topo do teste avisa que
  precisam ficar em sincronia se mudarem lá.
- **`@vitest-environment jsdom` só neste arquivo**, não no arquivo inteiro de testes do projeto —
  mesma política já estabelecida (`CLAUDE.md`): jsdom é a exceção pontual, não o padrão.
- **Nenhuma mudança em `storage.ts`.** O objetivo era fechar uma lacuna de cobertura numa função
  com bug histórico documentado, não refatorar ou "melhorar" a implementação — ela já está
  correta, só sem teste.

## Pendências / dívidas conhecidas

- `useEntitlement.ts`, `usePlayerIdentity.ts`, `usePlayerPublicProfile.ts`, `useProfile.ts`,
  `useProgress.ts` continuam sem teste direto — deliberadamente fora de escopo (ver
  `FEATURES.md`, "Fora de escopo"), mesma categoria de hooks finos sobre I/O que o projeto já
  decide não testar diretamente.
- Outras funções de `storage.ts` (`saveProfile`, `saveProgress`, `createProfileSlot`,
  `switchActiveProfile`) continuam sem teste direto — cobertas indiretamente por outros testes
  que as chamam através de hooks, mas sem um teste dedicado à própria função. Não auditado neste
  lab; se uma dessas acumular lógica/achado de Copilot no futuro, considerar cobertura dedicada
  então.

## Funcionalidades planejadas que NÃO foram concluídas

- Nenhuma — as 3 funcionalidades planejadas em `FEATURES.md` foram concluídas.

## O que o próximo laboratório deve desenvolver

- Sem novo insumo (dispositivo físico, assinatura real validada, playtest, ou pedido explícito
  do usuário), o próximo passo real depende do usuário — ver `docs/backlog-status.md` pra
  prioridades atualizadas. Repetir uma varredura de código sem evidência nova (bug reproduzido,
  lacuna de cobertura concreta como esta) só produziria mais trabalho especulativo.

## Estado do repositório ao final

- Branch: `lab-253-testes-migracao-storage`.
- Suite: 377/377 (37 arquivos, 6 testes novos). Lint: zero avisos. Build: TypeScript + Vite +
  PWA sem erro novo (mesmo aviso preexistente de chunk >500kB).
- `.github/copilot-instructions.md` e `.vscode/` locais não incluídos.
