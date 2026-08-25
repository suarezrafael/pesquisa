# Laboratório 95 — mais missões + escolinhas menores

Status: em andamento
Início: 2026-08-25
Fim: -
Commit inicial: a3c52a5b96ec6a13185caa1a7ccee7654e3e3aee

## Objetivo do laboratório
Pedido direto do usuário: "aumente o numero de desafio, hoje acho que tem 21, talvez as vasinhas
[sic, = casinhas/escolinhas] precisar ficar menores pra nao sobrecarregar o planetinha, pode fazer
isso." Dois pedidos ligados: mais missões, e encolher as escolinhas pra caberem sem sobrecarregar
o planeta pequeno (`PLANET_RADIUS = 13`).

## Investigado antes de escrever conteúdo/código
- **21 missões hoje** (`data/quests.ts`, `q01`-`q21`), ciclo estrito lógica→matemática→leitura
  (7/7/7), recompensa em xp/moeda cresce em degraus conforme o índice, `coinReward` sempre = metade
  de `xpReward` (arredondado). `q20` é "Missão Final" (última do ciclo comum), `q21` é o bônus
  escondido do deserto (posição fixa via `QUEST_FIXED_UP`, não a fórmula normal).
- **Desbloqueio é por POSIÇÃO NO ARRAY, não pelo número do id** (`isQuestUnlocked` olha
  `quests[questIndex - 1]`) — então dá pra ACRESCENTAR missões novas no FIM do array com segurança
  total: quem já jogou continua com o mesmo progresso (`completedQuestIds` guarda ids, nunca muda
  de significado), e as novas viram "conteúdo depois da Missão Final" (comum em jogos — mais
  conteúdo depois do final "oficial", não quebra a história do `q20`/`q21`).
- **NUNCA reordenar/renumerar ids existentes** — isso quebraria o progresso salvo de quem já jogou
  (um id passaria a apontar pra um conteúdo diferente do que a pessoa realmente completou).
- **Escolinha = objeto único reaproveitado 21 vezes** (`quests.forEach` em `World3D.tsx` ~4482-
  4590): paredes 1.6×1.1×1.4, fundação 1.72×1.6×1.52, porta 0.42×0.62×0.06, telhado (diâmetro
  2.1), professor (escala 0.92), espalhadas numa faixa de latitude fixa (`phi` entre 0,22π e
  0,62π) via ângulo áureo. Mais escolinhas na MESMA faixa = mais apertado — daí o pedido de
  encolher.

## Funcionalidades planejadas
- [ ] **`data/quests.ts`**: +9 missões novas (`q22`-`q30`), mantendo o ciclo lógica/matemática/
  leitura (3/3/3 novas, chegando a 10/10/10 no total) e temas que ainda não foram usados
  (subtração, contar horas, estimativa, classificação com veículos, causa-efeito na leitura) —
  nenhum tema repetido dos 21 já existentes. Recompensa continua a progressão em degraus a partir
  de onde `q21` parou.
- [ ] **`world3d/World3D.tsx`**: dimensões da escolinha reduzidas (~20% menor em cada eixo —
  paredes/fundação/porta/telhado/professor/posições internas, tudo multiplicado pelo mesmo fator
  pra continuar visualmente coerente) — aplicado direto nos números de cada `MeshBuilder`, não via
  transform do nó pai (evita o colisor de física da parede ficar dessincronizado do visual, que
  aconteceria se só escalasse `base` depois de criar o `PhysicsAggregate`).
- [ ] **Testar ao vivo**: as 9 escolinhas novas aparecem no planeta com números 22-30, funcionam
  (abrem a missão certa, dão a recompensa certa); escolinhas visualmente menores mas ainda com
  colisão funcionando (não dá pra atravessar andando); medir alguns gaps entre escolinhas vizinhas
  pra confirmar que ficou menos apertado, mesmo padrão de verificação já usado no lab-27.
- [ ] **Deploy em produção** (só frontend).

## Fora de escopo (explicitamente adiado)
- **Mudar `TRIGGER_DISTANCE`/`RESET_DISTANCE`** (raio de proximidade que abre a missão) — não
  pedido, e mexer nisso sem um problema relatado arriscaria destemperar um valor já ajustado ao
  longo de vários laboratórios anteriores.
- **Redesenhar a distribuição geográfica** (faixa de `phi`, ângulo áureo) — encolher o prédio já
  resolve o pedido de "não sobrecarregar"; mudar a distribuição em si é mais risco pro mesmo
  resultado.
