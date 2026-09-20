# Laboratório 208 — Chat radial contextual

Status: em andamento
Início: 2026-09-20
Commit inicial: 11a35cb9b275496aa5e3b876a35e608eeb696fce

## Objetivo do laboratório

Backlog "Lab 194 - Quick chat contextual sem supervisao pesada": a reclamação sobre o chat vem de
baixa expressividade, não necessariamente de precisar de texto livre — transformar o chat
catalogado atual num atalho radial/contextual (frases mais relevantes pro estado atual do jogador
num toque só), sem abrir mão do catálogo fechado, e reavaliar se esse novo modo ainda precisa do
mesmo portão parental do chat/ranking atuais.

Origem: `docs/gameplay-market-expansion-backlog.md`, "Lab 194 - Quick chat contextual sem
supervisao pesada" — escolhido junto com o usuário via `AskUserQuestion` (escopo maior, com
decisão de design real, inclusive sobre o portão parental) entre 3 opções (escopo completo / fatia
menor / pular por agora) depois do lab-207 (Lab 191/193, auditoria de FPS/drawcalls, seguem
bloqueados por medição ao vivo indisponível nesta sessão). Usuário escolheu escopo completo.

## Investigação prévia

- **Catálogo já é bem maior que os "10 frases originais"** que motivaram a reclamação original
  (lab-82 já expandiu pra ~35 frases em 5 categorias/abas: saudação, reação, convite, elogio,
  jogo). O problema remanescente não é falta de frase, é FRICÇÃO DE NAVEGAÇÃO: achar "Vamos pra
  escolinha?" hoje exige abrir o painel, trocar de aba, rolar a grade — mesmo a frase certa já
  existindo. Esta lab ataca a fricção, não o tamanho do catálogo.
- **Reavaliação do portão parental (pedido explícito do item do backlog)**: diferente do ranking
  (lab-205, onde SÓ ABRIR o painel virou seguro porque a aba local é 100% offline — nenhum dado sai
  pra rede), o chat SEMPRE envia uma mensagem de verdade a outros jogadores reais pela rede,
  mesmo sendo 100% catalogado (sem texto livre, sem PII) — continua na mesma categoria de risco de
  "conectar torna a posição/aparência do jogador visível a estranhos" que a auditoria do lab-205
  já usou pra justificar MANTER o portão na aba online do ranking. Conclusão desta lab: o portão
  parental do chat continua necessário e não muda — só o CAMINHO até enviar uma frase catalogada
  fica mais curto, a decisão de permitir ou não continua a mesma.
- **`ChatPanel.tsx`/`chatMessages.ts` (catálogo + abas) continuam 100% intactos** — o radial novo é
  um atalho ADICIONAL, não uma substituição. Reduz o risco de regressão (nada do fluxo existente
  muda de comportamento) e mantém o "mais opções" como rede de segurança pra qualquer frase fora
  do conjunto contextual.
- **Contexto detectado a partir de estado que já existe na cena** (`currentPlanetId`,
  `activeMinigameId`, `insideHouseInterior`, `insideGameCenterInterior` — todos `let` já mantidos
  pelo laço de física principal, `World3D.tsx`) mais `progress.equippedPetId` (React, via
  `progressRef.current`, já usado em outros pontos do arquivo pro mesmo propósito de ler estado
  atual de dentro do closure). Nenhum estado novo precisou ser criado — só uma nova PONTE
  (`__getChatContext`, mesmo padrão de `__handleInteractPress`/`__refreshPet`/etc.) que combina o
  que já existe num único contexto, calculada sob demanda (só quando o jogador toca no ícone de
  chat), não por quadro.
- **Contextos e prioridade** (mais específico primeiro): `corrida` (minijogo ativo OU dentro do
  centro de jogos) > `casa` (dentro de um interior de bolso que NÃO é o centro de jogos, e que não
  é uma visita à casa de um amigo) > `planeta` (num planeta secundário — funde "planeta atual" e
  "missão" do backlog, já que todo planeta secundário já É uma missão, ver escolinhas do lab-206) >
  `pet` (tem um pet equipado, quando nenhum dos anteriores se aplica) > `default` (hub principal,
  sem nenhum dos anteriores). Achado do review automático do Copilot (rodada 1): `corrida` precisa
  vir ANTES de `casa` porque `enterGameCenterInterior()` liga as duas flags juntas
  (`insideHouseInterior` e `insideGameCenterInterior`) — checar `casa` primeiro faria o saguão do
  centro de jogos nunca cair em `corrida`.
- **Frases contextuais reaproveitam o catálogo já existente** sempre que fazem sentido (`explorar`,
  `escolinha`, `ajuda`, `cuidado`, `vamos`, `quase_la`, `consegui`, `vem_aqui`, `trocar`, `legal`,
  `adorei`, `voce_demais`) — só 3 frases novas onde nada do catálogo cobria bem o contexto:
  `bem_vindo_casa` (🏠), `boa_corrida` (🏁), `pet_fofo` (🐾). Ids novos adicionados às DUAS cópias
  da lista de validação do servidor (`server-cf-relay/src/index.ts`, ativo; `server/relay.cjs`,
  legado/suspenso mas mantido em sincronia por convenção já documentada no próprio arquivo).
- **UI radial não usa `.modal-overlay` (tela cheia)** — mesma decisão já tomada pra chat/ranking/
  mochila (comentário de `canvasInert` em `World3D.tsx`): são atalhos pequenos, o canvas continua
  interativo ao redor. Fecha só por × ou Esc (`useModalA11y`), sem nenhum backdrop — achado do
  review automático do Copilot (rodada 1): uma primeira versão tinha um backdrop transparente de
  TELA CHEIA só pra fechar com clique-fora, mas isso capturava pointer/wheel em cima do canvas
  INTEIRO (mesma classe de bug que o lab-205 corrigiu pro ranking), removido de vez — nem
  `ChatPanel`/`RankingPanel` têm esse comportamento. Os botões circulares reaproveitam o MESMO
  estilo já auditado pra contraste AA de `.help-button` (anel branco opaco + fundo translúcido), em
  vez de repetir `--primary` + texto branco (`.chat-quick-btn` já usa essa combinação sem ter
  passado pela auditoria de contraste — não é regressão desta lab tocar nisso, mas também não faz
  sentido REPLICAR uma combinação sabidamente arriscada num componente novo quando já existe um
  padrão validado ao lado).
- **`useModalA11y` reaproveitado** (mesmo hook de `ChatPanel`/`RankingPanel`/etc.) — Esc fecha,
  foco entra/sai corretamente, coexiste com outros painéis na pilha compartilhada já existente.

## Decisão de escopo

Confirmada com o usuário via `AskUserQuestion`: escopo completo (transformação radial/contextual +
reavaliação do portão parental), não a fatia menor nem pular o item. Fora de escopo: texto livre,
DM, voz (já fora de escopo do próprio item do backlog); remover/afrouxar o portão parental (decisão
desta lab foi mantê-lo, ver "Investigação prévia" acima); refazer o catálogo por categoria
existente (`ChatPanel.tsx` continua como está, só ganhou um atalho na frente).

## Funcionalidades planejadas

- [x] Tipo `ChatContext` + mapa de frases contextuais (`contextualQuickChatMessages`) em
  `chatMessages.ts`, reaproveitando ids existentes + 3 frases novas.
- [x] `ChatRadial.tsx`: componente novo, botões circulares em arco ao redor de um ícone central,
  reaproveitando `useModalA11y` e o mesmo `onSend(messageId)` do painel completo — mesma validação
  de servidor, mesmo portão parental (decidido ANTES de abrir, em `World3D.tsx`).
  Último botão do arco é sempre "mais opções" (⋯), que troca pro `ChatPanel` completo existente.
- [x] Ponte `__getChatContext` (`World3D.tsx`) computando o contexto atual sob demanda a partir de
  estado já existente na cena + `progressRef.current.equippedPetId`.
- [x] Gatilho de chat do HUD (`onOpenChat`) agora abre o radial primeiro (ainda atrás do mesmo
  `openMultiplayerFeature`/portão parental de antes); `chatOpenRef`/`hudInert` atualizados pra
  cobrir os dois pontos de entrada (radial e painel completo).
- [x] Ids novos sincronizados nas 2 cópias de validação do servidor (`server-cf-relay`, ativo;
  `server/relay.cjs`, legado).
- [~] Verificar ao vivo: ambiente de automação desta sessão travou de novo em `document.hidden`
  (11ª lab seguida — mesma limitação exata; desta vez até a captura de screenshot expirou por
  timeout, sintoma mais forte de repaint congelado). Documentado abaixo; confiado em `tsc`/testes/
  build/lint + leitura de código cuidadosa.

## Verificação de código (sem ambiente de automação disponível)

Checagens automatizadas: `npx tsc -b` (app) limpo; `npx tsc --noEmit` (server-cf-relay) limpo;
`npm run test -- --run` (app): 257/257 (sem mudança — nenhuma lógica de domínio nova, só UI/gatilho
de chat); `npm run build` sem erros; `npm run lint` (oxlint) sem warning novo (os 2 warnings
existentes — `PetPanel.tsx` fast-refresh, `domain.test.ts` variável não usada — são anteriores a
esta lab, não relacionados).

Pontos conferidos por leitura:

- **`__getChatContext` fecha sobre os mesmos `let` do laço de física principal** (`currentPlanetId`,
  `activeMinigameId`, `insideHouseInterior`, `insideGameCenterInterior`), declarados antes da ponte
  no mesmo escopo de função — mesma garantia de closure já usada por `__showLocalChatBubble`
  (registrada logo antes) e por toda outra ponte `__xxx` deste arquivo: como são `let` (não
  `const` capturado por valor), a ponte sempre lê o valor mais recente no momento em que é
  CHAMADA (só quando o jogador toca no ícone de chat), não o valor de quando foi registrada.
- **`progressRef.current.equippedPetId`**: `progressRef` já é atualizado a cada render
  (`progressRef.current = progress`, fora do efeito de setup) — mesmo padrão já usado por outros
  pontos do arquivo pra ler o `progress` React mais recente de dentro do closure sem esperar um
  novo efeito rodar.
- **`chatOpenRef.current = chatOpen || chatRadialOpen`**: cobre os dois pontos de entrada nos MESMOS
  3 lugares que já liam `chatOpenRef` antes desta lab (supressão de movimento no laço de física,
  gatilho de interação, e o guard duplo perto da linha ~13600 já existente) — nenhum desses 3
  precisou de edição própria, só a fonte que alimenta o ref.
- **`hudInert` e `onOpenChat`**: único novo estado de UI (`chatContext`) é somente-leitura pro
  `ChatRadial` — nenhuma outra parte do arquivo depende dele, risco de regressão contido ao
  componente novo.
- **IDs novos nos catálogos do servidor**: confirmado que `server-cf-relay/src/index.ts` é o relay
  ATIVO (README do próprio projeto, citado em `CLAUDE.md`) — sem os 3 ids novos lá, uma mensagem
  `boa_corrida`/`bem_vindo_casa`/`pet_fofo` enviada pelo radial seria descartada em silêncio pelo
  servidor (mesma checagem `QUICK_CHAT_IDS.has(msg.messageId)` já existente); `server/relay.cjs`
  (legado/suspenso) atualizado também, só por convenção de sincronia já documentada no arquivo.

**Risco remanescente, honesto**: a disposição visual exata do arco (ângulos, raio de 80px,
posição fixa no canto direito da tela) não foi confirmada ao vivo — pode precisar de ajuste fino
de posição em telas muito estreitas (o `.chat-radial` de 200×200px cabe com folga em qualquer
tela ≥ 320px de largura, mas não foi testado contra o teclado virtual mobile aberto, por exemplo,
já que o radial não tem campo de texto nenhum pra abrir teclado). O SENTIDO de prioridade de
contexto (`corrida` > `casa` > `planeta` > `pet` > `default`) é uma escolha de design pro que vem
DEPOIS de `corrida` (obrigatório vir primeiro, ver achado da rodada 1 acima) — outra ordem pro
restante seria igualmente válida; esta foi escolhida por especificidade decrescente do sinal
(interior de bolso é o contexto mais "isolado e certo" depois de corrida, pet equipado é o mais
"sempre verdadeiro quando nada mais se aplica").

## Rodada de review — Copilot (PR #91)

**Rodada 1**: "🟡 Changes recommended". 1 achado formal (comentário inline) + 3 achados descritos só
no resumo em texto (sem comentário inline próprio, tabela de "votos") — todos investigados contra
o código real antes de corrigir, nenhum descartado como falso positivo:

1. **Médio (comentário inline) — centro de jogos classificado incorretamente como `casa`**:
   confirmado contra o código — `enterGameCenterInterior()` (`World3D.tsx`) liga
   `insideHouseInterior = true` JUNTO com `insideGameCenterInterior = true` (mesmo padrão já
   documentado na declaração de `insideGameCenterInterior`: "reaproveita `insideHouseInterior` como
   a flag 'dentro de ALGUM interior de bolso'"). `__getChatContext` checava `insideHouseInterior`
   ANTES de `insideGameCenterInterior`, então o saguão do centro de jogos (e qualquer minijogo
   dentro dele) sempre caía em `casa`, nunca em `corrida`. Corrigido invertendo a ordem — mesmo
   critério de especificidade que o próprio loop de física principal já usa pra este par de flags.
2. **Médio (só no resumo) — backdrop de tela cheia bloqueia interação com o canvas**: confirmado
   contra o CSS — a primeira versão de `.chat-radial-backdrop` era `position: fixed; inset: 0`
   (tela cheia, mesmo transparente), capturando pointer/wheel em cima do canvas INTEIRO enquanto o
   radial estava aberto, não só na área do próprio componente. Mesma classe de bug que o lab-205
   corrigiu pro ranking ("modal bloqueia arrasto do planeta") — mas reintroduzida aqui por um
   mecanismo diferente (uma div cobrindo a tela, não o atributo `inert`). Corrigido removendo o
   backdrop inteiramente: `ChatPanel`/`RankingPanel` (mesma categoria de atalho pequeno) nem têm
   um, fecham só por ×/Esc — o radial passou a seguir o mesmo padrão em vez de inventar
   "clique fora fecha" com um custo colateral que os outros dois nunca tiveram.
3. **Médio (só no resumo) — semântica de menu (`role="menu"`/`"menuitem"`) sem navegação por seta
   correspondente**: confirmado contra o componente — usar esses papéis ARIA promete navegação por
   seta entre os itens (prática padrão da especificação), nunca implementada aqui (só o Tab
   genérico de `useModalA11y`, igual a todo outro painel do arquivo). Corrigido trocando por
   `role="group"`, que não promete nenhuma tecla que o componente não ofereça de verdade.
4. **Médio (só no resumo) — mensagem "Bem-vindo à minha casa!" pode aparecer visitando a casa de um
   amigo**: confirmado contra o código — `visitingHouseSnapshot` (`World3D.tsx`, lab-175) é
   não-nulo exatamente quando o jogador está visitando a casa de OUTRO jogador; a frase contextual
   de `casa` é da perspectiva de quem MORA ali, sem sentido dita por um visitante. Corrigido: o
   contexto `casa` só é retornado quando `insideHouseInterior && !visitingHouseSnapshot` — visitando
   a casa de um amigo, cai pro próximo contexto da prioridade (planeta/pet/padrão).

`npx tsc -b`, `npm run test -- --run` (257/257) e `npm run build` seguem limpos depois das 4
correções.

**Rodada 2**: achado da rodada 1 confirmado "Resolved since last review". 2 achados novos, os dois
de DOCUMENTAÇÃO (não de código) — confirmados e corrigidos:

5. **Baixo — "Contextos e prioridade" (Investigação prévia) ainda documentava `casa` > `corrida`**:
   confirmado — a correção real da rodada 1 (inverter a ordem no código) nunca foi refletida na
   lista de prioridade original desta seção, só no changelog da própria rodada 1 mais abaixo —
   ficavam contraditórias entre si. Corrigido atualizando a lista original pra `corrida` > `casa`,
   com nota explicando o motivo (mesmas duas flags ligadas juntas por `enterGameCenterInterior`).
6. **Baixo — texto sobre "captura clique-fora-fecha" ficou obsoleto**: confirmado — a correção real
   da rodada 1 (remover o backdrop inteiro) mudou o comportamento de fechar pra só ×/Esc, mas o
   texto original de "Investigação prévia" ainda descrevia o backdrop transparente capturando
   clique-fora. Corrigido atualizando o texto pra descrever o comportamento final (sem backdrop),
   com nota do porquê (mesmo bug de bloqueio de canvas do lab-205, reintroduzido e depois removido).

`npx tsc -b`, `npm run test -- --run` (257/257) e `npm run build` seguem limpos (nenhuma mudança de
código nesta rodada, só `FEATURES.md`).

**Rodada 3**: os 2 achados da rodada 2 confirmados "Resolved since last review". 1 achado formal
novo (comentário inline) + 2 achados "Previously missed" (marcados pelo próprio Copilot como não
detectados nas rodadas anteriores, em código que não tinha mudado desde a rodada 2) — os 3
confirmados e corrigidos:

7. **Baixo — 3ª referência desatualizada a `casa > corrida`**: confirmado — a correção da rodada 2
   arrumou a lista de prioridade em "Investigação prévia", mas o "Risco remanescente" mais abaixo
   ainda citava a ordem antiga (`casa > corrida > planeta > pet > default`). Corrigido pra refletir
   a ordem de verdade, com nota de que só a posição de `corrida` é obrigatória (achado da rodada
   1), o resto continua sendo escolha de design.
8. **Médio — caixa de 200×200px do radial ainda tapa o canvas nos espaços vazios entre os botões**:
   confirmado contra o CSS — remover o backdrop de TELA CHEIA (rodada 1) não bastava: `.chat-radial`
   continuava sendo uma `div` de 200×200px com `pointer-events` padrão (`auto`), então clicar/arrastar
   num espaço vazio DENTRO dessa caixa (fora dos círculos dos botões, mas ainda dentro do quadrado)
   continuava sendo capturado por ela, tapando aquele pedaço do canvas. Corrigido devolvendo
   `pointer-events: none` pro contêiner e `pointer-events: auto` só nos controles de verdade
   (`.chat-radial-btn`, `.chat-radial-close`) — `pointer-events` é herdado, então sem o `auto`
   explícito nos botões eles ficariam eles mesmos inclicáveis.
9. **Médio — `equippedPetId` sozinho não garante que o pet exista de verdade**: confirmado contra
   `rebuildPet()` (perto da criação do avatar) — ele já resolve `equippedPetId` pelo catálogo
   (`findPetById`) e simplesmente não constrói nada se o id não for encontrado (progresso
   persistido é JSON arbitrário, pode ficar com um id de pet removido/renomeado do catálogo). O
   `__getChatContext` fazia só uma checagem de truthy, sem essa mesma validação — podia oferecer o
   contexto `pet` com nenhum pet de verdade visível no mundo. Corrigido exigindo
   `findPetById(equippedPetId)` também.

`npx tsc -b`, `npm run test -- --run` (257/257) e `npm run build` seguem limpos depois das 3
correções.

**Rodada 4**: o achado da rodada 3 (3ª referência desatualizada) confirmado "Resolved since last
review". 1 achado "Previously missed" novo, confirmado e corrigido:

10. **Médio — botão de fechar do radial com contraste insuficiente sobre a cena 3D**: confirmado
    contra o CSS — `.chat-radial-close` herdava de `.modal-close` um fundo transparente + cor
    `#6774a3`, pensado pra sentar em cima do fundo OPACO branco de `.chat-panel`/outros modais, não
    direto sobre a cena 3D (este radial não tem painel nem backdrop atrás dele, ver achado da
    rodada 1) — contra um céu claro, esse ícone podia cair abaixo do mínimo de 3:1 pra ícones/UI.
    Corrigido dando ao botão de fechar o MESMO anel opaco (branco translúcido + borda branca +
    sombra dupla) já usado pelos outros botões do radial, em vez de herdar o estilo pensado pra
    outro contexto visual.

`npx tsc -b`, `npm run test -- --run` (257/257) e `npm run build` seguem limpos depois da correção.

**Rodada 5**: 1 achado real, confirmado e corrigido — a própria correção da rodada 4 introduziu um
problema novo:

11. **Médio — botão de fechar do radial abaixo do alvo mínimo de toque (auto-inflingido pela
    rodada 4)**: confirmado contra o CSS — a correção do contraste (rodada 4) encolheu
    `.chat-radial-close` pra 32×32px (`min-width: 0; min-height: 0; width: 32px; height: 32px`),
    abaixo do piso de 44×44px já estabelecido em todo o resto do jogo
    (`docs/prompts/02-design-profissional.md` §3). Corrigido voltando pro tamanho mínimo certo
    (44×44px), mantendo o anel opaco da correção anterior — os dois requisitos (contraste e alvo de
    toque) cabem juntos sem conflito, só precisavam das duas correções aplicadas ao mesmo tempo.

`npx tsc -b`, `npm run test -- --run` (257/257) e `npm run build` seguem limpos depois da correção.

## Fora de escopo (explicitamente adiado)

- Texto livre, PII, DM, voz — fora de escopo do próprio item do backlog.
- Remover/afrouxar o portão parental do chat — avaliado e mantido (ver "Investigação prévia").
- Refazer `ChatPanel.tsx`/categorias existentes — continuam intactos, o radial é um atalho a mais.
- Corrigir o contraste pré-existente de `.chat-quick-btn` (`--primary` + texto branco) — fora do
  escopo desta lab (não é uma regressão introduzida aqui), mas documentado como candidato futuro.
- Lab 197 (órbitas), demais peças do Lab 198 (footstep dust, brilho em interativo, pulso de
  recompensa, trail de foguete/cometa, feedback de puzzle), Lab 200 (missões físicas por planeta),
  Lab 191/193 (auditoria de FPS/drawcalls, bloqueados por medição ao vivo indisponível) — candidatos
  que ficaram de fora desta escolha.
