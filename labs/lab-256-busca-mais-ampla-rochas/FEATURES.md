# Laboratório 256 — Busca de terreno mais ampla pras rochas de montanha

Status: implementado
Início: 2026-10-04
Fim: 2026-10-04
Commit inicial: 0b41b5e336dcac7db8ea519e21fc8137d2aa1d54
Prioridade: P0 — usuário mandou um TERCEIRO print mostrando que o fix do lab-255 não bastou

## Objetivo do laboratório

Minutos depois do deploy do lab-255 (rocha flutuando perto de "Hub de Jogos"/"Parkour"), o
usuário mandou outro print, dessa vez perto de "Centro de Jogos" — mostrando DUAS rochas enormes,
completamente destacadas do chão, flutuando no meio do ar, com a mensagem "se vc tivesse achado a
causa esse morro aqui nao estaria flutuando". Reproduzido ao vivo no mesmo dev build já rodando
desta sessão: `mountainRock-1-1` (`rock_tallA`, escala 3,2) mostrava exatamente esse sintoma —
sem NENHUM contato visível com o chão de nenhum ângulo, pior que o caso do lab-255.

## Funcionalidades planejadas

- [x] Reproduzir o caso específico do print ao vivo (raycast de tela real, não só a amostragem de
  vértice usada pelo algoritmo) — confirmado: no pixel exato onde a fresta aparece, o raycast
  acerta `planet` a uma distância MENOR da câmera do que a rocha (14,79 vs 16,28) — ou seja, o
  terreno próximo realmente está "na frente" da rocha do ponto de vista da câmera, um gap real de
  perspectiva, não um bug de renderização.
- [x] Entender por que a correção do lab-255 (`findFlatterUpReal` reaproveitado) não bastou pra
  este caso: o passo de anel padrão da função (0,065 rad, pensado pra fundação de prédio) é menor
  que o próprio footprint da rocha grande (~0,135-0,16 rad pra escala 3,2-3,8) — a busca mal se
  afasta além do tamanho da própria rocha, incapaz de escapar de uma região ruim mais larga que
  ela mesma (como perto da borda de um platô).
- [x] Adicionar um parâmetro opcional `ringStep` em `findFlatterUpReal` (padrão `0.065`, igual
  antes — escolas/prédios/centro de jogos continuam chamando sem esse argumento, comportamento
  deles inalterado) e passar `rockFootprintAngularRadius * 0.9` pras rochas de montanha — busca
  agora numa área proporcional ao tamanho de CADA rocha, não um passo fixo pequeno.
- [x] Medir de novo ao vivo: `mountainRock-1-1` (o da print) — variação de altura caiu pra 0,63
  (era ~1,2 antes do lab-255, pouco mudou DEPOIS do lab-255 até este ajuste). Visualmente
  confirmado com zoom: base totalmente conectada ao morro, sem fresta.
- [x] Medir as outras 8 rochas já verificadas no lab-255 (platôs 0, 1 e 4) — todas com
  `largestGap` entre -0,04 e -0,12 (ancoragem boa e consistente) e `spread` geral menor que antes;
  2 das 9 ainda ficam com spread >1,0 (não totalmente eliminado, mesma ressalva honesta do
  lab-255: a busca melhora mas não garante zero em toda região).
- [x] `npm run test` (377/377), `npm run lint` (zero avisos), `npm run build` (tsc -b + build)
  sem regressão.
- [x] Reverter o bypass temporário de `waitForVisible()` antes do commit.

## Fora de escopo (explicitamente adiado)

- Visualmente confirmar as 2 rochas restantes com spread >1,0 (`mountainRock-1-3`,
  `mountainRock-4-0`) — não consegui um ângulo de câmera limpo nesta sessão (câmera de órbito
  ociosa interferindo na automação). Ficam documentadas como pendência pro próximo laboratório se
  o usuário ainda notar alguma rocha flutuando.
- Mudar o algoritmo de `settleMeshOnTerrain` em si, ou os parâmetros de escala/`radiusFrac` das
  rochas — mesma decisão do lab-255, a causa raiz é a busca de POSIÇÃO, já endereçada aqui.
