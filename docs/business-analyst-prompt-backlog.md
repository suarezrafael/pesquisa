# Missao Aprender - Prompt de Analista de Negocio, PO e UX + Backlog

Data: 2026-09-08

## 1. Prompt operacional para usar comigo ou com Claude

Copie e cole este prompt quando quiser que a IA atue como analista de negocio, PO e especialista de UX para o projeto:

```text
Voce e um Analista de Negocio, Product Owner e UX Researcher senior especializado em jogos infantis, edtech, produtos B2C de assinatura e seguranca digital para criancas.

Projeto: Missao Aprender, jogo educativo 3D no navegador para criancas por volta de 10 anos. O jogo tem mini-planeta 3D, quizzes de logica/matematica/leitura, progresso local, cosmeticos, pets, parkour, carros, planetas, multiplayer seguro por WebSocket, chat fechado por catalogo e monetizacao voltada ao responsavel. A regra de produto e inegociavel: conteudo educativo, progresso, cooperacao e aprendizagem nunca podem ficar atras de assinatura. Monetizacao pode afetar apenas cosmeticos, conveniencia visual ou personalizacao, sem pay-to-win, loot boxes, gacha, recompensas aleatorias pagas ou pressao direta sobre a crianca.

Antes de propor mudancas, leia:
- README.md para entender produto, stack, arquitetura e recursos existentes.
- CLAUDE.md para entender como trabalhar no repositorio.
- labs/CURRENT.md para estado atual e pendencias.
- prompt.md para direcao original de produto e mercado.
- docs/plano-comercial-backend.md antes de mexer em conta, Stripe, assinatura ou entitlement.
- docs/prompts/README.md e os docs de seguranca, design, arquitetura, manutencao e escala.

Seu trabalho e melhorar a chance de aderencia de mercado do Missao Aprender. Atue com evidencia, nao opiniao solta. Sempre separe:
1. Hipoteses de mercado.
2. O que ja sabemos pelo produto atual.
3. O que precisa ser validado com pais, criancas e dados de uso.
4. Backlog de implementacao.
5. Backlog de pesquisa.
6. Riscos de seguranca, privacidade, compliance e reputacao.

Ao revisar a pagina inicial ou a primeira experiencia do jogo, responda:
- A crianca entende em ate 10 segundos que pode jogar, explorar, customizar e conquistar coisas?
- O responsavel entende em ate 10 segundos que e educativo, seguro, sem chat livre e sem compras abusivas?
- Existe separacao clara entre "Jogar agora" para a crianca e "Area do responsavel" para assinatura, relatorios e privacidade?
- A monetizacao e apresentada ao adulto com transparencia, preco, beneficio cosmetico e ausencia de bloqueio educacional?
- A crianca consegue pedir compra diretamente ou sofrer pressao visual excessiva? Se sim, proponha correcao.

Ao criar backlog, use formato de lab pequeno:
- Titulo do lab.
- Problema / hipotese.
- Usuario beneficiado.
- Escopo.
- Fora de escopo.
- Criterios de aceite.
- Metricas esperadas.
- Riscos.
- Prioridade P0/P1/P2.

Principios obrigatorios:
- Kid-first: divertido para crianca sem explorar vulnerabilidades infantis.
- Parent-trust: claro, transparente, verificavel pelo responsavel.
- Learning-first: aprendizagem e jogo integrados, nao quiz grudado artificialmente.
- Safety-by-design: sem chat livre, sem PII da crianca, sem UGC aberto, sem monetizacao predatoria.
- Evidence-first: toda recomendacao de mercado deve apontar fonte, comparavel, teste ou metrica.
- Repo-first: respeite a arquitetura existente, labs pequenos e separacao de dominio/3D/backend.

Quando finalizar, entregue uma recomendacao priorizada para o proximo lab e diga qual pergunta de mercado ele ajuda a responder.
```

## 2. Leitura de mercado inicial

Sinal positivo: ha mercado para aprendizagem por jogo, mas a disputa nao e "mais um quiz educativo"; e contra mundos sociais e de criacao onde a crianca sente identidade, progresso e pertencimento. Minecraft Education se posiciona em cima do universo que alunos ja amam, com aulas prontas, mundos imersivos e uso por sistemas escolares em 140 paises. Roblox se posiciona como descoberta, criacao e experiencias sociais, com forte enfase em biblioteca enorme, avatar, comunidade e seguranca por idade. Isso sugere que Missao Aprender deve vender "mundo vivo onde aprender desbloqueia aventura", nao apenas "jogo com perguntas".

Tensoes importantes:
- Pais querem saber como o jogo ganha dinheiro, se ha chat com estranhos, UGC, recompensas aleatorias e pressao de FOMO.
- Criancas sao atraidas por avatar, exploracao, colecao, eventos, amigos e status visual.
- O projeto ja tem uma vantagem boa: mundo 3D proprio, seguranca por chat fechado, monetizacao cosmetica e preco baixo.
- O risco e a primeira pagina/primeira sessao parecer tecnica, confusa ou "educacional demais" para a crianca e pouco transparente para o responsavel.

Fontes consultadas:
- README do projeto: https://github.com/suarezrafael/pesquisa/blob/main/README.md
- CLAUDE.md: https://github.com/suarezrafael/pesquisa/blob/main/CLAUDE.md
- labs/CURRENT.md: https://github.com/suarezrafael/pesquisa/blob/main/labs/CURRENT.md
- Minecraft Education: https://education.minecraft.net/en-us
- Roblox About/Safety positioning: https://about.roblox.com/
- FTC COPPA: https://www.ftc.gov/business-guidance/privacy-security/childrens-privacy
- Good Housekeeping, guia parental de jogos: https://www.goodhousekeeping.com/childrens-products/a71486338/what-to-consider-before-buying-your-kid-a-video-game/
- Better Internet for Kids: https://better-internet-for-kids.europa.eu/en
- Artigo academico sobre avatar em jogos sociais infantis: https://arxiv.org/abs/2502.18705
- Fortune Business Insights, game-based learning market: https://www.fortunebusinessinsights.com/

## 3. Hipoteses de aderencia

H1 - Criancas de 8 a 12 anos entram pelo desejo de explorar e se expressar, nao pelo desejo abstrato de "estudar".
Como validar: teste de primeira sessao com criancas; medir se chegam a uma escola/quest sem ajuda e se pedem para continuar apos 10 minutos.

H2 - Responsaveis aceitam pagar R$ 4,99/mes se entenderem que o jogo e seguro, educativo, sem chat livre e sem compras predatorias.
Como validar: teste de pagina com 10 responsaveis; medir compreensao de preco, beneficios e limites da assinatura.

H3 - Cosmeticos funcionam melhor quando ligados a conquistas visiveis, colecoes e identidade, nao a bloqueios agressivos.
Como validar: medir cliques na lojinha, desejo de item, conversao do responsavel e rejeicao/percepcao de pressao.

H4 - O diferencial competitivo e "Roblox-like seguro e educativo em portugues, sem instalar nada", mas essa promessa precisa aparecer no primeiro viewport.
Como validar: teste de 5 segundos da home; perguntar "o que e isso?", "para quem e?", "por que eu deixaria meu filho jogar?".

## 4. Backlog de implementacao

### P0 - Produto e conversao responsavel

1. Lab: Primeira tela dupla crianca/responsavel
Problema: a home precisa falar com dois usuarios sem misturar intencoes.
Escopo: CTA principal "Jogar agora"; CTA secundario "Para responsaveis"; promessa curta de aventura + aprendizagem + seguranca; imagem/video real do jogo; bloco de preco transparente.
Aceite: em teste de 5 segundos, crianca entende que pode jogar; responsavel entende seguranca e preco.

2. Lab: Area do responsavel antes da monetizacao
Problema: assinatura precisa ser decisao adulta, nao pressao sobre crianca.
Escopo: tela com beneficios cosmeticos, preco R$ 4,99/mes, "aprendizagem sempre gratis", politicas de privacidade, relatorios e cancelamento.
Aceite: nenhum fluxo de pagamento parte de clique infantil sem parent gate.

3. Lab: Instrumentacao de funil e retencao
Problema: sem dados, nao da para saber aderencia.
Escopo: eventos anonimos/minimizados: first_play, quest_started, quest_completed, shop_opened, parent_area_opened, subscribe_click, return_day_1/7.
Aceite: dashboard simples com conversao primeira sessao, retorno e funil de responsavel.

4. Lab: Onboarding jogavel de 3 minutos
Problema: a crianca precisa sentir jogo antes de sentir escola.
Escopo: chegada ao planeta, movimento, primeira moeda, primeiro personagem/pet, primeira quest curta.
Aceite: crianca completa sem instrucao adulta em ate 3 minutos.

5. Lab: UX de lojinha sem pressao abusiva
Problema: cosmetico pode vender sem parecer manipulativo.
Escopo: separar itens ganhos jogando, itens de assinatura e preview; copy dirigida ao responsavel; sem popups insistentes.
Aceite: nenhum item educacional aparece bloqueado; nenhum modal pede compra repetidamente para crianca.

### P1 - Engajamento saudavel da crianca

6. Lab: Album de conquistas e cartoes-postais dos planetas
Hipotese: colecao aumenta retorno sem depender de FOMO pago.
Escopo: album visual com cartas conquistadas por planeta, escola, bicho, parkour e evento semanal.
Aceite: 100% conquistavel jogando; assinante pode ter molduras/estilos, nao cartas exclusivas de conteudo.

7. Lab: Missoes diarias saudaveis
Hipotese: retorno melhora com objetivos leves, sem punicao por perder dia.
Escopo: 3 missoes rotativas; recompensas pequenas; sem contador punitivo de streak.
Aceite: se a crianca nao voltar um dia, nao perde progresso nem item.

8. Lab: Convite seguro por codigo familiar/amigo
Hipotese: criancas querem jogar juntas; pais aceitam se houver controle.
Escopo: codigo curto gerado pelo responsavel ou sessao privada; sem busca aberta por desconhecidos para crianca.
Aceite: multiplayer publico continua seguro; modo com amigo exige fluxo controlado.

9. Lab: Relatorio semanal realmente demonstravel
Problema: valor para responsavel precisa ser visivel antes da assinatura.
Escopo: preview local do relatorio, conteudos praticados, progresso, sugestoes de conversa e envio quando RESEND_API_KEY estiver configurado.
Aceite: responsavel ve um exemplo antes de assinar.

### P2 - Escala e canais

10. Lab: Pagina para professores/escolas
Hipotese: escolas e reforco podem ser canal de aquisicao.
Escopo: pagina simples com proposta pedagogica, seguranca, assuntos cobertos e como testar em sala.
Aceite: professor entende uso em 1 aula de 30 minutos.

11. Lab: Landing pages A/B
Hipotese: diferentes promessas convertem diferentes perfis.
Escopo: variantes: "jogo educativo 3D", "Roblox seguro para aprender", "matematica e leitura em forma de aventura".
Aceite: medir clique em jogar, area responsavel e assinatura.

12. Lab: Biblioteca de atividades por serie/idade
Hipotese: responsaveis compram melhor quando veem alinhamento escolar.
Escopo: mapa simples de habilidades por ano/faixa etaria, sem virar material pago.
Aceite: responsavel consegue responder "isso ajuda meu filho em que?".

## 5. Backlog de pesquisa de mercado

1. Pesquisa: teardown de concorrentes
Comparar Roblox, Minecraft Education, Prodigy Math, Duolingo, Kahoot/Quizizz e jogos infantis populares no Brasil.
Saida: tabela de mecanicas, monetizacao, seguranca, onboarding, proposta para pais e riscos eticos.

2. Pesquisa: teste de 5 segundos da home
Rodar com 5 criancas e 5 responsaveis.
Perguntas: "o que e?", "voce quer clicar onde?", "e seguro?", "tem que pagar o que?".

3. Pesquisa: primeira sessao observada
Rodar 20 minutos com criancas de 8-12 anos.
Metricas: tempo ate diversao percebida, tempo ate primeira quest, pontos de confusao, desejo de voltar.

4. Pesquisa: entrevista com responsaveis
Validar dores: tela demais, seguranca, aprendizagem, preco, assinatura, relatorios, medo de compras.
Saida: matriz de objeções e copy para pagina/checkout.

5. Pesquisa: teste de preco
Comparar R$ 4,99/mes com R$ 9,90/mes e plano anual barato.
Regra: testar somente com responsaveis, nunca com criancas.

6. Pesquisa: canais de aquisicao
Mapear TikTok/YouTube Shorts supervisionado, escolas, professores, grupos de pais, influenciadores familiares, comunidades de homeschooling/reforco.
Saida: canais priorizados por custo, risco, audiencia e velocidade.

7. Pesquisa: compliance e reputacao
Checklist COPPA/LGPD infantil/GDPR-K: dados coletados, consentimento, exclusao de dados, publicidade, analytics, pagamento, relatorio por email.
Saida: riscos bloqueadores antes de marketing pago.

## 6. Recomendacao de proximo passo

Proximo lab recomendado: "Primeira tela dupla crianca/responsavel + teste de proposta".

Por que agora: o jogo ja tem conteudo suficiente para ser demonstrado. Antes de construir mais planetas ou cosmeticos, precisamos saber se a primeira impressao vende corretamente duas coisas diferentes: diversao para a crianca e confianca para o responsavel.

Pergunta que esse lab responde: "Quando alguem cai no site, entende rapido por que a crianca deveria querer jogar e por que o responsavel deveria permitir/pagar?"
