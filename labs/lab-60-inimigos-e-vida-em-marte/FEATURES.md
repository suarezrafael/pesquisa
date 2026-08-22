# Laboratório 60 — Inimigos e barra de vida em Marte

Status: concluído
Início: 2026-08-20
Fim: 2026-08-20
Commit inicial: 129455faf830890b72fc173c9e9a14624928008e

## Objetivo do laboratório
Usuário: "no planeta marciano tem que ter ETs e robos que tenta matar o nosso boneco, nos temos
que ter uma barra de vida se a barra esvaziar, voce morre e volta pro planetinha e tem que voltar
de foguete pra poder seguir em marte." — adicionar risco/combate a Marte: inimigos que perseguem e
atacam o jogador, uma barra de vida, e uma consequência real por perder toda a vida (volta pro
planeta principal, precisa pilotar o foguete de novo pra continuar explorando Marte).

## Funcionalidades planejadas
- [x] **ETs e robôs em Marte** — dois tipos de inimigo novos, só primitivas (mesmo padrão do resto
      do jogo: carro, foguete, bichos), populando o planetinha secundário (Marte) junto com as
      rochas/cavernas já existentes (lab-59).
- [x] **IA de perseguição/ataque** — inimigos vagam perto de onde nasceram até o jogador entrar
      num raio de detecção, aí perseguem; ao alcançar o jogador, causam dano (com um intervalo
      entre ataques, não dano contínuo instantâneo).
- [x] **Barra de vida** — HUD novo (visível pelo menos quando o jogador está em Marte), com
      feedback visual ao tomar dano.
- [x] **Morte e respawn** — vida chegando a zero teleporta o jogador de volta pro planeta
      principal (reaproveitando o mesmo mecanismo de pouso do foguete), restaura a vida cheia; pra
      voltar a Marte precisa embarcar e pilotar o foguete de novo (mesmo ciclo já existente do
      lab-59), não tem atalho.
- [x] Build (typecheck + produção) passa.
- [x] Verificado ao vivo (dev server + teleporte de debug): inimigo persegue e causa dano, barra
      de vida reflete o dano em tempo real, vida zerada teleporta de volta pro planeta principal,
      voltar a Marte exige embarcar no foguete de novo. Um bug real (`Vector3.normalize()` do
      Babylon mutando o vetor de posição do jogador em vez de devolver um novo, travando a
      checagem de distância) foi encontrado e corrigido ao vivo — ver `CONTEXT.md`.

## Fora de escopo (explicitamente adiado)
- Combate ativo do jogador (atacar de volta, esquivar) — o pedido do usuário descreve só o lado do
  inimigo ("tenta matar o nosso boneco") e a consequência (barra de vida, morte, respawn); virar
  em ataque/defesa do jogador fica pra um próximo pedido explícito.
- Progressão de dificuldade (mais inimigos/mais fortes com o tempo) — fixo por enquanto, mesmo
  espírito de "por enquanto" já usado pro planetinha secundário no lab-58.
