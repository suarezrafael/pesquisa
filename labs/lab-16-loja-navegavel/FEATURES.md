# Laboratório 16 — Loja navegável (interior)

Status: concluído
Início: 2026-08-17
Fim: 2026-08-17
Commit inicial: 8ef63e1f0ee1b43d60817cd32f6050017ba191bc

## Objetivo do laboratório
Pedido original do usuário no lab-09 ("loja que dá pra entrar"), adiado explicitamente em seis
labs seguidos. Escolhido nesta sessão entre os 2 itens grandes restantes (loja navegável,
backend/conta) — não como pergunta ao usuário desta vez, porque o outro item exige decisões de
infraestrutura/negócio (provedor de auth, pagamento) que só o usuário pode tomar, enquanto a loja é
trabalho de jogo autocontido igual a tudo que já foi feito nesta sessão.

Hoje a "lojinha de avatares" (lab-08/lab-13) é um modal 2D acionado por um ícone no HUD — não tem
presença física no mundo 3D. Este lab dá a ela um prédio de verdade no planeta que o jogador
caminha até e entra fisicamente (porta com vão real, não parede sólida decorativa como as
escolas), com um interior simples (balcão, prateleiras, um lojista) — chegar perto do balcão abre
o MESMO modal de lojinha já existente (reaproveita toda a lógica de compra/equipar, não duplica).

## Funcionalidades planejadas
- [x] Prédio da loja: paredes com um vão de porta de verdade (não uma parede sólida decorativa
      como as escolas), teto, num local escolhido por busca de distância angular contra todos os
      outros marcos do mapa.
- [x] Interior: balcão, 1-2 prateleiras decorativas, um lojista (reaproveita `buildStudentFigure`,
      mesmo padrão do professor nas escolas).
- [x] Gatilho: chegar perto do balcão (dentro do prédio) abre o modal de lojinha já existente
      (`onOpenShop`, reaproveitando a prop já passada pro `World3D`) — mesmo padrão de proximidade
      já usado pras escolas/moedas.
- [x] Verificação end-to-end: rodar o dev server, confirmar visualmente que dá pra entrar pela
      porta e ver o interior, e que chegar perto do balcão abre a lojinha de verdade.

## Fora de escopo (explicitamente adiado)
- Itens de backend/conta (auth, parental gate, pagamento) — pendência maior, decisão do usuário.
- Colisão física nas paredes da loja — mesmo padrão das escolas (sem colisor nas paredes,
  decorativas); o vão da porta já resolve visualmente "entrar de verdade" sem precisar bloquear
  fisicamente o resto das paredes.
- Nova UI de compra dentro do 3D (prateleiras clicáveis, etc.) — reaproveita o modal 2D já
  existente, não inventa um sistema de compra novo.
