# Laboratório 128 — Pote de moedas na base alienígena de Marte

Status: concluído
Início: 2026-08-30
Fim: 2026-08-30
Commit inicial: c22205a3b7cc0b9d8d2e5ea0a46f4c413139682b

## Objetivo do laboratório

Item pequeno do backlog discutido em chat: *"em marte ao vencer os ets deve aparecer um pote de
moedas na base de ets."*

## Investigado antes de planejar

- **"A base de ETs" = a Estação Alienígena** (`buildUfoStation`, direção fixa `MARS_UFO_DIR`) — os
  6 inimigos em si (`marsEnemies`) NÃO nascem clusterizados nessa estrutura (distribuição própria
  em golden-angle pelo planeta inteiro, só evitando o foguete de pouso) — a "base" reconhecível
  pro jogador é a estação em si, não "onde quer que um inimigo tenha nascido".
- **"Vencer os ETs" já tem um gatilho existente e testado** (lab-94): `if
  (!marsClearedThisVisit && marsEnemies.every((e) => !e.alive))` — dispara
  `onUnlockMarsRewardRef.current()` (o chapéu exclusivo). Reaproveitado tal e qual, só acrescentando
  a revelação do pote logo depois, sem duplicar a lógica de "todos mortos".
- **Espaço físico na estação**: `UFO_RADIUS = 3,2` num planeta de raio 6 ocupa ~0,53 rad de raio
  angular — colocar o pote a 0,75 rad de `MARS_UFO_DIR` (rotacionado em torno de um eixo
  perpendicular) garante que ele fica claramente fora da malha física da estação, mas ainda perto o
  bastante pra ler como "na base".
- **Padrão de coleta já estabelecido**: `coins` (array compartilhado por todo o jogo) só suporta
  "vale sempre 1 moeda" — não serviria pro "pote" (que deve valer mais que uma moeda comum) sem
  distorcer essa semântica em todo o resto do código. Melhor um gatilho PRÓPRIO (mesmo padrão dos
  outros gatilhos custom já existentes — balcão da loja, carteira de estudos), não reaproveitar o
  array genérico.

## Decisões técnicas tomadas

- **Construído sempre (junto da estação), mas invisível até Marte ser limpo** — mesmo espírito de
  "construir sempre, mostrar condicionalmente" já usado em outros lugares deste arquivo (barato:
  6 malhas pequenas).
- **`MARS_COIN_POT_REWARD = 10`** — bônus de uma vez só, além da moeda que cada inimigo já dá ao
  ser nocauteado individualmente.
- **Reseta a cada nova visita** (junto do reset de `marsClearedThisVisit`/inimigos já existente) —
  mesmo espírito de "voltar de novo por escolha própria depois de já ter limpado o planeta" já
  documentado pro chapéu.
- **`TextBlock.isVisible = false` explícito, não só `setEnabled(false)` no mesh** — achado ao
  revisar o próprio código antes de testar (não só suposição): `Control.linkWithMesh` projeta pela
  matriz de mundo do mesh independente do estado `isEnabled()` dele; sem isso, o texto "🪙 Pote de
  moedas!" ficaria flutuando sozinho no espaço antes de Marte ser limpo.

## Funcionalidades planejadas

- [x] `World3D.tsx`: `MARS_COIN_POT_REWARD`/`MARS_COIN_POT_TRIGGER_DISTANCE` novos; pote (tigela +
      5 moedinhas) construído em `buildMarsIfNeeded`, perto da estação alienígena, invisível até
      Marte limpo.
- [x] `World3D.tsx`: revelado no mesmo ponto que já concede o chapéu de Marte; resetado (escondido
      de novo) junto do reset de inimigos por nova visita.
- [x] `World3D.tsx`: gatilho de proximidade próprio (não reaproveita o array genérico `coins`) —
      credita `MARS_COIN_POT_REWARD` de uma vez, esconde o pote, idempotente (não credita de novo
      sem sair/voltar).
- [x] Verificação: `npm run build`/`npm run test` sem erros (52/52); verificação ao vivo (dev
      server + browser automation) — viagem de foguete real até Marte (achado na própria
      verificação: a primeira tentativa de pousar não segurou W tempo suficiente, avatar visual e
      corpo físico ficaram DESSINCRONIZADOS até segurar mais tempo — ver `CONTEXT.md`), pote
      revelado manualmente e coletado por proximidade real (+10 moedas confirmado, 195→205),
      confirmado que não credita de novo ficando parado perto, confirmado visualmente que o pote
      renderiza em escala razoável perto da estação sem colidir com ela, sem erro de console.
