# Laboratório 10 — Clima, NPCs andando, trilha alternativa, mais diálogos

Status: concluído
Início: 2026-08-16
Fim: 2026-08-16
Commit inicial: acccd513a267e3440e95330ef232c4e6b64eae52

## Objetivo do laboratório
Adicionar variedade ao mundo já existente sem abrir os itens grandes ainda pendentes (ruas+carros,
loja navegável, parkour): uma segunda trilha sonora sintetizada pra alternar com a "estilo rádio"
do lab-07, NPCs civis andando pelo terreno (distintos dos animais selvagens do lab-09), chuva
como clima dinâmico, e mais falas na bolha de diálogo da piscina.

## Funcionalidades planejadas
- [x] Correção de bug: pulo não aparecia visualmente (personagem 3D ficava sempre grudado no chão
      mesmo com o colisor físico subindo) — corrigido em `World3D.tsx` antes de abrir este lab,
      incluído aqui porque foi descoberto e resolvido na mesma sessão.
- [x] Outra música: uma segunda trilha sintetizada (mesmo padrão de áudio sem asset externo do
      lab-04/lab-07), alternável/distinta da atual "estilo rádio" (pedido direto do usuário nesta
      sessão).
- [x] Pessoas andando por aí: NPCs civis vagando pelo terreno andável (não só na piscina/lagoa) —
      reaproveita `buildStudentFigure` e o padrão de IA de vagar dos animais do lab-09, adaptado
      pra figura humana andando de pé (pedido direto do usuário nesta sessão; relacionado mas
      menor que o item "ruas e carros" que ficou pendente do lab-09, que envolve infraestrutura de
      rua/veículo).
- [x] Chuva: clima dinâmico (chuva em horário aleatório) — item 3 da lista de pendências do
      `labs/lab-09-vida-selvagem-pulo/CONTEXT.md` ("O que o próximo laboratório deve desenvolver").
- [x] Outros diálogos: mais variedade nas falas da bolha de chat decorativa da piscina
      (`POOL_CHAT_LINES`, lab-09) — pedido direto do usuário nesta sessão.
- [x] Gatos: novo tipo de bicho (`gato`), a maioria vagando pelo chão igual aos demais, alguns
      parados no topo dos platôs/telhados ("em cima de tudo") — pedido direto do usuário no meio
      da sessão, adicionado ao escopo deste lab por ser pequeno e do mesmo espírito dos bichos do
      lab-09.

## Fora de escopo (explicitamente adiado)
- Ruas e carros andando no mundo (pendência maior do lab-09 — infraestrutura de rua + veículos).
- Loja navegável (interior) — pendência do lab-09.
- Parkour (plataformas/obstáculos pra pular) — pendência do lab-09.
- Trovão/raio como parte do clima dinâmico — usuário pediu especificamente "chuva"; trovão/raio
  citados no CONTEXT.md do lab-09 como parte do mesmo pedido original, mas não repetidos nesta
  sessão — confirmar com o usuário se quer incluir junto ou deixar pra depois.
