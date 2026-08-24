# Laboratório 87 — correções visuais + expansão de cosméticos da loja

Status: concluído
Início: 2026-08-24
Fim: 2026-08-24
Commit inicial: 5e1cda8c885e293892a63d5347ea50ffe13ca866

## Objetivo do laboratório
Pedido direto do usuário nesta mensagem (não seguiu a recomendação de `labs/CURRENT.md` de ir
para G3-G5 — o usuário redirecionou a prioridade pra bugs visuais + produto, o que tem
precedência): três bugs visuais reportados ao vivo (legendas de objeto/NPC com baixa qualidade;
manchas pretas no chão ao caminhar; morros "invisíveis" com casas flutuando sobre algo
transparente) + expandir o catálogo de cosméticos exclusivos de assinante na lojinha (organizado
por abas se ficar muita opção, com um preview 3D do avatar/boneco) + gerar um código de teste pro
usuário experimentar o fluxo de assinatura (Stripe ainda em modo teste).

## Funcionalidades planejadas
- [x] **Legendas de objeto/NPC com baixa qualidade** — `READABILITY_SCALE = 1.4` aplicada em cima
  do que já existia em `mobileFontSize()`, pra TODO aparelho (antes só celular ganhava algum
  aumento). Confirmado ao vivo: números das escolas visivelmente maiores no teste local.
- [x] **Manchas pretas no chão ao caminhar** — causa mais provável (shadow acne, sem
  `bias`/`normalBias` num planeta com curvatura contínua) corrigida com `shadowGenerator.bias =
  0.001` / `normalBias = 0.035`. **Não confirmado 100% ao vivo** (não deu pra isolar do efeito da
  chuva dinâmica, que também escurece a cena, nem reproduzir o problema original sem um relato com
  imagem) — se persistir, pedir print pro usuário mostrando o chão de perto, parado, sem chuva.
- [x] **Morros invisíveis / casas flutuando em algo transparente** — causa raiz real encontrada:
  a fundação das escolas (lab-28) é um tamanho FIXO, não cobre a PIOR variação de relevo possível
  perto de bordas íngremes de platô. Corrigido aplicando `settleMeshOnTerrain` (a mesma correção
  multi-vértice já usada pras rochas de montanha, lab-75) em cada escola — amostra o ponto mais
  baixo de cada malha filha contra o relevo real e desce a escola o suficiente pra nenhum canto
  ficar boiando. `surfacePos` (usado pro gatilho de missão) atualizado pra posição final.
- [x] **Mais cosméticos exclusivos de assinante na lojinha** — catálogo de assinante dobrou: 4
  avatares novos (dinossauro/golfinho/pavão/esquilo), 2 chapéus novos (completa os 5 formatos
  existentes), 2 cores novas por eixo de roupa (camisa/calça/sapato/mochila) — de 10 pra 20 itens
  exclusivos, tudo reaproveitando geometria/enums já existentes.
- [x] **Abas na loja** — `AvatarShop.tsx` reorganizado em 4 abas (Avatares/Chapéus/Roupas/Cabelo)
  — o catálogo passou de ~15 pra mais de 50 itens neste laboratório, uma lista só não cabia mais.
- [x] **Menu com preview 3D do avatar e do boneco** — `AvatarPreview3D.tsx`, motor Babylon próprio
  e isolado (canvas pequeno, sem física, câmera girando devagar), reaproveita as funções de
  montagem do boneco (extraídas pra `studentFigure.ts`, novo módulo, especificamente pra não
  quebrar o `lazy()` de `World3D.tsx` — ver "Decisões técnicas" no CONTEXT.md). Testado ao vivo:
  preview atualiza corretamente ao trocar avatar/chapéu/cor em qualquer aba.
- [x] **Código de teste do plano de assinatura** — não gerei um cupom novo no Stripe (ação
  operacional que eu poderia fazer sozinho, mas o caminho mais simples e sem risco já existe): o
  cartão de teste padrão do Stripe (modo teste, já ativo neste projeto) completa uma assinatura
  real de teste, sem cobrar nada. Entregue no final da resposta desta sessão.

## Fora de escopo (explicitamente adiado)
- G3-G5 (endurecimento do relay + moderação de apelido) — era a recomendação de `labs/CURRENT.md`,
  mas o usuário redirecionou a prioridade nesta mensagem; continua no backlog pro próximo
  laboratório se não houver novo redirecionamento.
- "Minha Casa" (Fase E do plano comercial, montar/decorar casa) — fora do pedido desta mensagem
  (o pedido foi por mais itens compráveis, não pela feature de decoração ainda maior).
