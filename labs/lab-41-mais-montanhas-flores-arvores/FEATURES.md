# Laboratório 41 — Mais montanhas, flores e árvores

Status: concluído
Início: 2026-08-17
Fim: 2026-08-17
Commit inicial: 9ecd508cf3cc80d960819c722571599321d22441

## Objetivo do laboratório
Pedido do usuário: "coloque mais montanhas e flores no planeta, e mais árvores."

## Funcionalidades planejadas
- [x] 4 montanhas novas (`PLATEAU_CENTERS`, total sobe de 8 pra 12) — posições achadas por busca
      gulosa de distância angular contra TODOS os marcos do mapa (as 8 montanhas anteriores,
      lagoa, piscina, deserto, os 4 parkours, lojinha, torre, as 21 escolas), cada uma escolhida
      como o ponto de maior folga restante depois de já contar as anteriores — folga mínima de
      18,6°, sem sobrepor nada existente.
- [x] Mais árvores e flores nos props gerais espalhados pelo planeta — em vez de só aumentar a
      contagem total (que manteria a mesma proporção 1/3 árvore-1/3 pedra-1/6 flor de antes), o
      índice de qual prop usar agora vem de uma lista com árvore e flor REPETIDAS (2x cada), sem
      mudar a lista original de arquivos nem os índices que a bacia do deserto depende
      (`DESERT_ROCK_INDICES`) — árvore sobe de ~33% pra ~44% de chance, flor de ~17% pra ~22%.
- [x] Contagem total de props sobe de 42 pra 65 (~+55%) — mais de tudo (incluindo árvore/flor,
      já com prioridade maior pela mudança acima).
- [x] Verificação: `npm run build` passa; ao vivo, 65/65 colisores de prop confirmados na cena;
      raycast físico real numa das montanhas novas confirma altura de 1,94 unidade (esperado 2,0,
      diferença de 0,06 dentro da tolerância já documentada de discretização malha-vs-fórmula).

## Fora de escopo (explicitamente adiado)
- Nenhum — pedido direto e totalmente coberto.
