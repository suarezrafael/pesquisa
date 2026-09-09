# Missão Aprender - Backlog de Discovery, Mercado e Produto

Data: 2026-09-08

Este documento complementa `docs/business-analyst-prompt-backlog.md`. Ele existe para orientar os próximos laboratórios depois da melhoria da primeira tela/home, sem misturar pesquisa de mercado, UX, monetização e segurança infantil dentro de um único lab grande.

## Contexto atual

Estado considerado: lab-160 concluído.

O jogo já tem conteúdo suficiente para validar aderência inicial: mundo 3D, quests, planetas, casa, pets, cosméticos, ranking, login diário, cartões-postais, multiplayer seguro por catálogo e sistema de amigos com busca/pedido/aceite/recusa/remoção.

A prioridade de produto agora não é simplesmente aumentar escopo. A prioridade é responder quatro perguntas de negócio:

1. A criança entende rapidamente que isso é um jogo desejável, não só um quiz escolar?
2. O responsável entende rapidamente que é seguro, educativo e monetizado de forma ética?
3. O social aumenta retorno sem aumentar risco infantil de forma inaceitável?
4. A assinatura de R$ 4,99/mês tem valor percebido suficiente para o responsável?

## Princípios para os próximos labs

- Aprendizagem, progresso, quests, cooperação e conteúdo pedagógico continuam sempre grátis.
- Assinatura só pode liberar cosméticos, conveniência visual, casa/decoração premium e benefícios de responsável.
- Nenhum upsell deve ser pressionado diretamente contra a criança.
- Nenhum lab social deve introduzir texto livre, UGC aberto, foto, áudio, vídeo ou dado de contato.
- Toda recomendação de produto deve ter métrica ou teste de validação associado.
- Preferir labs pequenos que testem uma hipótese por vez.

## Backlog P0 - Aderência e funil inicial

### 1. Home dupla criança/responsável

Prioridade: P0

Problema / hipótese: a primeira tela precisa vender duas promessas diferentes sem confundir: diversão para a criança e confiança para o responsável.

Usuário beneficiado: criança nova, responsável avaliando o produto.

Escopo: CTA principal para jogar, CTA secundário para área dos responsáveis, prova visual do jogo, sinais de confiança, promessa de monetização ética.

Fora de escopo: checkout direto, mudanças de Stripe, novos cosméticos, novas quests.

Critérios de aceite: em 10 segundos, a criança entende que pode explorar/customizar/conquistar; o responsável entende segurança/educação/assinatura cosmética; Babylon continua lazy-loaded.

Métricas esperadas: `title_play_clicked`, `title_family_area_clicked`, taxa de criação de perfil, taxa de acesso a `/familia`.

Riscos: tela parecer marketing demais; linguagem adulta invadir o fluxo infantil; sugerir por engano que precisa pagar para aprender.

### 2. Pré-venda responsável antes do login

Prioridade: P0

Problema / hipótese: pedir login antes de explicar valor reduz conversão do responsável.

Usuário beneficiado: responsável ainda não cadastrado.

Escopo: uma camada antes de login no `/familia` com preço, benefícios, segurança, privacidade, cancelamento e regra de aprendizagem grátis.

Fora de escopo: mudar checkout, plano anual, teste de preço.

Critérios de aceite: responsável entende o que paga antes de criar conta; checkout continua atrás de login e parental gate; não há promessa que o produto ainda não cumpra.

Métricas esperadas: `family_landing_viewed`, `parent_signup_started`, `checkout_started`.

Riscos: prometer relatório/email para famílias externas antes do domínio Resend estar verificado; excesso de texto.

### 3. Instrumentação de funil comercial e social

Prioridade: P0

Problema / hipótese: as métricas atuais cobrem sessão e quest, mas ainda faltam eventos para medir home, responsável, assinatura e social.

Usuário beneficiado: PO/produto.

Escopo: eventos anônimos/minimizados para cliques da home, abertura de `/familia`, parental gate, cadastro, checkout, pareamento, lojinha, amigos.

Fora de escopo: dashboard sofisticado, ferramenta paga, coleta de PII da criança.

Critérios de aceite: eventos não quebram jogo se falharem; payload não inclui nome real, email da criança, resposta de quest ou chat; documentar catálogo de eventos.

Métricas esperadas: funil visitante -> perfil -> quest -> retorno -> responsável -> checkout.

Riscos: excesso de eventos gerar custo; metadados acabarem expondo dado infantil.

## Backlog P1 - Retenção saudável e social seguro

### 4. Status de amigos com privacidade

Prioridade: P1

Problema / hipótese: saber que amigos existem/estão ativos aumenta retorno, mas horário preciso pode expor padrão de rotina infantil.

Usuário beneficiado: criança que joga com amigos.

Escopo: mostrar estados seguros como `online agora`, `jogou recentemente`, `faz alguns dias`, sem horário exato. Atualizar `FriendsPanel` e backend conforme plano do lab-158.

Fora de escopo: chat livre, DM, notificação push, localização, horário detalhado.

Critérios de aceite: nenhum dado pessoal novo; sem mostrar último acesso exato; rate limit preservado; testes de domínio/backend.

Métricas esperadas: retorno D1/D7 de usuários com amigos, abertura de painel de amigos, pedidos enviados/aceitos.

Riscos: criar ansiedade social; aumentar superfície de contato com desconhecidos.

### 5. Perfil público seguro de amigo

Prioridade: P1

Problema / hipótese: crianças valorizam identidade, avatar e conquistas. Um perfil seguro de amigo pode aumentar motivação sem precisar de texto livre.

Usuário beneficiado: criança e grupo de amigos.

Escopo: visualizar avatar, pet equipado, série, alguns badges/cartões-postais e talvez casa em modo somente leitura no futuro.

Fora de escopo: bio livre, foto, comentário, mural, troca de itens, comparação agressiva.

Critérios de aceite: perfil contém apenas dados de jogo; não contém nome real, email, contato, texto livre; bloquear/remover amigo remove acesso ao perfil.

Métricas esperadas: abertura de perfil, retorno semanal, taxa de amizade aceita.

Riscos: status visual virar pressão de compra; constrangimento por comparação.

### 6. Missões sociais cooperativas sem comunicação livre

Prioridade: P1

Problema / hipótese: cooperação aumenta engajamento quando o objetivo é claro e a comunicação pode ser feita por emotes/mensagens prontas.

Usuário beneficiado: crianças jogando juntas.

Escopo: pequenas tarefas cooperativas: visitar mesma escola, completar desafio semanal, achar cartão-postal, ver pet/casa do amigo.

Fora de escopo: chat livre, salas privadas complexas, matchmaking com desconhecidos sem guardrails.

Critérios de aceite: solo continua funcional; social não bloqueia aprendizagem; mensagens continuam catalogadas.

Métricas esperadas: sessões com 2+ jogadores, missão social iniciada/concluída, retorno de usuário com amigo.

Riscos: dependência de amigo reduzir satisfação solo; abuso de convites.

## Backlog P1 - Monetização ética

### 7. Vitrine de benefícios de assinatura no `/familia`

Prioridade: P1

Problema / hipótese: o responsável precisa ver valor concreto antes de assinar, e a criança não deve receber pressão direta.

Usuário beneficiado: responsável comprador.

Escopo: preview de cosméticos, casa/decoração premium, relatório, backup/restauração, preço e cancelamento. Texto explícito: `conteúdo educativo sempre grátis`.

Fora de escopo: desconto por urgência, contador regressivo, loot box, teste A/B de preço.

Critérios de aceite: checkout só aparece no portal do responsável; nenhum benefício pedagógico exclusivo; a copy não promete vantagem em quest, XP ou ranking.

Métricas esperadas: visualização da vitrine, clique em checkout, conclusão de pareamento.

Riscos: parecer pay-to-win; prometer envio de email amplo antes de resolver domínio Resend.

### 8. Preview de relatório semanal

Prioridade: P1

Problema / hipótese: relatório é um dos benefícios mais fortes para o responsável, mas precisa ser demonstrável antes da compra.

Usuário beneficiado: responsável.

Escopo: bloco de exemplo ou preview local com nível, missões concluídas, habilidades praticadas e sugestão de conversa com a criança.

Fora de escopo: diagnóstico pedagógico profundo, IA generativa, ranking escolar.

Critérios de aceite: dados são mínimos e explicados; sem expor respostas individuais da criança; funciona mesmo sem assinatura como exemplo estático ou preview local.

Métricas esperadas: clique em checkout após ver relatório, tempo na tela `/familia`.

Riscos: responsável interpretar como avaliação escolar formal; privacidade do progresso.

## Backlog P2 - Pesquisa e canais

### 9. Teste de 5 segundos da home

Prioridade: P2 como pesquisa, mas deve acontecer logo após o lab da home.

Problema / hipótese: a nova home pode parecer clara para quem construiu, mas confusa para famílias reais.

Usuário beneficiado: PO/produto.

Escopo: testar com 5 crianças e 5 responsáveis. Perguntar: `o que é isso?`, `onde você clicaria?`, `é seguro?`, `tem que pagar o que?`.

Fora de escopo: pesquisa estatística grande.

Critérios de aceite: registrar respostas anônimas e ajustar copy/UX se 2+ participantes errarem a proposta central.

Métricas esperadas: compreensão da proposta, intenção de jogar, confiança do responsável.

Riscos: viés por testar só com família/próximos.

### 10. Sessão observada de primeira jogatina

Prioridade: P2

Problema / hipótese: a aderência real depende de a criança sentir diversão antes de se cansar/confundir.

Usuário beneficiado: criança nova.

Escopo: sessão de 15-20 minutos observada, sem instruir demais. Medir tempo até movimento fluido, primeira quest, primeira recompensa, abertura de loja/amigos/pet.

Fora de escopo: teste escolar formal.

Critérios de aceite: documentar 5 maiores pontos de atrito; transformar os 2 maiores em labs.

Métricas esperadas: tempo até primeira recompensa, pedido espontâneo para continuar, confusões de controle.

Riscos: uma criança muito experiente em Roblox enviesar para cima; uma criança sem familiaridade enviesar para baixo.

### 11. Teardown competitivo

Prioridade: P2

Problema / hipótese: Missão Aprender precisa se posicionar contra jogos sociais e edtechs, não só contra outros quizzes.

Usuário beneficiado: PO/marketing/produto.

Escopo: comparar Roblox, Minecraft Education, Prodigy, Duolingo, Kahoot/Quizizz e jogos infantis populares no Brasil por: gancho inicial, loop, social, avatar, monetização, segurança, proposta para pais.

Fora de escopo: copiar mecânicas predatórias.

Critérios de aceite: tabela com oportunidades replicáveis eticamente e mecânicas proibidas/arriscadas.

Métricas esperadas: lista de hipóteses de produto priorizadas.

Riscos: adotar FOMO/loot/gacha por parecer eficiente.

## Recomendação de sequência

1. Finalizar o lab da home dupla.
2. Fazer o pré-login do `/familia` com proposta de valor clara.
3. Completar instrumentação de funil.
4. Retomar social com status de amigos seguro.
5. Fazer teste real de 5 segundos e primeira sessão observada.

A pergunta principal desta fase é: `O jogo já tem uma proposta que uma criança quer jogar e um responsável entende/confiaria em permitir ou pagar?`
