# Laboratório 36 — Terceiro parkour: torre em espiral

Status: concluído
Início: 2026-08-17
Fim: 2026-08-17
Commit inicial: 33bafa4c6e200dfc7c7556874722298b51ddafdb

## Objetivo do laboratório
Última pendência da fila aberta no lab-34/35: usuário escolheu "mais parkour" como uma das
direções de "mais brincadeiras interativas". Os dois parkours existentes (7 e 14 degraus) são
ziguezagues retos num plano tangente fixo — um terceiro igual seria "mais do mesmo", não uma
variação de verdade.

## Funcionalidades planejadas
- [x] Espaçamento verificado ANTES de escrever qualquer código de cena (script Node isolado,
      fora do app): espiral de 12 degraus, 1,5 volta completa, raio encolhendo de 1,8 pra 0,6 —
      maior distância 3D entre dois degraus consecutivos = 1,59, bem dentro do alcance já
      comprovado dos outros dois parkours (~2,1-2,36).
- [x] Terceiro percurso: espiral (gira em círculos cada vez mais estreitos subindo, não zigue-
      zague reto) — 12 degraus, sobe ~9,35 unidades no total (mais alto que os outros dois apesar
      de menos degraus que o segundo, porque girar permite ganhar altura sem esticar o percurso
      por uma faixa enorme do mapa). Local achado por busca de distância angular contra todos os
      marcos do mapa (~29,3° de folga do vizinho mais próximo).
- [x] Recompensa no topo: 6 moedas (o maior leque dos três desafios, coerente com ser o mais alto).
- [x] Verificação: `npm run build` passa; ao vivo, confirmadas as 12 plataformas com colisão
      física real; as distâncias 3D REAIS entre plataformas consecutivas (medidas na cena, não só
      calculadas no script) batem exatamente com o que o script previu (1,59 → 0,99). 6/6 moedas
      confirmadas. Ver `CONTEXT.md`.

## Fora de escopo (explicitamente adiado)
- Testar ao vivo (jogando, subindo de verdade) os três desafios de parkour e a Torre do Tesouro —
  nenhum foi confirmado com movimento real do jogador nesta sessão, só por raycast/geometria.
