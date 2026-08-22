# Laboratório 64 — Marcianos renovados, anel remoto e confirmação de golpe/tiro

Status: concluído
Início: 2026-08-21
Fim: 2026-08-21
Commit inicial: 4711971a90bb4e06296dd401f176886d0b4f9a37

## Objetivo do laboratório
Usuário: "mas se estiver com a espada mexe o braco em formato de golpe de espadae a arma dispara
laser de luz. Se voltar pra marte, tem que ter novos marcianos pra matar, senao o planeta fica
vazio. e efeito de fumaca circular que aparece quando esta em marte devem aparecer quando estou
vizualizando outros usuarios logados no server tbm."

Três pedidos:
1. Confirmar (e finalmente flagrar ao vivo) que segurar a espada faz o braço golpear e a arma
   dispara laser — pendência que já atravessa os labs 62 e 63.
2. Marte não pode ficar "vazio" depois de nocautear os inimigos uma vez — voltar de foguete deve
   trazer marcianos novos.
3. O anel de onda sonora (lab-62, "anel de onda sonora" — usuário chama de "fumaça circular" aqui)
   deve aparecer também nos jogadores remotos (multiplayer local) quando eles estiverem em Marte.

## Funcionalidades planejadas
- [x] Marte repovoado a cada chegada — `landRocket()` reseta todos os `marsEnemies` pro estado
      vivo/posição de nascimento. Verificado AO VIVO: voei até Marte, desabilitei os 5 inimigos
      manualmente (simulando "planeta limpo"), voltei pro planeta principal de foguete, voei de
      volta a Marte — os 5 reapareceram vivos.
- [x] Anel de onda sonora nos jogadores remotos — visível quando a posição sincronizada deles está
      perto de Marte. Verificado AO VIVO com duas abas conectadas ao mesmo servidor de
      retransmissão: mandei a aba 2 pra Marte, e a aba 1 mostrou o anel do jogador remoto
      habilitado (`enabled: true`) na posição correta de Marte, visível no screenshot.
- [x] Pontes de depuração DEV-only (`__debugTriggerAttackAnim`, `__debugTriggerEnemyVfx`,
      `__debugTriggerLaser`) — implementadas e usadas com sucesso pra finalmente confirmar o item 1.
- [x] Confirmação ao vivo via essas pontes: braço golpeando com a espada CONFIRMADO
      visualmente (screenshot com os dois braços num arco de corte + a espada visível na mão);
      pose de tiro da arma confirmada visualmente; feixe de laser, choque do robô e fumaça do ET
      confirmados por contagem exata de malhas geradas (1 `laserBeam`, 3 `roboShockSeg`, 5
      `etSmokePuff` — batendo exatamente com o código) já que duram menos que o tempo de
      ida-e-volta de uma chamada de automação (180-450ms), mas não capturados num screenshot
      literal — mesma limitação de tempo real documentada nos labs 62/63, não uma regressão.
- [x] Build (typecheck + produção) passa.

## Fora de escopo (explicitamente adiado)
- Mudar a contagem/dificuldade dos inimigos de Marte — só repovoar com a mesma distribuição já
  existente (`MARS_ENEMY_COUNT`/`MARS_ENEMY_COUNT_LOW_END`), não pedido pelo usuário.
- Sincronizar um campo "planeta atual" no protocolo de rede pro anel remoto — desnecessário, a
  posição já sincronizada é suficiente pra inferir se o jogador remoto está perto de Marte.
