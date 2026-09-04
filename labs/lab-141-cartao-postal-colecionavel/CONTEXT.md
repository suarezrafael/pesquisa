# Contexto — Laboratório 141 — Cartão-postal colecionável

Preenchido em: 2026-09-03
Commit inicial → final: fb0b9b87c4bfc35c2ea72958c26d1120d6a19910..HEAD

## O que foi feito

`data/postcards.ts` novo (catálogo puro, 7 cartões — um por planeta-destino) +
`applyPostcardCollected` (`progression.ts`, mesmo padrão idempotente de `applyTreasureChestFound`/
`unlockMarsReward`) + `Progress.collectedPostcardIds` novo. `landRocket()` (`World3D.tsx`) chama a
concessão logo que `arrivedPlanetId` é resolvido (cobre chegada de verdade E pouso de volta na
origem ao desistir no meio do caminho — nos dois casos o jogador está pisando de verdade na
superfície daquele planeta), mostrando um aviso transitório só quando o cartão é genuinamente novo
(retorno `boolean` do bridge `onCollectPostcard`, igual ao padrão de `onFindTreasureChest`, mas
esse último não precisava do retorno porque o baú já tem gatilho visual de "achado" — pousar num
planeta acontece toda visita, sem esse gatilho). Galeria nova dentro do `AchievementsPanel.tsx` já
existente, não um painel/ícone de HUD novo — cartão não coletado mostra "???"/"Ainda não visitado".

## Decisões técnicas tomadas

- **Item escolhido de forma autônoma, não pedido nesta sessão** — registrado explicitamente aqui
  por transparência: com a verificação ao vivo do lab-140 bloqueada (ambiente) e nenhum pedido novo
  do usuário no momento, em vez de ficar ocioso puxei um item já identificado e válido do backlog
  de engajamento (mesma lista de onde saiu o login diário, lab-138) — mesmo raciocínio que já
  levou ao lab-138.
- **Concede na chegada por `landRocket`, não por um gatilho de proximidade novo dentro do
  planeta** — mais simples e já é o ÚNICO ponto por onde "chegar" num planeta-destino passa;
  reaproveita a mesma lógica de decidir `arrivedPlanetId` que já existe pra pouso/vida cheia/
  cronômetro de sobrevivência.
- **Sem moeda/XP, mesmo espírito de `badges`, não de recompensa de missão** — decisão consciente
  de manter isso como coleção pura (o próprio nome do pedido, "colecionável", já sugere isso), sem
  criar mais um sistema de bônus a coordenar com evento semanal/assinante.
- **Galeria dentro do `AchievementsPanel.tsx` existente, sem ícone novo no HUD** — o HUD já tem 9
  botões (`docs/prompts` não pede limite, mas adicionar mais um só pra isso pareceu
  desproporcional); "conquistas" e "cartões-postais" são as duas telas de "coleção" do jogo, cabem
  bem juntas no mesmo painel.

## Pendências / dívidas conhecidas

- **Não verificado ao vivo nesta sessão** — mesma limitação de ambiente do lab-140 (aba de
  automação sem foco do sistema operacional, `document.hidden = true`), ainda sem recuperar. Viajar
  de foguete até um planeta-destino de verdade pra testar isto exigiria bem mais tempo de
  automação que os labs anteriores desta sessão (histórico do projeto já registra viagens de
  foguete como um dos cenários mais trabalhosos de verificar ao vivo, ver labs 115/127/129/130) —
  então mesmo com o ambiente saudável, a confirmação completa ficaria pra uma sessão à parte.
  Confiança vem de: `npm run test` (99/99, 4 testes novos cobrindo concessão/idempotência/id
  desconhecido/acúmulo independente por planeta) + paridade de código com `applyTreasureChestFound`
  (já comprovado ao vivo desde o lab-131) + `npm run build` limpo.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — todas as planejadas em `FEATURES.md` foram concluídas (com a ressalva de verificação ao
vivo pendente, ver acima).

## O que o próximo laboratório deve desenvolver

Sem pedido novo do usuário. Antes de puxar mais um item do backlog por conta própria, checar se o
usuário já testou os labs 139-141 em produção e tem algum retorno — priorizar isso sobre abrir
mais escopo novo.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`.
- `npm run test`: 99/99 (4 testes novos).
- `npm run build`: typecheck (`tsc -b`) + build de produção sem erros.
- Live-test: não realizado nesta sessão (ver Pendências).
- Deploy: pendente — mesmo fluxo dos labs anteriores (push → PR → CI → merge → deploy).
