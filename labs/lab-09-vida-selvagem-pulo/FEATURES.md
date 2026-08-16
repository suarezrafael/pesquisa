# Laboratório 09 — Animais selvagens, pulo, lagoa/piscina, terreno com variação de cor

Status: concluído
Início: 2026-08-16
Fim: 2026-08-16
Commit inicial: 5e6193c

## Objetivo do laboratório

Uma sequência longa de pedidos do usuário, um atrás do outro, na mesma sessão:
"eu quero animais no mundo animais aleatorios", "quero pular quando clico na tecla espaco",
"quero picina com gente nela", "quero lago com peixe e pato e tartaruga", "fasa uma mochila
que der para entender", "mais animais", "eu quero mais pessoas", "eu quero que arrume os
morros eles estao sem textura" — além de feedback ao vivo apontando bugs reais durante o
desenvolvimento ("o boneco ainda ta bugado", "os asnimais estao meio bugados", "a picina ta
bugada", "o mapa esta bugado").

## Funcionalidades planejadas
- [x] Animais selvagens vagando pelo planeta: coelhos e esquilos (terrestres, com IA de "andar
      até um ponto por perto, descansar, escolher outro") e passarinhos (voando, batendo asa)
- [x] Pulo com a barra de espaço — só funciona "no chão" (não pula infinito/voa), borda de
      subida da tecla (não repete segurando)
- [x] Lagoa com peixinhos, pato e tartaruga nadando em círculos
- [x] Piscina com gente boiando, se mexendo e "conversando" (bolha de fala decorativa)
- [x] Mochila do personagem redesenhada pra dar pra reconhecer de costas (aba, bolsos laterais,
      alças aparecendo nos ombros)
- [x] Variação de cor no terreno (verde/verde-seco/pedra conforme inclinação) — sem textura de
      arquivo, por cor de vértice
- [x] Mais animais (20, era 12) e mais gente na piscina (5, era 3)
- [x] Testado de ponta a ponta com metodologia corrigida (renders forçados, não só espera
      passiva) depois de descobrir que a aba em segundo plano do Chrome automatizado suspende
      `requestAnimationFrame` — ver `CONTEXT.md` para os bugs reais encontrados e corrigidos

## Fora de escopo (pedidos recebidos nesta sessão, adiados pro próximo laboratório)

Chegaram muitos pedidos novos enquanto este laboratório já estava em andamento — registrados
aqui pra não se perderem, não implementados agora pra não empilhar risco em cima do que já
precisou de correção:
- Ruas e carros andando ("quero carros andando", "quero ruas")
- Loja que dá pra entrar ("quero lojar que der para entrar")
- Clima dinâmico: chuva em horário aleatório, trovões e raios
- Parkour (plataformas/obstáculos — combina com o pulo já implementado aqui)
- Trilha sonora do Michael Jackson — **recusado**, não implementável: é música com direito
  autoral de terceiro, não dá pra incluir num jogo. A trilha "estilo rádio" sintetizada
  (lab-07) continua sendo a alternativa.
