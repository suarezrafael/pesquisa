# Contexto — Laboratório 48 — Escada em espiral no Prédio dos Enigmas

Preenchido em: 2026-08-18

## O que foi feito

1. **Redesenho completo da escada**: trocado o zigue-zague de 2 lances retos (lab-47) por uma
   espiral contínua — 12 degraus por andar (30° cada), 360° completo por andar, 3 andares = 36
   degraus/segmentos no total. Cada degrau nunca repete o ângulo do anterior dentro da mesma
   subida, o que resolve "mesmo lado" de forma estrutural (não dá pra ter "sempre o mesmo lado"
   numa espiral, por definição).
2. **Degraus como plataformas independentes** (estilo parkour, pedido explícito do usuário) — em
   vez de blocos empilhados crescendo em altura (como no zigue-zague reto, onde cada bloco se
   estendia até o piso), aqui cada degrau é uma plataforma FINA e independente
   (`quizStep-{andar}-{i}`), já que numa espiral cada degrau ocupa uma posição (x,z) diferente —
   não faz sentido "empilhar" blocos como no caso reto. Isso por acaso também é visualmente mais
   parecido com as plataformas do parkour (`parkourPlatform`), que já são blocos rasos
   individuais.
3. **Colisão: rampa helicoidal aproximada por segmentos retos** (`quizSpiralRamp-{andar}-{i}`,
   36 no total) — aplica a MESMA lição do lab-47 (degraus com colisor próprio prendem a cápsula
   física do avatar): os degraus visuais não colidem (`collide: false`); cada segmento de rampa
   invisível cobre o arco entre o degrau i e o i+1, orientado com uma rotação combinada
   (`Quaternion.RotationYawPitchRoll`) — yaw pra ficar tangente ao círculo naquele ponto, pitch
   pra inclinar na subida daquele trecho. Como Babylon.js não tem uma primitiva de "rampa
   helicoidal" pronta, aproximar por segmentos retos curtos (12 por volta completa) é o jeito
   mais simples de conseguir uma superfície contínua que seja ao mesmo tempo curva E colidível
   por um `PhysicsAggregate BOX` comum.
4. **Prédio alargado** (`QT_WIDTH` 3,4→4,0, `QT_HALF_W` 1,7→2,0) — o poço de escada reto anterior
   era uma faixa estreita (1,0 de largura); uma espiral de raio confortável (0,5) precisa de um
   poço mais largo pra não encostar nas paredes. Reconfirmado ao vivo que o prédio ainda não
   sobrepõe a rua depois de alargar (folga de borda ~0,31 — mais apertada que antes, 0,51, mas
   ainda positiva).

## Decisões técnicas tomadas

- **Testar com raycast sistemático ANTES de reportar** (não depois, e não só visualmente) — dado
  que os dois laboratórios anteriores (lab-46, lab-47) já erraram declarando sucesso sem testar
  fundo o bastante, desta vez a verificação foi: amostrar TODOS os 13 pontos de cada um dos 3
  andares (36+3 no total) via raycast físico real, confirmando que cada um bate no segmento de
  rampa EXATO esperado, em sequência crescente sem buracos nem saltos pro segmento errado — só
  depois disso a implementação foi considerada verificada. Essa é a mesma abordagem que já tinha
  funcionado bem no lab-47 pra confirmar os 3 lances retos, só que adaptada pra amostrar mais
  pontos (13 por andar em vez de 11) já que a curva exige mais amostras pra confirmar continuidade
  com confiança.
- **1 giro completo (360°) por andar, não mais nem menos** — dá uma proporção visual razoável
  pra um prédio de teto baixo (1,8 por andar) sem ficar nem apertado/vertiginoso demais (giros
  demais) nem parecendo quase reto (giro incompleto). Os pontos de transição entre andares ficam
  no mesmo ângulo (0°) a cada volta — comportamento normal de escadas em espiral reais, não é um
  bug.
- **Raio 0,5** — o maior que cabia com folga confortável dentro do poço de 1,3 de largura
  disponível (após alargar o prédio), sem chegar perto da parede externa do poço nem do
  parapeito do lado do piso.

## Pendências / dívidas conhecidas

- Nenhuma nova. Ver "Fora de escopo" em `FEATURES.md` (abertura circular perfeita no piso —
  cosmético, não funcional).

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma das planejadas para este laboratório.

## O que o próximo laboratório deve desenvolver

1. Nenhum pedido novo pendente no momento em que este laboratório foi encerrado.
2. O padrão "rampa helicoidal aproximada por segmentos retos + degraus decorativos
   independentes" agora é o jeito comprovado de fazer escadas em espiral neste projeto —
   reaproveitar em vez de reinventar se algum prédio futuro precisar de outra escada em espiral.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`. Usuário pediu explicitamente pra mesclar em `main` e
  apagar a branch — não é uma ação que esta sessão pode executar. Comando pra ele rodar:
  ```
  git checkout main
  git merge worktree-abstract-wobbling-owl
  git branch -d worktree-abstract-wobbling-owl   # só depois do merge
  ```
- Como rodar/verificar: `cd app && npm install && npm run dev`.
