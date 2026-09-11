# Missao Aprender - Backlog ampliado de jogabilidade, social seguro e qualidade 3D

Data: 2026-09-11
Branch base: `main`, apos lab-176 mergeado. No momento desta escrita, o lab-177 estava em andamento
em outro branch/worktree.

Este documento amplia `docs/growth-retention-monetization-backlog.md` com foco em tres perguntas:

1. Quais elementos jogaveis de produtos de sucesso podem aumentar retencao infantil?
2. Quais problemas de qualidade hoje prejudicam a percepcao de "jogo de verdade"?
3. Como evoluir social/chat/ranking sem destruir a promessa de seguranca para responsaveis?

Regra inegociavel mantida: aprendizagem, progresso, cooperacao e exploracao continuam gratis; a
crianca nao deve receber pressao de compra; seguranca infantil vale mais que copiar mecanicas de
produtos maiores.

## 1. Pesquisa de mercado e padroes de produtos vencedores

| Produto / referencia | O que retem criancas | O que o responsavel tolera/valoriza | Implicacao para Missao Aprender |
| --- | --- | --- | --- |
| Roblox | Avatar, social, mundos variados, camera familiar, controle simples, UGC constante, comunicacao. | Controles parentais, filtros de texto, restricoes por idade/consentimento, marca forte apesar de riscos publicos. | Copiar camera/controle/socialidade, nao copiar abertura social sem infraestrutura de seguranca. |
| Minecraft / Minecraft Education | Criatividade, exploracao, colaboracao, objetos que reagem, problemas resolvidos dentro do mundo. | Ambiente estruturado, educacao visivel, mundos seguros/gerenciados em contexto escolar/familiar. | Planetas precisam ser brinquedos interativos com puzzles ambientais, nao vitrines estaticas. |
| Toca Boca World | Playset digital: tocar objetos, criar historias, customizar espacos/personagens, descobrir segredos. | Jogo infantil sem chat com estranhos, foco em criatividade e seguranca. | Interacoes pequenas, densas e seguras podem reter sem chat livre. |
| Prodigy | Fantasia, batalha/quests, recompensa e conteudo educativo integrado ao loop. | Conteudo educacional gratuito e assinatura opcional para familias. | Aprendizagem deve estar embutida na acao, com valor adulto separado. |

Fontes consultadas:

- Roblox Help: menores tem filtros mais restritos para conteudo inadequado e informacao pessoal; chat
  depende de configuracoes/idade/consentimento em cenarios recentes. Fonte:
  https://en.help.roblox.com/hc/en-us/articles/43611824582292-How-to-chat-on-Roblox
- Roblox Creator Hub: texto de usuario deve passar por filtro para impedir linguagem inadequada e PII.
  Fonte: https://create.roblox.com/docs/production/promotion/text-filtering
- Roblox Safety/Civility: comunicacao e experiencias passaram a ser segmentadas por idade, com
  verificacao e trusted connections. Fonte:
  https://about.roblox.com/newsroom/2025/11/roblox-requires-age-checks-limits-minor-and-adult-chat
- Minecraft Education: plataforma imersiva de aprendizagem no universo Minecraft. Fonte:
  https://education.minecraft.net/en-us
- Microsoft Education Blog: game-based learning conecta paixao do aluno com proposito por criatividade,
  colaboracao e exploracao. Fonte:
  https://www.microsoft.com/en-us/education/blog/2025/07/bring-learning-to-life-with-minecraft-education/
- Toca Boca: foco em construir mundo, criar personagens e contar historias. Fonte:
  https://www.tocaboca.com/kids/toca-boca-world
- Prodigy: math game gratuito para educadores, com membership opcional de pais. Fonte:
  https://www.prodigygame.com/
- Babylon.js: otimizacao de cena inclui tecnica como instancias, congelamento cuidadoso de meshes e
  reducao de trabalho por frame. Fonte: https://doc.babylonjs.com/features/featuresDeepDive/scene/optimize_your_scene

## 2. Diagnostico de oportunidades

### 2.1 Qualidade de movimento

Problema reportado: o boneco parece fazer "moonwalk". Em jogo 3D infantil, isso e um bug de
credibilidade: a crianca sente que o personagem esta deslizando, nao caminhando.

Hipotese tecnica: a animacao de pernas/figura esta dirigida por tempo ou estado de movimento, mas
nao pela distancia real percorrida na tangente do planeta. Quando a velocidade fisica, direcao do
corpo e fase da passada nao batem, aparece foot sliding.

Direcao recomendada:

- Dirigir fase da caminhada por distancia percorrida no solo, nao apenas por tempo.
- Alinhar tronco/rotacao do avatar com velocidade tangencial real, nao com ultimo input bruto.
- Separar idle, walk, run, jump, falling, landing, driving e rocket.
- Adicionar aceleracao/desaceleracao visual curta para entrada/saida de movimento.
- Emitir pequenos efeitos de pe/poeira/grama quando uma passada toca o solo, se FPS permitir.
- Medir `moonwalk_visible_rate` em QA manual: 0 casos obvios em 3 minutos de andar/correr/subir
  montanha no planeta principal e em pelo menos 1 planeta secundario.

### 2.2 Planetas nao-terra

Problema: planetinhas visitaveis ainda parecem pobres/estaticos em relacao ao planeta principal.

Direcao recomendada:

- Cada planeta precisa de pelo menos 1 NPC memoravel, 1 objeto fisico/interativo, 1 segredo e 1
  desafio educativo ambiental.
- Orbita precisa ter leitura visual: aneis, satelites, asteroides, cometas, poeira espacial, objetos
  em alto-relevo e landmark que a crianca reconhece de longe.
- Objetos em relevo devem ter colisao/visual alinhados e leitura de escala. Nao basta textura plana.
- Cada planeta deve responder a "por que eu voltaria aqui?" com recompensa/descoberta concreta.

### 2.3 Efeitos visuais e game feel

Elementos interessantes para crianca, desde que leves:

- Poeira/folhas/estrelas pequenas no pulo, pouso e corrida.
- Brilho discreto em objeto interativo.
- Pulso visual em recompensa, moeda, badge e coletavel.
- Trails curtos para foguete, cometas e orbitais.
- Rim light/atmosfera em planetas para dar volume.
- Reacao fisica leve em objetos tocados: balancar, girar, acender, tocar som curto.
- NPC com idle animado, olhar para o jogador e balao catalogado.
- Feedback de erro positivo em puzzle: vermelho/ruido curto sem punir.

Guardrail: efeito visual nao pode piorar FPS em tablets de entrada. Todo efeito novo precisa de
modo reduced quality ou budget claro.

### 2.4 FPS baixo

Hipoteses provaveis no jogo atual:

- Muitos meshes/props individuais.
- Shadow caster/render list crescendo ou nao sendo limpo.
- Materiais/texturas duplicados.
- Calculos por frame em objetos que poderiam ficar congelados.
- Falta de LOD/impostor para objetos distantes.
- Particulas/SSAO/sombras pesando em mobile.
- Planetas/objetos fora de foco ainda custando CPU/GPU.

Direcao recomendada:

- Criar primeiro um lab de medicao de FPS e draw calls antes de grandes otimizacoes.
- Converter grupos repetidos para thin instances/instances quando nao precisam de estado unico.
- Congelar materiais/world matrices de props estaticos quando seguro.
- Usar LOD/impostores para props distantes e planetas secundarios.
- Reduzir/limitar shadow casters; auditar limpeza de render list.
- Culling agressivo por planeta/bioma/inside house.
- Object pooling para efeitos curtos.
- Preset mobile: menos particulas, sombras menores, materiais mais simples, densidade de props menor.

## 3. Chat, ranking e supervisao parental

### 3.1 O que o mercado ensina

Roblox mostra que comunicacao aumenta retencao, mas tambem mostra que isso exige infraestrutura de
seguranca, idade, consentimento, filtros, restricoes e monitoramento. Nao e apenas "liberar texto e
bloquear palavroes". O proprio modelo Roblox filtra PII e linguagem inadequada, e comunicacao de
menores e cada vez mais condicionada a idade/controles.

### 3.2 Decisao recomendada para Missao Aprender

Nao remover supervisao parental do chat agora. Para uma crianca de ~10 anos, chat livre com filtro
local por lista de palavras nao e suficiente, porque:

- criancas contornam blocklist com espacos, numeros, acentos, emojis e grafias criativas;
- risco principal nao e so palavrao: e PII, convite externo, grooming, bullying, escola/endereco,
  telefone, redes sociais, combinacoes para burlar filtro;
- se filtrar apenas no destino, conteudo inadequado ainda trafega e pode vazar por logs/debug;
- blocklist exige manutencao continua e varias linguas/girias;
- a promessa de valor para pais hoje e "sem chat livre"; mudar isso altera posicionamento e risco.

O que pode mudar com menor risco:

1. Ranking: pode deixar de pedir supervisao se for somente jogo, sem contato social, sem PII, sem
   horario exato, sem nome real e com apelidos gerados/seguros. Ranking global ainda deve evitar
   criancas identificaveis.
2. Chat fechado: pode deixar de pedir supervisao em modo catalogado basico, se nao permite texto
   livre nem dados pessoais e se o responsavel ainda pode desativar multiplayer.
3. Chat livre: so como pesquisa/lab futuro, com parent opt-in, amizade confirmada, rate limit,
   filtro servidor, filtro cliente, bloqueio de PII, denuncia/bloqueio, auditoria e kill switch.

### 3.3 Caminho seguro para comunicacao mais expressiva

Em vez de chat livre imediato, evoluir em degraus:

- Degrau 1: quick chat contextual, radial e mais rapido, com frases por situacao do jogo.
- Degrau 2: frase montavel por slots seguros: "Vamos para [planeta]" / "Preciso de ajuda em
  [missao]" / "Gostei do seu [item]".
- Degrau 3: emotes e reacoes 3D visiveis no mundo, com cooldown.
- Degrau 4: chat de amigos aprovados com allowlist de palavras/slots, nao texto livre.
- Degrau 5: prototipo de texto livre parent-opt-in com filtro robusto e somente se pesquisas
  mostrarem que catalogo expandido nao resolve a frustracao.

### 3.4 Se um filtro de palavras for pesquisado

Um banco de palavras inadequadas pode existir como camada adicional, mas nao como unica protecao.
Requisitos minimos:

- Rodar no servidor antes de broadcast; o cliente tambem pode prever bloqueio, mas servidor decide.
- Normalizar lower-case, acentos, leetspeak, repeticoes, pontuacao, espacos e separadores.
- Bloquear PII: telefone, e-mail, URL, arroba de rede social, endereco, escola, cidade/bairro quando
  possivel, idade real.
- Blocklist em portugues e ingles; categorias separadas por severidade.
- Allowlist/slot de palavras seguras para modo infantil.
- Nunca armazenar texto livre bruto em analytics.
- Rate limit, cooldown, mute temporario, report/block, kill switch global.
- Mensagem bloqueada deve aparecer para remetente como "essa mensagem nao pode ser enviada", sem
  mostrar a palavra proibida para outros.

## 4. Backlog ampliado

### Lab 191 - Auditoria de FPS, draw calls e custo por sistema

- Problema / hipotese: FPS baixo pode estar vindo de muitos meshes, sombras, materiais ou loops por
  frame. O jogo ja tem instrumentacao/perf HUD e `window.__perf`; o proximo passo e transformar isso
  em auditoria repetivel de gargalos, nao criar outro overlay concorrente.
- Usuario beneficiado: crianca em aparelho modesto.
- Escopo: reaproveitar e/ou estender a instrumentacao existente para registrar FPS medio/p5, draw
  calls quando disponivel, meshes ativos, materiais, shadow casters, particulas e tempo de frame
  aproximado; criar roteiro de teste para planeta principal, loja, casa, Marte e planetas
  secundarios; documentar se o contador atual deve continuar visivel em producao ou virar flag de
  diagnostico, sem contradizer decisao anterior sem justificativa.
- Fora de escopo: otimizar tudo no mesmo lab.
- Criterios de aceite: baseline registrado em `CONTEXT.md`; gargalos priorizados; nenhuma duplicacao
  de overlay/perf HUD; qualquer mudanca de visibilidade do contador e explicitamente justificada.
- Metricas esperadas: FPS medio/p5, tempo ate primeira interacao, abandono de carregamento.
- Riscos: ferramenta de medicao afetar FPS; medir so desktop potente.
- Prioridade: P0.

### Lab 192 - Locomocao sem moonwalk

- Problema / hipotese: o avatar desliza porque passada, velocidade e direcao visual nao estao
  sincronizadas.
- Usuario beneficiado: crianca.
- Escopo: recalibrar animacao de caminhada/corrida para fase baseada em distancia no solo; alinhar
  corpo com velocidade tangencial; adicionar transicoes idle/walk/run/jump/landing; testar planeta
  principal, montanha e planeta secundario.
- Fora de escopo: trocar modelo 3D inteiro, mocap complexo, novo sistema de combate.
- Criterios de aceite: sem moonwalk obvio em caminhada, corrida, curvas e subidas; pulo e aterrissagem
  nao quebram pose; camera/controle continuam funcionais.
- Metricas esperadas: `time_to_first_control`, feedback de playtest, checklist visual de moonwalk.
- Riscos: quebrar gravidade radial; regressao em carro/foguete/casa.
- Prioridade: P0.

### Lab 208 - Movimento mais rapido e responsivo

- Problema / hipotese: a jogabilidade precisa parecer mais rapida e viva. Se o avatar anda devagar
  demais, a crianca sente pouca energia, demora para chegar nos objetivos e perde vontade de
  explorar.
- Usuario beneficiado: crianca.
- Escopo: aumentar velocidade base e/ou aceleracao do avatar, revisar sprint, pulo, desaceleracao,
  atrito e camera para manter controle; calibrar velocidade diferente para caminhada, corrida,
  parkour e estados especiais; atualizar tutorial/hints se comandos mudarem.
- Fora de escopo: vender velocidade, booster pago, vantagem premium, redesenhar todo controlador.
- Criterios de aceite: avatar se move mais rapido sem moonwalk obvio; curvas continuam controlaveis;
  pulo/queda nao quebram gravidade radial; camera acompanha sem enjoo; parkours existentes ficam
  jogaveis na nova velocidade.
- Metricas esperadas: queda em `time_to_first_fun`, maior exploracao por sessao, feedback de
  playtest sobre "ficou mais divertido/rapido".
- Riscos: aumentar velocidade e atravessar colisores; piorar camera; dificultar criancas pequenas.
- Prioridade: P0/P1.

### Lab 209 - Hub de mini-jogos e teleport por botao no chao

- Problema / hipotese: mini-jogos com entrada clara aumentam retencao porque crianca entende rapido
  "onde tem jogo" e pode repetir desafios curtos sem procurar pelo mundo todo.
- Usuario beneficiado: crianca recorrente.
- Escopo: criar uma area/hub de jogos com botoes no chao/pedestais; ao pisar/pressionar interacao,
  a crianca seleciona um mini-jogo e e conduzida/teleportada para a area correta; incluir explicacao
  curta, contagem regressiva e retorno ao hub.
- Fora de escopo: matchmaking competitivo, monetizacao, leaderboard global aberto, UGC.
- Criterios de aceite: ao menos 2 mini-jogos existentes/novos aparecem no hub; entrada e saida sao
  claras; nenhum botao fica escondido/enterrado; mobile tem toque equivalente; progresso educacional
  e recompensas continuam gratis.
- Metricas esperadas: `minigame_started`, `minigame_completed`, repeticao por sessao, retorno D1/D7.
- Riscos: teleport quebrar estado de camera/fisica; hub poluir mapa; crianca ignorar quests
  educativas.
- Prioridade: P1.

### Lab 210 - Parkour arcade com argolas, tesouros e power-ups justos

- Problema / hipotese: parkour com objetivos visuais claros (argolas, tesouros, trofeus) transforma
  movimentacao em jogo repetivel, nao apenas travessia.
- Usuario beneficiado: crianca.
- Escopo: criar/desenvolver desafios de parkour com argolas para atravessar, tesouros/coletaveis em
  rota, checkpoints, cronometro opcional, trofeu de conclusao, boost temporario de velocidade e pulo
  alto dentro da arena. Recompensas devem ser moedas/badges/cosmeticos conquistaveis jogando.
- Fora de escopo: boost pago, pay-to-win, gacha, recompensa aleatoria paga, ranking global agressivo.
- Criterios de aceite: desafio e completavel sem assinatura; boost so vale na arena/mini-jogo; queda
  reseta em checkpoint sem punir; feedback visual/sonoro claro; trofeu aparece no album/conquistas
  quando aplicavel.
- Metricas esperadas: conclusoes de parkour, tentativas por sessao, retry sem abandono, trofeus
  conquistados, D7 de quem joga mini-jogos.
- Riscos: dificuldade alta frustrar; boost quebrar mundo aberto se vazar para fora da arena; queda de
  FPS por efeitos/coletaveis.
- Prioridade: P1.

### Lab 211 - Trofeus e sala/album de mini-jogos

- Problema / hipotese: trofeus visiveis criam meta de retorno e orgulho, especialmente quando ligados
  a desafios curtos de habilidade.
- Usuario beneficiado: crianca.
- Escopo: adicionar trofeus por mini-jogo/parkour, exibicao no album/conquistas e possivelmente na
  casa; separar trofeus de habilidade/participacao sem competicao toxica.
- Fora de escopo: ranking pago, comparacao agressiva, trofeu bloqueado por assinatura.
- Criterios de aceite: trofeus aparecem apos conclusao real; crianca entende proximo trofeu; casa ou
  album mostra conquistas sem expor PII; assinatura nao bloqueia trofeu.
- Metricas esperadas: `trophy_earned`, retorno apos ver album, conclusao de mini-jogos.
- Riscos: ansiedade de completismo; excesso de trofeus diluir valor.
- Prioridade: P1.

### Lab 202 - Objetos do mundo alinhados ao relevo

- Problema / hipotese: varios objetos do mapa estao parcialmente enterrados ou atravessando o
  planeta, como piscina, casas, trechos de estrada e outros elementos. Isso indica bug de ancoragem
  no relevo/esfera e quebra a percepcao de qualidade mais do que falta de features novas.
- Usuario beneficiado: crianca.
- Escopo: auditar objetos estaticos principais do planeta (casas, piscina, estrada, loja, escolas,
  props grandes e landmarks); padronizar helper de posicionamento/orientacao pela normal radial e
  altura real do terreno; corrigir offsets por categoria; adicionar checklist visual com screenshots
  antes/depois.
- Fora de escopo: redesenhar todos os assets, trocar sistema de terreno, adicionar novos biomas.
- Criterios de aceite: nenhum objeto critico fica enterrado ou flutuando de forma obvia; estrada
  acompanha o relevo sem um lado ficar abaixo da terra; piscina/casas ficam legiveis acima da
  superficie; fisica e trigger de interacao continuam alinhados ao visual.
- Metricas esperadas: reducao de bugs visuais reportados; melhora de playtest qualitativo; menos
  abandono por percepcao de produto quebrado.
- Riscos: corrigir offset visual e desalinha collider/trigger; aumentar custo de CPU se calcular
  terreno por frame em vez de build time; mexer em objetos demais num lab.
- Prioridade: P0.

### Lab 203 - Pet maior, visivel e com troca clara

- Problema / hipotese: o pet atual parece pequeno e ainda fica enterrado/abaixo da superficie em
  alguns momentos. Como pet e um dos loops emocionais de retencao, ele precisa ser facil de ver,
  acompanhar e trocar.
- Usuario beneficiado: crianca.
- Escopo: aumentar escala visual do pet com limite por especie; corrigir posicionamento para ficar
  sempre acima do solo pela normal radial/terreno local; revisar follow offset ao lado/atras do
  avatar; melhorar painel de pet para escolher/trocar pet equipado com feedback claro.
- Fora de escopo: novos pets pagos, combate de pet, IA complexa.
- Criterios de aceite: pet nao fica enterrado no planeta principal nem em planetas secundarios/casa
  quando aplicavel; pet fica visivel ao lado do avatar sem atrapalhar camera; crianca consegue
  escolher outro pet equipado e ver a troca imediatamente; mobile continua legivel.
- Metricas esperadas: `pet_interaction_rate`, retorno D1/D7 de quem equipa pet, feedback de playtest
  sobre apego ao pet.
- Riscos: pet grande demais atrapalhar camera/interacao; corrigir follow quebrar colisao; troca de
  pet confundir com compra.
- Prioridade: P0/P1.

### Lab 206 - Pets premium de qualidade, roupas e mascaras

- Problema / hipotese: pets podem ser um dos maiores motores emocionais de retencao infantil. O
  catalogo atual precisa evoluir de "bicho acompanhante" para companheiro colecionavel, com grafico
  mais completo e personalizacao visual propria.
- Usuario beneficiado: crianca e responsavel.
- Escopo: ampliar catalogo de pets com modelos/figuras mais ricos, silhuetas diferentes e animacoes
  simples; adicionar cosmeticos de pet como roupas, coleiras, chapeus, capas e mascaras; criar tela
  clara para escolher pet e acessorios; definir quais itens sao ganhos jogando e quais podem ser
  cosmeticos premium da familia.
- Fora de escopo: vantagem de gameplay, poder especial pago, gacha/loot box, pet aleatorio pago,
  troca de pets entre criancas.
- Criterios de aceite: crianca consegue escolher pet e acessorio com preview claro; itens premium
  nao afetam aprendizado/progresso/cooperacao; cada pet tem leitura visual distinta em jogo; mobile
  continua performatico; catalogo evita itens assustadores/ofensivos.
- Metricas esperadas: `pet_interaction_rate`, `pet_equipped_rate`, `pet_cosmetic_preview_rate`,
  retorno D1/D7 de quem customiza pet, interesse parental em cosmeticos seguros.
- Riscos: aumentar meshes/materials e derrubar FPS; pet/acessorio cobrir avatar/camera; personalizacao
  parecer pressao de compra; catalogo virar bagunca visual.
- Prioridade: P1, apos Lab 203 corrigir tamanho/posicionamento do pet atual.

### Lab 207 - Troca segura de nickname

- Problema / hipotese: identidade e apelido sao parte central do apego da crianca ao avatar. Se a
  crianca se arrepende do nick inicial ou quer renovar a identidade, precisa conseguir trocar sem
  expor nome real, telefone, escola ou linguagem inadequada.
- Usuario beneficiado: crianca e responsavel.
- Escopo: adicionar opcao de mudar nickname com gerador seguro e/ou escolha guiada por partes
  aprovadas (adjetivo + tema + numero); bloquear texto livre com PII/palavras inadequadas; aplicar
  limite de frequencia; atualizar HUD, ranking, perfil publico, amigos e multiplayer; registrar
  decisao no `CONTEXT.md`.
- Fora de escopo: nome real, bio livre, imagem enviada, nickname totalmente livre sem filtro,
  historico publico de nomes antigos.
- Criterios de aceite: crianca consegue trocar nick sem criar conta adulta; nick novo nunca carrega
  email, telefone, endereco, escola, palavroes ou dados pessoais; ranking/amigos/multiplayer mostram
  o novo nick; ha limite/cooldown para evitar spam; responsavel entende que o apelido continua
  seguro.
- Metricas esperadas: `nickname_changed`, retencao D1/D7 de criancas que personalizam identidade,
  reducao de abandono no onboarding se o nome inicial nao agradar.
- Riscos: filtro insuficiente; nick usado para bullying/mensagem indireta; trocar muitas vezes
  confundir amigos; atualizar backend/localStorage de forma inconsistente.
- Prioridade: P0/P1.

### Lab 204 - Ceu escuro no espaco e claro na atmosfera

- Problema / hipotese: ao viajar de foguete entre planetas, a cor do espaco precisa ficar escura
  para comunicar que a crianca saiu da atmosfera. Ao entrar/pousar na atmosfera, o ceu deve voltar
  a ficar claro. Se o ceu fica sempre claro no voo espacial, a fantasia de viagem entre planetas
  perde impacto.
- Usuario beneficiado: crianca.
- Escopo: criar transicao visual de ambiente por estado do foguete: superficie/atmosfera com ceu
  claro, voo espacial com fundo escuro/estrelado, entrada na atmosfera voltando gradualmente para
  ceu claro do planeta de destino. Rever cor de clearColor/skybox/fog/iluminacao sem quebrar HDRI,
  planetas secundarios ou casa.
- Fora de escopo: simulacao astronomica real, cutscene longa, novo sistema de clima espacial.
- Criterios de aceite: durante voo longe dos planetas o fundo fica escuro e legivel como espaco;
  ao aproximar/entrar na atmosfera do destino, a transicao retorna para ceu claro sem flash brusco;
  voltar ao planeta principal restaura o ambiente correto; mobile nao perde performance.
- Metricas esperadas: melhora de playtest qualitativo sobre "parece viagem espacial"; sem queda de
  FPS perceptivel; menos confusao de orientacao durante voo.
- Riscos: alterar clearColor e afetar outros modos; escurecer demais objetos/rocket; conflito com
  clima/chuva/fog existentes.
- Prioridade: P0/P1.

### Lab 205 - Preview fixo na lojinha durante scroll

- Problema / hipotese: ao navegar em abas com muitos itens da lojinha, como calcas/roupas, o preview
  do avatar rola para cima junto com o conteudo. A crianca escolhe sem ver imediatamente como o
  boneco vai ficar, reduzindo confianca na customizacao.
- Usuario beneficiado: crianca.
- Escopo: manter o preview 3D do avatar visivel enquanto a lista de itens rola; avaliar layout com
  coluna fixa/sticky no desktop e preview compacto/sticky no mobile; garantir que trocar item
  atualize o preview instantaneamente; preservar acessibilidade e performance do canvas.
- Fora de escopo: novo catalogo de cosmeticos, checkout, mudanca de entitlement.
- Criterios de aceite: em abas longas, o usuario consegue rolar calcas/roupas/chapeus sem perder o
  preview; o preview nao cobre botoes nem itens; mobile continua usavel; foco/teclado e botao fechar
  continuam funcionando; nao ha regressao no bug corrigido do lab 176.
- Metricas esperadas: aumento de `avatar_customization_rate`, menos abandono da lojinha, feedback de
  playtest sobre entender a aparencia antes de equipar/comprar.
- Riscos: canvas sticky consumir FPS; layout ficar apertado em telas pequenas; sobreposicao com tabs.
- Prioridade: P0/P1.

### Lab 193 - Otimizacao de draw calls e props repetidos

- Problema / hipotese: o mundo tem muitos objetos repetidos que poderiam ser instanciados/congelados.
- Usuario beneficiado: crianca em mobile/tablet.
- Escopo: identificar top grupos repetidos; converter 1 ou 2 grupos para thin instances/instances;
  congelar matrizes/materiais de props estaticos quando seguro; medir antes/depois.
- Fora de escopo: reescrever toda cena ou reduzir qualidade visual sem criterio.
- Criterios de aceite: FPS ou draw calls melhoram no roteiro do lab 191; sem perder colisao/interacao
  de objetos que precisam ser individuais.
- Metricas esperadas: draw calls, active meshes, FPS p5.
- Riscos: instanciar objeto que precisava de estado unico; bugs de shadow/culling.
- Prioridade: P0/P1.

### Lab 194 - Quick chat contextual sem supervisao pesada

- Problema / hipotese: a reclamacao sobre chat vem de baixa expressividade, nao necessariamente de
  necessidade de texto livre.
- Usuario beneficiado: crianca.
- Escopo: transformar chat catalogado em radial/contextual com frases por proximidade/estado:
  planeta atual, missao, casa, pet, corrida, ajuda, elogio, convite. Avaliar se esse modo ainda
  precisa do mesmo portao parental que chat/ranking atual.
- Fora de escopo: texto livre, PII, DM, voz.
- Criterios de aceite: nenhuma mensagem arbitraria; servidor valida id; experiencia mais rapida; se
  remover portao parental, manter toggle adulto para desativar multiplayer/chat.
- Metricas esperadas: uso de chat por sessao, respostas recebidas, retencao de criancas com amigos.
- Riscos: frases permitirem combinacoes indevidas; spam.
- Prioridade: P1.

### Lab 195 - Ranking seguro sem friccao excessiva

- Problema / hipotese: ranking pode ser menos arriscado que chat se mostrar apenas dados de jogo e
  apelidos seguros. Pedir supervisao para ranking pode estar adicionando friccao desnecessaria.
- Usuario beneficiado: crianca recorrente.
- Escopo: auditar ranking atual; remover ou suavizar parental gate se ranking nao expuser PII,
  horario, localizacao, chat ou contato; limitar a apelido gerado, avatar, XP/moedas/conquistas.
- Fora de escopo: ranking global competitivo agressivo, comentarios, perfil aberto sem amizade.
- Criterios de aceite: nenhum nome real; sem botao de contato direto; responsavel entende e pode
  desativar social/multiplayer.
- Metricas esperadas: ranking_open_rate, retorno D1/D7, guardrail de denuncias/abuso.
- Riscos: comparacao social; crianca tentar otimizar por moedas em vez de aprender.
- Prioridade: P1.

### Lab 201 - Modal de ranking nao bloqueia arrasto do planeta

- Problema / hipotese: quando a modal de ranking esta aberta, a area livre do planeta a direita nao
  aceita clique/arrasto. A modal fica exclusiva e sequestra o input do canvas, prejudicando camera,
  exploracao e sensacao de controle.
- Usuario beneficiado: crianca.
- Escopo: ajustar comportamento de overlay/modal do ranking para que somente o painel visivel do
  ranking capture clique/scroll/toque; a area fora do painel deve permitir drag/camera do planeta
  quando visualmente livre. Revisar `pointer-events`, tamanho do overlay, backdrop, foco e eventos
  de mouse/touch.
- Fora de escopo: redesenhar ranking, mudar dados de ranking, liberar chat/ranking sem auditoria de
  seguranca.
- Criterios de aceite: com ranking aberto, clicar/arrastar dentro do painel ainda rola/seleciona o
  ranking; clicar/arrastar na area livre do planeta gira/controla a camera normalmente; fechar a
  modal por botao/atalho continua funcionando; mobile nao perde toque do painel nem do mundo.
- Metricas esperadas: reducao de `camera_friction_events`; menos abandono/fechamento acidental do
  ranking; QA manual desktop/mobile.
- Riscos: clique atravessar modal em areas que deveriam ser bloqueadas; foco/acessibilidade do
  dialogo ficar inconsistente; toque mobile conflitar com scroll do painel.
- Prioridade: P0/P1.

### Lab 196 - NPCs vivos nos planetas secundarios

- Problema / hipotese: planetas sem NPC parecem vazios e reduzem vontade de explorar/voltar.
- Usuario beneficiado: crianca.
- Escopo: 1 NPC por planeta secundario prioritario, com idle, olhar para jogador, fala catalogada,
  mini pedido/quest ambiental e feedback.
- Fora de escopo: chat livre com NPC, IA generativa, narrativa longa.
- Criterios de aceite: cada NPC tem papel claro; fala segura e curta; pelo menos 1 NPC conecta a
  matematica/logica/leitura.
- Metricas esperadas: `planet_interactions_per_session`, retorno apos visita, conclusao de mini quest.
- Riscos: excesso de texto; NPC decorativo sem funcao.
- Prioridade: P1.

### Lab 197 - Orbitas com objetos em alto-relevo

- Problema / hipotese: orbitas/planetas com objetos fisicos reconheciveis aumentam encanto e
  orientacao espacial.
- Usuario beneficiado: crianca.
- Escopo: adicionar aneis, crateras, rochas, satelites, cometas ou detritos orbitais em relevo real
  para planetas selecionados; garantir culling/LOD; alinhar visual e colisao quando tocavel.
- Fora de escopo: simulacao astronomica perfeita, fisica orbital real complexa.
- Criterios de aceite: objetos sao visiveis de longe, nao quebram FPS, e ao menos alguns sao
  interativos/coletaveis/educativos.
- Metricas esperadas: tempo de exploracao no planeta, interacoes, FPS p5.
- Riscos: poluir cena; derrubar performance; colisoes invisiveis.
- Prioridade: P1.

### Lab 198 - Efeitos visuais de recompensa, movimento e interacao

- Problema / hipotese: pequenos efeitos aumentam sensacao de resposta e prazer sem exigir muito
  conteudo novo.
- Usuario beneficiado: crianca.
- Escopo: pacote leve de efeitos: landing puff, footstep dust/grass, brilho em interativo, pulse de
  recompensa, trail de foguete/cometa, feedback de puzzle.
- Fora de escopo: shader pesado, bloom/orbs decorativos excessivos, particulas sem budget.
- Criterios de aceite: efeitos desligam/reduzem em mobile; nao escondem UI; nao reduzem FPS abaixo
  da meta.
- Metricas esperadas: playtest qualitativo, FPS, interacoes por sessao.
- Riscos: over-polish; queda de performance.
- Prioridade: P1.

### Lab 199 - Prototipo seguro de filtro de chat livre

- Problema / hipotese: se a frustracao com chat continuar apos quick chat contextual, talvez texto
  livre restrito para amigos aprovados aumente retencao. Mas isso so pode ser testado com protecoes
  fortes.
- Usuario beneficiado: crianca com amigos e responsavel.
- Escopo: prototipo desativado por padrao, parent opt-in, somente amigos confirmados, filtro servidor
  com normalizacao, blocklist/PII, rate limit, report/block, kill switch e sem analytics de texto.
- Fora de escopo: liberar globalmente, DM aberto, chat com desconhecidos, armazenar mensagens brutas,
  depender so de filtro cliente.
- Criterios de aceite: mensagens proibidas nao sao transmitidas; PII comum bloqueada; logs nao guardam
  texto livre; responsavel consegue desligar; teste automatizado cobre bypass basico.
- Metricas esperadas: uso seguro, bloqueios por categoria, denuncias, retencao de amigos.
- Riscos: alto risco reputacional/compliance; blocklist incompleta; contorno por linguagem criativa.
- Prioridade: P2, somente apos Labs 194/195 e pesquisa com responsaveis.

### Lab 200 - Extensao de missoes fisicas por planeta

- Problema / hipotese: criancas retem mais quando aprendem mexendo em objetos, nao lendo pergunta
  isolada.
- Usuario beneficiado: crianca e responsavel.
- Escopo: depende do Lab 180 (`docs/growth-retention-monetization-backlog.md`) e nao deve repetir
  sua implementacao. Se o Lab 180 ainda nao existir, executar o 180 primeiro. Se ja existir, ampliar
  com 3 missoes fisicas adicionais por planeta priorizado: empurrar/alinhar objeto, ligar circuito/
  ordem logica, coletar leitura ambiental; cada uma com pergunta curta ou feedback educativo
  integrado.
- Fora de escopo: substituir todo quiz, editor de fases, UGC.
- Criterios de aceite: cada missao tem objeto fisico, objetivo claro, feedback e recompensa gratis.
- Metricas esperadas: conclusao de desafio ambiental, retry sem abandono, D1/D7 de quem completou.
- Riscos: puzzle dificil demais; fisica instavel.
- Prioridade: P1.

## 5. Backlog de pesquisa

### Pesquisa F - Por que a crianca quer chat livre?

- Pergunta: a reclamacao e sobre texto livre, ou sobre o catalogo atual ser lento/pobre?
- Metodo: playtest com consentimento do responsavel, roteiro curto, coleta minima, sem gravar PII e
  sem registrar fala livre da crianca como dado identificavel. Comparar quick chat atual versus mock
  radial/contextual; observar se a crianca consegue convidar, pedir ajuda, elogiar e combinar acao.
- Sucesso: 7/10 criancas dizem que conseguem se comunicar o suficiente sem texto livre.
- Prioridade: P0 antes de qualquer chat livre.

### Pesquisa G - Movimento e controle percebidos

- Pergunta: o moonwalk/camera reduzem confianca no jogo?
- Metodo: mostrar 2 versoes/gravacoes, atual e corrigida; pedir para criancas apontarem qual parece
  mais "jogo de verdade"; medir pedidos de ajuda em controle.
- Sucesso: versao corrigida preferida por maioria clara e menor erro de controle.
- Prioridade: P0.

### Pesquisa H - Elementos de planeta que geram retorno

- Pergunta: NPC, puzzle, colecionavel ou efeito visual gera mais desejo de voltar?
- Metodo: prototipo de 1 planeta com variantes pequenas; perguntar "o que voce quer fazer de novo
  amanha?" e medir interacoes.
- Sucesso: ao menos 2 elementos sao lembrados espontaneamente por 6/10 criancas.
- Prioridade: P1.

## 6. Prompt para Claude executar esta ampliacao

```text
Voce esta no repo suarezrafael/pesquisa, projeto Missao Aprender.

Leia antes de agir:
- README.md
- CLAUDE.md
- labs/CURRENT.md
- docs/prompts/README.md
- docs/prompts/01-seguranca.md
- docs/prompts/02-design-profissional.md
- docs/prompts/03-arquitetura-sistema.md
- docs/growth-retention-monetization-backlog.md
- docs/gameplay-market-expansion-backlog.md
- docs/event-catalog.md
- app/src/data/chatMessages.ts
- app/src/productAnalytics.ts
- app/src/world3d/World3D.tsx nas regioes de movimento, camera, planetas, sombras/props e chat

Regras:
- Nao abrir chat livre no produto padrao.
- Se trabalhar comunicacao, comece por quick chat contextual/radial e validacao servidor por id.
- Se pesquisar filtro de chat livre, deixar desativado por padrao, parent opt-in, somente amigos,
  filtro servidor e kill switch.
- Nao remover supervisao de chat sem uma decisao documentada de seguranca.
- Ranking pode ser reavaliado separadamente se nao expuser PII nem permitir contato.
- Nao adicionar efeitos visuais sem medir FPS.
- Para moonwalk, sincronize animacao com distancia real percorrida no solo e velocidade tangencial.

Ordem recomendada apos o lab atual:
1. Lab 201 - Modal de ranking nao bloqueia arrasto do planeta, por ser bug de input reportado.
2. Lab 202 - Objetos do mundo alinhados ao relevo.
3. Lab 203 - Pet maior, visivel e com troca clara.
4. Lab 204 - Ceu escuro no espaco e claro na atmosfera.
5. Lab 205 - Preview fixo na lojinha durante scroll.
6. Lab 207 - Troca segura de nickname.
7. Lab 206 - Pets premium de qualidade, roupas e mascaras.
8. Lab 208 - Movimento mais rapido e responsivo.
9. Lab 209 - Hub de mini-jogos e teleport por botao no chao.
10. Lab 210 - Parkour arcade com argolas, tesouros e power-ups justos.
11. Lab 211 - Trofeus e sala/album de mini-jogos.
12. Lab 191 - Auditoria de FPS, draw calls e custo por sistema.
13. Lab 192 - Locomocao sem moonwalk.
14. Lab 193 - Otimizacao de draw calls e props repetidos.
15. Lab 194 - Quick chat contextual sem supervisao pesada.
16. Lab 195 - Ranking seguro sem friccao excessiva.
17. Lab 196 - NPCs vivos nos planetas secundarios.
18. Lab 197 - Orbitas com objetos em alto-relevo.
19. Lab 198 - Efeitos visuais de recompensa, movimento e interacao.
20. Lab 200 - Extensao de missoes fisicas por planeta.
21. Lab 199 - Prototipo seguro de filtro de chat livre, somente se pesquisa e responsavel justificarem.

Para cada lab, crie FEATURES.md, mantenha escopo pequeno, rode testes/build quando aplicavel,
verifique em navegador real se tocar 3D, atualize labs/CURRENT.md e escreva CONTEXT.md baseado no
diff real.
```

## 7. Recomendacao priorizada

Depois do lab 177, eu recomendo corrigir primeiro **Lab 201 - Modal de ranking nao bloqueia arrasto
do planeta**, **Lab 202 - Objetos do mundo alinhados ao relevo** e **Lab 203 - Pet maior, visivel e
com troca clara**, junto com **Lab 204 - Ceu escuro no espaco e claro na atmosfera** e **Lab 205 -
Preview fixo na lojinha durante scroll**. Depois, fazer **Lab 207 - Troca segura de nickname** e,
quando o pet atual estiver confiavel, **Lab 206 - Pets premium de qualidade, roupas e mascaras**.
Para aumentar retencao jogavel, priorizar **Lab 208 - Movimento mais rapido e responsivo**, **Lab
209 - Hub de mini-jogos**, **Lab 210 - Parkour arcade** e **Lab 211 - Trofeus de mini-jogos**. Em
seguida, fazer **Lab 191 - Auditoria de FPS, draw calls e custo por sistema** e **Lab 192 - Locomocao
sem moonwalk**.

Pergunta de mercado respondida: "A crianca percebe Missao Aprender como um jogo 3D de qualidade
suficiente para querer ficar e voltar?" Sem input funcional, objetos acima do relevo, pet visivel,
transicao espacial convincente, customizacao com preview sempre visivel, pets desejaveis, FPS e
movimento bons, identidade segura/editavel e mini-jogos repetiveis, novos planetas, NPCs e chat
podem aumentar escopo, mas nao necessariamente retencao.
