# Laboratório 207 — Efeitos visuais leves: poeira de aterrissagem

Status: em andamento
Início: 2026-09-20
Commit inicial: 887eaa768f93eb7f4f8fea3d58f8c5e3270a9d3d

## Objetivo do laboratório

Primeira fatia pequena do backlog "Lab 198 - Efeitos visuais de recompensa, movimento e
interação" (pacote leve de efeitos: landing puff, footstep dust, brilho em interativo, pulso de
recompensa, trail de foguete/cometa, feedback de puzzle): uma nuvem de poeira ao aterrissar depois
de qualquer queda/pulo, dando mais peso físico ao movimento sem exigir shader pesado nem partículas
sem orçamento — exatamente o que o próprio item do backlog descreve como escopo aceitável.

Origem: `docs/gameplay-market-expansion-backlog.md`, "Lab 198 - Efeitos visuais de recompensa,
movimento e interacao" — escolhido entre os itens não bloqueados por medição de FPS ao vivo (Lab
193 drawcalls) depois do lab-206 (Lab 196).

## Investigação prévia

- **Padrão de partícula já estabelecido e maduro**: `rocketFlameSystem` (chama do foguete, lab-59)
  já usa exatamente a técnica necessária — `DynamicTexture` com gradiente radial desenhado num
  canvas, `ParticleSystem` com `emitRate` controlado (ligado/desligado conforme o evento). A poeira
  de aterrissagem reaproveita 100% dessa técnica, só trocando cor (terrosa em vez de
  amarelo/laranja) e trocando "ligado contínuo" por um ÚNICO disparo (`manualEmitCount` +
  `.start()`, padrão de burst já suportado nativamente pelo Babylon.js, sem precisar de nada novo).
- **Mundo é uma ESFERA — "poeira sobe e cai" precisa respeitar `localUp` de onde o jogador está**,
  não um "pra baixo" fixo do mundo (ao contrário de chuva/chama de foguete, que já são efeitos
  GLOBAIS/relativos a um objeto que sempre aponta pra cima de verdade). `direction1`/`direction2`/
  `gravity` do sistema são recalculados a cada disparo com base no `localUp` do PONTO onde o
  jogador aterrissou (mesmo idioma já usado em todo o arquivo pra orientar objetos na superfície:
  `Vector3.Cross(localUp, Vector3.Right())` pra achar um par de eixos perpendiculares).
- **Detecção de aterrissagem**: o loop de física principal já calcula `grounded` (raycast físico
  real) todo quadro, usado hoje só pra liberar o pulo. Um novo `let wasGroundedLastFrame` detecta a
  transição falso→verdadeiro (acabou de tocar o chão) — dispara em QUALQUER aterrissagem (pulo
  normal, queda de parkour, etc.), sem distinguir a altura da queda (simplificação deliberada, ver
  "Fora de escopo").
- **`emitter` do `ParticleSystem` aceita um `Vector3` simples** (não precisa ser sempre uma malha
  perseguida) — um snapshot da posição do pé no momento do toque no chão é suficiente; a nuvem fica
  parada onde o jogador aterrissou, não o segue enquanto ele anda embora (comportamento correto de
  poeira de verdade).

## Decisão de escopo

Sem pergunta ao usuário nesta lab (escopo já reduzido a UMA fatia pequena, de baixo risco, reaproveitando
100% de uma técnica já madura e testada em produção). As outras 5 peças do Lab 198 (footstep dust,
brilho em interativo, pulso de recompensa, trail de foguete/cometa, feedback de puzzle) ficam pra
labs futuros — cada uma merece sua própria decisão de escopo/verificação.

## Funcionalidades planejadas

- [ ] `ParticleSystem` de poeira (textura gerada por canvas, mesma técnica de `rocketFlameSystem`),
  construído uma vez perto da criação do avatar, sempre disponível (não depende de estar num
  planeta específico).
- [ ] Disparo em burst (`manualEmitCount`) a cada transição "no ar → no chão" detectada no loop de
  física principal, com direção/gravidade calculadas a partir do `localUp` do ponto de contato.
- [ ] Verificar ao vivo (ver limitação conhecida) e, na falta dela, revisão de código cuidadosa.

## Fora de escopo (explicitamente adiado)

- Footstep dust (poeira a cada passo andando) — mais frequente/sensível a performance, merece sua
  própria decisão de orçamento de partículas.
- Brilho em objeto interativo, pulso de recompensa, trail de foguete/cometa, feedback de puzzle —
  as outras 5 peças do Lab 198.
- Distinguir queda alta de queda pequena (intensidade/tamanho da nuvem proporcional à altura da
  queda) — simplificação deliberada: todo aterrissagem dispara a MESMA nuvem.
- Lab 193 (drawcalls), Lab 194 (chat contextual radial), Lab 197 (órbitas), Lab 200 (missões
  físicas por planeta) — candidatos que ficaram de fora desta escolha.
