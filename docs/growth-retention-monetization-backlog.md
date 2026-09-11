# Missao Aprender - Backlog de crescimento, retencao e monetizacao responsavel

Data: 2026-09-11
Branch base: `main`, com observacao de que o PR #49 / lab-175 estava aberto no momento desta
analise.

Este documento complementa `docs/market-metrics-engagement-backlog.md`. O backlog anterior esgotou
o ciclo de ativacao/parent trust/social seguro no estado registrado em `labs/CURRENT.md`. O foco
agora e elevar qualidade, retencao infantil e valor percebido pelo responsavel sem quebrar a regra
inegociavel do produto: aprendizagem, progresso, cooperacao e conteudo educativo nunca ficam atras
de assinatura.

Observacao de numeracao: os numeros de lab abaixo seguem a sequencia real observada no repositorio
no momento da escrita. Se `labs/CURRENT.md` avancar antes da execucao, use sempre o proximo numero
livre e nunca reutilize uma pasta de lab existente. Os titulos/hipoteses sao a fonte do escopo; o
numero e apenas uma sugestao operacional.

## 1. Problema que o jogo resolve

### Para a crianca

A crianca quer jogar algo que pareca jogo de verdade: explorar, dominar movimento, se expressar por
avatar, descobrir lugares, cuidar de pet, visitar amigos, colecionar conquistas e ter pequenas
surpresas. O problema que o Missao Aprender resolve e transformar pratica de raciocinio, matematica
e leitura em aventura 3D com objetivos curtos, sem parecer uma prova grudada em uma tela bonita.

### Para o responsavel

O responsavel quer reduzir a culpa e o risco do tempo de tela: "meu filho esta jogando, mas esta
seguro, aprendendo e sem cair em compra abusiva, chat livre ou conteudo imprevisivel". O problema
que o Missao Aprender resolve e oferecer um espaco de jogo que preserva diversao infantil e da ao
adulto uma explicacao verificavel de seguranca, aprendizado, progresso e monetizacao honesta.

### Para o negocio

O produto precisa provar que criancas voltam por diversao e que responsaveis pagam por confianca,
relatorios, personalizacao e conveniencia familiar. Monetizacao direta no fluxo infantil deve ser
tratada como risco, nao como atalho.

## 2. Pesquisa de comparaveis e estrategias de mercado

Estas referencias nao devem ser copiadas literalmente. Elas indicam mecanismos de mercado que ja
provaram tracao e precisam ser adaptados ao contexto infantil/edtech do Missao Aprender.

| Produto / categoria | Estrategia que atrai criancas | Estrategia que convence responsaveis | O que adaptar para o Missao Aprender | Risco a evitar |
| --- | --- | --- | --- | --- |
| Roblox | Identidade por avatar, mundos sociais, descoberta constante, controle 3D familiar, jogar com amigos. | Controles parentais, marca reconhecida, catalogo enorme de experiencias. | Camera e movimento com expectativa "Roblox-like"; avatar forte; mundos visitaveis; social seguro. | Nao copiar UGC aberto, moedas confusas, pressao por compra, chat livre ou experiencias imprevisiveis. |
| Minecraft / Minecraft Education | Criatividade, exploracao, colaboracao e interacao fisica com o mundo. | Credibilidade escolar, aprendizagem por projetos, uso em sala e em casa. | Planetas mais interativos, missoes ambientais, construcao/decoração segura por catalogo. | Mundo bonito mas estatico; quiz desconectado da acao. |
| Prodigy | Batalhas, quests, recompensas, fantasia e perguntas educacionais embutidas no loop. | Conteudo educacional gratuito, relatórios/insights e assinatura opcional para familias. | Manter educacao gratuita; vender relatorio, cosmeticos e apoio familiar para adulto. | Crianca sentir que precisa pagar para progredir ou aprender. |
| Duolingo / edtech B2C | Metas curtas, feedback imediato, progresso visivel, experimentacao constante. | Assinatura por conveniencia, remocao de atrito e percepcao de progresso. | Sessoes curtas de aprendizagem validada, experimentos A/B simples, telemetria por coorte. | Streak punitivo, culpa por ausencia, FOMO agressivo. |
| Animal Jam / jogos sociais infantis | Avatar, pets, decoracao, exploracao e chat restrito. | Area de pais, seguranca infantil e controles. | Chat fechado, perfis seguros, visitas somente leitura, reacoes catalogadas. | Bio livre, upload, desenho livre, troca de itens ou mensagens indiretas ofensivas. |
| Toca Boca / playsets digitais | Brinquedo digital aberto, toque em objetos, cenas densas de interacao. | Jogo infantil sem pressao competitiva, foco em criatividade e faz-de-conta. | Cada planeta deve ter objetos que respondem a crianca: botoes, alavancas, NPCs, mini-puzzles, colecionaveis. | Mundo parecer vitrine vazia sem "brinquedo" para mexer. |

Fontes consultadas e como elas influenciam o backlog:

- Roblox reporta DAUs, horas engajadas e bookings como indicadores centrais; no Q2 2026, a empresa
  citou crescimento de receita, DAUs/horas dentro do esperado e pressao de monetizacao em coortes
  jovens. Uso no backlog: medir engajamento e monetizacao separadamente, sem concluir que mais
  tempo de tela e automaticamente melhor. Fonte:
  https://ir.roblox.com/financials/quarterly-results/default.aspx
- Prodigy afirma que seu conteudo educacional de matematica e ingles e gratuito, e que assinaturas
  opcionais para pais ajudam a manter o produto gratuito para educadores. Uso no backlog: manter
  aprendizagem gratuita e vender valor adulto/cosmetico. Fonte: https://www.prodigygame.com/
- Minecraft Education posiciona o produto como plataforma imersiva de aprendizagem no universo que
  criancas ja amam. Uso no backlog: integrar aprendizado a exploracao, colaboracao e interacao com
  o ambiente. Fonte: https://education.minecraft.net/
- Duolingo destaca crescimento orientado por produto, grande volume de conteudo e assinaturas. Uso
  no backlog: metas curtas, feedback claro, experimentacao e coortes, sem copiar pressao de streak.
  Fonte: https://investors.duolingo.com/
- Animal Jam comunica seguranca, parent tools, play free e membership. Uso no backlog: area adulta
  separada, social infantil com catalogo fechado, monetizacao compreensivel. Fonte:
  https://www.animaljam.com/
- A FTC/COPPA exige consentimento parental verificavel antes de coletar dados pessoais de criancas
  em servicos direcionados a menores de 13 anos, com direitos continuos de acesso, revogacao e
  exclusao. Uso no backlog: dados infantis minimos, sem PII, sem UGC aberto, portal adulto claro.
  Fonte:
  https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions
- Orientacoes recentes para responsaveis reforcam que compras no jogo, recompensas aleatorias,
  comunicacao online, UGC e FOMO sao fatores tao importantes quanto a classificacao indicativa.
  Uso no backlog: banir loot box/gacha, separar checkout da crianca e revisar eventos limitados.
  Fonte:
  https://www.goodhousekeeping.com/childrens-products/a71486338/what-to-consider-before-buying-your-kid-a-video-game/

## 3. Hipoteses de crescimento

1. Se a primeira sessao tiver qualidade visual e camera confiavel, a crianca acredita que e um jogo
   "de verdade" e fica tempo suficiente para encontrar o valor educativo.
2. Se avatar, loja e preview funcionarem sem bug, cosmeticos viram motivacao legitima e assinatura
   adulta ganha credibilidade.
3. Se planetas visitaveis tiverem objetos interativos, NPCs e mini-puzzles, a exploracao deixa de
   ser turismo visual e vira loop de retorno.
4. Se o responsavel entender "educativo, seguro, sem chat livre, sem compra abusiva e sem pay-to-win"
   em ate 10 segundos, a resistencia a assinatura diminui.
5. Se a assinatura for explicada como beneficio adulto/cosmetico, com preco, cancelamento e o que
   continua gratis, a monetizacao pode crescer sem ferir a confianca.
6. Se o produto medir coortes de ativacao, D1, D7, interacoes por planeta e conversao adulta, o
   roadmap passa a ser guiado por evidencia em vez de preferencia interna.

## 4. O que ja sabemos pelo produto atual

- O jogo ja tem planeta 3D, quests, XP/moedas, cosméticos, pets, casa, garagem, planetas,
  multiplayer seguro, chat fechado por catalogo, amigos, pagina familiar e backend comercial.
- O backlog anterior entregou varios mecanismos de retencao: onboarding/home dupla, status de
  amigos, perfil publico seguro, mapa de habilidades, album, rotina do pet, cooperacao, preview de
  relatorio e casa visitavel.
- O PR #49 / lab-175, se mergeado, completa casa visitavel somente leitura.
- O usuario reportou tres bloqueios de qualidade que precisam entrar antes de features grandes:
  preview do avatar na lojinha bugando ao trocar bone/chapeu, montanha invisivel com fisica ativa,
  e camera que precisa ser facil como Roblox.
- Tambem existe uma lacuna de riqueza nos planetinhas visitaveis: eles precisam de mais elementos
  interativos e mais qualidade visual/ludica.

## 5. O que precisa ser validado

- Criancas de 9 a 11 anos entendem em ate 10 segundos como jogar, explorar, customizar e conquistar?
- A camera atual causa atrito, enjoo, confusao ou abandono?
- O bug da lojinha reduz vontade de customizar ou passa impressao de produto quebrado?
- Planetas com 3 a 5 interacoes simples aumentam D1/D7 ou apenas aumentam tempo de producao?
- Responsaveis entendem que a assinatura nao bloqueia aprendizado?
- Responsaveis pagariam por relatorio, backup/progresso familiar, cosmeticos premium e personalizacao
  segura, ou esperam conteudo pedagogico mais forte?
- A crianca encontra algum caminho para pedir compra diretamente? Se sim, esse caminho deve ser
  removido ou convertido para uma mensagem neutra de "peca para um responsavel abrir a area da
  familia", sem preco e sem urgencia no fluxo infantil.

## 6. North Star e metricas

### North Star

`weekly_meaningful_play_learning_sessions`

Sessao semanal unica em que a crianca joga por pelo menos 8 minutos, interage com pelo menos 2
objetos/mecanicas de mundo e conclui pelo menos 1 desafio educativo com feedback de progresso.

### Metricas infantis

- `activation_10m_rate`: novo perfil, ou dispositivo quando ainda nao houver identificador anonimo
  de perfil, que completa jogar + explorar + aprender + recompensa em 10 min. O lab de coortes deve
  explicitar o nivel de agregacao para evitar misturar varias criancas do mesmo aparelho.
- `time_to_first_fun`: segundos ate primeira acao divertida clara (pular, dirigir, pet, objeto,
  parkour, planeta).
- `time_to_first_learning_challenge`: segundos ate primeiro desafio educativo contextual.
- `avatar_customization_preview_success_rate`: preview abriu/trocou item sem erro visual.
- `camera_friction_events`: recenter, colisao ruim, zoom extremo, quedas/abandono apos mover camera.
- `planet_interactions_per_session`: objetos/mini-puzzles/NPCs acionados por sessao.
- `D1`, `D7`, `sessions_per_week`, `return_after_planet_visit`.

### Metricas do responsavel

- `parent_value_comprehension_rate`: em teste, 8/10 explicam o que e gratis, pago, seguro e sem chat
  livre.
- `family_area_click_rate`, `parent_signup_started`, `parent_pairing_completed`.
- `weekly_report_preview_viewed`, `checkout_started_from_parent_area`, `paid_conversion_from_parent_area`.
- `refund_rate`, `cancel_rate`, motivos de cancelamento.

### Guardrails

- `child_direct_checkout_entrypoints = 0`.
- `paid_education_gate_count = 0`.
- `paid_random_reward_count = 0`.
- `free_chat_messages = 0`.
- `open_ugc_publish_count = 0`.
- Nenhum evento de telemetria deve carregar nome real, email da crianca, texto livre, localizacao,
  escola ou resposta detalhada de chat.

## 7. Backlog de implementacao

### Lab 176 - Lojinha com preview de avatar estavel

- Problema / hipotese: se o preview quebra ao trocar bone, chapeu ou outros itens, a crianca perde
  confianca na customizacao e o responsavel perde confianca na assinatura cosmetica.
- Usuario beneficiado: crianca e responsavel.
- Escopo: corrigir o preview 3D da lojinha para troca de avatar, bone/chapeu, cabelo e cores sem
  duplicar, sumir, herdar mesh errada ou travar; adicionar teste/regressao para troca sequencial de
  cosmeticos; revisar cleanup de meshes/materials/estado visual.
- Fora de escopo: novos cosmeticos, checkout, preco, catalogo premium novo.
- Criterios de aceite: trocar 10 vezes entre itens diferentes nao quebra o boneco; item bloqueado
  nao aparece como comprado; preview nao altera progresso antes de confirmar compra/equipar; build e
  testes passam.
- Metricas esperadas: `avatar_customization_preview_success_rate` perto de 100%; aumento em
  `shop_preview_item_changed` e `avatar_customization_rate`.
- Riscos: vazar entitlement premium no preview; consertar loja mexendo em modelo real do jogador.
- Prioridade: P0.

### Lab 177 - Relevo e montanhas visiveis

- Problema / hipotese: a fisica permite andar sobre montanha invisivel, mas o visual nao renderiza.
  Isso quebra imersao, parece bug grave e prejudica a percepcao de qualidade do mundo 3D.
- Usuario beneficiado: crianca.
- Escopo: diagnosticar separacao entre mesh visual e colisao fisica; corrigir material, parenting,
  layer, frustum, instancia, disposal ou ordem de criacao que esteja escondendo o relevo; adicionar
  verificacao visual/canvas ou teste manual documentado.
- Fora de escopo: redesenhar todo terreno, adicionar bioma novo, trocar engine.
- Criterios de aceite: montanhas aparecem onde ha colisao; avatar nao caminha no "ar"; mobile low
  quality ainda mostra leitura minima do relevo; screenshot de verificacao entra no CONTEXT do lab.
- Metricas esperadas: reducao de abandono em areas de montanha; menos `camera_friction_events` e
  bugs reportados na primeira sessao.
- Riscos: queda de FPS; mesh visual desalinhada da colisao; material pesado em mobile.
- Prioridade: P0.

### Lab 178 - Camera Roblox-like facil

- Problema / hipotese: criancas que ja jogam Roblox esperam camera terceira-pessoa simples,
  previsivel e permissiva. Camera dificil reduz ativacao antes do valor educativo aparecer.
- Usuario beneficiado: crianca.
- Escopo: orbit por mouse/touch, zoom por scroll/pinch, botao de recentralizar, suavizacao,
  colisao/evitar clipping, sensibilidade padrao, modo mobile com dedo direito para camera e esquerdo
  para movimento, tooltips minimos quando necessario.
- Fora de escopo: sistema completo de configuracoes avancadas, suporte a controle/gamepad se ainda
  nao existir, combate novo.
- Criterios de aceite: em desktop, WASD + mouse/arrasto e scroll funcionam naturalmente; em mobile,
  movimento e camera nao brigam; camera nao entra dentro do planeta/personagem; teste manual em
  desktop e viewport mobile documentado.
- Metricas esperadas: queda em `time_to_first_control`; reducao de abandono nos primeiros 2 minutos;
  menor uso repetido de recenter.
- Riscos: quebrar direcao de movimento relativa a camera; causar enjoo; regressao em carro/foguete.
- Prioridade: P0.

### Lab 179 - Planetas interativos v1

- Problema / hipotese: planetinhas visitaveis precisam deixar de ser apenas cenario. Interacoes
  simples aumentam exploracao, retorno e boca a boca infantil.
- Usuario beneficiado: crianca.
- Escopo: adicionar pelo menos 3 interacoes por planeta existente: NPC com fala catalogada, objeto
  acionavel, mini-puzzle ambiental, coletavel ou segredo visual; instrumentar eventos; manter tudo
  sem texto livre/UGC.
- Fora de escopo: planeta novo, editor de mundo, narrativa longa, monetizacao.
- Criterios de aceite: cada planeta tem objetivo/descoberta clara; interacoes dao feedback audiovisual;
  pelo menos uma interacao conecta a desafio educativo curto; eventos nao coletam PII.
- Metricas esperadas: `planet_interactions_per_session`, `return_after_planet_visit`, D1/D7 de quem
  visita planeta.
- Riscos: aumentar escopo artistico demais; objetos sem valor virarem "decoracao clicavel".
- Prioridade: P1.

### Lab 180 - Missoes ambientais de aprendizagem

- Problema / hipotese: aprendizagem retém melhor quando faz parte da acao do mundo, nao quando a
  crianca sente que saiu do jogo para responder quiz.
- Usuario beneficiado: crianca e responsavel.
- Escopo: transformar parte dos quizzes em desafios ambientais: alinhar pontes por logica, abastecer
  foguete com matematica, decifrar placas por leitura, abrir portas por padroes; recompensas gratis.
- Fora de escopo: substituir todos os quizzes, IA generativa de conteudo, dificuldade adaptativa
  complexa.
- Criterios de aceite: 3 missoes ambientais usam dados existentes de quest/habilidades; erro nao
  pune, apenas da feedback; progresso educacional continua gratis.
- Metricas esperadas: `learning_challenge_started`, `learning_challenge_completed`,
  `retry_without_quit_rate`, compreensao parental em teste.
- Riscos: puzzle ficar dificil sem instrucao; aprendizagem ficar escondida demais para o adulto.
- Prioridade: P1.

### Lab 181 - Circuito de descoberta e album de planetas

- Problema / hipotese: criancas voltam quando sabem que ainda existe algo legal para descobrir e
  completar.
- Usuario beneficiado: crianca.
- Escopo: album de descobertas por planeta com slots de NPCs, segredos, colecionaveis e postais;
  destaque de "proxima descoberta" sempre gratis; integracao com conquistas existentes.
- Fora de escopo: colecionavel aleatorio pago, trading entre criancas, ranking competitivo.
- Criterios de aceite: criança ve o que descobriu e o que falta sem pressao de compra; premium fica
  separado de progresso; descobrir algo dispara feedback claro.
- Metricas esperadas: `album_planet_opened`, `discoverable_collected`, D7 por numero de descobertas.
- Riscos: completismo virar ansiedade; inventario poluido.
- Prioridade: P1.

### Lab 182 - Eventos semanais saudaveis

- Problema / hipotese: eventos leves dão novidade, mas devem evitar FOMO manipulativo.
- Usuario beneficiado: crianca.
- Escopo: estender o sistema semanal deterministico existente em `app/src/data/weeklyEvents.ts`,
  preservando uma unica fonte de verdade para rotacao semanal, bonus e copy. Adicionar objetivo
  educativo/ambiental, recompensa cosmetica ou moeda gratis, janela ampla e mensagem de que nao ha
  problema em perder; sem pagamento para acelerar/recuperar.
- Fora de escopo: timers agressivos, desconto relampago, passe de batalha, recompensa aleatoria paga.
- Criterios de aceite: evento aparece como convite, nao obrigacao; ausencia nunca pune pet/progresso;
  recompensa e previsivel; responsavel entende que nao ha pressao de compra; nao existe segunda
  rotacao semanal concorrente nem recompensa conflitante com a progressao atual.
- Metricas esperadas: retorno semanal, conclusao de evento, feedback qualitativo infantil.
- Riscos: FOMO; familias com limite de tela sentirem pressao.
- Prioridade: P1.

### Lab 183 - Auditoria da vitrine adulta de assinatura

- Problema / hipotese: a vitrine adulta ja existe nos labs 166/173, mas precisa ser auditada contra
  a experiencia infantil antes de novas chamadas premium serem adicionadas. A pergunta nao e
  "construir a pagina de novo"; e provar que a copy e os pontos de entrada ainda separam crianca e
  responsavel sem pressao indevida.
- Usuario beneficiado: responsavel.
- Escopo: auditar `TitleScreen`, `AvatarShop`, `/familia`, relatorio exemplo, CTA adulto e textos de
  itens premium; ajustar apenas lacunas concretas como copy infantil que incentive compra, falta de
  clareza sobre "gratis vs pago", ou ausencia de evento em ponto adulto relevante.
- Fora de escopo: pedir compra no fluxo infantil, bloquear escola/quest, urgencia artificial.
- Criterios de aceite: crianca nao ve checkout, preco ou urgencia; adulto continua vendo preco,
  beneficios, cancelamento e regra de aprendizagem gratis; qualquer nova superficie premium passa
  por esse checklist.
- Metricas esperadas: `parent_value_comprehension_rate`, `weekly_report_preview_viewed`,
  `checkout_started_from_parent_area`, zero entrada direta de checkout infantil.
- Riscos: valor premium parecer fraco; copy prometer mais do que entrega; misturar preco em tela
  infantil.
- Prioridade: P1.

### Lab 184 - Qualidade visual dos planetas e mundo

- Problema / hipotese: para competir por atencao infantil, o mundo precisa parecer vivo e coerente,
  nao uma colecao de assets soltos.
- Usuario beneficiado: crianca.
- Escopo: passe de art direction nos planetas existentes: materiais, escala, iluminacao, landmarks,
  silhouettes, props interativos, feedback audiovisual e performance mobile.
- Fora de escopo: redesign completo, asset pago sem licenca clara, aumentar peso sem budget.
- Criterios de aceite: cada planeta tem identidade visual reconhecivel em 5 segundos; FPS segue meta;
  screenshots desktop/mobile entram no CONTEXT.
- Metricas esperadas: `return_after_planet_visit`, tempo de exploracao voluntaria, feedback de
  playtest.
- Riscos: polimento visual consumir muitos labs; queda de performance em tablets.
- Prioridade: P1.

### Lab 185 - Medicao de coortes de retencao e qualidade

- Problema / hipotese: sem coortes, nao sabemos se os novos recursos aumentam retencao ou apenas
  acumulam complexidade.
- Usuario beneficiado: PO, dev e negocio.
- Escopo: criar um entregavel minimo concreto com catalogo de eventos, allowlist de propriedades,
  nivel de agregacao (dispositivo versus perfil anonimo), eventos novos necessarios para camera,
  loja e planetas, e uma saida simples de metricas/coortes a partir dos eventos existentes e novos;
  nenhum dado pessoal infantil.
- Fora de escopo: ferramenta paga pesada, publicidade, segmentacao individual de crianca.
- Criterios de aceite: cada lab novo declara metricas esperadas e eventos; D0/D1/D7, primeira
  sessao, camera, loja, planetas, responsavel e assinatura possuem evento/propriedade mapeados; a
  saida permite comparar coortes antes/depois; guardrails aparecem no relatorio.
- Metricas esperadas: cobertura de eventos > 90% para labs P0/P1; decisoes de roadmap com evidencia.
- Riscos: coleta excessiva; tracking quebrar performance; interpretar pouco dado como certeza.
- Prioridade: P0/P1.

### Lab 186 - Playtest guiado crianca + responsavel

- Problema / hipotese: o produto so prova aderencia quando criancas querem voltar e responsaveis
  conseguem explicar valor/seguranca sem ajuda.
- Usuario beneficiado: crianca, responsavel e negocio.
- Escopo: roteiro de teste de 30 minutos com 5 a 8 duplas crianca/responsavel; tarefas: entrar,
  controlar camera, customizar avatar, visitar planeta, concluir desafio educativo, abrir area do
  responsavel, explicar assinatura.
- Fora de escopo: pesquisa quantitativa grande, coleta de dados sensiveis, teste escolar formal.
- Criterios de aceite: roteiro, termo simples, planilha de observacao sem PII, criterios de sucesso
  e resumo de aprendizados priorizados.
- Metricas esperadas: ativacao observada, erros de controle, desejo de voltar, compreensao parental,
  intencao de pagamento.
- Riscos: viés de amostra pequena; crianca tentar agradar adulto; confundir opiniao com evidencia.
- Prioridade: P0.

## 8. Backlog de pesquisa

### Pesquisa A - Teste dos 10 segundos

- Hipotese: crianca e responsavel entendem propostas diferentes rapidamente.
- Metodo: mostrar home por 10 segundos; pedir que cada um explique o que pode fazer, o que e pago,
  se ha chat livre e se precisa pagar para aprender.
- Sucesso: 8/10 responsaveis e 8/10 criancas respondem corretamente sem ajuda.
- Prioridade: P0.

### Pesquisa B - Playtest de camera e primeira sessao

- Hipotese: camera/movimento sao principal gargalo antes de aprendizagem.
- Metodo: observar crianca jogando 10 minutos sem instrucoes; medir pedidos de ajuda, tempo ate
  controle, uso de camera, abandono e sorriso/engajamento espontaneo.
- Sucesso: 70% chegam ao primeiro desafio/recompensa sem ajuda adulta.
- Prioridade: P0.

### Pesquisa C - Valor de assinatura para responsavel

- Hipotese: responsaveis pagam por relatorio, seguranca, backup, personalizacao e ausencia de abuso,
  nao por bloquear conteudo educativo.
- Metodo: entrevista curta com mock da area familiar e tres pacotes de beneficios; perguntar preco
  aceitavel, medos e motivo de cancelamento.
- Sucesso: 6/10 entendem valor pago sem pedir conteudo educacional exclusivo.
- Prioridade: P1.

### Pesquisa D - Riqueza dos planetas

- Hipotese: interacoes ambientais geram mais vontade de voltar do que apenas mais quests.
- Metodo: teste A/B manual: planeta com 3 interacoes versus planeta estatico; medir retorno e
  preferencia declarada.
- Sucesso: planeta interativo recebe mais exploracao voluntaria e mais mencoes espontaneas.
- Prioridade: P1.

### Pesquisa E - Linguagem etica de monetizacao

- Hipotese: copy transparente aumenta confianca e reduz rejeicao.
- Metodo: testar variacoes de texto "gratis vs pago" com responsaveis; incluir perguntas sobre
  compras abusivas, chat, dados e cancelamento.
- Sucesso: baixa confusao sobre assinatura e nenhum responsavel interpreta que precisa pagar para a
  crianca aprender.
- Prioridade: P1.

## 9. Riscos de seguranca, privacidade, compliance e reputacao

- COPPA/LGPD infantil: nao coletar PII de crianca sem base/consentimento; manter parent account
  separado do perfil infantil.
- Monetizacao predatoria: proibido loot box, gacha, recompensa aleatoria paga, timer falso, desconto
  com urgencia artificial ou pay-to-win.
- Pressao infantil: a crianca nao deve conseguir iniciar checkout ou ver mensagem de compra com
  preco/urgencia dentro da loja infantil.
- Chat/social: manter catalogo fechado, sem DM, sem voz, sem bio livre, sem foto, sem upload e sem
  UGC aberto.
- UGC indireto: casas, decoracao e nomes podem formar mensagens; limitar catalogo, visibilidade e
  denuncia/bloqueio.
- Dados de telemetria: medir comportamento sem resposta textual, email, nome real, escola, localizacao
  ou identificador pessoal exposto.
- Reputacao: promessa educacional deve ser modesta e verificavel; evitar prometer melhora escolar
  garantida.
- Performance: adicionar planetas/objetos sem budget pode derrubar mobile, que provavelmente e
  parte importante do publico.

## 10. Auditoria UX e padrao de interacao

Leitura rapida do produto atual:

- A `TitleScreen` ja separa bem "Jogar" e "Area dos responsaveis", com sinais de confianca
  visiveis.
- `/familia` e uma rota separada, lazy-loaded, com portao parental, proposta de valor, preco,
  relatorio exemplo e checkout adulto.
- O tutorial e curto, permite pular e explica movimento basico, missao e recompensa.
- A lojinha tem abas, preview 3D e nao inicia checkout diretamente.
- O mundo 3D ja tem muitos verbos: andar, pular, correr, dirigir, voar, interagir, responder
  missao, cuidar de pet, decorar casa, visitar amigo, abrir loja, usar mochila e viajar.

Diagnostico UX:

1. **O padrao central e bom, mas ainda nao esta suficientemente consistente.** O produto tem muitos
   sistemas fortes, porem a crianca precisa reconhecer sempre o mesmo ciclo: ver affordance,
   aproximar, entender verbo, apertar/acionar, receber feedback e saber o que mudou.
2. **A camera virou parte do produto, nao detalhe tecnico.** Para criancas acostumadas com Roblox,
   camera ruim e percebida como "o jogo e dificil/bugado", mesmo quando o conteudo e bom.
3. **O fluxo adulto esta correto na separacao, mas a loja infantil precisa cuidado extra.** O texto
   "peca pra quem cuida..." pode ser interpretado como convite indireto de compra. Melhor: no fluxo
   infantil, itens premium devem aparecer como "Item da familia" ou "Visual especial", sem preco,
   sem urgencia e sem call to action de pedir compra. A explicacao comercial completa fica em
   `/familia`.
4. **Planetas precisam de uma linguagem de interacao repetivel.** Todo objeto interativo deve usar
   o mesmo padrao visual: brilho/icone discreto, hint de tecla/toque, verbo claro, feedback
   audiovisual e recompensa/estado final.
5. **O produto resolve um problema real se o jogo for bom antes de ser educativo.** Para a crianca,
   o problema e "quero brincar e pertencer". Para o responsavel, e "quero uma tela segura que tenha
   valor educacional e nao abuse de compras". O UX deve servir os dois sem misturar as jornadas.

### Jobs to be Done

| Usuario | Situacao | Job principal | Resultado esperado |
| --- | --- | --- | --- |
| Crianca nova | Abriu pela primeira vez | "Quero descobrir rapido se isso e divertido." | Controla o personagem, acha algo legal, ganha algo gratis e quer continuar. |
| Crianca recorrente | Voltou depois de um dia | "Quero ver o que mudou e o que posso conquistar." | Encontra meta curta, pet/planeta/amigo/album e progresso visivel. |
| Responsavel avaliando | Viu o jogo ou foi chamado pela crianca | "Quero saber se e seguro, educativo e justo." | Entende chat fechado, ausencia de PII infantil, conteudo gratis e assinatura opcional. |
| Responsavel pagando | Considera assinatura | "Quero saber pelo que pago e como cancelo." | Ve preco, beneficios cosmeticos/adultos, relatorio, backup, cancelamento e privacidade. |

### Heuristicas de UX obrigatorias para novos labs

- Toda feature deve declarar qual job resolve para crianca ou responsavel.
- Todo novo objeto 3D interativo deve ter affordance antes da interacao, hint durante proximidade e
  feedback apos a acao.
- O comando de interacao deve ser consistente: teclado, mouse/touch e mobile precisam ter equivalente.
- Texto infantil deve ser curto, concreto e orientado a acao; texto adulto pode explicar seguranca,
  privacidade e assinatura.
- Nenhuma tela infantil deve usar preco, urgencia, escassez artificial, "peca para comprar" ou
  comparacao social agressiva.
- Nenhuma feature educativa deve parecer castigo para desbloquear diversao; a aprendizagem precisa
  estar ligada ao objetivo do mundo.
- Antes de adicionar conteudo novo, corrigir bugs que quebram confianca: preview, montanha invisivel
  e camera.
- Todo lab visual precisa de verificacao desktop e mobile com screenshot ou anotacao no `CONTEXT.md`.

### UX backlog complementar

#### Lab 187 - Mapa de verbos e affordances do jogo

- Problema / hipotese: o jogo tem muitos sistemas, mas a crianca pode nao perceber o que e
  interativo. Um mapa de verbos padroniza como o mundo "fala" com o jogador.
- Usuario beneficiado: crianca nova e crianca recorrente.
- Escopo: documentar todos os verbos existentes (andar, pular, interagir, comprar com moeda, equipar,
  visitar, dirigir, voar, responder, cuidar, mover, reagir), seus hints, input desktop/mobile,
  feedback visual/sonoro e eventos.
- Fora de escopo: implementar todos os redesigns; criar engine nova de input.
- Criterios de aceite: existe tabela de verbos; cada novo planeta/interacao deve seguir o padrao;
  inconsistencias viram itens de backlog.
- Metricas esperadas: reducao em `time_to_first_fun`, `time_to_first_learning_challenge` e pedidos
  de ajuda em playtest.
- Riscos: virar documento sem aplicacao; excesso de padronizacao tirar personalidade.
- Prioridade: P0/P1.

#### Lab 188 - Linguagem visual de objetos interativos

- Problema / hipotese: se todo objeto acionavel tem o mesmo tipo de dica, a crianca explora mais e
  depende menos de tutorial.
- Usuario beneficiado: crianca.
- Escopo: criar padrao visual/sonoro para interativos: marcador, brilho leve, label de acao, estado
  de concluido, feedback de recompensa e comportamento mobile.
- Fora de escopo: redesenhar todos os objetos do jogo de uma vez.
- Criterios de aceite: pelo menos loja, pet/casa, missao e um planeta usam o mesmo padrao; mobile
  tem toque equivalente; nao ha sobreposicao de labels.
- Metricas esperadas: aumento de interacoes por sessao; reducao de abandono antes da primeira missao.
- Riscos: poluicao visual; labels demais cobrindo o mundo.
- Prioridade: P1.

#### Lab 189 - Revisao da lojinha para monetizacao infantil segura

- Problema / hipotese: a loja pode mostrar valor cosmetico sem criar pressao direta para compra.
- Usuario beneficiado: crianca e responsavel.
- Escopo: revisar copy, badges e estados de itens premium; remover qualquer linguagem que incentive
  a crianca a pedir compra; manter preco/assinatura apenas em `/familia`; preservar preview e
  separacao de itens ganhos jogando.
- Fora de escopo: mudar Stripe, preco ou catalogo de assinatura.
- Criterios de aceite: crianca entende que ha itens especiais, mas nao ve preco nem urgencia; adulto
  encontra explicacao completa na area responsavel; nenhum checkout infantil.
- Metricas esperadas: `shop_open_rate_child` como diagnostico, nao meta de venda; compreensao
  parental; ausencia de relatos de pressao.
- Riscos: esconder demais o valor premium; responsavel nao perceber beneficio se nao abrir `/familia`.
- Prioridade: P1.

#### Lab 190 - Primeira sessao orientada por experiencia

- Problema / hipotese: a ativacao melhora quando a primeira sessao mostra jogo, interacao e
  aprendizado em vez de explicar tudo por texto.
- Usuario beneficiado: crianca nova.
- Escopo: roteiro jogavel nos primeiros 10 minutos: camera/movimento, primeiro objeto interativo,
  primeiro desafio, primeira recompensa, ponte para avatar/pet/planeta.
- Fora de escopo: tutorial longo, narrativa completa, assinatura.
- Criterios de aceite: crianca consegue concluir sem adulto; cada passo e uma acao no mundo; errar
  nao pune; proximo objetivo aparece sem bloquear exploracao livre.
- Metricas esperadas: `activation_10m_rate`, `time_to_first_fun`, `time_to_first_reward`, D1.
- Riscos: experiencia ficar guiada demais; crianca recorrente achar repetitivo.
- Prioridade: P1.

## 11. Prompt UX para o Claude montar/validar backlog com qualidade

Use este prompt quando quiser que o Claude revise a experiencia antes de implementar ou quando for
criar um novo backlog de UX.

```text
Voce e um Lead UX/Product Designer senior especializado em jogos infantis, game feel, edtech B2C,
monetizacao responsavel e seguranca digital para criancas.

Produto: Missao Aprender, jogo educativo 3D no navegador para criancas por volta de 10 anos. A
crianca deve sentir que esta jogando de verdade: explorar planetas, controlar avatar, customizar,
cuidar de pet, descobrir objetos, jogar com amigos de forma segura e conquistar coisas. O
responsavel deve entender que o produto e educativo, seguro, sem chat livre, sem PII infantil, sem
compras abusivas e sem pay-to-win.

Antes de propor qualquer mudanca, leia:

- README.md
- CLAUDE.md
- labs/CURRENT.md
- docs/prompts/README.md
- docs/prompts/01-seguranca.md
- docs/prompts/02-design-profissional.md
- docs/prompts/03-arquitetura-sistema.md
- docs/market-metrics-engagement-backlog.md
- docs/growth-retention-monetization-backlog.md
- app/src/components/TitleScreen.tsx
- app/src/components/Tutorial.tsx
- app/src/world3d/World3D.tsx, apenas as regioes de input/camera/interacao relevantes
- app/src/world3d/AvatarShop.tsx
- app/src/components/FamilyPortal.tsx

Sua tarefa:

1. Defina claramente o problema do cliente que a mudanca resolve.
   - Crianca: qual desejo/frustracao infantil esta sendo atendido?
   - Responsavel: qual risco, duvida ou motivacao adulta esta sendo atendida?
   - Negocio: qual metrica deve melhorar?

2. Audite a jornada em quatro caminhos:
   - crianca nova nos primeiros 10 minutos;
   - crianca recorrente voltando para conquistar algo;
   - responsavel avaliando seguranca/valor;
   - responsavel entendendo assinatura/cancelamento/privacidade.

3. Para cada tela ou mecanica, responda:
   - A acao principal fica clara em ate 10 segundos?
   - O usuario sabe o que e clicavel/interativo?
   - Existe feedback depois da acao?
   - O texto esta adequado para crianca ou para adulto?
   - Existe caminho de compra direto ou pressao sobre a crianca?
   - Desktop e mobile tem controles equivalentes?
   - A mecanica aumenta aprendizado integrado ou so adiciona quiz solto?

4. Use este padrao de qualidade para interacoes 3D:
   - affordance visivel antes da acao;
   - hint de proximidade;
   - input consistente teclado/mouse/touch;
   - feedback audiovisual;
   - resultado persistente ou recompensa clara;
   - telemetria sem PII;
   - estado vazio/erro compreensivel.

5. Ao propor backlog, use formato de lab pequeno:
   - Titulo do lab.
   - Problema / hipotese.
   - Usuario beneficiado.
   - Job to be Done.
   - Escopo.
   - Fora de escopo.
   - Criterios de aceite.
   - Metricas esperadas.
   - Riscos.
   - Prioridade P0/P1/P2.

6. Regras inegociaveis:
   - aprendizagem, progresso, cooperacao e conteudo educativo nunca ficam atras de assinatura;
   - monetizacao so pode afetar cosmeticos, conveniencia visual, relatorios e personalizacao;
   - nao usar loot box, gacha, recompensa aleatoria paga, timer falso ou pay-to-win;
   - nao usar chat livre, bio livre, imagem enviada, voz, UGC aberto ou dado pessoal infantil;
   - checkout e preco ficam somente no fluxo adulto;
   - qualquer item premium no fluxo infantil deve ser neutro, sem CTA de compra.

Entregue no final:

- diagnostico UX resumido;
- principais problemas que impedem aderencia;
- backlog priorizado;
- proximo lab recomendado;
- pergunta de mercado que esse lab responde;
- metrica primaria e guardrail desse lab.
```

## 12. Prompt pronto para o Claude executar este backlog

Cole o prompt abaixo em uma sessao do Claude Code quando quiser que ele implemente os proximos labs.

```text
Voce esta trabalhando no repo suarezrafael/pesquisa, projeto Missao Aprender.

Atue como engenheiro senior de jogo 3D/React/Babylon e tambem como guardiao de produto infantil.
Antes de alterar codigo, leia:

- README.md
- CLAUDE.md
- labs/CURRENT.md
- docs/prompts/README.md
- docs/prompts/01-seguranca.md
- docs/prompts/02-design-profissional.md
- docs/prompts/03-arquitetura-sistema.md
- docs/prompts/04-manutencao-clean-code.md
- docs/plano-comercial-backend.md se tocar assinatura, Stripe, conta, entitlement ou area familiar
- docs/market-metrics-engagement-backlog.md
- docs/growth-retention-monetization-backlog.md

Regra inegociavel: conteudo educativo, progresso, cooperacao e aprendizagem nunca podem ficar atras
de assinatura. Monetizacao pode afetar apenas cosmeticos, conveniencia visual, relatorios e
personalizacao para o responsavel. Nao introduza loot boxes, gacha, recompensa aleatoria paga,
pay-to-win, chat livre, bio livre, upload, UGC aberto ou checkout iniciado pela crianca.

Primeiro confira o estado atual:

1. Rode `git status --short --branch`.
2. Leia `labs/CURRENT.md`.
3. Verifique se o PR #49 / lab-175 ja foi mergeado. Se foi, considere casa visitavel completa. Se
   nao foi, nao duplique esse trabalho.
4. Escolha o proximo lab pequeno do backlog abaixo.

Ordem recomendada:

1. Lab 176 - Lojinha com preview de avatar estavel.
2. Lab 177 - Relevo e montanhas visiveis.
3. Lab 178 - Camera Roblox-like facil.
4. Lab 185 - Medicao de coortes de retencao e qualidade, se faltar evento para provar os labs.
5. Lab 179 - Planetas interativos v1.
6. Lab 180 - Missoes ambientais de aprendizagem.
7. Lab 181 - Circuito de descoberta e album de planetas.
8. Lab 182 - Eventos semanais saudaveis, estendendo `weeklyEvents.ts`.
9. Lab 183 - Auditoria da vitrine adulta de assinatura.
10. Lab 184 - Qualidade visual dos planetas e mundo.
11. Lab 186 - Playtest guiado crianca + responsavel.

Para cada lab:

- Crie uma pasta `labs/lab-NNN-slug/` com `FEATURES.md`.
- Mantenha o escopo pequeno e verificavel.
- Preserve separacao de dominio/3D/backend.
- Adicione ou atualize testes quando tocar regra de negocio, entitlement, progressao, eventos ou
  backend.
- Se tocar 3D/camera/visual, faca verificacao manual em navegador e registre o resultado.
- Atualize `labs/CURRENT.md` e escreva `CONTEXT.md` ao final, baseado no diff real.
- Rode `npm run test` e `npm run build` em `app/` quando aplicavel; rode testes de workers se tocar
  backend.
- Antes de pedir merge, leia comentarios do Copilot/GitHub no PR e corrija achados reais.

Comece pelo Lab 176, a menos que `labs/CURRENT.md` mostre que ele ja foi feito. O objetivo e corrigir
o preview do avatar na lojinha quando troca bone/chapeu/outros cosmeticos, porque isso bloqueia
confianca em customizacao e monetizacao cosmetica.
```

## 13. Recomendacao priorizada

O proximo lab deve ser o **Lab 176 - Lojinha com preview de avatar estavel**.

Pergunta de mercado que ele ajuda a responder: a crianca consegue se apegar ao avatar e confiar na
customizacao como recompensa desejavel? Sem esse alicerce, cosmeticos premium e assinatura adulta
perdem forca porque o responsavel ve um produto visualmente instavel.

Depois dele, execute o **Lab 177 - Relevo e montanhas visiveis** e o **Lab 178 - Camera Roblox-like
facil** antes de adicionar features grandes. Esses tres labs formam a base de qualidade percebida:
avatar, mundo visivel e controle.
