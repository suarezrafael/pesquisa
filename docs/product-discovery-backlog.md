# Missao Aprender - Backlog de Discovery, Mercado e Produto

Data: 2026-09-08

Este documento complementa `docs/business-analyst-prompt-backlog.md`. Ele existe para orientar os proximos laboratorios depois da melhoria da primeira tela/home, sem misturar pesquisa de mercado, UX, monetizacao e seguranca infantil dentro de um unico lab grande.

## Contexto atual

Estado considerado: lab-160 concluido.

O jogo ja tem conteudo suficiente para validar aderencia inicial: mundo 3D, quests, planetas, casa, pets, cosmeticos, ranking, login diario, cartoes-postais, multiplayer seguro por catalogo e sistema de amigos com busca/pedido/aceite/recusa/remocao.

A prioridade de produto agora nao e simplesmente aumentar escopo. A prioridade e responder quatro perguntas de negocio:

1. A crianca entende rapidamente que isso e um jogo desejavel, nao so um quiz escolar?
2. O responsavel entende rapidamente que e seguro, educativo e monetizado de forma etica?
3. O social aumenta retorno sem aumentar risco infantil de forma inaceitavel?
4. A assinatura de R$ 4,99/mes tem valor percebido suficiente para o responsavel?

## Principios para os proximos labs

- Aprendizagem, progresso, quests, cooperacao e conteudo pedagogico continuam sempre gratis.
- Assinatura so pode liberar cosmeticos, conveniencia visual, casa/decoracao premium e beneficios de responsavel.
- Nenhum upsell deve ser pressionado diretamente contra a crianca.
- Nenhum lab social deve introduzir texto livre, UGC aberto, foto, audio, video ou dado de contato.
- Toda recomendacao de produto deve ter metrica ou teste de validacao associado.
- Preferir labs pequenos que testem uma hipotese por vez.

## Backlog P0 - Aderencia e funil inicial

### 1. Home dupla crianca/responsavel

Prioridade: P0

Problema / hipotese: a primeira tela precisa vender duas promessas diferentes sem confundir: diversao para a crianca e confianca para o responsavel.

Usuario beneficiado: crianca nova, responsavel avaliando o produto.

Escopo: CTA principal para jogar, CTA secundario para area dos responsaveis, prova visual do jogo, sinais de confianca, promessa de monetizacao etica.

Fora de escopo: checkout direto, mudancas de Stripe, novos cosmeticos, novas quests.

Criterios de aceite: em 10 segundos, a crianca entende que pode explorar/customizar/conquistar; o responsavel entende seguranca/educacao/assinatura cosmetica; Babylon continua lazy-loaded.

Metricas esperadas: `title_play_clicked`, `title_family_area_clicked`, taxa de criacao de perfil, taxa de acesso a `/familia`.

Riscos: tela parecer marketing demais; linguagem adulta invadir o fluxo infantil; sugerir por engano que precisa pagar para aprender.

### 2. Pre-venda responsavel antes do login

Prioridade: P0

Problema / hipotese: pedir login antes de explicar valor reduz conversao do responsavel.

Usuario beneficiado: responsavel ainda nao cadastrado.

Escopo: uma camada antes de login no `/familia` com preco, beneficios, seguranca, privacidade, cancelamento e regra de aprendizagem gratis.

Fora de escopo: mudar checkout, plano anual, teste de preco.

Criterios de aceite: responsavel entende o que paga antes de criar conta; checkout continua atras de login e parental gate; nao ha promessa que o produto ainda nao cumpra.

Metricas esperadas: `family_landing_viewed`, `parent_signup_started`, `checkout_started`.

Riscos: prometer relatorio/email para familias externas antes do dominio Resend estar verificado; excesso de texto.

### 3. Instrumentacao de funil comercial e social

Prioridade: P0

Problema / hipotese: as metricas atuais cobrem sessao e quest, mas ainda faltam eventos para medir home, responsavel, assinatura e social.

Usuario beneficiado: PO/produto.

Escopo: eventos anonimos/minimizados para cliques da home, abertura de `/familia`, parental gate, cadastro, checkout, pareamento, lojinha, amigos.

Fora de escopo: dashboard sofisticado, ferramenta paga, coleta de PII da crianca.

Criterios de aceite: eventos nao quebram jogo se falharem; payload nao inclui nome real, email da crianca, resposta de quest ou chat; documentar catalogo de eventos.

Metricas esperadas: funil visitante -> perfil -> quest -> retorno -> responsavel -> checkout.

Riscos: excesso de eventos gerar custo; metadados acabarem expondo dado infantil.

## Backlog P1 - Retencao saudavel e social seguro

### 4. Status de amigos com privacidade

Prioridade: P1

Problema / hipotese: saber que amigos existem/estao ativos aumenta retorno, mas horario preciso pode expor padrao de rotina infantil.

Usuario beneficiado: crianca que joga com amigos.

Escopo: mostrar estados seguros como `online agora`, `jogou recentemente`, `faz alguns dias`, sem horario exato. Atualizar `FriendsPanel` e backend conforme plano do lab-158.

Fora de escopo: chat livre, DM, notificacao push, localizacao, horario detalhado.

Criterios de aceite: nenhum dado pessoal novo; sem mostrar ultimo acesso exato; rate limit preservado; testes de dominio/backend.

Metricas esperadas: retorno D1/D7 de usuarios com amigos, abertura de painel de amigos, pedidos enviados/aceitos.

Riscos: criar ansiedade social; aumentar superficie de contato com desconhecidos.

### 5. Perfil publico seguro de amigo

Prioridade: P1

Problema / hipotese: criancas valorizam identidade, avatar e conquistas. Um perfil seguro de amigo pode aumentar motivacao sem precisar de texto livre.

Usuario beneficiado: crianca e grupo de amigos.

Escopo: visualizar avatar, pet equipado, serie, alguns badges/cartoes-postais e talvez casa em modo somente leitura no futuro.

Fora de escopo: bio livre, foto, comentario, mural, troca de itens, comparacao agressiva.

Criterios de aceite: perfil contem apenas dados de jogo; nao contem nome real, email, contato, texto livre; bloquear/remover amigo remove acesso ao perfil.

Metricas esperadas: abertura de perfil, retorno semanal, taxa de amizade aceita.

Riscos: status visual virar pressao de compra; constrangimento por comparacao.

### 6. Missoes sociais cooperativas sem comunicacao livre

Prioridade: P1

Problema / hipotese: cooperacao aumenta engajamento quando o objetivo e claro e a comunicacao pode ser feita por emotes/mensagens prontas.

Usuario beneficiado: criancas jogando juntas.

Escopo: pequenas tarefas cooperativas: visitar mesma escola, completar desafio semanal, achar cartao-postal, ver pet/casa do amigo.

Fora de escopo: chat livre, salas privadas complexas, matchmaking com desconhecidos sem guardrails.

Criterios de aceite: solo continua funcional; social nao bloqueia aprendizagem; mensagens continuam catalogadas.

Metricas esperadas: sessoes com 2+ jogadores, missao social iniciada/concluida, retorno de usuario com amigo.

Riscos: dependencia de amigo reduzir satisfacao solo; abuso de convites.

## Backlog P1 - Monetizacao etica

### 7. Vitrine de beneficios de assinatura no `/familia`

Prioridade: P1

Problema / hipotese: o responsavel precisa ver valor concreto antes de assinar, e a crianca nao deve receber pressao direta.

Usuario beneficiado: responsavel comprador.

Escopo: preview de cosmeticos, casa/decoracao premium, relatorio, backup/restauracao, preco e cancelamento. Texto explicito: `conteudo educativo sempre gratis`.

Fora de escopo: desconto por urgencia, contador regressivo, loot box, teste A/B de preco.

Criterios de aceite: checkout so aparece no portal do responsavel; nenhum beneficio pedagógico exclusivo; copiar nao promete vantagem em quest, XP ou ranking.

Metricas esperadas: visualizacao da vitrine, clique em checkout, conclusao de pareamento.

Riscos: parecer pay-to-win; prometer envio de email amplo antes de resolver dominio Resend.

### 8. Preview de relatorio semanal

Prioridade: P1

Problema / hipotese: relatorio e um dos beneficios mais fortes para o responsavel, mas precisa ser demonstravel antes da compra.

Usuario beneficiado: responsavel.

Escopo: bloco de exemplo ou preview local com nivel, missoes concluidas, habilidades praticadas e sugestao de conversa com a crianca.

Fora de escopo: diagnostico pedagogico profundo, IA generativa, ranking escolar.

Criterios de aceite: dados sao minimos e explicados; sem expor respostas individuais da crianca; funciona mesmo sem assinatura como exemplo estatico ou preview local.

Metricas esperadas: clique em checkout apos ver relatorio, tempo na tela `/familia`.

Riscos: responsavel interpretar como avaliacao escolar formal; privacidade do progresso.

## Backlog P2 - Pesquisa e canais

### 9. Teste de 5 segundos da home

Prioridade: P2 como pesquisa, mas deve acontecer logo apos o lab da home.

Problema / hipotese: a nova home pode parecer clara para quem construiu, mas confusa para familias reais.

Usuario beneficiado: PO/produto.

Escopo: testar com 5 criancas e 5 responsaveis. Perguntar: `o que e isso?`, `onde voce clicaria?`, `e seguro?`, `tem que pagar o que?`.

Fora de escopo: pesquisa estatistica grande.

Criterios de aceite: registrar respostas anonimas e ajustar copy/UX se 2+ participantes errarem a proposta central.

Metricas esperadas: compreensao da proposta, intencao de jogar, confianca do responsavel.

Riscos: vies por testar so com familia/proximos.

### 10. Sessao observada de primeira jogatina

Prioridade: P2

Problema / hipotese: a aderencia real depende de a crianca sentir diversao antes de se cansar/confundir.

Usuario beneficiado: crianca nova.

Escopo: sessao de 15-20 minutos observada, sem instruir demais. Medir tempo ate movimento fluido, primeira quest, primeira recompensa, abertura de loja/amigos/pet.

Fora de escopo: teste escolar formal.

Criterios de aceite: documentar 5 maiores pontos de atrito; transformar os 2 maiores em labs.

Metricas esperadas: tempo ate primeira recompensa, pedido espontaneo para continuar, confusoes de controle.

Riscos: uma crianca muito experiente em Roblox enviesar para cima; uma crianca sem familiaridade enviesar para baixo.

### 11. Teardown competitivo

Prioridade: P2

Problema / hipotese: Missao Aprender precisa se posicionar contra jogos sociais e edtechs, nao so contra outros quizzes.

Usuario beneficiado: PO/marketing/produto.

Escopo: comparar Roblox, Minecraft Education, Prodigy, Duolingo, Kahoot/Quizizz e jogos infantis populares no Brasil por: gancho inicial, loop, social, avatar, monetizacao, seguranca, proposta para pais.

Fora de escopo: copiar mecanicas predatorias.

Criterios de aceite: tabela com oportunidades replicaveis eticamente e mecanicas proibidas/arriscadas.

Metricas esperadas: lista de hipoteses de produto priorizadas.

Riscos: adotar FOMO/loot/gacha por parecer eficiente.

## Recomendacao de sequencia

1. Finalizar o lab da home dupla.
2. Fazer o pre-login do `/familia` com proposta de valor clara.
3. Completar instrumentacao de funil.
4. Retomar social com status de amigos seguro.
5. Fazer teste real de 5 segundos e primeira sessao observada.

A pergunta principal desta fase e: `O jogo ja tem uma proposta que uma crianca quer jogar e um responsavel entende/confiaria em permitir ou pagar?`
