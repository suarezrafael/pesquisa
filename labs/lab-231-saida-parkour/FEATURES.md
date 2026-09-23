# Laboratorio 231 - Saida segura do parkour

Status: em andamento
Inicio: 2026-09-23
Fim: -
Commit inicial: 9dda215bea9132aa25dc384b3929f3f5ef5caad5

## Objetivo do laboratorio

Corrigir o bloqueio relatado pelo usuario: cair do parkour reposiciona o avatar
indefinidamente no checkpoint e impede alcancar o chao/retorno, obrigando a
recarregar ou trocar de perfil.

## Funcionalidades planejadas

- [x] Permitir abandonar o percurso caindo para longe das plataformas, sem
  eliminar o checkpoint para quedas proximas (relato do usuario; Lab 210).
- [x] Expor uma saida no HUD, acessivel em qualquer plataforma e por toque,
  que volta ao hub sem recarregar nem mudar perfil (relato do usuario;
  `02-design-profissional.md` secao 3).
- [ ] Validar testes, build e layout do controle; medir no tablet apos
  publicar, inclusive queda, retorno e nova entrada (relato do usuario).

## Fora de escopo

- Redesenhar o parkour, as recompensas ou os checkpoints.
- Misturar a revisao da lojinha da PR #119 ou o LOD da PR #116.

## Guardrails

- Sair sem chegar ao topo nao conta conclusao ou trofeu.
- O botao respeita `inert` quando um modal bloqueante esta aberto.
- Nenhuma mudanca em progresso, conta, monetizacao ou PII.

## Evidencia ate agora

- Codigo anterior em `World3D.tsx`: `heightVsCheckpoint < -1.3` teleportava
  automaticamente antes da queda ate o solo; o retorno ficava no solo.
- `parkourFall.ts` separa queda perto do percurso (`respawn`) de queda afastada
  (`exit`). `World3D.tsx` limpa estado/HUD na saida e oferece `Voltar ao hub`
  em qualquer ponto do parkour.
- 294/294 testes; lint sem avisos novos (dois preexistentes); build passou.
- Ainda falta percorrer queda, saida por botao e reentrada no Redmi Pad 2. O
  Edge local fica perto de 1 FPS e nao valida essa interacao fisica.
