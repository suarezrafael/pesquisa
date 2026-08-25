# Laboratório 95 — mais missões + escolinhas menores

Status: concluído (parcial — ver nota abaixo)
Início: 2026-08-25
Fim: 2026-08-25
Commit inicial: a3c52a5b96ec6a13185caa1a7ccee7654e3e3aee

**Nota importante**: das duas metas do laboratório, só "mais missões" foi entregue. A redução do
tamanho das escolinhas foi tentada, **implantada em produção, causou um bug visual/funcional real
relatado pelo próprio usuário ao vivo** ("todas as casa estão dentro da terra, até os NPC estão
enterrado... as casinhas só aparecem o telhado") e foi **revertida** de volta ao tamanho original
no mesmo laboratório, já redeployada. Ver `CONTEXT.md` pra detalhes e causa raiz (não confirmada).

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
- [ ] **`world3d/World3D.tsx`**: redução de ~20% no tamanho da escolinha — **TENTADA, DEPLOYADA,
  CAUSOU BUG EM PRODUÇÃO, REVERTIDA**. Ver `CONTEXT.md` pra timeline completa e causa raiz (não
  confirmada). A meta original ("escolinhas menores pra não sobrecarregar o planetinha") continua
  em aberto pra um laboratório futuro, com uma abordagem mais cuidadosa.

## Fora de escopo (explicitamente adiado)
- **Mudar `TRIGGER_DISTANCE`/`RESET_DISTANCE`** (raio de proximidade que abre a missão) — não
  pedido, e mexer nisso sem um problema relatado arriscaria destemperar um valor já ajustado ao
  longo de vários laboratórios anteriores.
- **Redesenhar a distribuição geográfica** (faixa de `phi`, ângulo áureo) — encolher o prédio já
  resolve o pedido de "não sobrecarregar"; mudar a distribuição em si é mais risco pro mesmo
  resultado.
