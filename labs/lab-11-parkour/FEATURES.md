# Laboratório 11 — Parkour

Status: em andamento
Início: 2026-08-16
Fim: -
Commit inicial: d70199bdc38068259bc0169a220979ae40a0e69f

## Objetivo do laboratório
Dar um uso de verdade pro pulo do lab-09/10 (que agora funciona de forma confiável — bugfix desta
sessão em `d70199b`): plataformas/obstáculos espalhados pelo planeta que só dá pra atravessar
pulando, formando um ou mais percursos de parkour opcionais (não bloqueiam o loop principal de
missões).

Escolhido como foco deste laboratório entre os itens pendentes do
`labs/lab-10-clima-npcs-trilha/CONTEXT.md` ("ruas+carros", "loja navegável", "parkour",
"trovão/raio") por ser o mais diretamente amarrado ao trabalho que acabou de ser corrigido nesta
sessão (o pulo) e o de escopo mais claro/contido — ruas+carros e loja navegável são bem mais
trabalhosos. Retomado direto após o usuário pedir "continue o próximo lab" sem especificar
prioridade; os outros itens continuam na fila.

## Funcionalidades planejadas
- [ ] Plataformas flutuantes/blocos escalonados formando ao menos um percurso de parkour
      (referência: `labs/lab-10-clima-npcs-trilha/CONTEXT.md`, "O que o próximo laboratório deve
      desenvolver", item 3 — "Parkour").
- [ ] Colisor físico nas plataformas (`PhysicsAggregate`, mesmo padrão dos props/planeta) — o
      personagem precisa conseguir ficar em pé nelas de verdade, não só visual.
- [ ] Pelo menos uma recompensa/sinal de conclusão ao chegar no topo/fim do percurso (reaproveitar
      o padrão de moedas ou um marcador visual simples) — sem isso não fica claro que "deu certo".
- [ ] Verificação end-to-end: rodar o dev server e confirmar visualmente (via automação de
      navegador) que dá pra subir o percurso pulando de plataforma em plataforma.

## Fora de escopo (explicitamente adiado)
- Ruas e carros andando no mundo (pendência do lab-09/10).
- Loja navegável (interior) — pendência do lab-09/10.
- Trovão/raio como parte do clima dinâmico — pendência do lab-09/10.
