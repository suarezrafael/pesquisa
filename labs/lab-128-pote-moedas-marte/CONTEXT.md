# Contexto — Laboratório 128 — Pote de moedas na base alienígena de Marte

Preenchido em: 2026-08-30
Commit inicial → final: c22205a3b7cc0b9d8d2e5ea0a46f4c413139682b..HEAD

## O que foi feito

Pedido pequeno do backlog discutido em chat: ao vencer todos os inimigos de Marte, um pote de
moedas aparece na base alienígena (Estação Alienígena), coletável por proximidade, dando um bônus
de 10 moedas de uma vez só — além do que já existia (chapéu exclusivo, lab-94; moeda por inimigo
nocauteado individualmente).

Tudo em `app/src/world3d/World3D.tsx`:
- `MARS_COIN_POT_REWARD = 10` / `MARS_COIN_POT_TRIGGER_DISTANCE = 1.4` novos.
- Pote (tigela + 5 moedinhas douradas, mesmo material emissivo já usado nas moedas comuns)
  construído em `buildMarsIfNeeded`, posicionado a 0,75 rad de `MARS_UFO_DIR` (fora da malha física
  da estação, `UFO_RADIUS=3,2` ocupa só ~0,53 rad) — sempre construído, mas `setEnabled(false)` até
  Marte ser limpo.
- Revelado (`setEnabled(true)` + `TextBlock.isVisible = true`) no mesmo ponto onde o chapéu
  exclusivo já era concedido (`if (!marsClearedThisVisit && marsEnemies.every((e) => !e.alive))`,
  lab-94, reaproveitado sem mudança).
- Resetado (escondido de novo) junto do reset de inimigos por nova visita a Marte.
- Gatilho de proximidade PRÓPRIO (não reaproveita o array genérico `coins`, que só suporta "vale 1
  moeda sempre") — credita `MARS_COIN_POT_REWARD` de uma vez, esconde o pote, idempotente.

## Decisões técnicas tomadas

Ver `FEATURES.md` (seção "Decisões técnicas tomadas") para o racional completo. Resumo: pote
sempre construído mas condicionalmente visível (padrão já usado no arquivo), reseta por visita
(mesmo espírito do chapéu), gatilho próprio em vez de reaproveitar o array genérico de moedas, e um
achado de revisão de código (não só suposição) que `Control.linkWithMesh` do Babylon.GUI projeta
pela matriz de mundo do mesh independente do `isEnabled()` dele — corrigido com
`TextBlock.isVisible = false` explícito, senão o texto do pote ficaria flutuando sozinho no espaço
antes de Marte ser limpo.

## Achado real na verificação ao vivo (não na leitura de código)

A primeira tentativa de pousar em Marte (segurando W por ~8s de jogo simulado) pareceu ter dado
certo pela CÂMERA (mostrava a Estação Alienígena de perto), mas checando `avatarCollider.position`
(corpo físico) contra `window.__playerFigure.root` (visual), os dois estavam em lugares
COMPLETAMENTE diferentes — o visual (parentado dentro do foguete durante o voo) já mostrava Marte,
mas o corpo físico nunca tinha sido teleportado de verdade (`landRocket()` não tinha disparado
ainda, `drivingRocket.progress` não tinha alcançado 1.0). Segurando W por mais tempo (300 quadros
adicionais) sincronizou os dois corretamente. **Lição pra próximas verificações envolvendo viagem
de foguete**: sempre conferir `avatarCollider.position` CONTRA `window.__playerFigure.root.
getAbsolutePosition()` antes de confiar que o pouso terminou — a câmera sozinha pode enganar.

## Pendências / dívidas conhecidas

- **A verificação ao vivo não testou o combate de verdade** (matar os 6 inimigos com espada/arma
  reais) — isso exigiria voltar ao planeta principal pra pegar espada/arma primeiro (pickups físicos,
  não persistem entre sessões), depois voar de volta a Marte, um roteiro bem mais longo. Em vez
  disso, o pote foi revelado manualmente (`pot.setEnabled(true)`) pra testar especificamente o
  código NOVO (revelação + coleta), confiando no gatilho "todos mortos" já existente e comprovado
  desde o lab-94 (não modificado aqui, só reaproveitado). Se o usuário reportar que o pote não
  aparece depois de vencer os inimigos de verdade, o primeiro lugar a checar é essa integração.

## Funcionalidades planejadas que NÃO foram concluídas

Todas as funcionalidades planejadas em `FEATURES.md` foram concluídas.

## O que o próximo laboratório deve desenvolver

Do backlog maior discutido em chat, ainda não formalizado em labs: mobília desbloqueada por
planeta conquistado, persistência de "Minha Casa" pra assinante (arquitetural, G6 do doc de
escala), cronômetro de sobrevivência em Mercúrio/Netuno, e outras ideias de engajamento (login
diário, baús, cartão-postal colecionável). Sem prioridade única — perguntar ao usuário.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`.
- `npm run test` (em `app/`): 52/52 passando (sem teste novo — construção 3D + gatilho de
  proximidade, sem lógica de domínio pura nova).
- `npm run build` (em `app/`): typecheck + build de produção sem erros.
- Verificação ao vivo (dev server local + browser automation): viagem de foguete real até Marte
  (com o achado de sincronização acima), pote revelado manualmente e coletado por proximidade real
  (+10 moedas, 195→205, confirmado via `localStorage`), sem crédito duplo ficando parado perto,
  confirmado visualmente que o pote renderiza em escala razoável perto da estação sem colidir com
  ela, sem erro de console.
- Como verificar de novo: `cd app && npm run dev`, viajar de foguete até Marte, derrotar os 6
  inimigos (precisa de espada/arma, achadas no planeta principal antes de viajar), andar até a
  Estação Alienígena.
