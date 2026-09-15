# Laboratório 186 — Modal de ranking não bloqueia arrasto do planeta

Status: em andamento
Início: 2026-09-15
Fim: -
Commit inicial: 768b9f3ca7669afb6c033ea3709b082176308eac

## Objetivo do laboratório

Investigar e, se ainda reproduzível, corrigir o relato de `docs/gameplay-market-expansion-backlog.md`
("Lab 201"): com o painel de ranking aberto, a área livre do planeta à direita não aceitaria
clique/arrasto — o painel sequestraria o input do canvas inteiro, prejudicando câmera/exploração.

Origem: `docs/gameplay-market-expansion-backlog.md`, seção 4 ("Backlog ampliado"), "Lab 201 -
Modal de ranking não bloqueia arrasto do planeta" — primeiro item da "Recomendação priorizada"
(seção 7) do documento, o único backlog de código ainda não mapeado em nenhum lab existente
(`docs/growth-retention-monetization-backlog.md` e `docs/market-metrics-engagement-backlog.md`
já estão esgotados de itens de código — ver `labs/lab-184-qualidade-visual-planetas/CONTEXT.md` e
o histórico em `labs/CURRENT.md`). Numeração do lab segue a sequência real do repositório (185 já
usado por um lab anterior fora de ordem), não o número "201" do documento — mesma convenção já
usada em vários labs passados (ex. "Lab 165" do documento virou lab-166 no repo).

## Investigação prévia (leitura do código, antes de codar)

Lida a implementação atual do ranking (`RankingPanel.tsx`, montagem em `World3D.tsx` linha
~12704, `hudInert`/`rankingOpen` linha ~12521) e do giro de câmera por arrasto (`onCameraPointerDown`
em `World3D.tsx`, ~linha 3083):

- **`RankingPanel` NÃO é um `.modal-overlay` de tela cheia** — usa a classe `.chat-panel`
  (`position: absolute; right: 1rem; bottom: 1rem; width: min(320px, ...)`, `z-index: 20`), o
  mesmo padrão do painel de chat: uma caixa pequena ancorada no canto inferior direito, sem
  nenhum backdrop cobrindo o resto da tela. Diferente de outros painéis do jogo
  (`AvatarShop`/`PlanetPickerPanel`/etc.), que usam `.modal-overlay` (tela cheia).
- **`onCameraPointerDown` (o handler que inicia o giro de câmera) não checa `rankingOpen` nem
  `hudInert` em lugar nenhum** — só decide entre joystick (metade esquerda do canvas) e câmera
  (metade direita), sem nenhuma condição de "painel aberto". `rankingOpen` só entra em `hudInert`,
  que gate teclado/joystick de MOVIMENTO (achado dos labs 182/183 desta mesma sessão), não o giro
  de câmera por arrasto do mouse/touch.
- **Achado**: por leitura estática, nada no código atual bloqueia arrasto na área livre do canvas
  enquanto o ranking está aberto — o único jeito de um clique "ser sequestrado" seria ele cair
  DENTRO da caixa de 320px do próprio painel (comportamento esperado, não um bug). Isso sugere que
  o relato do backlog (escrito depois do lab-177) pode já estar resolvido por mudanças posteriores
  não relacionadas (ex. a padronização de `.chat-panel` como caixa pequena, não backdrop) — mas
  isso PRECISA ser confirmado ao vivo antes de decidir o que corrigir, já que leitura estática não
  garante ausência de bug de verdade (ex. CSS herdado de um container pai, ou comportamento
  diferente em mobile/touch que a leitura não captura).

## Funcionalidades planejadas

- [ ] Verificação ao vivo (Chrome real): abrir o ranking, tentar arrastar em várias áreas do canvas
  (perto do painel, longe dele, dentro do painel) tanto com mouse (desktop) quanto simulando touch
  se possível. Confirmar se a câmera gira normalmente fora da caixa do painel.
- [ ] Se REPRODUZÍVEL: corrigir seguindo os critérios de aceite do backlog — com ranking aberto,
  clicar/arrastar dentro do painel ainda rola/seleciona o ranking; clicar/arrastar na área livre
  do planeta gira a câmera normalmente; fechar a modal por botão/atalho continua funcionando;
  mobile não perde toque do painel nem do mundo.
- [ ] Se NÃO reproduzível: documentar como já resolvido (achado negativo, sem código novo) e
  registrar a leitura de código acima como a evidência, mesmo padrão já usado neste projeto pra
  achados de auditoria sem ação necessária (ex. lab-183).

## Fora de escopo (explicitamente adiado)

- Redesenhar o ranking (dados exibidos, abas online/local) — só o comportamento de captura de
  input, se houver um achado real.
- Liberar chat/ranking sem auditoria de segurança (fora de escopo do próprio item do backlog).
- Os outros itens do mesmo lote recomendado (Lab 202-205) — cada um vira seu próprio lab, mesma
  convenção de manter cada laboratório pequeno o suficiente pra caber num `CONTEXT.md` legível.
