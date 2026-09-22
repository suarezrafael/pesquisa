# Laboratorio 225 - Perfil de qualidade mobile

Status: concluido
Inicio: 2026-09-22
Fim: 2026-09-22
Commit inicial: a92be87b18d3cc1fde3b4b0bea7647d0bcb07328

## Objetivo do laboratorio

Centralizar as escolhas de qualidade do Babylon em dois perfis auditaveis, mantendo a escala
automatica de resolucao independente. Permitir que uma amostra de performance mostre exatamente
quais recursos custosos ou decorativos foram reduzidos em cada aparelho.

## Funcionalidades planejadas

- [x] Reunir antialiasing, post-processamento, sombra, ambiente, densidade e efeitos num perfil
  tipado, preservando os valores atuais (referencia: Lab 224 `CONTEXT.md` e backlog 193).
- [x] Substituir as decisoes dispersas em `World3D.tsx` pelo perfil, sem afetar legibilidade,
  conteudo educativo ou ajuste continuo de resolucao (referencia: Labs 59/67/70 e backlog 193).
- [x] Expor o perfil e as reducoes ativas no HUD/`window.__perf.sample()` para coleta comparavel
  em Redmi Pad 2 e Poco C75 (referencia: Lab 219 e Lab 224 `CONTEXT.md`).
- [x] Testar a paridade dos perfis e o fluxo real no Edge, alem de TypeScript, suite, lint e build
  (referencia: Lab 224 `CONTEXT.md`).

## Fora de escopo

- Adicionar um terceiro perfil ou mudar limiares do benchmark/auto-tune sem dados fisicos.
- Afirmar melhora de FPS apenas por mover configuracoes de lugar.
- Reduzir texto, quests, minijogos, colisao, interacao ou recompensas.
