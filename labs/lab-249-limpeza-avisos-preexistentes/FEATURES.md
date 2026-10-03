# Laboratório 249 — Limpeza dos 2 avisos de lint preexistentes

Status: concluído
Início: 2026-10-03
Fim: 2026-10-03
Commit inicial: 9bbc3fb71bec63ad386cdf7f8d4a7e1dfafef81b
Prioridade: manutenção — zero risco, zero mudança de comportamento

## Objetivo do laboratório

Toda rodada de `npm run lint` desde aproximadamente o lab-83 reportava os mesmos 2 avisos
("dois avisos preexistentes"), citados em quase todo `CONTEXT.md` desde então. Nenhum dos dois
dependia de dispositivo físico, assinatura real ou playtest — eram puramente limpeza de código
que nunca foi priorizada. Escopo escolhido porque a sessão não tinha nenhum item de backlog
numerado nem feature pedida pelo usuário disponível para avançar (ver `docs/backlog-status.md`,
lab-248).

## Funcionalidades planejadas

- [x] `app/src/world3d/PetPanel.tsx:46` (`react(only-export-components)`): extrair a constante
  `STAGE_LABEL` para um arquivo próprio, já que o arquivo também exporta o componente `PetPanel`
  — quebra o fast refresh em dev. Atualizar o import em `AchievementsPanel.tsx`.
- [x] `app/server-accounts/src/domain.test.ts:923` (`eslint(no-unused-vars)`): renomear a
  variável descartada na desestruturação (`equippedGlassesId`) com prefixo `_`, convenção que o
  próprio lint já sugeria.
- [x] Confirmar `npm run lint` (app e server-accounts), `npm run test` (app: 366 testes;
  server-accounts: 171 testes) e `npm run build` sem nenhum aviso/erro novo.

## Fora de escopo (explicitamente adiado)

- Qualquer mudança de comportamento, UI ou regra de jogo/domínio.
- Code-splitting ou qualquer otimização de bundle (já tentado e revertido no lab-125; fora do
  escopo deste lab de limpeza).
