# Laboratório atual

Último concluído: labs/lab-134-corrige-casa-confundida-com-carro/ — bug reportado pelo usuário em
produção ("ao chegar perto da casa e aperto E não acontece nada", confirmado em aba anônima —
descartando cache). Causa raiz real, achada com a pista certeira do próprio usuário ("confira se
não está confundido com os carros passando"): a casa ficava a só ~1,2-1,8 unidades do laço de rua
dos carrinhos em certos momentos (dentro de `CAR_ENTER_DISTANCE=2.0`) e usava o MESMO texto de dica
que os carros ("Pressione E pra entrar") — o jogador via a legenda de um carro passando perto e
achava que era da casa; apertar E ali entrava no carro, não na casa. Corrigido com DUAS mudanças:
casa reposicionada (nova direção medida por script, 2,5+ unidades de folga real de qualquer ponto
da rua, sem colidir com escolinha/loja/carteira, mesma vizinhança de antes) e textos de dica
diferenciados ("...em casa" vs. "...no carro"), pra qualquer futura proximidade acidental não
reproduzir a mesma confusão. **Achado adicional real, separado da causa do bug**: o service worker
do PWA estava servindo uma versão em cache de 3 dias atrás em produção até ser limpo manualmente —
vira item de backlog (configurar atualização automática do service worker). **Achado de ferramenta
na verificação**: testar a nova posição via `__debugTeleport` + uma chamada SEPARADA de interação
falhava (terreno mais inclinado faz o avatar escorregar um pouco pela gravidade entre uma chamada e
outra); numa única chamada atômica funcionou perfeitamente — mesma família de limitação de
ferramenta já documentada em labs 129/131/133, não um bug do produto. `npm run test`: 75/75 (sem
teste novo). `npm run build` sem erros. Ver
`labs/lab-134-corrige-casa-confundida-com-carro/CONTEXT.md`.

Antes desse: labs/lab-133-bonus-planeta-completo/ — item do backlog de engajamento
discutido em chat, escolhido entre 4 opções via `AskUserQuestion`. Responder a 6ª (última)
escolinha de um planeta-destino agora credita, na mesma resposta, um bônus imediato de +50 XP /
+30 moedas (com os mesmos multiplicadores de evento semanal/assinante da recompensa da própria
pergunta) — distinto do item de mobília do lab-130 (cosmético) e do combo do lab-132 (sequência
entre missões diferentes). Entra no MESMO bloco `isPlanetFullyCompleted` já usado pela mobília,
sem gatilho novo. `CompletionResult` ganha `planetClearBonusXp?`/`planetClearBonusCoins?` (mesmo
padrão opcional de `unlockedFurnitureItem`); linha de bônus própria no `RewardToast`. 5 testes
novos (70→75). **Verificação ao vivo ficou PARCIAL**: a mesma limitação do `__debugTeleport` fora
do planeta principal (lab-131) impediu alcançar a 6ª escolinha ao vivo — desta vez reconfirmada
mesmo pra um deslocamento PEQUENO (~6 unidades) dentro do mesmo planeta já visitado, descartando a
hipótese de que só saltos grandes seriam o problema. Confiança vem de reaproveitar o mesmo bloco já
verificado ao vivo no lab-130 + 5 testes cobrindo a matemática exata. `npm run build` sem erros.
**Backlog novo reportado pelo usuário nesta sessão** (ainda não formalizado em labs): câmera da
lojinha de avatar precisa girar ao pressionar+arrastar (investigar se regrediu do lab-118) + mais
luz no avatar (fica escuro); mais roupas texturizadas e mais opções na lojinha; painel `/familia`
sem link de acesso de dentro do jogo quando o perfil já está vinculado. Ver
`labs/lab-133-bonus-planeta-completo/CONTEXT.md`.

Antes desse: labs/lab-132-combo-respostas-seguidas/ — item do backlog de engajamento
discutido em chat ("combo de respostas certas seguidas"), escolhido entre 4 opções via
`AskUserQuestion`. Responder missões corretamente uma atrás da outra — sem fechar (desistir de)
nenhuma no meio — rende moeda bônus crescente em marcos: 3º acerto seguido = +5, 5º = +10, 10º e a
cada 10 depois = +20. **Achado de investigação**: o jogo nunca deixa uma pergunta ser respondida
errada de forma definitiva (`QuestModal.tsx` só mostra "Quase!..." e deixa tentar de novo, sem
avisar `App.tsx`) — "seguidas" teve que ser redefinido como "sem DESISTIR" (fechar o × antes de
acertar quebra a sequência), o sinal real que o código já tinha disponível. `Progress.
currentStreak` novo; `streakBonusFor`/`applyStreakReset` (progression.ts) mesmo formato idempotente
de `unlockMarsReward`; combo COMPARTILHADO entre missão principal e escolinha de planeta (um só
contador); Quiz Surpresa fica de fora de propósito (não é idempotente por id, farmar seria fácil).
Bônus anunciado como mais uma linha condicional no `RewardToast` já existente. 6 testes novos
(64→70). **Verificação ao vivo COMPLETA** (diferente dos 3 labs anteriores — tudo aconteceu no
planeta principal, sem o risco de `__debugTeleport` fora dele): 3 escolinhas reais respondidas em
sequência, toast mostrou "🔥 Combo de 3 acertos seguidos! +5 moedas bônus!" com a moeda batendo
exatamente; escolinha aberta e fechada sem responder confirmada zerando `currentStreak` no
`localStorage` de verdade. `npm run build` sem erros. Ver
`labs/lab-132-combo-respostas-seguidas/CONTEXT.md`.

Antes desse: labs/lab-131-baus-tesouro-escondidos/ — item do backlog de engajamento
discutido em chat ("baús de tesouro escondidos"), escolhido entre 4 opções via `AskUserQuestion`.
Um baú de tesouro escondido por planeta-destino sem combate (Mercúrio/Vênus/Júpiter/Saturno/Urano/
Netuno — Marte fica de fora, já tem o pote de moedas do lab-128), achado por proximidade real
(sem pergunta), +15 moedas. Achado UMA VEZ SÓ por planeta, PRA SEMPRE (`Progress.
foundTreasureChestIds`, novo) — diferente das moedas comuns (resetam por sessão) e do pote de
Marte (reseta por visita). `TREASURE_CHEST_DIR` reaproveita a parametrização de ângulo de ouro de
`PLANET_SCHOOL_DIRS` (lab-127), só com `phi=165°` (perto do polo sul, longe da plataforma de
pouso e das escolinhas). `applyTreasureChestFound`/`foundTreasureChest`/`onFindTreasureChest` mesmo
padrão idempotente de `unlockMarsReward` (lab-94). Baú de madeira com fivela dourada, visual
distinto; mensagem transitória ("💰 Baú encontrado!") mesmo padrão de `marsDeathMessage`. 4 testes
novos (60→64). **Achado real de ferramenta na verificação ao vivo**: `window.__debugTeleport` não
respeita `currentWorldCenter` fora do planeta principal — teleportar pra uma posição válida em
Vênus (depois de chegar lá por voo de foguete real) fazia o avatar "cair" de volta pra Terra
assim que um quadro renderizava, reproduzido consistentemente; a construção/render do baú FOI
confirmada visualmente (legenda "💰 Baú de tesouro!" visível na cena), mas a coleta por
proximidade não foi confirmada ao vivo por causa dessa limitação da técnica de teste (não um bug
do produto) — lição registrada pra próximas sessões: navegar DENTRO de um planeta-destino sempre
por caminhada real (teclado sintético + quadros forçados), nunca `__debugTeleport` uma vez lá.
`npm run build` sem erros. Ver `labs/lab-131-baus-tesouro-escondidos/CONTEXT.md`.

Antes desse: labs/lab-130-mobilia-por-planeta/ — pedido original do usuário (backlog
discutido em chat): "cada planeta deve subir o nivel das perguntas para liberar mais itens na
casinha de cada um" — escolhido entre 4 opções de backlog via `AskUserQuestion`. Completar as 6
escolinhas de um planeta-destino (Mercúrio/Vênus/Júpiter/Saturno/Urano/Netuno) agora concede, de
graça, um item de mobília exclusivo e temático daquele planeta pra "Minha Casa" (Meteorito de
Mercúrio ☄️, Vulcão de Vênus 🌋, Mancha Vermelha de Júpiter 🟠, Anel de Saturno 💍, Cristal de
Urano 🧊, Redemoinho de Netuno 🌊). `planetReward?: string` novo em `FurnitureOption`
(`unlockGeneric` passa a rejeitar compra desses itens, mesma regra de `subscriptionOnly`);
`unlockPlanetFurnitureReward` novo (mesmo padrão idempotente de `unlockMarsReward`, lab-94);
`applyPlanetQuestCompletion` detecta planeta 100% completo e expõe `unlockedFurnitureItem` em
`CompletionResult`, anunciado numa linha de bônus nova no `RewardToast` (mesmo padrão das linhas de
evento semanal/assinante) em vez de um segundo modal; `MyHousePanel` ganha um terceiro estado
visual ("🔒 Conquiste o planeta") pros itens ainda não concedidos. 8 testes novos em
`progression.test.ts` (52→60) cobrindo a condição exata de concessão, idempotência e a
impossibilidade de compra direta. **Verificação ao vivo ficou PARCIAL**: build/testes confirmados
limpos, persistência de `localStorage` confirmada (item novo aceito sem quebrar o resto do save),
mas o roteiro completo (responder as 6 perguntas reais → ver o toast → abrir Minha Casa → ver "✓
Tem") não foi concluído — a navegação de teleporte de debug até o balcão dentro do interior 3D da
casa (lab-123) esbarrou numa limitação da PRÓPRIA TÉCNICA de teste (o interior usa um sistema de
coordenadas próprio com um raio de saída perto da entrada, e `__debugTeleport` não atualiza a flag
de estado que o movimento real do jogador atualiza — teleportes às cegas acabaram disparando a
saída da casa repetidamente), não um bug do produto; o fluxo porta→interior→balcão em si é código
do lab-123, já verificado ao vivo naquela ocasião. `npm run build` sem erros. Ver
`labs/lab-130-mobilia-por-planeta/CONTEXT.md`.

Antes desse: labs/lab-129-cronometro-sobrevivencia-planetas/ — pedido do backlog discutido
em chat: "alguns planetas tem tempo de permanencias, um cronometro onde voce precisa responder a
perguntas durante a exploracao, mas o cronometro fica regredindo se permanecer longe do foguete
muito tempo voce morre e volta pra terra, pode ser planetas quentes como mercurio e os mais longes
como netuno." `hasSurvivalTimer?: boolean` novo em `DestinationPlanet`, marcado em Mercúrio e
Netuno; cronômetro de 60s dreia 1s/s real quando o avatar fica a mais de 5 unidades do foguete de
volta daquele planeta, restaura +20s ao responder qualquer escolinha do próprio planeta (bridge
`__onPlanetQuestCompleted`, mesmo padrão de `__refreshHouseFurniture` do lab-123), e zera o
cronômetro a cada nova chegada (mesmo espírito de "vida cheia a cada nova ida a Marte" do lab-60).
Ao chegar a zero, `respawnFromSurvivalTimeout` teleporta de volta pra Terra sem perder moeda/XP já
ganho (mesma filosofia não-punitiva do respawn de Marte), mostrando "Você desmaiou de calor!" em
Mercúrio ou "...de frio!" nos demais planetas com cronômetro. `SurvivalTimerBar.tsx` novo reaproveita
o CSS da barra de vida de Marte, só troca o ícone (🥵/🥶). **Achado de verificação (lição nova)**:
diferente de testar a viagem de foguete (progresso SIMULADO, acelerável forçando quadros), este é
um cronômetro de TEMPO REAL — cada chamada de ferramenta de automação (screenshot, JS, clique)
consome segundos reais que contam contra o próprio cronômetro sendo testado; em 3 pousos de teste em
Mercúrio, o cronômetro expirou sozinho entre uma chamada e outra, o que na prática SERVIU como
confirmação end-to-end genuína do pipeline completo (dreno → morte → mensagem certa "Você desmaiou
de calor! Volte de foguete pra continuar explorando Mercúrio." → teleporte pra casa confirmado por
posição → mensagem some sozinha) mas impediu capturar a barra num valor intermediário. Netuno não
testado ao vivo (mesmo código compartilhado só muda a palavra da causa). `npm run test`: 52/52 (sem
teste novo). `npm run build` sem erros. Ver
`labs/lab-129-cronometro-sobrevivencia-planetas/CONTEXT.md`.

Antes desse: labs/lab-128-pote-moedas-marte/ — item pequeno do backlog discutido em chat: ao
vencer todos os inimigos de Marte, um pote de moedas aparece na Estação Alienígena (bônus de 10
moedas de uma vez, além do chapéu já existente e da moeda por inimigo nocauteado). Pote sempre
construído junto da estação (0,75 rad de distância da direção dela, fora da malha física, `UFO_
RADIUS=3,2` ocupa só ~0,53 rad), mas invisível até Marte ser limpo — revelado no mesmo gatilho que
já concedia o chapéu (lab-94, reaproveitado sem mudança). Gatilho de coleta PRÓPRIO (não reaproveita
o array genérico `coins`, que só suporta "vale 1 moeda sempre"). **Achado real na verificação ao
vivo**: a primeira tentativa de pousar em Marte pareceu funcionar pela câmera, mas o corpo físico
do avatar (`avatarCollider`) e o visual (`studentFigure.root`) ficaram DESSINCRONIZADOS — segurar
W por mais tempo resolveu (`landRocket()` não tinha disparado ainda). Lição registrada em
`CONTEXT.md` pra futuras verificações com viagem de foguete: sempre conferir os dois contra a mesma
posição antes de confiar que o pouso terminou. Verificado ao vivo: pote revelado e coletado por
proximidade real (+10 moedas confirmado), sem crédito duplo, renderiza sem colidir com a estação,
sem erro de console. Combate de verdade (matar os 6 inimigos) não testado ao vivo — roteiro longo
demais (precisa buscar espada/arma no planeta principal antes); confiança vem do gatilho "todos
mortos" já comprovado desde o lab-94, não modificado aqui. `npm run test`: 52/52. `npm run build`
sem erros. Ver `labs/lab-128-pote-moedas-marte/CONTEXT.md`.

Antes desse: labs/lab-127-escolinhas-planetas-expandidas/ — pedido do usuário (backlog
discutido em chat): expandiu as escolinhas dos 6 planetas-destino (Mercúrio/Vênus/Júpiter/Saturno/
Urano/Netuno) de 1 pergunta cada (lab-115) pra 6 cada (36 no total, 30 novas de astronomia real),
igual ao padrão de várias escolinhas do planeta principal. `planetQuests.ts` virou
`Record<string, Quest[]>` + `findPlanetQuestById`. Distribuição das 6 escolinhas por planeta
MEDIDA antes de escolher a fórmula (script à parte, mesma disciplina do lab-117/125): 78° de
separação angular mínima, 5,46 unidades de arco mesmo no Mercúrio (o planeta menor, pior caso) —
confirmado visualmente ao vivo, escolinhas bem espalhadas, nenhuma colada em outra nem na
plataforma de pouso do foguete. **Achado só na verificação ao vivo**: a viagem de foguete deste
jogo não é automática — precisa pilotar de verdade (segurar W, que vira "throttle"); a primeira
tentativa de verificação forçou centenas de quadros sem input nenhum e o foguete não se moveu,
corrigido despachando um `KeyboardEvent` de `keydown` sintético antes de forçar os quadros.
Verificado ao vivo: viagem real até Mercúrio, 2 escolinhas diferentes respondidas corretamente
(perguntas distintas confirmadas), XP/moeda creditados nas duas, `completedPlanetQuestIds`
registrando os ids certos e independentes, sem erro de console. `npm run test`: 52/52. `npm run
build` sem erros. Ver `labs/lab-127-escolinhas-planetas-expandidas/CONTEXT.md`.

Antes desse: labs/lab-126-moeda-bonus-assinante/ — item do backlog original (`prompt.md` §6,
P2) nunca construído: assinantes ativos agora ganham 1,5× nas moedas creditadas ao completar uma
missão (nunca XP — moeda só compra cosmético, nunca desbloqueia missão/nível/conteúdo educacional,
então não viola a regra inegociável do plano comercial; XP também abre viagem a planetas, então
boostá-lo teria cheiro de pay-to-win). Reaproveitou 100% o padrão já existente do evento semanal
(`event.coinMultiplier`) — `SUBSCRIBER_COIN_MULTIPLIER` novo em `progression.ts`, empilha com o
evento em vez de substituir. `RewardToast` ganhou uma linha de bônus condicional nova ("👑 Bônus de
moeda de assinante aplicado!"), independente da linha do evento semanal. 5 testes novos
(47→52) cobrindo cálculo, empilhamento, XP intocado e idempotência. **Verificado ao vivo** o
caminho SEM assinatura (quest real respondida, +40 moedas = 20 base × 2 do evento semanal, sem
bônus de assinante, sem regressão, sem erro de console); **o caminho COM assinatura não foi
simulado ao vivo** (simular localStorage de assinatura esbarra na proteção anti-bypass do lab-90) —
confiança vem dos testes unitários + paridade de código com a linha do evento semanal já
comprovada ao vivo. `npm run test`: 52/52. `npm run build` sem erros. **Com isso, o backlog original
de `prompt.md` §6 (P0/P1/P2) está completo** — não há mais item ali sem laboratório correspondente.
Ver `labs/lab-126-moeda-bonus-assinante/CONTEXT.md`.

Antes desse: labs/lab-125-code-splitting-studentfigure/ — **resultado negativo, testado e
revertido**: converter os imports em barril de `@babylonjs/core` (`World3D.tsx`,
`AvatarPreview3D.tsx`, `studentFigure.ts`) pra imports individuais/`.pure` (mesma técnica do
lab-117, aplicada aos 35 símbolos únicos usados, com cada caminho verificado contra o pacote real
antes de editar) foi implementado e buildou sem erros, mas a MEDIÇÃO antes/depois mostrou que o
tamanho TOTAL (`World3D` + `studentFigure`, que qualquer jogador que entra no mundo 3D baixa junto)
**piorou** de ~4,31MB pra ~5,85MB (+35%) — `studentFigure` encolheu 81% sozinho, mas isso só
empurrou a maior parte do peso pro chunk `World3D`, que inchou quase 8×. Hipótese: as variantes
`.pure.js` do Babylon.js favorecem precisar de 1-2 classes isoladas (o caso do lab-117), não uma
fatia grande e interligada da API (34 classes em `World3D.tsx`) — provavelmente perdendo
deduplicação que o barril original já fazia bem. Descartada a hipótese alternativa de que
`@babylonjs/loaders/glTF` forçasse o barril de volta (grep recursivo confirmou zero imports de
barril nesse pacote). **Revertido por completo antes de qualquer commit** — `npm run build`
confirmado voltando aos tamanhos exatos de antes (634kB/3.680kB), `npm run test` 47/47. Backlog
fica vazio depois deste laboratório — nenhum item pendente sem depender de novo pedido do usuário.
Ver `labs/lab-125-code-splitting-studentfigure/CONTEXT.md`.

Antes desse: labs/lab-124-corrige-morros-invisiveis-de-vez/ — retomada do bug de "morros
invisíveis" deixado explicitamente sem solução no lab-95. Duas perguntas feitas ao usuário deram a
informação que faltava: aparelho **Android/Chrome**, e o morro invisível **continua sólido** (não
dá pra atravessar) — confirma que é só renderização, não um buraco real. **Duas correções**, ambas
com evidência concreta (não só suposição): (1) `planetMat.twoSidedLighting = true` — gotcha
documentado do Babylon.js, nunca aplicado apesar de `backFaceCulling = false` já estar lá desde o
lab-95 (sem essa propriedade, as faces de trás desenhadas por `backFaceCulling=false` continuam
iluminadas com a normal de frente, renderizando quase pretas); (2) normais degeneradas (triângulos
dobrados nas rampas íngremes) substituídas pela direção radial após `ComputeNormals` — **medido ao
vivo antes de remover o log temporário**: 1 normal genuinamente degenerada em 5151 na malha real,
prova concreta de que o dobramento acontece de verdade. **Sem tentativa de reproduzir o bug
visualmente** (é específico de GPU/driver móvel, ambiente de verificação é Chrome desktop) —
confirmação definitiva depende do usuário testar de novo no aparelho onde viu o problema. `npm run
test`: 47/47. `npm run build` sem erros. Sem regressão visual observada no desktop. Ver
`labs/lab-124-corrige-morros-invisiveis-de-vez/CONTEXT.md`.

Antes desse: labs/lab-123-casa-interior-3d/ — segunda metade do mesmo pedido de chat que
originou o lab-122: "Minha Casa" virou um interior 3D andável de verdade (apertar E na porta pra
entrar numa sala nova, catálogo de móveis + itens de educação lá dentro, apertar E na mesma porta
pra sair de volta pro planetinha). Arquitetura: a sala é modelada como mais um "planetinha" de raio
grande no MESMO `Scene` Babylon (reaproveita o mecanismo de gravidade radial já existente —
`currentWorldCenter`/`currentGroundBaseFn`, sem Scene/Engine separada), entrada/saída sem viagem de
foguete (teleporte direto, mesmo espírito de `teleportAvatarTo`). 4 itens novos de temática
educacional em `furniture.ts` (Estante de Livros/Globo Terrestre/Lousa/Microscópio, sempre
grátis/compráveis com moeda). **Nota de processo importante** (detalhe completo em
`labs/lab-123-casa-interior-3d/CONTEXT.md`): a implementação nasceu de um sub-agente que recebeu
instrução explícita de só INVESTIGAR (sem editar arquivo nenhum) e não seguiu essa instrução — ele
implementou a feature inteira sozinho antes de ser interrompido. O código foi integralmente revisado
(diff completo, build, testes) antes de qualquer confiança, e **um bug real de câmera foi pego só na
verificação AO VIVO** (não pela leitura de código nem pelos testes automatizados): a distância de
câmera padrão do jogo (9 unidades) era maior que o quarto inteiro (8 unidades), fazendo a câmera
ficar do lado de FORA da parede — corrigido com distância/altura de câmera menores específicas do
interior + reajuste da folga do ponto de nascimento (derivada da distância de câmera, não mais um
número fixo desacoplado). **Verificado ao vivo, ponta a ponta, depois do fix**: dica "Pressione E"
aparece na porta, entrar renderiza a sala corretamente, balcão abre o catálogo de verdade, comprar
um item desconta moeda e faz o móvel aparecer instantaneamente como objeto 3D real na sala (sem
precisar sair/voltar), porta interna teleporta de volta pra posição exata de fora, sem erro de
console em nenhum passo. `npm run test`: 47/47. `npm run build` sem erros. Ver
`labs/lab-123-casa-interior-3d/CONTEXT.md`.

Antes desse: labs/lab-122-lojinha-avatar-texturas-exclusivas/ — pedido direto do usuário no
chat: itens exclusivos de assinante na lojinha de avatar (calça/sapato/mochila/camisa) precisavam
parecer genuinamente mais premium (textura/padrão/brilho), não só uma cor sólida diferente dos
itens grátis. **Confirmado o problema**: os 8 itens `subscriptionOnly` dos 4 catálogos
(`app/src/data/customization.ts`) só diferiam dos itens grátis por `colorRgb` — mesmo tratamento
visual, nomes chamativos ("Calça Estelar", "Camisa Holográfica"...) sem nada que os justificasse.
**Corrigido**: novo campo `style?` em `ColorOption` (6 estilos: `starry`/`nebula`/`holographic`/
`prism`/`neon-glow`/`metallic-gold`) + função central `applyClothingLook` (`studentFigure.ts`) que
aplica `DynamicTexture` procedural (mesma técnica já usada nas faixas de Júpiter/Saturno/Urano/
Netuno) ou PBR `metallic`/`roughness` puro (dourado), com textura cacheada por `Scene`. **Achado
que ampliou o escopo**: a cor de calça/sapato/mochila/camisa é setada em **13 pontos** diferentes
(9 em `World3D.tsx` — montagem inicial, 4 pontes de recolorir ao vivo, 4 sub-checagens de
sincronização remota — e **4 em `AvatarPreview3D.tsx`**, o preview da própria lojinha, só
descoberto numa segunda rodada de verificação ao vivo depois que a primeira implementação não
mudava nada visível na lojinha). Todos os 13 substituídos por `applyClothingLook`. **Verificado ao
vivo**: textura visível no avatar em jogo (estrelinhas nítidas na calça, listras coloridas na
camisa), reset correto ao trocar de volta pra item sólido, cache de textura confirmado reutilizado
entre calça/mochila com o mesmo estilo, sem erro de console. `npm run test`: 47/47 (sem teste
novo). `npm run build` sem erros. **Segunda parte do mesmo pedido do usuário (casa com interior 3D
andável, transição por porta E) fica para laboratório(s) futuro(s)** — mudança arquitetural bem
maior, não coberta aqui. Uma investigação em paralelo (não formalizada como lab) confirmou com
dados reais a causa do chunk `studentFigure` de 3,68MB (barril `@babylonjs/core` importado em 3
arquivos simultaneamente, side-effects declarados no `package.json` do pacote forçam incluir
XR/FrameGraph nunca usados) — corrigir de verdade exigiria converter os 3 arquivos de uma vez
(~50 símbolos), risco/esforço bem maior que o fix de 2 símbolos do lab-117; fica como candidato a
laboratório futuro, não decidido se vale a pena. Ver
`labs/lab-122-lojinha-avatar-texturas-exclusivas/CONTEXT.md`.

Antes desse: labs/lab-121-acessibilidade-teclado-zoom/ — escolhido pelo usuário entre 3
opções de backlog (as outras: reinvestigar o bug de morros invisíveis do lab-95 sem informação nova
do usuário; code-splitting de `studentFigure.ts`, acoplamento interno do Babylon.js sem solução
clara). Ataca os 2 itens `[SHOULD]` de acessibilidade deixados de fora do lab-120 (que cobriu só os
`[MUST]`): navegação por teclado/leitor de tela nos painéis 2D, e zoom de fonte do sistema.
**Zoom de fonte**: investigado e confirmado já conforme (CSS já 100% `rem`/`em`/`clamp()`, modais
já usam `max-height: vh` + `overflow-y: auto`) — sem mudança de código. **Navegação por teclado
— corrigido**: novo hook `app/src/state/useModalA11y.ts` (Esc fecha, foco entra no painel ao abrir,
foco volta ao fechar) aplicado nos 12 painéis do jogo; `ChatPanel`/`RankingPanel`/`WeaponBagPanel`
ganharam `role="region"`/`aria-label` (paridade com os outros 9, que já eram `role="dialog"`);
`HudHeader` (9 botões) ganhou `inert` condicional (`World3D.tsx`, booleano `hudInert` combinando
`suspendTriggers` de `App.tsx` + estados internos de painel) pra sair da ordem de tabulação
enquanto qualquer painel está aberto. **Achado só na verificação ao vivo (não na investigação
teórica)**: o `<canvas>` do jogo também é focável por padrão (Babylon.js captura teclado nele) —
sem aplicar `inert` nele também, Tab escapava do modal aberto direto pro canvas; corrigido com o
mesmo booleano. Verificado ao vivo via DOM direto (não só screenshot): Esc fechando 3 painéis
diferentes, Tab preso dentro do modal com HUD/canvas confirmadamente `inert`, sem erro de console,
sem regressão visual. `npm run test`: 47/47 (sem teste novo). `npm run build` sem erros. Ver
`labs/lab-121-acessibilidade-teclado-zoom/CONTEXT.md`.

Antes desse: labs/lab-120-auditoria-acessibilidade-wcag/ — escolhido pelo usuário entre as
opções de backlog restantes. Primeira auditoria SISTEMÁTICA de todo `index.css` contra os 3
`[MUST]` de acessibilidade de `docs/prompts/02-design-profissional.md` §3 (antes só havia ajustes
pontuais: `READABILITY_SCALE` no lab-87, `.avatar-shop-tab`/`.avatar-shop-action` no lab-91).
Medido com scripts Node reais (fórmula de luminância relativa do WCAG), não estimativa visual: 9
pares texto/fundo reprovados no contraste AA (4.5:1) foram identificados, incluindo a mensagem de
resposta certa/errada de TODA missão (`.quest-feedback`) e a etiqueta de tipo de missão
(`.quest-type-tag`). **Corrigido**: 4 tokens de design escurecidos no `:root`
(`--success`/`--danger`/`--accent-dark`/`--primary-dark`, preservando matiz/saturação via HSL) +
3 cores soltas substituídas por tom equivalente (`#6b76a0`/`#8a94b8`/`#9a6b1a`) + os 2 usos de
`--primary` como TEXTO (`.reward-bonus-line`/`.ranking-row-self`) trocados pra `--primary-dark`.
Também achado e corrigido: `.help-button` (ícones do HUD) e `.modal-close` (× de fechar, em todo
modal) abaixo do alvo de toque mínimo de 44×44px em telas estreitas — `.modal-close` ganhou
`min-width`/`min-height: 44px`; `.help-button` teve o piso do `clamp()` subido pra 44px, e
`.hud-top-row` ganhou `flex-wrap: wrap` como rede de segurança pra não reintroduzir o bug de
estouro de tela já resolvido nos labs 57-59 numa tela física estreita ("Poco C75"). **Achado de
ferramenta (não do produto)**: `mcp__claude-in-chrome__resize_window` não afeta o viewport real
neste ambiente (`window.innerWidth`/`outerWidth` inalterados e logicamente inconsistentes em 3
tentativas) — contornado com o argumento matemático do piso do `clamp()` + simulação de contêiner
estreito via `javascript_tool` direto no DOM. **Verificado ao vivo**: cores novas confirmadas
tanto visualmente (recompensa de quest, etiqueta de tipo) quanto lendo
`getComputedStyle(document.documentElement)` direto; `flex-wrap` confirmado sem estouro/corte de
ícone num contêiner HUD forçado a 340px; sem erro de console. `npm run test`: 47/47 (sem teste
novo — mudança só de CSS). `npm run build` sem erros. Ver
`labs/lab-120-auditoria-acessibilidade-wcag/CONTEXT.md`.

## Correção de produção fora de um laboratório formal (2026-08-29)

**Domínio confiável do Neon Auth (de novo)**: o mesmo problema já corrigido no lab-104 pra
`missaoaprendizado.com` (`403 Invalid Origin` bloqueando login/cadastro/recuperação de senha)
também afetava `https://missao-aprender-jogo.pages.dev` (o deploy paralelo Cloudflare Pages do
lab-109) — nunca tinha sido adicionado à lista de domínios confiáveis do Neon Auth, apesar de já
estar em uso há vários laboratórios. Reportado pelo usuário ao vivo ("quando tento recuperar senha
entrar na conta ou criar uma recebo invalid origin"). Corrigido adicionando o domínio na lista
(`console.neon.tech` → projeto `missao-aprender` → Auth → Configuration → Domains, sessão já
autenticada no navegador). **Verificado ao vivo**: tentativa de login em
`https://missao-aprender-jogo.pages.dev/familia` com credencial errada agora retorna "Invalid
email or password" (erro normal do Better Auth), não mais "Invalid Origin" — confirma que o
bloqueio de origem foi removido. **Lembrete pro futuro**: se um domínio novo for apontado pro jogo
(incluindo outro Pages/Vercel de teste), lembrar de adicionar ele aqui também — não é automático,
e o sintoma (403 Invalid Origin) só aparece pro usuário final na hora de login/cadastro, não em
build/deploy.

Último concluído: labs/lab-119-relatorio-semanal-email/ — Fase F do plano comercial, escolhido
pelo usuário entre 3 opções de backlog. **Achado central**: `docs/plano-comercial-backend.md`
documentava que o progresso da criança NUNCA sai do aparelho dela — um e-mail semanal automático
não tem como funcionar sem mudar isso conscientemente (o painel `/familia` só funciona lendo
`localStorage` DIRETO no navegador, um e-mail é enviado pelo servidor, assíncrono). Confirmado com
o usuário (`AskUserQuestion`, 3 opções): sincroniza um resumo MÍNIMO
(nível/XP/moedas/missões/emblemas, nunca conteúdo bruto/apelido/avatar/horário) só enquanto o
entitlement estiver ativo. Construído: `progress_snapshots` (nova tabela, uma linha por família,
sempre sobrescrita), `POST /progress-summary` (mesma autenticação por token de entitlement de
`/entitlement`, incluindo checagem de revogação por `jti`), `sendWeeklyProgressEmails` (Cron
semanal novo, segunda-feira 09:00 São Paulo, decide via `controller.cron` qual das duas tarefas
agendadas rodar) enviando via Resend (chamada HTTP direta, sem SDK), `syncProgressSummary` no jogo
(dispara uma vez por sessão quando `entitlement.active` vira `true`, mesmo padrão de
`productAnalytics.ts`). **Bug real pego ANTES de produção** (revisão de código, não teste ao vivo):
a query que busca famílias elegíveis usava `order by ... limit 1` cru pra achar a assinatura mais
recente — funciona pra UMA família filtrada por `where` (como em outras rotas), mas limitaria o
resultado INTEIRO a uma linha só numa consulta que cobre várias famílias de uma vez; corrigido com
`distinct on (family_account_id)`. **Verificado ao vivo**: `POST /progress-summary` testado contra
o Worker local (`wrangler dev`) + banco de produção real, com token de entitlement assinado de
verdade pra uma família real já existente — 401 sem auth, 401 token inválido, 400 payload inválido,
204 + linha conferida no banco com payload válido (removida depois, era só teste). Migração
aplicada de verdade e Worker deployado em produção
(`https://missao-aprender-accounts.rafaelvs.workers.dev`, os dois Cron Triggers confirmados no
output do deploy). **Pendência real**: `RESEND_API_KEY` não configurado (precisa de conta Resend
do usuário) — o Cron semanal já está agendado e vai disparar certinho, mas falha ao tentar mandar
o e-mail até essa chave existir (log, sem quebrar o resto do Worker). `npm run test`: app 47/47,
`server-accounts` 47→59 (12 testes novos). `npm run build`/`tsc --noEmit` sem erros nos dois
pacotes. Ver `labs/lab-119-relatorio-semanal-email/CONTEXT.md`.

Antes desse: labs/lab-118-preview-avatar-girar-e-flor/ — pedido do usuário: "na lojinha de
avatar tem que ter como girar o avatar pra ver o cabelo escolhido, ao escolher a flor ela esta
deitada em ve de estar de pe na cabeca, e na deu pra ver o cabelo comprido." Três queixas, duas
causas reais: (1) `AvatarPreview3D.tsx` nunca tinha `camera.attachControl` — só existia giro
automático manual, sem jeito de arrastar; trocado por `attachControl` + `useAutoRotationBehavior`
nativo do Babylon (pausa sozinho ao arrastar, retoma depois), com limites de raio/inclinação. (2)
O chapéu "Flor" (`studentFigure.ts`, `applyHat`) tinha as 5 pétalas num anel horizontal achatado
no eixo Y — uma flor literalmente deitada em cima da cabeça; corrigido virando o anel pro plano
vertical (achatado no eixo Z) — a flor fica de pé, de frente, como o emoji 🌸. (3) Cabelo comprido
investigado e confirmado SEM bug — o "rabo" de trás sempre existiu (lab-73), só não dava pra ver
sem controle de câmera; resolvido de graça pelo item (1). Novo debug hook dev-only
`window.__avatarPreviewScene` (mesmo padrão de `window.__scene`) usado pra medir as posições reais
das pétalas em vez de adivinhar por screenshot. **Verificado ao vivo**: arrastar o preview gira
livremente; flor aparece reconhecível de frente/lado; cabelo comprido visível ao girar pra trás.
`npm run test`: 47/47. `npm run build` sem erros (chunk `World3D` inalterado). Ver
`labs/lab-118-preview-avatar-girar-e-flor/CONTEXT.md`.

Antes desse: labs/lab-117-code-splitting-world3d/ — escolhido pelo usuário entre 3 opções de
débito técnico já identificadas (relatório semanal por e-mail / code-splitting do World3D.tsx /
auditoria de acessibilidade). Medido com `vite-bundle-visualizer` (via `npx`, não virou dependência
do projeto) ANTES de decidir o que cortar — achado: `World3D.tsx` importava só 2 símbolos de
`@babylonjs/gui` (`AdvancedDynamicTexture`/`TextBlock`, usados só pras legendas flutuantes) mas
puxava o pacote INTEIRO (695KB dos 918KB do chunk) por importar do barril em vez dos arquivos
individuais — controles 2D nunca usados (botão/slider/grid) e materiais de GUI 3D nunca usados
(handle/fluent). Trocado pros imports diretos dos 2 arquivos
(`@babylonjs/gui/2D/advancedDynamicTexture`, `@babylonjs/gui/2D/controls/textBlock`), confirmados
por leitura do código-fonte do pacote como dependendo só de `Container`/`Control`/`Style`/
`Measure`. **Resultado medido**: chunk `World3D` 918,61 kB → 626,73 kB minificado (-32%), 198,15 kB
→ 147,86 kB gzip (-25%). Dois achados adicionais investigados e CONSCIENTEMENTE ADIADOS (documentados
em `labs/lab-117-code-splitting-world3d/FEATURES.md`/`CONTEXT.md`): glTF 1.0 morto dentro de
`@babylonjs/loaders/glTF` (~65KB, sem confirmação de como reconstruir a cadeia de registro só com
2.0 sem risco de quebrar carregamento de modelo) e o chunk `studentFigure-*.js` (3,68MB!, >99%
`@babylonjs/core`, incluindo XR/FrameGraph nunca usados) — mas isso vem de acoplamento INTERNO das
próprias classes `Scene`/`Engine` do Babylon.js, não corrigível só trocando imports deste projeto;
escopo grande demais pra este laboratório. **Verificado ao vivo**: legendas flutuantes dos números
de escola renderizando normalmente, escolinha abrindo por proximidade, sem erro de console.
`npm run test`: 47/47 (sem teste novo — mudança de bundling, não lógica de domínio). `npm run
build` sem erros. Ver `labs/lab-117-code-splitting-world3d/CONTEXT.md`.

Antes desse: labs/lab-116-corrige-camera-decolagem-foguete/ — pedido do usuário: "a viagem do
foguete pra ida pros outros planetas ta um pouco bugada a camera, fica uma visao dentro da terra.
na volta pra terra ta ok." Causa raiz: a câmera do foguete fica "atrás da cauda" (pedido do
lab-61) nas duas fases de repouso do voo (decolagem e flip final de pouso) — nessas fases o nariz
trava apontando pra LONGE do planeta relevante, então "atrás da cauda" aponta a câmera DIRETO PRA
DENTRO dele. Só ficava visivelmente quebrado saindo do planeta principal (raio 13, único corpo com
`backFaceCulling = false` desde o lab-95 — os outros planetas são esferas lisas com culling padrão,
então "câmera lá dentro" só mostra vazio). A decolagem é um HOLD real controlado pelo jogador (fica
tempo suficiente pra notar); o pouso equivalente tem a MESMA geometria problemática, mas
`landRocket()` corta o quadro ruim quase instantaneamente ao cruzar `progress >= 1` — por isso só
a decolagem tinha sido reportada, mas a lógica errada existia nos dois lados. Corrigido nas DUAS
pontas: `RocketFlight` ganhou `fromUp`/`toUp: Vector3` (mesmos vetores já calculados em
`boardRocket`); a câmera "de lado" (tangente horizontal baseada em `facing` + altura no PRÓPRIO
"pra cima" do planeta relevante, garantido pra fora da superfície) substitui a câmera "atrás da
cauda" durante `progress <= ROCKET_LAUNCH_HOLD_END` e `progress >= ROCKET_LANDING_FLIP_START`; o
cruzeiro (meio do voo) ficou intocado. **Verificado ao vivo nas 4 combinações**: decolagem do
planeta principal rumo a Marte e a Mercúrio (câmera limpa, sem interior visível do planeta
principal — bug reproduzido e corrigido); pouso em Mercúrio e decolagem de volta (câmera de fora,
sem regressão); pouso de volta no planeta principal (aproximação externa limpa, "volta pra Terra"
continua ok como o usuário confirmou). Sem erro de console. `npm run test`: 47/47 (sem teste novo —
é bug de câmera/renderização, não lógica de domínio). `npm run build` sem erros. Ver
`labs/lab-116-corrige-camera-decolagem-foguete/CONTEXT.md`.

Antes desse: labs/lab-115-escolinhas-sistema-solar/ — pedido do usuário: "crie escolinhas com
perguntas tbm nos planetas novos para ampliar a elevação dos níveis, e quanto mais longe o planeta
mais alto deve ser o nível do usuário." Cada um dos 6 planetas novos da frente Sistema Solar
(Mercúrio/Vênus/Júpiter/Saturno/Urano/Netuno) ganhou uma escolinha com pergunta de astronomia REAL
sobre o próprio planeta (`data/planetQuests.ts`, novo) — XP/moeda de verdade via
`applyPlanetQuestCompletion` (`progression.ts`, novo), isolado em `completedPlanetQuestIds`
(NUNCA em `completedQuestIds`/badges do planeta principal — mesmo espírito de isolamento do Quiz
Surpresa, mas com XP de verdade, já que o pedido é explicitamente "ampliar a elevação dos níveis").
Nível mínimo pra viajar (`requiredLevel` em `DESTINATION_PLANETS`) escalando com a distância REAL
ao Sol: Mercúrio=2, Vênus=3, Júpiter=5, Saturno=7, Urano=9, Netuno=11 — Marte e o planeta principal
ficam de fora do requisito (já alcançáveis sem restrição desde antes desta frente, mudar isso agora
alteraria comportamento já em produção). Escolinha simplificada (totem + professor, não a
estrutura completa com paredes/telhado do planeta principal) — os 6 planetas são esferas
PERFEITAS, sem risco de "escolinha enterrada" (bug do lab-95, específico do relevo irregular do
planeta principal). `PlanetPickerPanel.tsx` mostra 🔒 + nível necessário nos planetas ainda
bloqueados (reaproveita `.avatar-shop-tag.subscription-lock` já existente, zero CSS novo).
**Verificado ao vivo**: em nível 1, só Marte tem "Viajar" (os 6 novos mostram cadeado com o nível
certo); depois de subir pra nível 2 respondendo 2 missões reais do planeta principal, Mercúrio
libera "Viajar" enquanto Vênus+ continuam bloqueados; viagem completa até Mercúrio, escolinha
"Escolinha de Mercúrio" abriu certinho pela proximidade, resposta correta creditou +30 XP/+16
moedas (bônus de Semana da Recompensa Dupla 2x aplicado sobre 15 XP/8 moedas base) — confirmado por
leitura direta do `localStorage`: `completedQuestIds` do planeta principal INTACTO (só `q01`/`q02`,
a escolinha de planeta não entrou ali), `badges` intacto, `completedPlanetQuestIds: ["planet-
mercurio"]` isolado corretamente; reaproximar do totem já respondido não reabre o modal (idempotente).
`npm run test`: 47/47 (3 testes novos). `npm run build` sem erros. **Nota de transparência**: a
verificação usou o perfil de dev local "EspertoFoguete81" (criado 2026-08-20, antes desta sessão) —
seu progresso avançou de verdade (XP 0→70, moedas 2→38) pra alcançar nível 2 legitimamente; uma
tentativa de setar XP direto via `localStorage` foi bloqueada pelo classificador de modo automático
(mesmo tipo de proteção contra adulteração de save identificada no lab-90), então não foi possível
restaurar o valor original depois — save local de dev, sem dado de produção/banco envolvido. Ver
`labs/lab-115-escolinhas-sistema-solar/CONTEXT.md`.

Antes desse: labs/lab-114-sistema-solar-urano-netuno/ — ÚLTIMO laboratório da frente "Sistema
Solar": os dois gigantes de gelo, feitos juntos (incrementos pequenos sobre o padrão já
estabelecido). Urano com faixas rotacionadas 90° na MALHA do chão (`Quaternion.RotationAxis`,
nunca no `landingUp` — física/voo do foguete intocados), reflete o eixo de rotação real bem
tombado (~98°); Netuno com Grande Mancha Escura (decalque fixo, análogo à Mancha Vermelha de
Júpiter). **Com isso, os 8 planetas reais do sistema solar estão completos no jogo** — frente
"Sistema Solar" (labs 110-114) encerrada. **Verificado ao vivo**: seletor mostra os 7 destinos
(3 linhas de grade); Urano com viagem de IDA E VOLTA completa confirmada (posição + rotação da
malha conferida via `rotationQuaternion`, batendo exatamente com a rotação de 90° esperada);
Netuno com viagem de ida confirmada (chão/Mancha/moedas presentes, azul profundo nítido no
screenshot). Sem erro de console. `npm run test`: 44/44. `npm run build` sem erros. Ver
`labs/lab-114-sistema-solar-urano-netuno/CONTEXT.md`.

Antes desse: labs/lab-113-sistema-solar-saturno/ — quarto planeta novo da frente "Sistema
Solar", segundo gigante gasoso. Reaproveita a técnica de faixas do lab-112 (Júpiter, paleta mais
pálida/dourada) + ANEL novo (`CreateTorus` achatado no eixo Y, `scaling.y=0.02`, translúcido,
decorativo, sem física) — mesma primitiva do anel sonoro de combate de Marte, escala bem maior.
Sem rocha/cratera/combate. Raio 17 (um pouco menor que Júpiter=20), centro `(-58,0,58)`.
**Verificado ao vivo**: seletor mostra os 5 destinos; viagem completa pra Saturno confirmada por
inspeção da cena (posição do avatar, chão/anel/8 moedas presentes) e por medição direta da
bounding box do anel (disco de ~55 unidades de diâmetro, batendo com o cálculo esperado) — o
screenshot não mostrou o anel claramente por ângulo de câmera (perto do polo de pouso, anel no
equador fica fora de vista ali, geometria real não bug). A correção de `keysDown['e']` travado
(achado no lab-112) funcionou de primeira nesta verificação. `npm run test`: 44/44. `npm run
build` sem erros. **Deploy real (Vercel) pendente**: usuário pediu deploy manual em produção
durante este laboratório — Vercel falhou ("Not authorized", mesma restrição de CLI do lab-104,
consegue LER o projeto mas não fazer deploy). Cloudflare Pages paralelo atualizado DUAS vezes
nesta sessão (até Júpiter, depois até Saturno) —
https://missao-aprender-jogo.pages.dev tem tudo até este laboratório. Ver
`labs/lab-113-sistema-solar-saturno/CONTEXT.md`.

Antes desse: labs/lab-112-sistema-solar-jupiter/ — terceiro planeta novo da frente "Sistema
Solar", primeiro gigante gasoso. Faixas horizontais proceduralmente geradas (`DynamicTexture`,
técnica nova, reaproveitável em Saturno/Urano/Netuno) + Grande Mancha Vermelha (decalque fixo, não
sorteado). Sem rocha/cratera (Júpiter não tem superfície sólida), sem combate. Raio 20 (maior que o
planeta principal=13 — é o maior planeta do sistema solar de verdade), centro diagonal
`(58,0,-58)`. **Verificado ao vivo**: seletor mostra os 4 destinos (quebra pra 2ª linha de grade);
viagem completa pra Júpiter confirmada por inspeção da cena (posição do avatar batendo com
raio+avatar, textura de faixas presente, Mancha Vermelha e 8 moedas presentes) e visualmente
(faixa de cor clara no screenshot). **Achado de ferramenta durante a verificação (não bug do
produto)**: `keysDown['e']` pode ficar travado `true` por um par keydown/keyup incompleto de uma
automação anterior, fazendo o interact nunca disparar silenciosamente — corrigido despachando
`keyup` explícito antes do teste, registrado na memória do projeto. `npm run test`: 44/44.
`npm run build` sem erros. Ver `labs/lab-112-sistema-solar-jupiter/CONTEXT.md`.

Antes desse: labs/lab-111-sistema-solar-venus/ — segundo planeta novo da frente "Sistema
Solar" (continuação do lab-110). Superfície vulcânica alaranjada + atmosfera translúcida
amarelo-esbranquiçada decorativa (característica visual mais reconhecível de Vênus, sem física,
sem afetar luz/céu globais), sem cratera nenhuma (ao contrário de Mercúrio — decisão deliberada,
vulcanismo real de Vênus apaga crateras), sem combate. Raio 7 (entre Marte=6 e o planeta
principal=13), centro no eixo Y `(0,58,0)` — mutuamente ortogonal a Marte (Z) e Mercúrio (X). Zero
mudança na arquitetura genérica do lab-110 (`boardRocket`/`landRocket`/`PlanetPickerPanel`) — só
registrar constantes + `buildVenusIfNeeded()` + um `case` no dispatcher. **Verificado ao vivo**: os
3 destinos aparecem no seletor; viagem de IDA pra Vênus confirmada por inspeção direta da cena
(posição do avatar, chão/atmosfera/rochas/moedas todos presentes, visual da atmosfera confirmado
por screenshot), sem erro de console. A viagem de VOLTA não foi confirmada ao vivo nesta sessão
(deriva de posição na automação) — risco considerado desprezível, é código genérico idêntico ao já
comprovado pra Marte/Mercúrio no lab-110. `npm run test`: 44/44. `npm run build` sem erros. Ver
`labs/lab-111-sistema-solar-venus/CONTEXT.md`.

Antes desse: labs/lab-110-sistema-solar-selecao-de-planeta/ — pedido novo do usuário: ampliar
o mundo pra incluir todos os planetas do sistema solar (hoje só tinha Marte), renderizados sob
demanda ao viajar de foguete, com um seletor de destino ao embarcar. Escopo de cada planeta novo
confirmado com o usuário: moedas escondidas, sem combate (Marte continua sendo o único com
inimigos). Primeiro de vários laboratórios — este entregou a arquitetura genérica de múltiplos
destinos (`currentPlanetId: string | null` + registro `DESTINATION_PLANETS`, substitui o antigo
`onSecondPlanet: boolean` fixo) + `PlanetPickerPanel.tsx` (seletor "Pra onde vamos?", aberto ao
embarcar no foguete principal) + Mercúrio (esfera cinza-acastanhada, crateras via decalque de
geometria, rochas, 6 moedas escondidas, sem combate). **Marte verificado ao vivo como IDÊNTICO**
ao comportamento pré-refatoração (health bar, "5 marcianos restantes", anel sonoro, estação
alienígena, tudo confirmado numa viagem de ida e volta completa) — a refatoração generalizou só o
ESTADO/dispatch, sem tocar uma linha do conteúdo de `buildMarsIfNeeded` (ex-`buildSecondPlanetIfNeeded`).
Achado de ferramenta (não do produto): a aba de automação ficava `hidden` durante os ~9s de voo,
travando o `dt` do Babylon — contornado forçando `engine._deltaTime` manualmente, técnica salva na
memória do projeto pra reuso futuro. `npm run test`: 44/44 (sem teste novo — nada aqui é lógica de
domínio pura). `npm run build` sem erros. Ver
`labs/lab-110-sistema-solar-selecao-de-planeta/CONTEXT.md`.

Antes desse: labs/lab-109-cloudflare-pages-paralelo/ — resto de Fase F, escolhido pelo usuário
entre as opções restantes de backlog. `docs/plano-comercial-backend.md` recomenda migrar a
hospedagem do front-end pra Cloudflare Pages antes do lançamento comercial (Vercel Hobby proíbe uso
comercial). Escopo confirmado com o usuário: deploy NOVO e PARALELO, sem mexer no site ao vivo nem
no DNS — `missaoaprendizado.com` continua na Vercel até uma decisão futura separada. Projeto
`missao-aprender-jogo` criado na mesma conta Cloudflare dos Workers, build publicado sem NENHUMA
mudança de código (front-end já fala com os Workers via URL absoluta, `VITE_*` embutida em tempo de
build). **Live em https://missao-aprender-jogo.pages.dev** — verificado ao vivo: onboarding, mundo
3D, 627 arquivos estáticos servidos com `200`, sem erro de console. Conectividade cruzada com os
Workers não foi 100% confirmada ao vivo (fetch direto do navegador falhou "Failed to fetch" — mas
o MESMO erro acontece a partir da origem Vercel de PRODUÇÃO já em uso, e `curl` fora do navegador
confirma o Worker saudável, `200 {"ok":true}` — conclusão: restrição do ambiente de automação desta
sessão em alcançar `*.workers.dev`, não uma falha real; CORS do Worker já é `*` desde antes). Corte
de DNS/desligar Vercel fica explicitamente como decisão e ação FUTURA do usuário, não executada
nesta sessão. Ver `labs/lab-109-cloudflare-pages-paralelo/CONTEXT.md`.

Antes desse: labs/lab-108-multiplos-perfis-por-familia/ — última das 4 frentes de backlog de
produto do lab-104 (Minha Casa completa nos labs 105-107; esta era a única restante totalmente
construível em código, sem credencial nova nem decisão que só o usuário pode tomar). Permite dois
irmãos compartilhando o mesmo tablet terem cada um seu próprio perfil/progresso — antes, o jogo
tinha um único perfil fixo por aparelho (`localStorage` sem conceito de "qual criança"). Sistema de
slots em `storage.ts` (roster + perfil ativo, chaves com id embutido), migração ADITIVA e NUNCA
destrutiva do perfil legado (chaves antigas nunca apagadas), `ProfilePicker.tsx` novo ("Quem vai
jogar?"), botão 🔁 no HUD. Assinatura/entitlement continuam por APARELHO, não por criança —
`entitlementStorage.ts` intocado de propósito. **2 bugs reais pegos e corrigidos antes/durante a
verificação, nenhum chegou a ir pro usuário**: (1) o botão de trocar perfil só aparecia com 2+
perfis já criados — beco sem saída, já que ele é a ÚNICA porta pro "+ Novo perfil"; corrigido pra
sempre visível. (2) a guarda de migração usava o id ativo (que "Trocar perfil" apaga de propósito)
em vez do roster — cada troca de perfil disparava uma SEGUNDA migração do perfil legado (nunca
apagado), duplicando dados a cada troca; corrigido pra guardar pelo roster (nunca esvaziado).
**Verificado ao vivo** num dispositivo de dev real com um perfil pré-existente ("Duda", sessão
anterior): migração não-destrutiva confirmada, segundo perfil criado e confirmado isolado (moeda/
progresso não vazam entre perfis), troca sem perda de dado dos dois lados, sem erro de console —
perfil de teste removido ao final, devolvendo o aparelho ao estado original. `npm run test`: 44/44
(sem teste novo — `storage.ts` é I/O, não lógica de domínio pura). `npm run build` sem erros. Ver
`labs/lab-108-multiplos-perfis-por-familia/CONTEXT.md`.

Antes desse: labs/lab-107-minha-casa-sets-assinante/ — os dois sets temáticos exclusivos de
assinante ("Quarto Espacial" 🚀: cama-nave/luminária-planeta/tapete de estrelas; "Jardim Encantado"
🌷: grama florida/banco de madeira/borboletas animadas), última peça de "Minha Casa" planejada em
`docs/plano-comercial-backend.md`. 6 itens novos em `furniture.ts` (`cost: 0, subscriptionOnly:
true`) — zero mudança de domínio (`unlockGeneric` já rejeitava `subscriptionOnly` desde o lab-92).
`MyHousePanel` ganhou `entitlementActive` e a mesma expressão `usable = subscriptionOnly ?
entitlementActive : owned` já usada em `AvatarShop.tsx`. 2 testes de regressão novos (suite 44/44).
**Verificado ao vivo** o estado SEM assinatura (6 itens com 👑 e "🔒 Assinantes", sem regressão nos
5 itens grátis/compráveis) — o estado COM assinatura não foi simulado ao vivo de propósito (exigiria
token real ou adulterar `localStorage`/rede do jeito que o lab-90 já identificou como bypass
perigoso); confiança vem de paridade literal com `AvatarShop.tsx`, já em produção há vários labs.
**Com isso, "Minha Casa" está completa** (casa base grátis + mobília comprável + 2 sets exclusivos)
— só falta o "modo visita" (P2, precisa de revisão de segurança infantil própria). Ver
`labs/lab-107-minha-casa-sets-assinante/CONTEXT.md`.

Antes desse: labs/lab-106-minha-casa-mobilia-compravel/ — continuação direta do lab-105:
trocou o placeholder de mobília do `MyHousePanel` por compra de verdade com moeda. Novo
`app/src/data/furniture.ts` (5 itens, 6-20 moedas, campo `subscriptionOnly?` já previsto pro
próximo passo), `Progress.unlockedFurnitureIds`, `unlockFurniture` em `progression.ts`/
`useProgress.ts` (mesmo `unlockGeneric` de chapéus/óculos, zero regra nova). `MyHousePanel`
reaproveita as classes `.avatar-shop-*` de `AvatarShop.tsx` (grade de compra, botão desabilitado
sem moeda, tag "✓ Tem") — sem conceito de "equipar" (mobília não é peça do boneco, só possuída ou
não). 3 testes novos em `progression.test.ts` (suite total 42/42). **Verificado ao vivo**
(`npm run dev` + `window.__debugTeleport`): compra desconta moeda e persiste em
`localStorage`. **Nota de transparência**: a verificação usou o perfil local real "DudaDuda"
(porta 5174) — seus `coins` foram sobrescritos pra 100 pra testar sem grind, valor original não
anotado antes da sobrescrita (perda mínima, é só save local de teste, nada em produção/banco). Os
2 conjuntos exclusivos de assinante ("Quarto Espacial", "Jardim Encantado") ficam pro próximo
laboratório desta frente. Ver `labs/lab-106-minha-casa-mobilia-compravel/CONTEXT.md`.

Antes desse: labs/lab-105-minha-casa-plot-base/ — primeira fatia de "Minha Casa"
(`docs/plano-comercial-backend.md`, catálogo Fase E, item que faltava construir). Escolhido pelo
usuário entre 4 frentes de backlog de produto (Minha Casa / Fase F Stripe produção / e-mail semanal
via Resend / múltiplos perfis por família). **Correção de arquitetura feita durante a investigação,
antes de implementar**: a premissa inicial era espaço 3D andável de verdade, mas o código real
mostrou que NENHUM prédio deste jogo tem interior andável — todo prédio/objeto interage por gatilho
de proximidade abrindo um painel 2D (escolas → quiz, carteira → conquistas, loja → lojinha). Minha
Casa seguiu o MESMO padrão: fachada sólida (`World3D.tsx`, mesma técnica de construção das
escolinhas — paredes com `PhysicsAggregate`, fundação, telhado, `settleMeshOnTerrain`) perto do
spawn (espelhada em relação à carteira de estudos), gatilho de proximidade abre `MyHousePanel.tsx`
(painel novo, reaproveita CSS de `AchievementsPanel`) com 3 itens placeholder de mobília ("chega em
um próximo laboratório"). Mobília comprável com moeda e os 2 conjuntos exclusivos de assinante
("Quarto Espacial", "Jardim Encantado") ficam para laboratórios seguintes. **Verificado ao vivo**
com `npm run dev` local + teleporte de QA (`window.__debugTeleport`, dev-only): casa visível com
rótulo 🏠, painel abre/fecha/reabre corretamente (histerese confirmada), física da parede confirmada
(`physicsBody` estático). `npm run build` (typecheck + produção) passou sem erros. Ver
`labs/lab-105-minha-casa-plot-base/CONTEXT.md` pro detalhe completo.

Último concluído (secrets pendentes — ação do usuário): labs/lab-104-deploy-automatico-ci/ — resto
de G10 (deploy automático a partir do CI). Escolhido pelo usuário logo após o lab-103, entre
deploy automático/bug de morros invisíveis/staging separado. **Decisão de fluxo confirmada com o
usuário**: gatilho é push em `main` (padrão correto), não o branch de trabalho — achado ao
investigar: `main` estava 86 commits atrás deste branch, todo laboratório 78-103 fez deploy manual
direto daqui, nunca via `main`. A partir de agora, publicar em produção exige um PR deste branch
mesclado em `main`; push direto no branch de trabalho continua só rodando os testes (lab-101,
confirmado ao vivo: passo de deploy aparece "skipped", não falha sem token). **Tentativa de criar
os 2 tokens necessários via CLI (autorizada pelo usuário) confirmada INVIÁVEL nos dois casos**:
Cloudflare (sessão OAuth sem escopo "API Tokens: Edit") e Vercel (`vercel tokens add` → `403
Cannot create tokens for this app`, sessão restrita por integração) — sem contorno seguro,
reaproveitar tokens de sessão existentes foi descartado (expiração automática + escopo excessivo).
**PR rascunho `#8`** aberto (`worktree-abstract-wobbling-owl` → `main`, 88 commits, labs 78-104) —
usuário decidiu deixar a configuração dos secrets pra depois; PR seguro de existir sem eles (CI de
PR só testa, nunca dispara deploy). Ver `labs/lab-104-deploy-automatico-ci/CONTEXT.md` pro detalhe
completo.

Último concluído: labs/lab-103-nps-responsaveis/ — resto de G11/`prompt.md` §12 (NPS de pais/
responsáveis). Escolhido pelo usuário logo após o lab-102, entre deploy automático/NPS/bug de
morros invisíveis. Diferente de `product_events` (lab-99, 100% anônimo) — o responsável já
autenticado no portal responde por conta própria, sem problema novo de privacidade infantil. Nova
tabela `nps_responses` (primeira migração de verdade depois do baseline do lab-101, validou o
fluxo versionado na prática), endpoints `GET /nps/status`/`POST /nps` (autenticados,
`NPS_LIMITER` novo), widget no portal (`<select>` nativo 0-10, não 11 botões customizados) com
cooldown de 90 dias decidido pelo SERVIDOR (não `localStorage` — é sobre a família, não o
navegador), bloco `nps` em `GET /admin/metrics`. **Testado ao vivo contra produção real usando a
conta REAL do próprio usuário** (mesmo padrão do lab-100 — endpoints exigem JWT de responsável):
score enviado pela UI React de verdade (setter nativo + `dispatchEvent` pra disparar `onChange`
num componente controlado — React ignora `.value =` direto vindo de fora), `shouldPrompt` virou
`false` depois, 4 scores inválidos rejeitados com `400`, sem token rejeitado com `401`,
`/admin/metrics` refletiu a resposta (`score: 100`, 1 promotor). **`prompt.md` §12 (métricas de
PMF) está agora COMPLETO** (lab-99 + lab-103). Ver `labs/lab-103-nps-responsaveis/CONTEXT.md` pro
detalhe completo.

Antes desse: labs/lab-102-reconciliacao-stripe-banco/ — resto de G8
(`docs/prompts/05-escala-e-viabilidade.md`, `[receita]`). Escolhido pelo usuário logo após o
lab-101, entre reconciliação Stripe/deploy automático/NPS/bug de morros invisíveis. Cloudflare Cron
Trigger (primeira vez neste projeto, `[triggers] crons = ["0 9 * * *"]`) reconsulta diariamente
cada assinatura já conhecida direto no Stripe e corrige qualquer divergência de `status`/
`current_period_end` no banco (via `upsertSubscription`, reaproveitada dos webhooks) — cobre o
caso de um webhook que falhe silenciosamente de um jeito que nem a reentrega do Stripe corrija.
**Achado real durante a implementação**: a primeira execução do job acusou uma divergência FALSA
numa assinatura genuína — o driver `@neondatabase/serverless` devolve `timestamptz` como objeto
`Date` de verdade em runtime, não `string` (apesar do tipo declarado em todo `index.ts`), e
comparar por igualdade de string direta sempre falhava mesmo pro mesmo instante. Corrigido com
`toComparableIso` (`domain.ts`, 4 testes novos, total do Worker 40). **Testado ao vivo contra
produção real com autorização explícita do usuário** (classificador bloqueou corromper dado real
de produção mesmo temporariamente): `status` de uma assinatura REAL alterado direto no banco pra
um valor errado, reconciliação detectou e corrigiu sozinha em segundos, confirmado por leitura
direta do banco. Não cobre uma assinatura cujo PRIMEIRO webhook nunca chegou (nenhuma linha
criada) — limitação conhecida. **G8 agora está COMPLETO** (lab-96 + lab-102). Ver
`labs/lab-102-reconciliacao-stripe-banco/CONTEXT.md` pro detalhe completo.

Antes desse: labs/lab-101-ci-e-migracao-versionada/ — G10
(`docs/prompts/05-escala-e-viabilidade.md`, `[operação]`). Escolhido pelo usuário logo após o
lab-100, entre G10/reconciliação Stripe/NPS/bug de morros invisíveis. Atacou as duas partes mais
contidas de G10: CI (GitHub Actions, `.github/workflows/ci.yml`, 3 jobs — `app`/`server-accounts`/
`server-cf-relay` — rodando os 88 testes deste repositório a cada push, hoje zero automação antes
disso) e migração de schema versionada (`schema.sql` reaplicado inteiro sem histórico virou
`migrations/0001_baseline.sql` + tabela `schema_migrations`, `migrate.mjs` reescrito pra aplicar só
o que é novo, cada migração numa transação). **CI de verdade pegou 2 bugs reais de "funciona na
minha máquina"** que nenhuma verificação manual anterior tinha pego: `npx tsc` e o Vitest nos dois
Workers estavam resolvendo TypeScript/config por busca ancestral acidental em `app/node_modules`
(pastas aninhadas) — corrigido com `typescript` como devDependency direta + `vitest.config.ts`
próprio em cada Worker. Migração aplicada em produção e confirmada (contagem de tabelas 7→8).
Confirmado ao vivo no GitHub Actions: 3 jobs verdes, sem avisos. "Ambiente de staging" e "rollback
documentado" ficaram fora de propósito (infraestrutura maior, laboratório próprio futuro). Ver
`labs/lab-101-ci-e-migracao-versionada/CONTEXT.md` pro detalhe completo.

Antes desse: labs/lab-100-gerenciar-aparelhos-por-familia/ — resto de G7
(`docs/prompts/05-escala-e-viabilidade.md`, `[segurança/receita]`). Escolhido pelo usuário logo após
o lab-99, entre G10/reconciliação Stripe/UI de aparelhos/NPS. Até aqui só existia "desvincular todos
os aparelhos" (lab-97) — sem jeito de ver quantos/quais aparelhos estão pareados nem revogar um
específico. Corrigido: novos endpoints `GET /entitlement/devices` (lista os tokens da família,
autenticado como responsável) e `POST /entitlement/revoke` (revoga um `jti` específico, só se
pertencer à família de quem chama — `404` genérico tanto pra "não existe" quanto pra "não é seu",
sem vazar informação). Reaproveita `entitlement_tokens` do lab-97 por completo, sem tabela/coluna
nova. Novo bloco "Aparelhos pareados" em `FamilyPortal.tsx`, com confirmação em duas etapas por
item, mesmo padrão do "revogar todos". **Testado ao vivo contra produção real usando a conta REAL
do próprio usuário** (primeira vez neste projeto que a verificação usa uma sessão de navegador
autenticada de verdade em vez de só scripts, já que os endpoints exigem um JWT de responsável que
nenhum script consegue forjar): 2 aparelhos pareados e listados corretamente, 1 revogado pela UI
(o outro continuou intacto, confirmado via `/entitlement`), `404` confirmado pra `jti` inexistente
e `401` confirmado sem token — tudo executado dentro da própria aba autenticada, sem o JWT do
responsável nunca sair do navegador. **G7 agora está COMPLETO** (lab-88 + lab-97 + lab-100). Ver
`labs/lab-100-gerenciar-aparelhos-por-familia/CONTEXT.md` pro detalhe completo.

Antes desse: labs/lab-99-analytics-de-produto/ — resto de G11 (`prompt.md` §12: D1/D7
retention, tempo médio por sessão, quests concluídas por usuário, taxa de retorno semanal).
Escolhido pelo usuário logo após o lab-98. Restrição central: privacidade infantil — identificador
100% anônimo (`crypto.randomUUID()`, `getOrCreateDeviceId()` em `storage.ts`, sem vínculo com
nome/e-mail/apelido), primeira vez que telemetria de gameplay sai do aparelho da criança (antes só
`localStorage`). Novo: `app/src/productAnalytics.ts` (mesmo padrão de `errorReporting.ts` — `fetch`
com `keepalive`, falha silenciosa) dispara `session_start`/`session_end` (com duração) e
`quest_completed` (só em conclusão GENUÍNA, não em replay de missão já concluída — bug pego e
corrigido antes de qualquer teste). Nova tabela `product_events` no Neon; `POST /events` (anônimo,
rate-limited) grava; `GET /admin/metrics` (protegido por header `x-admin-secret`) devolve D1/D7
retention, duração média de sessão, quests médias por dispositivo, total de dispositivos únicos —
tudo via CTEs SQL. **Testado ao vivo contra produção real**: `POST /events` real confirmado por
leitura direta do banco; 11 eventos sintéticos inseridos cobrindo 3 dispositivos/múltiplos dias,
`/admin/metrics` bateu exatamente com o cálculo manual (D1 66.67%, D7 33.33%, sessão média 90s,
1.5 quests/dispositivo); `401` confirmado sem/com secret errado. Três ações de infraestrutura
(migração do schema, `wrangler secret put`, deploy do Worker) precisaram de **autorização explícita
do usuário** cada uma, bloqueadas individualmente pelo classificador de modo automático (mesmo
padrão do lab-96 com a API do Stripe). NPS de responsáveis ficou fora de escopo de propósito
(mecanismo diferente, pesquisa qualitativa não evento) — laboratório próprio futuro. **G11 agora
está COMPLETO** (lab-98 + lab-99). Ver `labs/lab-99-analytics-de-produto/CONTEXT.md` pro detalhe
completo.

Antes desse: labs/lab-98-alarme-de-cota/ — parte de G11
(`docs/prompts/05-escala-e-viabilidade.md`, item 4 da ordem de ataque §7), escolhido pelo usuário
logo após o lab-97. Boa parte de G11 (observabilidade) já tinha sido resolvida no lab-84 (Web
Analytics, `/client-error`, logs de erro do relay) — faltava ALARME DE COTA de verdade: nenhum
mecanismo detectava se o relay se aproximava da cota gratuita de 100k requests/dia dos Durable
Objects, apesar de duas rodadas de recálculo manual de orçamento já terem acontecido (lab-85/86).
Corrigido: contador autocontado dentro do próprio Durable Object do relay (`state.storage`,
SQLite-backed, primeira vez usado de verdade neste Worker), usando a razão de cobrança 20:1 pra
mensagens WebSocket já documentada no lab-86 (cada conexão = 1 unidade, cada mensagem recebida =
1/20). Loga `[quota-alarm]` ao cruzar 50%/80%/100% da cota, uma vez por limiar por dia; novo
endpoint `GET /quota-status` (sem autenticação, só números agregados) pra consultar sem precisar
de `wrangler tail`. 13 testes novos (primeiro teste automatizado deste Worker). Deployado e
**testado ao vivo contra produção real**: 5 conexões + 145 mensagens via `scripts/load-test.mjs`
(script já existente do lab-85), `/quota-status` refletiu 12 unidades (esperado ~12,25) — contagem
persistindo e acompanhando tráfego real de ponta a ponta. Eventos de produto/retenção D1-D7
(`prompt.md` §12, a outra metade de G11) ficam fora de escopo, para um laboratório futuro. Ver
`labs/lab-98-alarme-de-cota/CONTEXT.md` pro detalhe completo.

Antes desse: labs/lab-97-revogacao-token-pareamento/ — resto de G7
(`docs/prompts/05-escala-e-viabilidade.md`, `[segurança/receita]`), escolhido pelo usuário logo
após o lab-96. Rate limit e a corrida de resgate duplo já tinham sido corrigidos no lab-88; faltava
o token de entitlement em si — uma vez emitido, válido por 180 dias sem NENHUM jeito de invalidar
antes da expiração (código vazado em grupo de WhatsApp virava assinatura compartilhada pelo tempo
todo). Corrigido: nova tabela `entitlement_tokens` (`jti` = chave primária) registra cada token
emitido; `handlePairingRedeem` gera um `jti` de verdade e, ao atingir o limite de **3 aparelhos por
família** (confirmado com o usuário), revoga o mais antigo automaticamente antes de emitir um novo
— zero fricção pra trocar de aparelho; `handleEntitlement` recusa um token revogado, mas mantém
COMPATIBILIDADE RETROATIVA total pra tokens emitidos antes deste laboratório (sem `jti`, sempre
tratados como válidos até a expiração natural — nenhuma família pagante perde acesso por causa
desta mudança). Novo endpoint `POST /entitlement/revoke-all` (autenticado como o responsável) +
botão "Desvincular todos os aparelhos" no portal, pra quando um código vazar. 8 testes novos
(Worker: 21→29). Migração aplicada, Worker e frontend deployados. **Testado ao vivo contra
produção real** com uma família já existente (sem mexer na assinatura dela): 4 pareamentos em
sequência confirmaram a revogação automática do mais antigo no 4º, e `/entitlement` recusando
(`401`) o token revogado enquanto aceita (`200`) o mais recente — assinatura real intacta. Ver
`labs/lab-97-revogacao-token-pareamento/CONTEXT.md` pro detalhe completo.

Antes desse: labs/lab-96-webhook-stripe-idempotencia/ — G8
(`docs/prompts/05-escala-e-viabilidade.md`, `[receita]`), escolhido pelo usuário entre G8/G7/
revisitar tamanho das escolinhas logo após o lab-95. `subscriptions.status` só aceitava 4 dos 8
status reais do Stripe (Pix/boleto nasce `incomplete` com frequência, o que quebrava o `insert` e
causava reenvio infinito); sem tabela de eventos processados (reentrega podia reaplicar a mesma
mudança); sem índice único em `stripe_subscription_id` (corrida real sob entrega concorrente); sem
proteção contra evento fora de ordem; `invoice.payment_failed` sem handler. Tudo corrigido:
`schema.sql` ampliado + índice único + tabela `stripe_webhook_events` + coluna
`last_event_created_at`; `domain.ts` ganhou `isValidSubscriptionStatus`/`isEventNewerThan` (7
testes novos, total do Worker 14→21); `invoice.payment_failed` tratado (descoberta no caminho: SDK
`stripe` 22.x não tem mais `invoice.subscription` no nível raiz, é
`invoice.parent.subscription_details.subscription` — conferido no `.d.ts`, não suposição).
Migração aplicada no banco Neon de produção e conferida direto; Worker deployado
(`https://missao-aprender-accounts.rafaelvs.workers.dev`). Endpoint de webhook do Stripe (modo
teste) não estava inscrito em `invoice.payment_failed` — corrigido via API com **autorização
explícita do usuário** (a primeira tentativa foi bloqueada pelo classificador de modo automático
por mexer em config de terceiro). **Testado ao vivo contra produção de verdade**: evento sintético
assinado enviado ao Worker real, idempotência confirmada (reentrega do mesmo `event.id` devolveu
`deduped:true`). Ver `labs/lab-96-webhook-stripe-idempotencia/CONTEXT.md` pro detalhe completo.

Antes desse: labs/lab-95-mais-missoes-e-escolinhas-menores/ (pedido do usuário 2026-08-25:
aumentar o número de missões além das 21 atuais + encolher as escolinhas pra não sobrecarregar o
planetinha). +9 missões novas (`q22`-`q30`) — concluído e deployado. Escolinhas ~20% menores —
tentado, causou um bug real em produção ("casas dentro da terra, só o telhado aparece"), revertido.
**O bug persistiu idêntico mesmo depois do revert** — não tinha relação com o tamanho.

Investigação passou por DUAS causas raiz erradas antes da certa: (1) achou que era timing de
inicialização do Havok (raycast físico "não pronto" no boot) — três tentativas de correção
diferentes não mudaram nada, byte a byte, provando que não era isso; (2) achou que reposicionar
escolas longe de rampa de platô íngreme bastava, usando a FÓRMULA de relevo pra decidir — passou
num teste de 30/30 escolas, foi deployado, e o usuário reportou o MESMO bug de novo (a fórmula não
bate com a malha real do planeta perto de rampa íngreme, então o teste não pegava o próprio erro).
**Causa raiz de verdade**: `settleMeshOnTerrain` incluía o TELHADO (beiral largo, não toca o chão)
e o PROFESSOR (deslocado do centro, tem seu próprio chão) na decisão de quanto descer o prédio
INTEIRO — os dois "vazavam" pra fora da pegada real das paredes e distorciam a conta. Corrigido
excluindo os dois da amostragem (`excludeFromSampling` em `settleMeshOnTerrain`) e trocando a busca
de posição mais plana pra usar raycast físico real em vez da fórmula. **Verificado exaustivamente
em 30/30 escolas** (folga média subiu de negativa/enterrada pra 0,86 de um máximo de 1,10) e
**confirmado pelo próprio usuário testando de novo**: "testei denovo agora ficou certo".

Logo em seguida, o usuário reportou um bug RELACIONADO **que ficou SEM RESOLVER**: morros/platôs
aparecendo invisíveis ("as casas que estão sobre o morro aparecem flutuando no espaço"). Causa
identificada: a malha do planeta (só 48 segmentos) dobra alguns triângulos sobre si mesma nas
rampas mais íngremes, invertendo a ordem de enrolamento — com culling de face traseira ligado
(padrão do material, nunca desligado pro planeta, diferente de outros materiais deste arquivo),
esses triângulos ficam invisíveis. Tentativa de correção: `planetMat.backFaceCulling = false`,
confirmada por A/B ao vivo NUM cenário de teste. **Mas o usuário testou de novo no local real e o
morro CONTINUA invisível.** Um carimbo de build foi adicionado ao HUD (`__BUILD_STAMP__`, a pedido
do usuário) e confirmou que ele está testando a versão certa — não é cache. Fui até o local exato
do print dele (mesmos números de escola visíveis) usando essa mesma versão e não consegui
reproduzir — tudo sólido do meu lado. Suspeita: algo específico do aparelho/GPU do usuário, ou um
buraco de geometria real (não só culling) visível só de um ângulo específico. Perguntei se dá pra
ANDAR através do buraco e qual aparelho ele usa — **sem resposta**; usuário pediu pra seguir pro
próximo laboratório. **Esse bug fica em aberto, não resolvido.**

Um diagnóstico temporário (`ENTERRADAS:...`) foi deixado no HUD, sempre visível inclusive em
produção, pra conseguir dado real do aparelho do usuário sem ferramenta de desenvolvedor — precisa
ser removido num próximo laboratório depois de confirmação continuada de que o afundamento não
voltou. Meta de "escolinhas menores" (tamanho) segue em aberto. Ver
`labs/lab-95-mais-missoes-e-escolinhas-menores/CONTEXT.md` pra timeline completa (vale a leitura
completa — tem a lição de por que um teste "passou" duas vezes antes de a correção estar realmente
certa, e as perguntas pendentes sobre o bug de morros invisíveis).

**Pedido maior do usuário (2026-08-24), dividido em vários laboratórios — TODOS OS 4 ITENS
CONCLUÍDOS** (registrado aqui como histórico):
1. Dashboard de progresso + lojinha responsiva → **lab-91, concluído**: painel em `/familia` lê
   `localStorage` local (mesmo aparelho/navegador da criança, sem mudança de arquitetura, sem
   dado de criança saindo do aparelho); `.avatar-shop-tab`/`.avatar-shop-action` corrigidos pro
   `[MUST]` de 44×44px (`docs/prompts/02-design-profissional.md`); abas com fade de borda em vez
   de corte de texto. Ver `labs/lab-91-dashboard-de-progresso-e-lojinha-mobile/CONTEXT.md`.
2. Mais itens colecionáveis (free + assinatura) → **lab-92, concluído**: novo eixo "Óculos"
   (`equippedGlassesId`, mesmo padrão do chapéu) — 2 itens free (moeda) + 2 exclusivos de
   assinante. Achado: `docs/plano-comercial-backend.md` já especificava esse eixo pra Fase E e
   nunca tinha sido construído. Verificado ao vivo inspecionando `window.__playerFigure.
   glassesMeshes` direto (câmera do preview 3D não girava no ambiente de automação — inspeção de
   cena foi mais confiável que screenshot). Visibilidade multiplayer NÃO testada ao vivo com duas
   abas (só paridade de código com o chapéu, já comprovado desde o lab-73) — ver
   `labs/lab-92-oculos-novo-eixo-de-colecionaveis/CONTEXT.md`.
3. "Centro de estudo"/carteira onde o boneco senta + acessa catálogo de conquistas → **lab-93,
   concluído**: carteira fixa perto do spawn (mesmo padrão das escolinhas), gatilho de proximidade
   abre um `AchievementsPanel` novo (reaproveita CSS de `.quest-list` sem nada novo), pose sentada
   congelada nos pivôs do boneco. **Achado importante**: a primeira versão gateava o bloco inteiro
   de física/input por `sittingAtDesk`, o que travava o jogador na carteira PRA SEMPRE (nem
   `RESET_DISTANCE` conseguia disparar, já que a posição parava de atualizar) — corrigido gateando
   só a recalculagem da pose, não física/input/posição. Ver
   `labs/lab-93-carteira-de-estudos-e-conquistas/CONTEXT.md` pro relato completo.
4. Brinde ao vencer o chefe de Marte (ETs + robô) → **lab-94, concluído**. Achado: não existe
   "chefe" de Marte — só os 6 inimigos regulares já existentes (3 ET + 3 robô); o pedido real é
   "derrotar todos", não uma luta de chefe nova. Virou um chapéu exclusivo ("Coroa de Herói de
   Marte" 🪐, `marsRewardOnly` em `hats.ts`) desbloqueado uma única vez ao limpar Marte pela
   primeira vez, nunca comprável com moeda (mesma proteção que já existe pra itens de assinante).
   Verificado ao vivo com um atalho de QA temporário (removido antes do commit) que mata os 6
   inimigos de uma vez — toast "Marte limpo!" + lojinha atualizando na hora confirmados. Ver
   `labs/lab-94-brinde-de-marte/CONTEXT.md`.
Último concluído: labs/lab-94-brinde-de-marte/ — ver acima.

Último antes desse: labs/lab-90-corrige-bypass-de-assinatura-local/ (G6, metade "bypass": um `401`
do `/entitlement` — o servidor recusando explicitamente um token inválido/forjado — era tratado
igual a uma falha de rede em `useEntitlement.refresh()` e descartado, então editar `localStorage`
manualmente pra `active: true` liberava todo cosmético de assinante PERMANENTEMENTE, mesmo com a
revalidação rodando certinho a cada sessão. Corrigido distinguindo 401 (rejeição autoritativa,
sobrescreve o cache) de outras falhas (rede/5xx, continua preservando o cache — filosofia
"funciona offline" preservada). Decisão pura extraída e testada
(`shouldTrustCachedEntitlementOnFailure`, 34 testes no total). Verificado ao vivo contra o Worker
de produção real (não mockado): token forjado injetado via `localStorage` foi corrigido sozinho
pra `active: false` no reload, lojinha mostrou os itens de assinante corretamente bloqueados.
Deploy em produção feito (`npx vercel --prod --yes`). A outra metade de G6 — progresso pago sem
backup/restauração — ficou explicitamente fora de escopo, precisa de conversa de produto/
privacidade própria antes de qualquer implementação. Ver
`labs/lab-90-corrige-bypass-de-assinatura-local/CONTEXT.md`.)
Contexto do laboratório anterior: labs/lab-94-brinde-de-marte/CONTEXT.md

**Ticket de suporte aberto com a Cloudflare (2026-08-24)** sobre o binding nativo de Rate Limiting
não bloquear nada em produção (achado do lab-88) — aguardando resposta. Não é bloqueador: as rotas
críticas já têm defesa verificada que não depende desse binding (ver `labs/
lab-88-protecao-contra-sobrecarga/CONTEXT.md`).

**Duas correções de produção fora de um laboratório formal** (pedido direto do usuário no chat,
2026-08-24, não vale a pena um `labs/lab-NN/` próprio pelo tamanho, mas registrado aqui pra não
se perder):
1. **Domínio confiável do Neon Auth**: `https://missaoaprendizado.com` nunca tinha sido adicionado
   à lista de domínios confiáveis do Neon Auth (Configuration → Domains) — só
   `app-two-flax-92.vercel.app` estava lá desde a Fase B. Isso bloqueava QUALQUER cadastro/login
   feito a partir do domínio novo com `403 Invalid Origin` (o usuário achou que era senha
   esquecida; era isso). Corrigido adicionando o domínio na lista, direto no console do Neon
   (`console.neon.tech` → projeto `missao-aprender` → Auth → Configuration → Domains). **Se um
   domínio novo for apontado pro jogo no futuro, lembrar de adicionar ele aqui também** — não é
   automático.
2. **"Esqueci minha senha"** (`FamilyPortal.tsx`, `LoginScreen`) — não existia nenhum mecanismo de
   recuperação. Implementado com o que o servidor do Neon Auth já tinha configurado: plugin de
   e-mail-OTP (`authClient.forgetPassword.emailOtp({email})` pra pedir o código,
   `authClient.emailOtp.resetPassword({email, otp, password})` pra confirmar) — não é o fluxo de
   link mágico clássico do Better Auth (`forgetPassword`/`resetPassword` simples), que não está
   disponível nesta instância. Testado ao vivo: código de 6 dígitos chegou de verdade no e-mail do
   usuário (usa o provedor de e-mail compartilhado do próprio Neon, `auth@mail.myneon.app`, sem
   precisar configurar SMTP/Resend). Deployado em produção.

**G3 (lab-88), G4/G5 (lab-89) resolvidos. G6 parcialmente resolvido (lab-90). G7 resolvido
(lab-97). G8 resolvido (lab-96)**: o bypass de assinatura via `localStorage` está corrigido; a
falta de backup/restauração de progresso pago continua em aberto de propósito (precisa de conversa
de produto/privacidade, ver `labs/lab-90-.../CONTEXT.md`). G7 (token de pareamento sem `jti`/
revogação/limite de aparelhos) foi resolvido no lab-97, e a UI de gerenciar aparelhos individuais
(listar + revogar um específico) foi resolvida no lab-100 — **G7 está agora COMPLETO** — ver
`labs/lab-97-revogacao-token-pareamento/CONTEXT.md` e
`labs/lab-100-gerenciar-aparelhos-por-familia/CONTEXT.md`. G8 (webhook do Stripe sem idempotência,
`status` do schema não cobria todos os estados reais do Stripe/Pix) foi resolvido no lab-96 — ver
`labs/lab-96-webhook-stripe-idempotencia/CONTEXT.md`, e o **job de reconciliação Stripe↔banco**
(parte de G8 que tinha ficado fora de escopo do lab-96 de propósito, por exigir Cloudflare Cron
Triggers) foi resolvido no lab-102 — **G8 está agora COMPLETO**, ver
`labs/lab-102-reconciliacao-stripe-banco/CONTEXT.md`. G9 já foi resolvido no lab-88 (só o `.md` de
origem não foi atualizado pra refletir). Da ordem de ataque de
`docs/prompts/05-escala-e-viabilidade.md` seção 7, o que resta genuinamente sem solução agora é
deploy automático a partir do CI (próximo passo natural do lab-101) e as partes de G10 deixadas de
fora de propósito. **G10 (CI + migração versionada) foi resolvido no lab-101** —
"ambiente de staging" e "rollback documentado" (as outras duas partes de G10) continuam fora de
escopo de propósito, ver `labs/lab-101-ci-e-migracao-versionada/CONTEXT.md`. **G11 está agora
COMPLETO**: a parte de ALARME DE COTA foi resolvida no lab-98 (contador autocontado no relay)
e a parte de eventos de produto/retenção D1-D7 (`prompt.md` §12) foi resolvida no lab-99 (tabela
`product_events`, `POST /events`, `GET /admin/metrics`) — ver
`labs/lab-98-alarme-de-cota/CONTEXT.md` e `labs/lab-99-analytics-de-produto/CONTEXT.md`.

**LEIA ISTO ANTES DE COMEÇAR O PRÓXIMO LABORATÓRIO**: o lab-85 tinha medido 38,2% da cota diária
pra 30 jogadores/30min e deixado como pendência decidir se "salas com teto de 12 jogadores" era o
próximo passo certo. O lab-86 descobriu que esse número estava errado por um fator de 20x — a
Cloudflare cobra mensagens WebSocket recebidas numa razão de 20:1 (confirmado na página oficial de
preços dos Durable Objects), então o número real é **~1,91%**. **Isso muda a prioridade**: não há
mais uma crise de cota de requests que justifique "salas" com urgência — o próximo passo real da
ordem de ataque de `docs/prompts/05-escala-e-viabilidade.md` seção 7 é **G3/G5 (endurecimento do
relay + socket autenticado) e G4 (apelido deixa de ser texto livre — o único achado com risco
legal/reputacional imediato)**. "Salas" volta pro backlog, sem urgência, até o produto ter uso
real o suficiente pra justificar (nesse ponto, também vale medir "Duration" — 13.000 GB-s/dia,
outro recurso que o lab-86 identificou como potencialmente mais apertado que requests pra uma
sala sempre ativa; ver `labs/lab-86-correcao-orcamento-cota/CONTEXT.md`). Ler esse CONTEXT.md
inteiro antes de continuar — tem a tabela de recálculo completa e as dúvidas que ainda ficaram em
aberto (cota por conta vs. por instância, tanto de requests quanto de duration).

**Comandos de teste (lab-83, contagem atualizada no lab-85)**: `cd app && npm run test` (31
testes: lógica de jogo + backoff/modo-solo de `multiplayer.ts`) e `cd app/server-accounts && npm
run test` (14 testes, lógica de entitlement/pareamento). Rodar antes de mexer em `progression.ts`,
`multiplayer.ts` ou `server-accounts/src/domain.ts`.

**Plano comercial completo**: `docs/plano-comercial-backend.md` — 6 fases (A, B, C e D
concluídas; E em andamento — parte de catálogo pronta, falta "Minha Casa"; F não iniciada). Ler
antes de continuar qualquer trabalho de contas/assinatura/cosméticos pagos. Backend confirmado
com o usuário como TypeScript/Cloudflare (não migra pra C#/.NET). Preço da assinatura confirmado:
R$ 4,99/mês.

**Pedido de "chat livre" recusado (2026-08-24)**: usuário pediu chat de texto livre entre
crianças. Não implementado — é requisito `[MUST]` de `docs/prompts/01-seguranca.md`/`prompt.md`
§11 (risco de assédio/vazamento de dado pessoal, exposição LGPD/ECA). Resposta dada: catálogo de
quick-chat bem maior (ver lab-82). Se o pedido voltar, reapresentar o mesmo argumento antes de
considerar qualquer coisa que pareça abrir texto livre de verdade.

**Jogo ao vivo**: https://app-two-flax-92.vercel.app **e também** https://missaoaprendizado.com
(domínio próprio, comprado pelo usuário em 2026-08-24 via Cloudflare Registrar — ver
"Infraestrutura nova fora do git" abaixo — DNS apontado direto pro mesmo projeto Vercel, hospedagem
não mudou). Rota `/familia` com portal dos responsáveis + assinatura real via Stripe modo teste +
gerador de código de pareamento; HUD do jogo com botão 🔗 pra digitar esse código.
**Relé de multiplayer ao vivo (Cloudflare)**: https://missao-aprender-relay-v2.rafaelvs.workers.dev
(documentado em `app/server-cf-relay/README.md`)
**Backend de contas (Cloudflare Worker)**: https://missao-aprender-accounts.rafaelvs.workers.dev
— rotas `/health`, `/checkout`, `/subscription`, `/billing-portal`, `/pairing/generate`,
`/pairing/redeem`, `/entitlement`, `/webhooks/stripe`; login/cadastro do responsável continua
falando direto com o Neon Auth, sem passar por aqui (documentado em
`app/server-accounts/README.md`)

Trabalho acontece numa branch de worktree (`worktree-abstract-wobbling-owl`), a partir de `main`.
**PR #5 foi mesclado pelo usuário** — a branch voltou a ficar alguns commits à frente da `main`
depois disso (trabalho de documentação + Fase A do backend). Esta sessão não pode mesclar/apagar
a branch diretamente; avise o usuário quando um novo PR fizer sentido.

**Infraestrutura nova fora do git** (não tem como "clonar" isso via código — documentado aqui pra
quem retomar saber que existe): projeto Neon `missao-aprender` (id `plain-waterfall-72629169`,
região São Paulo), conta `rafaelv_s@hotmail.com` (login GitHub). Uma API key pessoal do Neon
("missao-aprender-agent", escopo amplo — toda a conta, não só este projeto) foi usada pra
provisionar isso; considerar revogar/restringir antes de qualquer automação recorrente.

**Projeto Cloudflare Pages `missao-aprender-jogo`** (lab-109, 2026-08-29): deploy PARALELO do
front-end, mesma conta Cloudflare dos Workers — https://missao-aprender-jogo.pages.dev. Não é
produção ainda (Vercel continua sendo o site ao vivo, `missaoaprendizado.com` não aponta pra cá) —
existe pronto e verificado, esperando decisão do usuário de fazer o corte de DNS de verdade (ver
`labs/lab-109-cloudflare-pages-paralelo/CONTEXT.md`). Publicado manualmente
(`wrangler pages deploy dist --project-name=missao-aprender-jogo --branch=main`, de dentro de
`app/`) — sem automação de CI ainda, de propósito. **Reaproveitado como via alternativa de deploy**
durante os labs 112-113 (2026-08-29), depois de o deploy direto no Vercel falhar com "Not
authorized" — atualizado duas vezes nesta sessão (até Júpiter, depois até Saturno), então está
sempre um passo à frente do site real enquanto o bloqueio do Vercel não for resolvido.

**Domínio `missaoaprendizado.com`** (2026-08-24): registrado pelo usuário via Cloudflare Registrar
(mesma conta Cloudflare dos Workers), US$10,46/ano, expira 23/08/2027, auto-renovação ativa por
padrão (desativável no dashboard Cloudflare). `missaoaprender.com` e `missaoaprender.com.br`
(o nome exato do jogo) já estavam registrados por terceiros — este foi o melhor disponível
preservando o nome. Zona DNS criada automaticamente na Cloudflare; dois registros A adicionados
manualmente (`@` e `www` → `76.76.21.21`, modo "DNS only"/sem proxy — obrigatório, já que quem
serve o site é o Vercel, não a Cloudflare) apontando pro mesmo projeto Vercel que já hospedava
`app-two-flax-92.vercel.app`. Vercel sugere trocar pro CNAME dele
(`86cbd73d3d7878f5.vercel-dns-017.com`) como otimização futura — não obrigatório, os registros A
atuais já funcionam (`vercel domains verify` confirma `ok: true`, `misconfigured: false`).

**Fly.io v1 (`missao-aprender-relay`)**: usuário pediu pra apagar, mas `flyctl apps destroy`
falhou — a conta Fly.io está com o trial expirado e a própria plataforma bloqueia TODA chamada de
API (inclusive apagar, que é grátis) até um cartão ser cadastrado. Sem contorno por CLI. O app já
está `suspended` (não roda/não é cobrado), só não pôde ser removido da conta.

**Decisões de produto já confirmadas** (não são mais pendências): preço R$ 4,99/mês; direção dos
cosméticos da Fase E inspirada em Brookhaven RP/Roblox (guarda-roupa amplo — já construído no
lab-82; casa pra montar — ainda não construída); biblioteca de material didático fica de fora dos
exclusivos, sempre grátis.

**Se o usuário reportar objetos/escolas flutuando de novo** (lab-75, lab-87): pedir um print com o
jogador parado bem perto do objeto — pro caso de escola, pedir também o NÚMERO dela (rótulo tipo
"14"), já corrigida em geral no lab-87 (`settleMeshOnTerrain` aplicado às escolas), mas sem
confirmação visual de uma escola especificamente afetada. Lembrar também que o sistema de chuva
dinâmica (`window.__forceRain(true/false)` em dev) pode deixar a cena inteira acinzentada por
20-90s — não confundir com bug de renderização antes de descartar isso. Se o usuário reportar
"manchas pretas no chão" de novo, checar primeiro se não é a chuva (lab-87 já ajustou
`shadowGenerator.bias`/`normalBias` pra shadow acne, sem confirmação visual completa).

**Pendência de verificação (lab-73)**: chapéu remoto foi confirmado ao vivo em duas abas; arma/
efeito de ataque compartilhado e colisão jogador-jogador só foram verificados por leitura de
código + build limpo, não ao vivo — ver `labs/lab-73-multiplayer-visual-e-personalizacao/
CONTEXT.md` pra detalhes.

Outros pedidos pendentes, sem mudança: (1) confirmar se a recompensa em moeda do combate atualiza
o HUD; (2) legibilidade de fonte — lab-87 aplicou `READABILITY_SCALE = 1.4` pra TODO aparelho
(antes só celular ganhava aumento); se voltar a ser reportada como insuficiente mesmo assim, o
próximo passo é revisar CONTRASTE (`outlineWidth`/`outlineColor`), não aumentar o tamanho de novo.

**Frentes de profissionalização ainda não construídas** (monitoramento de erro + analytics
básico concluídos no lab-84): (1) code-splitting de `World3D.tsx` (chunk de ~898KB/194KB gzip
depois do lab-87 separar `studentFigure.ts` — melhorou incidentalmente, mas /familia/termos/
privacidade ainda não carregam Babylon algum, que é o que G12 pede de verdade); (2) auditoria de
acessibilidade WCAG AA sistemática (além do item de contraste de fonte acima). Ambos ficam atrás
da prioridade de escala/viabilidade (`05-escala-e-viabilidade.md`, seção 7 itens 8 e 9).

**Módulos novos do lab-87** (útil pra quem for mexer em avatar/cosméticos): `world3d/
studentFigure.ts` tem a lógica de montar/vestir o boneco (extraída de `World3D.tsx` — importada
por ele E por `world3d/AvatarPreview3D.tsx`, o preview 3D da lojinha). Qualquer mudança na
aparência do boneco (novo chapéu, nova peça) deve ir em `studentFigure.ts`, não de volta pra
`World3D.tsx` — senão quebra o `lazy()` da lojinha de novo (ver `labs/lab-87-.../CONTEXT.md`,
seção "Decisões técnicas", pra entender por quê).

Para retomar o trabalho numa nova sessão, leia primeiro
`labs/lab-128-pote-moedas-marte/CONTEXT.md` (último laboratório concluído — pote de 10 moedas
aparece na Estação Alienígena de Marte ao vencer todos os inimigos; leia também o "Achado real na
verificação ao vivo" nesse CONTEXT.md — o corpo físico do avatar e o visual podem ficar
DESSINCRONIZADOS numa viagem de foguete se não segurar W tempo suficiente pro pouso terminar de
verdade; sempre conferir `avatarCollider.position` contra `window.__playerFigure.root.
getAbsolutePosition()` antes de confiar num pouso em testes futuros). Vem de um backlog maior
discutido em chat com o usuário, ainda não formalizado em labs: mobília desbloqueada por planeta
conquistado, persistência de "Minha Casa" pra assinante (arquitetural, G6 do doc de escala),
cronômetro de sobrevivência em Mercúrio/Netuno, e outras ideias de engajamento (login diário,
baús, cartão-postal colecionável). Sem prioridade única — perguntar ao usuário antes de escolher.
Antes desse, `labs/lab-127-escolinhas-planetas-expandidas/CONTEXT.md` (os 6 planetas-destino do
Sistema Solar agora têm 6 escolinhas de astronomia cada, em vez de 1). Antes desse,
`labs/lab-126-moeda-bonus-assinante/CONTEXT.md` (assinantes ganham 1,5× nas moedas de missão,
nunca XP; **com isso, o backlog original de `prompt.md` §6 é P0/P1/P2 completo**). Antes desse,
`labs/lab-125-code-splitting-studentfigure/CONTEXT.md` (resultado
NEGATIVO testado e revertido: converter `@babylonjs/core` pra imports individuais piorou o
tamanho total do bundle em vez de melhorar, ~4,31MB → ~5,85MB; documentado pra ninguém tentar essa
mesma técnica de novo sem saber que já foi medida e descartada). Antes desse,
`labs/lab-124-corrige-morros-invisiveis-de-vez/CONTEXT.md` (retomada do bug de morros invisíveis do
lab-95: `twoSidedLighting` + normais degeneradas corrigidas, ambas com evidência concreta;
**confirmação definitiva ainda depende do usuário testar de novo no aparelho Android/Chrome onde
viu o problema** — perguntar se ainda acontece antes de investigar mais fundo). Antes do lab-124,
`labs/lab-123-casa-interior-3d/CONTEXT.md` ("Minha Casa" virou interior 3D andável de verdade —
leia também a "Nota de processo" nesse CONTEXT.md sobre um sub-agente que não respeitou uma
instrução de só investigar, cujo código foi integralmente revisado antes de aceitar), antes desse
`labs/lab-122-lojinha-avatar-texturas-exclusivas/CONTEXT.md` (itens exclusivos da lojinha
de avatar com textura/estilo real), `labs/lab-121-acessibilidade-teclado-zoom/CONTEXT.md`
(navegação por teclado/leitor de tela nos 12 painéis 2D do jogo, Esc/foco/`inert`; zoom de fonte já
conforme, sem mudança de código), `labs/lab-120-auditoria-acessibilidade-wcag/CONTEXT.md`
(auditoria sistemática de
acessibilidade WCAG AA em `index.css`: contraste de cor e alvo de toque 44×44px, tudo corrigido) e
`labs/lab-119-relatorio-semanal-email/CONTEXT.md` (relatório semanal de progresso por e-mail, Fase
F do plano comercial; tudo construído e deployado em produção, só falta o usuário configurar
`RESEND_API_KEY` pro envio de verdade funcionar). Itens de backlog em aberto continuam os mesmos de
antes (todos esperando ação do usuário, sem mudança nestes quatro últimos laboratórios). Lembrar
também da correção de infraestrutura registrada acima ("Correção de produção fora de um
laboratório formal") — domínio do Cloudflare Pages adicionado aos domínios confiáveis do Neon
Auth. **Deploy real (Vercel) pendente**: usuário pediu publicar
em produção durante o lab-113 — deploy direto no Vercel (domínio real) falhou com "Not authorized"
(mesma restrição de CLI do lab-104: sessão consegue LER o projeto Vercel, não consegue fazer
deploy nele — provável limite de segurança da integração, não uma configuração errada). Cloudflare
Pages paralelo (lab-109, https://missao-aprender-jogo.pages.dev) foi atualizado pela última vez ao
final do lab-114 — ainda não inclui as escolinhas/nível mínimo deste laboratório (redeploy pendente
se o usuário quiser esse ambiente atualizado). O deploy real continua exigindo o usuário rodar
`npx vercel --prod --yes` na própria máquina, ou configurar os secrets do lab-104 e mesclar o PR
`#8`. Lembrar também que
`labs/lab-104-deploy-automatico-ci/CONTEXT.md` continua com pendências do
usuário: secrets `VERCEL_TOKEN`/`CLOUDFLARE_API_TOKEN` e merge do PR `#8` ainda não feitos. Se for
mexer em multiplayer/escala,
`docs/prompts/05-escala-e-viabilidade.md` (leia o adendo no topo primeiro — os números do corpo do
documento estão desatualizados em 20x, ver `labs/lab-86-correcao-orcamento-cota/CONTEXT.md`).
