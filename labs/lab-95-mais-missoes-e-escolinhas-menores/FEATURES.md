# Laboratório 95 — mais missões + escolinhas menores

Status: concluído
Início: 2026-08-25
Fim: 2026-08-25
Commit inicial: a3c52a5b96ec6a13185caa1a7ccee7654e3e3aee

**Nota importante**: a redução de tamanho da escolinha foi tentada, implantada em produção, e
causou um bug real relatado pelo usuário ao vivo ("todas as casa estão dentro da terra, até os NPC
estão enterrado... as casinhas só aparecem o telhado"). Revertida de volta ao tamanho original —
mas **o bug persistiu, idêntico, mesmo com o tamanho original**. Causa raiz de verdade (não tinha
nada a ver com o tamanho): `settleMeshOnTerrain` incluía o telhado e o professor — que nunca tocam
o chão — na decisão de quanto afundar o prédio inteiro. Corrigido excluindo os dois da amostragem e
usando raycast físico real (não a fórmula) pra decidir se uma posição é plana o bastante. **Corrigido
e confirmado pelo próprio usuário** ("testei denovo agora ficou certo") depois de verificação
exaustiva em 30/30 escolas.

Em seguida, o usuário reportou um bug relacionado: morros/platôs aparecendo invisíveis (casas
"flutuando no espaço"). Uma correção (`backFaceCulling = false` no material do planeta) foi tentada
e deployada, mas **o usuário testou de novo e o morro continua invisível — NÃO RESOLVIDO**. Um
carimbo de build foi adicionado ao HUD a pedido do usuário e confirmou que ele está na versão certa
(não é cache). Não consegui reproduzir o bug no mesmo local exato do print dele. Fica em aberto pro
próximo laboratório — ver `CONTEXT.md` pra timeline completa e as perguntas pendentes.

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
- [x] **`data/quests.ts`**: +9 missões novas (`q22`-`q30`), ciclo lógica/matemática/leitura
  mantido (10/10/10 no total agora). Temas novos: sequência de dobrar (lógica), subtração/troca de
  figurinhas, contar horas, estimativa (matemática), causa-efeito e sentimento em passagem de
  leitura, classificação com veículos, silogismo (lógica). Recompensa continua a progressão em
  degraus a partir de onde `q21` parou (40xp/20moedas → 50xp/25moedas no `q30`).
- [x] **Testado ao vivo (conteúdo das missões novas)**: teleportado direto pra `school-q22` (via
  `window.__debugTeleportExact`) — o modal abriu sozinho com o conteúdo certo ("Dobrando Sempre",
  lógica), respondido corretamente, recompensa creditada bateu exatamente (40xp/20moedas base,
  dobrado pra 80/40 pelo evento "Semana da Recompensa Dupla" ativo no momento do teste), e o badge
  "Metade do Caminho" disparou corretamente usando o NOVO limiar (`Math.ceil(30/2) = 15`,
  recalculado automaticamente a partir de `quests.length`, sem precisar tocar em
  `badgesEarnedAt`). Cadeia de desbloqueio confirmada funcionando pras missões novas também:
  `school-q30` corretamente NÃO abriu o modal sozinho porque `q29` ainda não tinha sido completada
  no perfil de teste (comportamento esperado de `isQuestUnlocked`, não um bug).
- [x] **Deploy em produção (missões novas)** via `npx vercel --prod --yes`.
- [x] **`world3d/World3D.tsx`**: redução de ~20% no tamanho da escolinha — tentada, deployada,
  causou bug em produção, revertida (tamanho original restaurado). **O bug de afundamento
  persistiu mesmo depois do revert** — não tinha relação com o tamanho. Causa raiz real:
  `PLATEAU_CENTERS` tem rampas de até 3,2 unidades de altura com inclinação de até ~0,8
  unidade/metro; uma escola cuja posição (fórmula de ângulo áureo) caísse numa rampa dessas via
  cantos com quase 2 unidades de diferença de altura entre si, e `settleMeshOnTerrain` (que desce o
  prédio até o canto MENOS alto encostar no chão) enterrava todos os outros cantos — inclusive o
  professor (NPC), que fica ainda mais deslocado do centro. Corrigido de verdade: `SCHOOL_UPS`
  (nova constante em escopo de módulo, substitui a duplicação antiga de `SCHOOL_DIRS`) mede a
  variação de relevo ao redor de cada posição candidata (`terrainVarianceNearby`) e, se for grande
  demais, procura um ponto próximo mais plano (`findFlatterSchoolUp`, busca em anéis, nunca se
  afasta mais que ~4,5m do slot original do ângulo áureo). Verificado ao vivo lendo a cena Babylon
  diretamente (posição real de paredes/telhado/pés do professor vs. altura real do terreno via
  raycast físico, não só screenshot) em 14 escolas (incluindo `q01`, a pior antes da correção) — 0
  enterradas, todas com as paredes flush no chão (folga = altura total da parede, exatamente como
  esperado) e o professor a poucos centímetros do nível real do terreno. Deployado em produção.
  **Essa verificação não se sustentou** — ver o item seguinte.
- [x] **Causa raiz de verdade do afundamento (Rodada 3)**: a verificação acima usava a MESMA
  fórmula analítica (`terrainHeight`) que a correção usava pra decidir posição — não pegava erro da
  própria fórmula. O usuário reportou o bug de novo depois do deploy. Causa raiz real:
  `settleMeshOnTerrain` incluía o telhado (beiral largo) e o professor (deslocado do centro) — que
  nunca tocam o chão — na decisão de quanto descer o prédio inteiro. Corrigido com
  `excludeFromSampling` (telhado/professor ainda se movem junto, mas não decidem mais quanto descer)
  e trocando a busca de posição plana pra usar raycast físico real (`terrainGroundRadial`) em vez da
  fórmula. Verificado exaustivamente em 30/30 escolas (folga média 0,86 de um máximo de 1,10, pior
  caso 0,52, zero enterradas). **Confirmado pelo usuário**: "testei denovo agora ficou certo".
- [ ] **Morros/platôs invisíveis — NÃO RESOLVIDO.** Bug relacionado reportado pelo usuário: casas em
  cima de platôs "flutuando no espaço" porque o morro embaixo delas fica invisível. Causa
  identificada (triângulos com ordem de enrolamento invertida nas rampas mais íngremes, culling de
  face traseira escondendo eles) e uma correção (`planetMat.backFaceCulling = false`) foi deployada,
  mas o usuário testou de novo (confirmado pelo carimbo de build que é a versão certa) e o morro
  continua invisível. Não consegui reproduzir no mesmo local exato do print dele. Perguntas feitas
  ao usuário sem resposta ainda: anda através do buraco? qual aparelho/GPU? Fica pro próximo
  laboratório — ver `CONTEXT.md`.
- [x] **Carimbo de build no HUD** (`__BUILD_STAMP__`, sempre visível) — pedido do usuário pra
  conseguir confirmar que está testando a versão certa sem depender de mim. Confirmado funcionando:
  o carimbo no print do usuário bateu exatamente com o publicado em produção.

## Fora de escopo (explicitamente adiado)
- **Mudar `TRIGGER_DISTANCE`/`RESET_DISTANCE`** (raio de proximidade que abre a missão) — não
  pedido, e mexer nisso sem um problema relatado arriscaria destemperar um valor já ajustado ao
  longo de vários laboratórios anteriores.
- **Redesenhar a distribuição geográfica** (faixa de `phi`, ângulo áureo) por completo — a correção
  de afundamento (`SCHOOL_UPS`) só faz um pequeno ajuste local (até ~4,5m) em posições que caem em
  rampa íngreme; a distribuição geral pela faixa de latitude continua a mesma. O pedido original de
  "não sobrecarregar" com escolinhas menores segue não implementado (ver nota no topo do arquivo).
