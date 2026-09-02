# Contexto — Laboratório 94 — brinde exclusivo ao limpar Marte

Preenchido em: 2026-08-25
Commit inicial → final: a6ce02d35c7c8863aee0d7c6e60a37ceedc65fff..HEAD

## O que foi feito
- **`app/src/data/hats.ts`**: novo item `capacete_heroi_marte` ("Coroa de Herói de Marte" 🪐,
  formato `crown` já existente reaproveitado, cor marciana vermelho-alaranjada), `cost: 0`,
  `marsRewardOnly: true` (campo novo em `HatOption`, mesmo espírito de `subscriptionOnly`).
  `DEFAULT_UNLOCKED_HAT_IDS` corrigido pra também filtrar `marsRewardOnly` — bug capturado antes
  de rodar qualquer código, só revisando o filtro existente (`cost === 0 && !subscriptionOnly`
  teria incluído o novo item, liberando-o de graça pra todo perfil novo desde o início).
- **`app/src/state/progression.ts`**: `unlockHat` ganhou a mesma exclusão de `marsRewardOnly` que
  já tinha pra `subscriptionOnly` — nunca liberável pelo botão de compra normal, mesmo com
  `cost: 0`. Nova função `unlockMarsReward(progress): MarsRewardResult` (`{progress, granted}`) —
  idempotente, adiciona o id direto em `unlockedHatIds` sem checar/descontar moeda.
- **`app/src/state/useProgress.ts`**: wrapper `unlockMarsReward()`, devolve o `granted` pro
  chamador decidir se mostra aviso.
- **`app/src/world3d/World3D.tsx`**: flag local `marsClearedThisVisit` (resetada junto com os
  inimigos a cada chegada em Marte, mesmo ponto de código do lab-64) — checa
  `marsEnemies.every((e) => !e.alive)` logo depois de nocautear cada inimigo; na primeira vez que
  isso fica verdadeiro, chama `onUnlockMarsRewardRef.current()` (mesmo padrão de ref já usado por
  `onOpenAchievementsRef`/`onSelectQuestRef`).
- **`app/src/App.tsx`**: `onUnlockMarsReward` conectado, novo state `showMarsReward`, incluído em
  `suspendTriggers`, `MarsRewardToast` renderizado condicionalmente.
- **`app/src/components/MarsRewardToast.tsx`** (novo): reaproveita `.reward-modal`/`.reward-icon`/
  `.reward-line` já existentes de `RewardToast.tsx` — componente à parte (não generaliza
  `RewardToast`) porque a copiagem é bem diferente e não tem XP/moedas/badges pra mostrar.
- **`app/src/world3d/AvatarShop.tsx`**: aba "Chapéus" ganhou o terceiro estado de bloqueio — tag
  "🪐 Vença Marte" reaproveitando `.avatar-shop-tag.subscription-lock`, e o botão de compra normal
  passou a excluir `marsRewardOnly` também (`!hat.subscriptionOnly && !hat.marsRewardOnly`).
- **3 testes novos** em `progression.test.ts` — suíte total: 39.
- **Deploy em produção** do frontend.

## Achado que redefiniu o escopo antes de escrever qualquer código
Investigado com um subagente antes de desenhar a feature: Marte **não tem chefe**. "ETs e o robô"
no pedido do usuário ("no planeta marte ao vencer os ets e o robo voce desbloqueia um brinde") são
só os dois TIPOS de inimigo que já existem (`MARS_ENEMY_COUNT = 6`, 3 de cada), não um inimigo
único/especial à parte. "Vencer" = derrotar todos os 6 da visita atual — um objetivo de limpeza,
não uma luta de chefe nova. Também confirmado: matar o último inimigo hoje não aciona NADA de
especial (cada nocaute já dá 1 moeda via `onCollectCoinRef`, mas não existe estado de "Marte
limpo"), e todos os inimigos voltam à vida a cada nova chegada em Marte (lab-64, pra não deixar o
planeta vazio numa visita futura) — então o brinde precisava ser um desbloqueio ÚNICO (persistido
via `unlockedHatIds`, que já não reseta entre visitas), não repetido a cada limpeza.

## Como foi verificado
Como jogar Marte de verdade (viajar de foguete, equipar espada+arma, nocautear 6 inimigos, um por
vez) seria lento e propenso a erro no ambiente de automação (já visto no lab-93), a verificação ao
vivo usou um atalho de QA temporário — `window.__debugClearMars()`, exposto só em
`import.meta.env.DEV`, matando os 6 inimigos de uma vez e rodando a MESMA checagem condicional do
código real (não um mock) — removido do código-fonte antes do commit final (confirmado via
`grep`). Com ele: confirmado que a lojinha mostra o item bloqueado ("🪐 Vença Marte", sem botão de
compra) antes de limpar Marte; que limpar dispara o toast "Marte limpo!" com o texto certo; que a
lojinha já aberta atualiza pra "Usar" na hora, sem precisar fechar/reabrir; e que chamar de novo
imediatamente (mesma visita) não reabre o toast. A idempotência ENTRE VISITAS de verdade (a parte
mais importante — voltar a Marte, limpar de novo, não duplicar nada) é coberta pelo teste unitário
de `unlockMarsReward`, que é uma função pura de `progress` e não sabe nem se importa quando/quantas
vezes é chamada — mais confiável pra essa garantia específica que uma segunda passada manual ao
vivo teria sido.

## Decisões técnicas tomadas
- **Brinde é um chapéu no catálogo já existente, não um sistema novo.** Reaproveita 100% do
  padrão já estabelecido (mesmo formato geométrico `crown`, mesma estrutura `HatOption`, mesmo
  fluxo de equipar/exibir na lojinha) — a única coisa genuinamente nova é COMO ele é liberado
  (evento de jogo, não moeda nem assinatura), isolada num campo (`marsRewardOnly`) e numa função
  (`unlockMarsReward`) pequenos.
- **Flag local (`marsClearedThisVisit`) em vez de campo em `Progress`.** A pergunta "o jogador já
  limpou Marte NESTA VISITA" só importa pra evitar chamar o unlock a cada quadro — não precisa
  sobreviver a um reload nem ser lida em outro lugar, então não faz sentido persistir. A pergunta
  que REALMENTE precisa persistir ("o jogador já tem o brinde, alguma hora") já é respondida pela
  presença do id em `unlockedHatIds` — nenhum campo novo em `Progress` foi necessário.
- **Toast à parte, não generalização de `RewardToast`.** `RewardToast` já tem um formato fixo
  (XP+moedas+badges, título "Missão concluída!") que não encaixa aqui; um componente pequeno
  reaproveitando só o CSS foi mais simples que ramificar o componente existente com props opcionais.
- **Atalho de QA (`__debugClearMars`) descartável, não um recurso permanente.** Diferente de
  `__debugTeleport`/`__debugTeleportExact` (já existentes, genuinamente reutilizáveis pra testar
  qualquer parte do mapa), este só fazia sentido pra ESTA feature específica — removido junto com
  o resto do código de investigação, mesmo padrão já usado nos labs 91 e 93 (`?devtest`,
  `__debugSittingAtDesk`).

## Pendências / dívidas conhecidas
- Nenhuma nova. Layering de dois modais abertos ao mesmo tempo (shop + toast) foi observado
  incidentalmente durante o teste (o shop ficou visualmente por cima do toast, que só apareceu ao
  fechar o shop) — artefato do MEU método de teste (chamei o atalho de QA com a lojinha já aberta,
  algo que não aconteceria durante uma limpeza de Marte de verdade, já que a lojinha nem fica
  acessível em combate). Não investigado mais a fundo por não representar um cenário real de jogo.

## Funcionalidades planejadas que NÃO foram concluídas
- Nenhuma do escopo definido no `FEATURES.md` deste laboratório ficou de fora.

## O que o próximo laboratório deve desenvolver
Com este laboratório, os 4 itens do pedido maior do usuário registrado desde o lab-91 (dashboard
de progresso, mais colecionáveis, carteira de estudos, brinde de Marte) estão **todos concluídos**.
Não há next-step explícito herdado deste pedido — na ausência de outro redirecionamento do
usuário, os itens de segurança/escala ainda em aberto de `docs/prompts/05-escala-e-viabilidade.md`
(G8: webhook do Stripe sem idempotência; resto de G7: token de pareamento sem `jti`/revogação/
vínculo de aparelho — ver `labs/lab-90-.../CONTEXT.md`) voltam a ser a recomendação natural.

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`
- Frontend deployado em produção (`https://missaoaprendizado.com`,
  `app-two-flax-92.vercel.app`) com o brinde de Marte.
- Como verificar: `cd app && npm run test` (39 testes) e `npx tsc -b` (limpo). Pra reproduzir a
  verificação ao vivo sem jogar Marte de verdade, seria preciso reintroduzir um atalho de QA
  parecido com `__debugClearMars()` (removido do código-fonte final) — o padrão fica documentado
  aqui pra quem precisar de novo no futuro.
