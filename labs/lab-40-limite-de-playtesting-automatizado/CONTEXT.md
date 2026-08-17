# Contexto — Laboratório 40 — Limite prático do playtesting automatizado + hook de direção

Preenchido em: 2026-08-17

## O que foi feito

1. **`__debugSetFacing(x, y, z)`** (`src/world3d/World3D.tsx`, dev-only, ao lado de
   `__debugTeleportExact`) — ajusta a variável `facing` diretamente. Necessário porque nenhum dos
   dois hooks de teleporte existentes muda `facing` (continua o que era antes do teleporte),
   então depois de teleportar pra um lugar novo do mapa, segurar "andar pra frente" ia na direção
   ERRADA (a antiga) até o jogador virar manualmente — inútil pra testar "andar até X" de forma
   confiável.
2. **Correção de dois comentários** que ainda afirmavam como fato a teoria do `.set()` quebrando
   o rastreamento de mudança do Babylon — já descartada na investigação do lab-39 (confirmado
   lendo o código-fonte do Babylon que o setter de `.position` é trivial). Comentários errados no
   código são pior que nenhum comentário — corrigidos pra não confundir quem ler depois.

## O que foi investigado (limite encontrado, não um bug)

Tentei validar o parkour de laser (lab-38) com uma travessia de verdade — andar até a borda de
uma plataforma e pular no momento certo pra passar por cima do laser seguinte, repetindo pra cada
uma das 8 plataformas — em vez de só os testes estáticos por posição já feitos no lab-39.

Calculei a física exata pra UM salto sobre um laser: com `JUMP_SPEED=6,2` e `GRAVITY=16`, a
altura do personagem acima do chão de onde pulou seque `h(t) = 6,2t - 8t²`. Resolvendo pra
`h(t) ≥ 0,55` (a folga entre a plataforma de onde se pula e a altura do laser + margem), o
personagem fica "alto o bastante" entre `t≈0,10s` e `t≈0,67s` — uma janela de ~0,57s. Andando a
`WALK_SPEED=7,5`, a zona de perigo lateral do laser (raio 0,42, então ~0,84 de largura) é cruzada
em só ~0,11s. Ou seja, a JANELA de tempo em que dá pra estar "alto o bastante" é ~5x mais larga
que o tempo que leva pra atravessar a zona perigosa — folga generosa, o pulo deveria ser fácil de
acertar pra um jogador de verdade.

**Mas isso não é cronometrável via automação de navegador nesta sessão**: cada chamada de
ferramenta (`javascript_exec` pra segurar uma tecla, `computer` `screenshot` pra forçar um quadro
real — necessário desde a descoberta do lab-39 sobre a aba não renderizar sozinha —, outra
chamada pra ler o resultado) tem latência real de ida-e-volta da ordem de segundos inteiros, não
frações de segundo. A janela de 0,57s que o pulo precisa é menor que o tempo de UMA chamada de
ferramenta só, então não dá pra "segurar W, soltar, apertar espaço no instante certo, segurar W
de novo" com a precisão que o mecanismo exige — qualquer tentativa ia na prática virar uma
sequência de posições estáticas de qualquer jeito (que é exatamente o que o lab-39 já fez, e já
fez melhor, porque testou os pontos exatos que importam em vez de tentar acertar por sorte de
timing).

**Conclusão**: os testes estáticos por posição (lab-39) continuam sendo a melhor verificação
disponível via automação pra mecanismos com timing fino como este. Uma travessia completa de
verdade só é confiável com um humano jogando (reflexos/ajuste em tempo real que a automação não
tem como replicar aqui).

## Verificação feita

- `npm run build` passa (typecheck + build de produção, exit code 0).
- `__debugSetFacing` testado ao vivo: teleporte exato pro início do percurso do laser (via
  `__debugTeleportExact`), direção ajustada pra `parkour4Forward` (via `__debugSetFacing`),
  `keydown` REAL de `w` (não simulação de estado interno), um quadro forçado via `computer`
  `screenshot` — posição do jogador mudou 0,10 unidade, na direção esperada. Confirma que o hook
  funciona corretamente pra uso futuro (mesmo que não tenha sido suficiente, sozinho, pra
  cronometrar um pulo completo).

## Pendências / dívidas conhecidas

Nenhuma nova — o "limite" documentado aqui é uma característica do ambiente de teste, não uma
dívida técnica do jogo em si.

## Funcionalidades planejadas que NÃO foram concluídas

- Travessia completa do parkour de laser via input real — não abandonada por falta de tentativa,
  mas por uma limitação de latência genuína e bem entendida (ver acima). Não é uma funcionalidade
  do JOGO faltando, é um teste que não é praticável nesta ferramenta.

## O que o próximo laboratório deve desenvolver

1. Nenhum pedido novo do usuário pendente.
2. Se quiser confirmar de vez que o parkour de laser é "passável" (não só "detecta certo", que já
   está confirmado), a forma confiável é o usuário jogando de verdade — não mais automação com
   cronometragem fina.
3. Considerar, se aparecer mais necessidade de testar mecanismos com timing fino no futuro, se
   vale a pena um modo de "câmera lenta" só pra debug (ex.: reduzir `GRAVITY`/velocidades
   temporariamente via uma flag de query string ou tecla de atalho dev-only) — alargaria a janela
   de tempo o bastante pra tornar a automação viável. Não implementado agora (fora do escopo do
   pedido original), só uma ideia registrada caso vire prioridade depois.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl` (worktree isolado, ainda não mesclada em `main` —
  usuário pediu merge, mas esta sessão não pode mesclar em main). Pra mesclar manualmente:
  ```
  git checkout main
  git merge worktree-abstract-wobbling-owl
  ```
- Como rodar/verificar: `cd app && npm install && npm run dev`.
