# Laboratório 139 — Câmera livre dentro de casa + comprar múltiplas cópias do mesmo móvel

Status: concluído
Início: 2026-09-02
Fim: 2026-09-02
Commit inicial: 1b7957206412f362232463e1e36ed05e0aea6cba

## Objetivo do laboratório

Dois pedidos do usuário na mesma sessão do lab-138 ("depois siga corrigindo..."), registrados como
"O que o próximo laboratório deve desenvolver" no `CONTEXT.md` do lab-138.

## Funcionalidades planejadas
- [x] Câmera dentro de casa: girar pra cima/baixo, dar zoom in/out e olhar de um lado pro outro
  segurando e arrastando o mouse (hoje só existia o giro horizontal por botão ◀ ▶).
- [x] Comprar mais de uma unidade do mesmo móvel — hoje cada item de `FURNITURE_CATALOG` só existe
  como 0 ou 1 na casa; cada cópia precisa da sua própria posição e poder ser movida
  independentemente das outras.

## Fora de escopo (explicitamente adiado)
- Câmera livre por arrastar fora de casa (planeta principal) — pedido foi especificamente "dentro
  da casa".
- Limite de quantas cópias comprar (hoje ilimitado, só limitado pelas moedas do jogador).
