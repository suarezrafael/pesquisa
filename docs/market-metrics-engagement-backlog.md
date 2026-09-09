# Missão Aprender - Backlog guiado por métricas de mercado

Data: 2026-09-09  
Branch base: `main`, considerando o estado registrado após o `lab-162-amigos-status-online`.

Este documento transforma a visão de produto do Missão Aprender em um backlog de crescimento, engajamento infantil e conversão responsável. A intenção não é afirmar que o jogo terá aderência por ter uma lista grande de recursos. A intenção é definir quais recursos precisam existir, quais métricas precisam mover e quais validações precisam provar que crianças querem voltar e que responsáveis entendem valor suficiente para pagar.

Regra inegociável mantida: conteúdo educativo, progresso, cooperação e aprendizagem nunca ficam atrás de assinatura. A assinatura pode destravar apenas cosméticos, conveniência visual, personalização, relatórios e recursos para o responsável, sem pay-to-win, loot boxes, gacha, recompensa aleatória paga ou pressão direta sobre a criança.

## 1. Hipóteses de mercado

1. Crianças por volta de 10 anos tendem a engajar mais quando o produto combina identidade, exploração, coleção, progresso visível, social seguro e objetivos curtos, como ocorre em jogos de grande retenção infantil e tween.
2. Pais e responsáveis tendem a aceitar melhor assinatura quando enxergam segurança, benefício educacional verificável, ausência de chat livre, ausência de compra abusiva e transparência sobre o que é grátis e o que é pago.
3. O Missão Aprender pode se posicionar entre jogo 3D de exploração e edtech familiar se a aprendizagem estiver integrada ao loop de aventura, não apenas anexada como quiz obrigatório.
4. A conversão paga deve vir de confiança adulta e conveniência familiar, não de frustração infantil.
5. Recursos sociais podem aumentar retorno e tempo de sessão, mas só devem crescer com controles fortes de privacidade, abuso, limites de amizade e comunicação fechada.

## 2. O que já sabemos pelo produto atual

Pelo estado atual do repo e dos labs concluídos, o produto já tem bases importantes:

- Home com separação entre criança e responsável, criada no `lab-161-home-dupla-crianca-responsavel`.
- Área do responsável com proposta de educação, segurança e assinatura fora do fluxo infantil.
- Planeta 3D, avatar, pets, casa, garagem, planetas, quizzes, progresso local, sessão, streak, missões e cosméticos.
- Multiplayer seguro por WebSocket, catálogo de chat fechado e sistema de amigos com status online/último acesso no `lab-162-amigos-status-online`.
- Backend com rotas de conta, assinatura, Stripe, entitlement, pairing familiar, relatório e backup de progresso, conforme plano comercial.
- Telemetria básica para entrada, sessão, cliques de jogar e área do responsável, missões, quiz e interações principais.

O ponto crítico agora é transformar essa coleção de recursos em um ciclo claro de ativação, retenção e confiança: entrar, entender, jogar, aprender, ganhar algo, querer voltar, e permitir que o responsável veja valor sem prejudicar a criança que continua grátis.

## 3. Métricas de mercado usadas como referência

Estas referências não provam aderência do Missão Aprender por si só. Elas mostram padrões de mercado que devemos testar no produto.

- Roblox mantém escala global de engajamento em seus relatórios trimestrais e destaca DAUs, horas engajadas e retenção como métricas centrais. Sinal de mercado: mundos sociais, identidade, descoberta e presença de pares são motores fortes, mas exigem investimento contínuo em segurança e moderação. Para números do trimestre mais recente, consultar diretamente os releases em [Roblox Investor Relations](https://ir.roblox.com/).
- Minecraft Education comunica uso em mais de 40.000 sistemas escolares, em 140 países, combinando mundo imersivo, criatividade, colaboração e confiança institucional. Sinal de mercado: o jogo educativo ganha força quando a aprendizagem vive dentro de um mundo explorável e cooperativo. Fonte: [Minecraft Education](https://education.minecraft.net/en-us).
- Duolingo declara crescimento orientado por produto, testes A/B, crescimento orgânico, melhoria de ensino e conversão de assinantes. Sinal de mercado: hábito, feedback imediato, progressão clara e testes constantes sustentam aquisição e retenção em edtech B2C. Fonte: [Duolingo Investor Relations](https://investors.duolingo.com/).
- Prodigy mantém conteúdos de Matemática e Inglês gratuitos e monetiza com opções para pais. Sinal de mercado: o modelo freemium infantil precisa preservar acesso educacional e vender valor adulto, personalização ou apoio familiar. Fonte: [Prodigy](https://www.prodigygame.com/).
- O FTC/COPPA reforça controle parental e consentimento verificável para coleta de informações de crianças. Sinal de mercado: segurança e privacidade não são detalhe de UX, são parte do produto vendável. Fonte: [FTC - Children's Privacy](https://www.ftc.gov/business-guidance/privacy-security/childrens-privacy).
- Guias de compra para responsáveis destacam atenção a compras no jogo, recompensas aleatórias, comunicação online, UGC e controles parentais. Sinal de mercado: a tela de monetização precisa ser adulta, clara e auditável. Fonte: [Good Housekeeping - buying a kid a video game](https://www.goodhousekeeping.com/childrens-products/a71486338/what-to-consider-before-buying-your-kid-a-video-game/).
- Relatórios de mercado sobre game-based learning variam em números, mas apontam crescimento alto do segmento, frequentemente acima de 20% de CAGR em projeções públicas recentes. Como há variação entre fornecedores, use esse dado como direção de oportunidade, não como TAM definitivo. Fontes de referência: [MarketsandMarkets](https://www.marketsandmarkets.com/), [Grand View Research](https://www.grandviewresearch.com/) e [Technavio](https://www.technavio.com/).

## 4. North Star e métricas de decisão

### North Star

`validated_child_learning_sessions_per_week`

Definição: número semanal de sessões únicas de perfis infantis em que a criança joga pelo menos 8 minutos, completa pelo menos 1 desafio educativo e recebe feedback ou recompensa de progresso. Excluir sessões quebradas, sessões apenas do portal do responsável e sessões sem ação educativa.

Por que esta métrica: ela força o produto a equilibrar diversão, tempo de jogo e aprendizagem real. Não adianta só abrir o jogo, só responder quiz ou só visitar loja.

### Métricas primárias

1. Ativação infantil: `% de novos perfis que completam o primeiro ciclo jogar + aprender + recompensa em até 10 minutos`.
   - Alvo inicial de MVP: 45% a 60%.
   - Alvo após polimento: 65% a 75%.
   - Pergunta respondida: a criança entendeu o que fazer e sentiu recompensa rápido?

2. Retenção infantil: D1, D7 e sessões por semana.
   - Alvo inicial orgânico: D1 >= 25%, D7 >= 10%.
   - Alvo pós-ajuste de loops: D1 >= 35%, D7 >= 18%.
   - Pergunta respondida: o jogo gera vontade de voltar sem pressão artificial?

3. Confiança do responsável: `% de responsáveis que entendem corretamente o que é grátis, o que é pago, como a criança se comunica e por que é seguro`.
   - Alvo qualitativo inicial: 8 de 10 responsáveis explicam corretamente após ver a home e `/familia`.
   - Alvo quantitativo posterior: taxa de criação de conta familiar e checkout iniciado por visitantes da área do responsável.
   - Pergunta respondida: o adulto enxerga valor e segurança antes de preço?

4. Conversão adulta ética: `paid_conversion_from_parent_area`.
   - Alvo inicial exploratório: 3% a 5% dos visitantes qualificados da área do responsável iniciam checkout.
   - Alvo mais maduro: 5% a 8% iniciam checkout, com churn e refund saudáveis.
   - Guardrail: zero bloqueio educacional por assinatura.

### Métricas de apoio

- `title_play_click_rate`: clique em “Jogar agora” na home.
- `parent_area_click_rate`: clique em “Área do responsável”.
- `time_to_first_control`: segundos até conseguir controlar personagem ou interagir.
- `time_to_first_learning_challenge`: segundos até o primeiro desafio educativo.
- `time_to_first_reward`: segundos até recompensa não paga.
- `quest_completion_rate`: missões iniciadas versus concluídas.
- `quiz_completion_rate` e `quiz_retry_rate`.
- `avatar_customization_rate`, `pet_interaction_rate`, `house_visit_rate`.
- `friend_request_sent_rate`, `friend_accept_rate`, `safe_social_session_rate`.
- `weekly_report_view_rate`, `parent_pairing_completion_rate`.
- `shop_open_rate_child`, monitorado apenas como risco de pressão, não como meta de monetização infantil.

### Guardrails obrigatórios

- `paid_education_gate_count = 0`.
- `paid_random_reward_count = 0`.
- `child_direct_checkout_entrypoints = 0`.
- `free_chat_messages = 0`.
- `open_ugc_publish_count = 0` até existir moderação adulta adequada.
- Taxa de nomes bloqueados e tentativas suspeitas acompanhada por logs sem PII infantil.
- P95 de carregamento até primeira interação em dispositivos modestos dentro de meta definida pelo time técnico.
- Eventos de abuso social, spam de amizade e denúncias devem ser menores que limites definidos antes de escalar aquisição.

## 5. Matriz de recursos necessários para competir por atenção

| Mecanismo de mercado | Por que importa | Estado atual | Lacuna principal | Métrica de prova |
| --- | --- | --- | --- | --- |
| Fantasia jogável imediata | Criança decide rápido se é jogo de verdade | Parcial após lab 161 | Primeiro objetivo ainda precisa ficar guiado e inevitavelmente compreensível | Ativação em 10 min |
| Identidade e avatar | Crianças se apegam ao personagem e aparência | Bom | Presets, progressão visual e comparação segura com amigos | Customização no D0 e D1 |
| Coleção e progresso | Colecionáveis dão motivo para voltar | Bom | Álbum central e metas de coleção claras | Retenção D7, itens conquistados |
| Pets e vínculo emocional | Pet cria rotina leve e cuidado recorrente | Bom | Rotina educativa com pet sem punição por ausência | Retorno D1/D7, interação com pet |
| Social seguro | Presença de amigos aumenta retorno | Forte, com amigos/status | Cooperação segura e perfil público limitado | Sessões com amigo, convites aceitos |
| Casa e personalização | Criança sente posse do mundo | Bom | Visita somente leitura e showcase sem UGC aberto | Visitas, edição de casa, retorno |
| Aprendizagem integrada | Edtech precisa parecer jogo, não prova | Parcial | Quests que dependem de lógica/leitura dentro do mundo | Desafios completos por sessão |
| Confiança parental | Adulto paga quando entende segurança e valor | Parcial/bom após lab 161 | Página familiar mais objetiva, relatório demonstrável, termos claros | Compreensão 8/10, signup familiar |
| Monetização ética | Evita risco reputacional e aumenta confiança | Base já existe | Tela “grátis vs pago” e benefícios cosméticos/conveniência | Checkout adulto, churn, refund |
| Medição e experimentação | Sem dados, backlog vira opinião | Parcial | Catálogo de eventos, dashboard semanal e experimentos simples | Eventos completos, decisões por coorte |

## 6. Backlog de implementação

### Lab 163 - Jornada de ativação de 10 minutos

- Problema / hipótese: crianças novas podem ver muitos recursos, mas não necessariamente entendem o primeiro objetivo. Se a primeira sessão levar a criança por jogar, aprender e ganhar algo em até 10 minutos, a retenção D1 deve subir.
- Usuário beneficiado: criança nova.
- Escopo: objetivo guiado no primeiro acesso, marcador visual no planeta, primeira missão curta, primeiro desafio educativo contextual, primeira recompensa grátis, evento de conclusão e estado salvo.
- Fora de escopo: assinatura, loja paga, multiplayer complexo e novo planeta.
- Critérios de aceite: criança entra por “Jogar agora”, entende para onde ir, completa missão, responde desafio, recebe recompensa não paga e vê próximo objetivo; tudo sem criar conta adulta.
- Métricas esperadas: ativação em 10 min, `time_to_first_learning_challenge`, `time_to_first_reward`, D1 por coorte.
- Riscos: tutorial longo demais, excesso de texto, recompensa parecer compra.
- Prioridade: P0.

### Lab 164 - Catálogo de eventos e dashboard semanal de produto

- Problema / hipótese: sem eventos padronizados, não dá para saber se os recursos geram engajamento real.
- Usuário beneficiado: PO, UX, dev e responsável pelo negócio.
- Escopo: documentar taxonomia de eventos, nomes, propriedades permitidas, métricas derivadas e dashboard simples para ativação, retenção, social, aprendizagem e conversão adulta.
- Fora de escopo: ferramenta BI externa, tracking com PII infantil e compra de mídia.
- Critérios de aceite: cada métrica primária tem eventos mapeados; eventos infantis não carregam PII; dashboard ou relatório técnico mostra funil semanal.
- Métricas esperadas: cobertura de eventos >= 90% para funis definidos; decisões de backlog referenciam pelo menos uma métrica.
- Riscos: excesso de eventos, custo de armazenamento, coleta indevida de dados infantis.
- Prioridade: P0.

### Lab 165 - Página familiar com proposta paga transparente

- Problema / hipótese: responsáveis precisam entender em até 10 segundos que o jogo é educativo, seguro, sem chat livre e sem compras abusivas; também precisam entender que a assinatura não bloqueia aprendizagem.
- Usuário beneficiado: responsável.
- Escopo: evolução de `/familia` com seções de segurança, aprendizado, grátis vs pago, exemplo de relatório, preço, cancelamento, privacidade e ausência de pay-to-win.
- Fora de escopo: checkout novo, desconto, campanha paga e coleta de dados sensíveis.
- Critérios de aceite: responsável consegue diferenciar grátis e pago sem ler termos longos; CTA de assinatura aparece apenas no fluxo adulto; preço e benefícios são claros.
- Métricas esperadas: compreensão 8/10 em teste moderado; `parent_area_click_rate`; `parent_signup_rate`; `checkout_started_rate`.
- Riscos: copy parecer promessa pedagógica não comprovada; excesso de informação; preço aparecer perto demais do fluxo infantil.
- Prioridade: P0.

### Lab 166 - Mapa de habilidades e relatório de aprendizagem

- Problema / hipótese: pais pagam mais quando enxergam progresso verificável em habilidades, não apenas tempo de tela.
- Usuário beneficiado: responsável e criança.
- Escopo: mapear desafios a habilidades como lógica, matemática, leitura e resolução de problemas; mostrar resumo no portal familiar e no relatório semanal.
- Fora de escopo: diagnóstico clínico, ranking escolar, nota formal e promessa de melhoria acadêmica garantida.
- Critérios de aceite: cada desafio tem habilidade associada; relatório mostra pontos fortes, pontos a praticar e atividade sugerida; linguagem é compreensível para adulto.
- Métricas esperadas: `weekly_report_view_rate`, `parent_return_rate`, intenção de pagamento em entrevista.
- Riscos: parecer avaliação escolar; dados insuficientes para inferências fortes; ansiedade dos pais.
- Prioridade: P0.

### Lab 167 - Álbum central de conquistas e coleções

- Problema / hipótese: coleção visível aumenta retorno porque dá à criança uma meta concreta e compartilhável de forma segura.
- Usuário beneficiado: criança.
- Escopo: tela de álbum com medalhas, pets, cosméticos conquistados, planetas visitados e conquistas educativas; destacar próximos itens ganháveis grátis.
- Fora de escopo: recompensas aleatórias, itens pagos com vantagem, ranking público aberto.
- Critérios de aceite: criança vê o que já ganhou e o próximo objetivo; itens pagos ficam claramente separados como personalização adulta/premium sem travar progresso.
- Métricas esperadas: D7, itens conquistados por semana, retorno após visualizar álbum.
- Riscos: virar pressão de completismo; confundir item premium com progresso educacional.
- Prioridade: P1.

### Lab 168 - Rotina diária saudável com pet

- Problema / hipótese: pet pode criar hábito sem FOMO se a rotina recompensa prática curta e não pune ausência.
- Usuário beneficiado: criança.
- Escopo: missão diária curta com pet, cuidado visual, desafio educativo leve, recompensa grátis e mensagem positiva mesmo após dias sem entrar.
- Fora de escopo: perda de item por ausência, streak punitivo, cobrança para recuperar sequência.
- Critérios de aceite: pet nunca adoece por falta de login; criança recebe convite para jogar, não culpa; streak é apresentado como celebração, não ameaça.
- Métricas esperadas: D1, D7, sessões por semana, interação com pet.
- Riscos: mecânica parecer obrigação; rotina competir com limites familiares de tempo de tela.
- Prioridade: P1.

### Lab 169 - Perfil público seguro de amigo

- Problema / hipótese: ver amigos aumenta desejo de voltar, mas a superfície social precisa expor apenas dados seguros.
- Usuário beneficiado: criança e responsável.
- Escopo: perfil limitado com avatar, pet, conquistas não sensíveis, status online e botões de ação seguros; sem texto livre, sem idade, sem localização, sem escola.
- Fora de escopo: bio livre, imagem enviada, comentários e mensagens abertas.
- Critérios de aceite: perfil não expõe PII; ações sociais passam por catálogo fechado; responsável entende o limite social.
- Métricas esperadas: `safe_social_session_rate`, `friend_accept_rate`, retorno D7 em crianças com amigo.
- Riscos: comparação social excessiva; spam de amizade; identificação indireta por nickname.
- Prioridade: P1.

### Lab 170 - Desafios cooperativos fechados

- Problema / hipótese: cooperação segura pode gerar engajamento mais forte do que competição, alinhando diversão e aprendizado.
- Usuário beneficiado: crianças amigas.
- Escopo: desafio em dupla ou grupo pequeno com objetivos educativos complementares, chat fechado e recompensa coletiva grátis.
- Fora de escopo: matchmaking aberto com desconhecidos, chat livre, placar global.
- Critérios de aceite: crianças conseguem completar um objetivo cooperativo sem comunicação livre; progresso educacional não depende de assinatura.
- Métricas esperadas: sessões com amigo, conclusão cooperativa, retenção D7 de crianças com cooperação.
- Riscos: criança sem amigo se sentir excluída; abuso de convites; complexidade técnica multiplayer.
- Prioridade: P1.

### Lab 171 - Casa visitável somente leitura

- Problema / hipótese: mostrar a casa para amigos aumenta senso de posse e retorno sem abrir UGC perigoso.
- Usuário beneficiado: criança.
- Escopo: visita segura à casa de amigo, apenas leitura, com catálogo de reações fechadas e limites de frequência.
- Fora de escopo: texto livre, desenho livre, upload, decoração ofensiva criada por usuário.
- Critérios de aceite: visitante não altera nada; proprietário controla visibilidade; itens são do catálogo aprovado.
- Métricas esperadas: visitas por criança, edição de casa após visita, retorno D7.
- Riscos: decoração formar mensagens indiretas; pressão por item premium.
- Prioridade: P1.

### Lab 172 - Vitrine ética de assinatura

- Problema / hipótese: conversão aumenta quando o adulto entende exatamente o que ganha sem afetar justiça do jogo.
- Usuário beneficiado: responsável.
- Escopo: comparação entre grátis e pago, benefícios permitidos, preço, teste de copy, política de cancelamento e prova de que aprendizagem continua grátis.
- Fora de escopo: promoção agressiva, pop-up infantil, timer falso, desconto com urgência artificial.
- Critérios de aceite: CTA pago só no fluxo adulto; copy afirma explicitamente que conteúdo educativo e progresso são grátis; benefícios premium são cosméticos, relatórios ou conveniência familiar.
- Métricas esperadas: checkout iniciado, conversão paga, churn, refund, compreensão parental.
- Riscos: parecer venda para criança; valor pago fraco se relatórios não forem úteis.
- Prioridade: P1.

### Lab 173 - Preview de relatório semanal antes da assinatura

- Problema / hipótese: mostrar um exemplo realista de relatório aumenta confiança e intenção de pagar.
- Usuário beneficiado: responsável.
- Escopo: relatório de demonstração com dados fictícios claramente marcados, mostrando habilidades praticadas, tempo de jogo, conquistas e sugestão de conversa familiar.
- Fora de escopo: dados inventados como se fossem da criança, diagnóstico pedagógico formal, comparação com outras crianças.
- Critérios de aceite: preview é acessível antes de pagar; responsável entende o benefício; o exemplo não coleta PII.
- Métricas esperadas: clique em preview, signup familiar, checkout iniciado, compreensão 8/10.
- Riscos: expectativa maior que a entrega real; relatório virar promessa educacional excessiva.
- Prioridade: P1.

### Lab 174 - Experimentos de aquisição familiar e escolar

- Problema / hipótese: o canal de aquisição mais saudável pode vir de pais, professores e indicação familiar, não de publicidade direta para crianças.
- Usuário beneficiado: negócio e responsáveis.
- Escopo: landing variants para responsável, professores e convite familiar; tracking de origem; mensagens sem manipulação infantil.
- Fora de escopo: anúncios pagos direcionados a criança, coleta de dados escolares sensíveis, parceria formal antes de validação.
- Critérios de aceite: cada canal tem proposta, CTA e métrica; mensagens são auditadas contra segurança infantil.
- Métricas esperadas: visitante qualificado, signup familiar, custo por signup se houver mídia, taxa de indicação.
- Riscos: comunicação parecer escolar oficial; promessa educativa não validada.
- Prioridade: P2.

### Lab 175 - Performance e primeira sessão mobile

- Problema / hipótese: parte relevante do público infantil acessa por máquinas e celulares modestos; se o jogo demora ou engasga, a proposta de valor morre antes do conteúdo.
- Usuário beneficiado: criança e responsável.
- Escopo: medir carregamento, FPS, peso de assets, primeira interação e responsividade em dispositivos alvo; ajustar assets críticos.
- Fora de escopo: reescrita total do 3D, suporte a dispositivos muito antigos sem WebGL estável.
- Critérios de aceite: metas de carregamento e FPS documentadas; regressões entram como bloqueio antes de campanha.
- Métricas esperadas: P95 até interativo, FPS médio, taxa de abandono no carregamento.
- Riscos: otimização consumir tempo demais; reduzir qualidade visual além do necessário.
- Prioridade: P1.

## 7. Backlog de pesquisa

### Pesquisa 1 - Teste de 5 segundos da home

- Problema / hipótese: criança e responsável precisam entender propostas diferentes em até 10 segundos.
- Usuário beneficiado: criança e responsável.
- Escopo: mostrar home por 5 a 10 segundos para 8 crianças e 8 responsáveis; perguntar o que dá para fazer, se parece seguro, se parece educativo e onde o adulto clicaria.
- Fora de escopo: teste de preço e sessão completa.
- Critérios de aceite: relatório com acertos, confusões e ajustes de copy/visual.
- Métricas esperadas: 80% das crianças identificam jogar/explorar/customizar; 80% dos adultos identificam educação/segurança/sem chat livre.
- Riscos: amostra pequena; crianças influenciadas por adulto presente.
- Prioridade: P0.

### Pesquisa 2 - Sessão moderada de primeira jogada

- Problema / hipótese: a criança precisa completar o primeiro ciclo sem instrução externa.
- Usuário beneficiado: criança.
- Escopo: observar 8 a 12 crianças jogando pela primeira vez por 15 minutos; medir tempo até ação, confusão, risos, frustração, missão concluída e vontade de continuar.
- Fora de escopo: multiplayer aberto e compra.
- Critérios de aceite: pelo menos 6 de 8 completam o primeiro ciclo sem ajuda crítica.
- Métricas esperadas: ativação em 10 min, tempo até recompensa, intenção de jogar de novo.
- Riscos: ambiente de teste artificial; hardware desigual.
- Prioridade: P0.

### Pesquisa 3 - Entrevista com responsáveis sobre assinatura

- Problema / hipótese: responsáveis pagam quando entendem valor educacional e segurança, mas rejeitam pressão sobre a criança.
- Usuário beneficiado: responsável e negócio.
- Escopo: entrevistar 10 a 15 responsáveis; testar página `/familia`, grátis vs pago, relatório, preço e preocupações.
- Fora de escopo: vender durante entrevista, coletar dados sensíveis da criança.
- Critérios de aceite: principais objeções, preço aceitável, termos que geram confiança e termos que geram rejeição.
- Métricas esperadas: 8/10 explicam modelo corretamente; intenção de teste pago; objeções ranqueadas.
- Riscos: intenção declarada maior que compra real; viés de cortesia.
- Prioridade: P0.

### Pesquisa 4 - Benchmark de concorrentes e comparáveis

- Problema / hipótese: recursos de engajamento devem ser escolhidos por padrões já provados, mas adaptados à ética infantil.
- Usuário beneficiado: PO e UX.
- Escopo: comparar Roblox, Minecraft Education, Prodigy, Duolingo, Kahoot, Blooket e apps educativos brasileiros quando relevantes; mapear loops, paywalls, segurança, social e parental value.
- Fora de escopo: copiar interface, usar mecânicas predatórias.
- Critérios de aceite: matriz com mecanismos replicáveis, mecanismos proibidos e ideias adaptadas ao Missão Aprender.
- Métricas esperadas: backlog revisado com evidência por lab.
- Riscos: copiar sem contexto; olhar só para gigantes globais.
- Prioridade: P1.

### Pesquisa 5 - Teste de preço e valor percebido

- Problema / hipótese: o preço precisa parecer justo para benefícios adultos e cosméticos, sem vender aprendizagem bloqueada.
- Usuário beneficiado: responsável e negócio.
- Escopo: testar faixas de preço, plano mensal/anual, relatório, cosméticos familiares e conveniência; usar survey simples e teste de landing.
- Fora de escopo: preço dinâmico para criança, desconto com urgência artificial.
- Critérios de aceite: faixa de preço recomendada, objeções, benefícios mais valorizados.
- Métricas esperadas: intenção de compra, checkout iniciado, conversão por variante.
- Riscos: amostra não representativa; intenção não virar pagamento.
- Prioridade: P1.

### Pesquisa 6 - Segurança percebida e linguagem de confiança

- Problema / hipótese: termos como “multiplayer”, “amigos” e “chat” podem assustar responsáveis se não forem explicados com precisão.
- Usuário beneficiado: responsável.
- Escopo: testar versões de copy sobre chat fechado, sem PII, sem UGC aberto, controle parental e assinatura ética.
- Fora de escopo: alterar mecanismo de segurança sem dev lab.
- Critérios de aceite: linguagem final que aumenta confiança sem esconder riscos.
- Métricas esperadas: compreensão, confiança declarada, queda de objeções.
- Riscos: copy jurídica demais; promessa de segurança absoluta.
- Prioridade: P1.

## 8. Definição de pronto para aquisição paga

Antes de investir em aquisição paga ou escalar lançamento público, o Missão Aprender deve atender a estes critérios mínimos:

- Pelo menos 50% dos novos perfis infantis completam o primeiro ciclo jogar + aprender + recompensa em até 10 minutos.
- D1 >= 25% e D7 >= 10% em coortes orgânicas ou de teste controlado.
- Pelo menos 8 de 10 crianças em teste moderado querem continuar jogando ou voltar outro dia.
- Pelo menos 8 de 10 responsáveis entendem corretamente o que é grátis, o que é pago, como funciona a segurança social e por que não há compra abusiva.
- Não existe checkout, preço, urgência comercial ou pedido de compra diretamente no fluxo infantil.
- Todo recurso educativo, progresso e cooperação essencial funciona sem assinatura.
- Social seguro não expõe PII, não tem chat livre, não tem UGC aberto e possui limites contra abuso.
- A página familiar tem proposta clara, preço claro, benefícios claros e política de cancelamento clara.
- Relatórios e métricas de aprendizagem mostram dados reais do jogo, sem prometer diagnóstico escolar ou resultado acadêmico garantido.
- Performance da primeira sessão é medida e aceita nos dispositivos alvo antes de campanha.

## 9. Recomendação priorizada para o próximo lab

Próximo lab recomendado: `lab-163-jornada-ativacao-10-minutos`.

Pergunta de mercado que ele responde: uma criança nova consegue chegar sozinha ao primeiro ciclo de diversão + aprendizagem + recompensa antes de desistir?

Motivo: nenhum recurso de social, assinatura, relatório ou aquisição compensa uma primeira sessão confusa. A ativação infantil é a ponte entre promessa de mercado e produto real. Se esse lab mover ativação e D1, o próximo passo natural é fortalecer a prova para responsáveis com `lab-165-pagina-familiar-com-proposta-paga-transparente` e `lab-166-mapa-de-habilidades-e-relatorio`.

## 10. Ordem sugerida dos próximos labs

1. `lab-163-jornada-ativacao-10-minutos` - provar ativação infantil.
2. `lab-164-catalogo-eventos-dashboard-produto` - medir funis e coortes corretamente.
3. `lab-165-pagina-familiar-com-proposta-paga-transparente` - provar compreensão e interesse adulto.
4. `lab-166-mapa-habilidades-relatorio-aprendizagem` - criar valor pago ético e verificável.
5. `lab-167-album-central-conquistas` - aumentar retorno por coleção e metas.
6. `lab-168-rotina-diaria-saudavel-pet` - aumentar hábito sem FOMO abusivo.
7. `lab-170-desafios-cooperativos-fechados` - testar social seguro como motor de retenção.
8. `lab-172-vitrine-etica-assinatura` - converter adulto com transparência.

A decisão de avançar para aquisição paga deve acontecer só depois que os labs 163 a 166 produzirem evidência mínima de ativação infantil, entendimento parental e valor educacional percebido.
