# Laboratorio 216 - Cosmeticos conquistaveis para pets

Status: em andamento
Inicio: 2026-09-20
Fim: -
Commit inicial: f28bb687a9913ca7341b1535957193057bbdb943

## Objetivo do laboratorio

Entregar a primeira fatia vertical de personalizacao visual dos pets: a crianca pode conquistar
acessorios com moedas obtidas jogando, experimentar no preview 3D e equipar no companheiro que a
segue no mundo. A mudanca deve preservar desempenho mobile e nao pode conceder vantagem de jogo.

Origem: `docs/gameplay-market-expansion-backlog.md`, "Lab 206 - Pets premium de qualidade,
roupas e mascaras"; `docs/backlog-status.md` registra modelos, roupas e mascaras como pendentes.

## Funcionalidades planejadas

- [ ] Criar catalogo de acessorios em dois encaixes independentes (pescoco e rosto), com ao menos
  uma opcao gratuita e opcoes compraveis apenas com moedas ganhas no jogo.
- [ ] Persistir itens desbloqueados e acessorios equipados, com regras de dominio que rejeitem ids,
  encaixes ou itens nao possuidos invalidos e testes unitarios dessas regras.
- [ ] Organizar o painel de pets em abas claras de companheiros e acessorios, mantendo o preview
  visivel e permitindo experimentar antes de comprar ou equipar.
- [ ] Renderizar os mesmos acessorios no preview e no pet que segue o avatar, reutilizando a
  montagem Babylon e limitando geometria/material para aparelhos fracos.
- [ ] Verificar TypeScript forçado, testes, lint, build e o fluxo real no Edge.

## Fora de escopo (explicitamente adiado)

- Assinatura, Stripe, item premium, pedido de compra feito pela crianca ou qualquer vantagem de
  gameplay.
- Novas especies/modelos completos de pet, roupas de corpo, chapeus, capas ou animacoes esqueletais.
- Gacha, loot box, item aleatorio, troca entre jogadores ou economia com dinheiro real.
- Baseline de FPS em Android fisico e otimizacao ampla de draw calls do mundo.
