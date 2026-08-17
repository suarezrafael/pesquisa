# Laboratório 15 — Ruas e carros

Status: em andamento
Início: 2026-08-17
Fim: -
Commit inicial: 29670425e2251c5b7b32de9a83b8ba53fea53398

## Objetivo do laboratório
Pedido original do usuário no lab-09 ("ruas+carros"), adiado explicitamente em cinco labs
seguidos. Escolhido nesta sessão como prioridade entre os 3 itens grandes restantes (ruas+carros,
loja navegável, backend/conta), via pergunta direta ao usuário (`labs/lab-14-trovao-raio/
CONTEXT.md`, "O que o próximo laboratório deve desenvolver").

Adicionar uma rua com carros andando pelo mundo — reaproveitando os mesmos padrões já
estabelecidos no jogo: geometria de faixa acompanhando a curvatura do planeta (mesmo método do rio,
lab-05/07), local escolhido por busca de distância angular (mesmo método usado pra piscina/parkour)
e IA de movimento ao longo de um caminho fixo (variação da IA de "círculo local" dos bichos da
lagoa/piscina, mas seguindo um caminho reto/sinuoso em vez de um círculo).

## Funcionalidades planejadas
- [ ] Rua: uma faixa (ribbon, mesmo método do rio) de asfalto acompanhando a curvatura do planeta,
      com uma linha central pintada, num local escolhido por busca de distância angular contra
      todos os outros marcos do mapa (platôs, lagoa, piscina, escolas, percurso de parkour).
- [ ] Carros: 4-6 carrinhos de brinquedo construídos só de primitivas (mesmo estilo do resto do
      jogo — sem asset externo), cores variadas, andando pra frente e pra trás ao longo da rua
      (ping-pong), orientados na direção do movimento.
- [ ] Verificação end-to-end: rodar o dev server e confirmar visualmente (via automação de
      navegador) que a rua aparece no lugar certo e os carros se movem ao longo dela sem erros no
      console.

## Fora de escopo (explicitamente adiado)
- Loja navegável (interior), itens de backend/conta — pendências maiores, sem relação com este
  pedido.
- Colisão física dos carros (bloquear o jogador, atropelamento, etc.) — decorativo nesta primeira
  rodada, mesmo padrão já usado pros pedestres/gente da piscina/pássaros (sem colisor).
- Som de motor/buzina — não pedido explicitamente; pode ser um retoque futuro se o usuário pedir.
- Mais de uma rua/cruzamento — "uma rua com carros" já atende o pedido original; múltiplas ruas
  ficam pra uma iteração futura se fizer sentido.
