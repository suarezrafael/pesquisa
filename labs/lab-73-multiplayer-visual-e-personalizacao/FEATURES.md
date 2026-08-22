# Laboratório 73 — multiplayer visual e personalização

Status: concluído
Início: 2026-08-22
Fim: 2026-08-22
Commit inicial: e77b0891d1d144fd76e5f700715d9daeb06661a8

## Objetivo do laboratório
Fazer chapéu/arma/ataque do jogador aparecerem pros outros jogadores no multiplayer (hoje só o
próprio cliente via), impedir que um jogador atravesse o outro, e expandir a lojinha com cor de
camisa/calça/sapato/mochila e formato de cabelo (pedido do usuário, mensagem literal): "quando um
outro usuario multiplayer estiver usando chapeu personalizado o outro usuario deve poder enxergar
esse chapeu, se ele estiver segunrando a espada ou a arma tbm, e o esfeito de espada e arma deve
ser visto por todos como num jogo multiplayer. O boneco multiplayer e o meu boneco deve ter
colisao, nao deve ser possivel passar por dentro dele. Tem que dar pra escolher na lojinha a cor
da camiseta e da mochila trocando por moedas, a cor da calca, a cor do sapato, e o formato do
cabelo, pode ser 3 opcoes de cada."

## Funcionalidades planejadas
- [x] Chapéu do jogador remoto visível pros outros (protocolo `RemoteState` + `applyRemoteAppearance`) — confirmado ao vivo (duas abas)
- [x] Espada/arma equipada do jogador remoto visível pros outros (código; não confirmado ao vivo)
- [x] Efeito de golpe/tiro (espada/laser) visto por todos, não só por quem golpeou (`AttackEvent`) (código; não confirmado ao vivo)
- [x] Colisão jogador-jogador (empurrão suave, sem deixar atravessar) (código; não confirmado ao vivo)
- [x] Lojinha: cor de camisa (3 opções + padrão, por moedas) — confirmado ao vivo (compra/equip)
- [x] Lojinha: cor de calça (3 opções, por moedas) — confirmado ao vivo (compra/equip)
- [x] Lojinha: cor de sapato (3 opções, por moedas) — confirmado ao vivo (compra/equip)
- [x] Lojinha: cor de mochila (3 opções, por moedas) — confirmado ao vivo (compra/equip)
- [x] Lojinha: formato de cabelo (3 opções, por moedas) — confirmado ao vivo (compra/equip)

## Fora de escopo (explicitamente adiado)
- Física de corpo-a-corpo real entre jogadores (custo de sincronizar física entre clientes) — a
  "colisão" é um empurrão suave só no próprio avatar local, mesma técnica já usada pros inimigos
  de Marte.
