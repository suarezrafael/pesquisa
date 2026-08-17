# Laboratório 19 — Colisão de NPCs + suavizar horizonte

Status: em andamento
Início: 2026-08-17
Fim: -
Commit inicial: 910be52c4daf5d0896b8854b18809ea3296f6f5e

## Objetivo do laboratório
Dois relatos do usuário jogando ao vivo:

1. "as casinhas em cima do morro ainda aparecem num morro transparente invisível, só tem grama
   não tem textura o morro" (repetido — mesma reclamação de antes do fix de cor de platô do
   lab-18). Investigado ao vivo: a escola apontada (q07) está em terreno **plano** (altura
   0.01, não é um platô) — o efeito é a curvatura do próprio planeta (raio 13): um prédio a
   ~9 unidades de distância fica a ~40° de separação angular, o que geometricamente afunda
   ~3 unidades abaixo do horizonte local do jogador — só o telhado aparece por cima da curva,
   com céu visível onde o chão "deveria" estar conectando visualmente. Não é bug de textura,
   é a curvatura natural do planeta pequeno. Vai ser suavizado com neblina mais presente (não
   eliminado — eliminar precisaria aumentar o raio do planeta, mudança grande demais e fora de
   escopo).
2. "os elementos devem ter física de colisão, as árvores os morros os NPCs" — árvores e morros
   (terreno) já têm colisor físico de verdade (lab-15/09); só os NPCs (pedestres que andam pelo
   mundo, lab-10) não têm.

## Funcionalidades planejadas
- [ ] Neblina base um pouco mais presente (não só durante chuva) — suaviza o corte abrupto de
      "prédio distante afundando no horizonte" sem deixar o jogo constantemente enevoado.
- [ ] Colisor físico nos NPCs pedestres (`walkerNpcs`, lab-10) — corpo cinemático (kinematic,
      não estático) já que eles se movem via IA de vagar, não via forças de física.
- [ ] Verificação: `npm run build` passa; testar rodando o dev server (jogador não consegue mais
      atravessar um NPC pedestre andando na direção dele; horizonte de um prédio distante com
      transição mais suave, não corte abrupto).

## Fora de escopo (explicitamente adiado)
- Aumentar o raio do planeta (eliminaria de vez a curvatura visível, mas é mudança grande —
  afeta posição de todo marco existente, velocidade de movimento relativa, etc.).
- Colisor em gente da piscina/lojista/professor — ficam parados ou confinados a uma área pequena,
  colisão importa bem menos que pros NPCs que vagam livremente pelo mapa.
