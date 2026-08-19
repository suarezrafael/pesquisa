# Laboratório 40 — Limite prático do playtesting automatizado + hook de direção

Status: concluído
Início: 2026-08-17
Fim: 2026-08-17
Commit inicial: ccf1f8ab30636c02c90ea2bd114d1364b0d540cd

## Objetivo do laboratório
Continuação sem feedback novo do usuário — a recomendação em aberto era um playtesting real do
parkour de laser (lab-38/39). Tentei ir além dos testes estáticos por posição (já feitos no
lab-39) e simular uma travessia de verdade (andar + pular no momento certo, via input de teclado
simulado), pra validar o percurso completo, não só pontos isolados.

## O que foi investigado
Calculada a física exata do pulo sobre um laser: janela de altura acima do limiar (~0,57s) contra
a largura da zona de perigo cruzada nessa velocidade (~0,11s) — margem confortável EM TEORIA. Mas
coreografar isso via chamadas sequenciais de automação de navegador não é viável na prática: cada
chamada de ferramenta (segurar tecla, tirar screenshot, ler estado) tem latência real de rede/
processamento da ordem de segundos — muito mais grosseira que a janela de tempo de meio segundo
que o pulo realmente precisa. Não dá pra cronometrar um pulo com essa precisão através de uma
sequência de chamadas de ferramenta discretas.

## Funcionalidades planejadas
- [x] `__debugSetFacing(x,y,z)` (novo hook dev-only) — teleportar não muda a direção que o
      personagem encara (`facing` continua o que era antes); sem isso não dava pra testar "andar
      até X" de forma confiável depois de um teleporte pra um lugar novo do mapa. Verificado ao
      vivo: teleporte pro início do parkour de laser + `__debugSetFacing` na direção do percurso +
      `keydown` real de 'w' + um quadro forçado (screenshot) resultou em 0,10 unidade de
      deslocamento na direção esperada — confirma que o hook funciona.
- [x] Duas correções de comentário no código (`__debugTeleport`/`__debugTeleportExact`) que
      declaravam como fato uma teoria (bug do `.set()` do Babylon quebrando rastreamento de
      mudança) já descartada na investigação do lab-39 — deixadas lá seriam enganosas pra quem
      ler o código depois.
- [x] Documentado o limite prático encontrado (ver "O que foi investigado") — playtesting via
      automação de navegador funciona bem pra estados ESTÁTICOS (posição/velocidade num instante,
      como os testes do lab-39) mas não pra sequências de input cronometradas em frações de
      segundo.

## Fora de escopo (explicitamente adiado)
- Travessia completa do parkour de laser via input de teclado real — inviável com a latência de
  ferramenta atual (ver acima); os testes estáticos por posição do lab-39 continuam sendo a
  melhor evidência disponível via automação.
