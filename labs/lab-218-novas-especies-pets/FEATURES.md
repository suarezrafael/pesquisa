# Laboratorio 218 - Novas especies de pets

Status: em andamento
Inicio: 2026-09-21
Fim: -
Commit inicial: e76377362b75245fa809ec8cf025b82499c9af0b

## Objetivo do laboratorio

Ampliar a colecao de companheiros com especies visualmente distintas, mantendo a personalizacao
do lab 216 e o custo grafico previsivel depois das otimizacoes do lab 217. A crianca deve poder
experimentar, conquistar com moedas do jogo e usar os novos pets sem vantagem competitiva.

Origem: `docs/gameplay-market-expansion-backlog.md`, backlog "Lab 206 - Pets premium de qualidade,
roupas e mascaras"; `labs/lab-216-pet-cosmeticos/FEATURES.md`, que adiou novas especies/modelos;
`labs/lab-217-babylon-performance-desktop/CONTEXT.md`, que recomenda um orcamento explicito de
malhas e materiais.

## Funcionalidades planejadas

- [ ] Adicionar coelho e tartaruga ao dominio, com duas variacoes visuais de cada especie e compra
  apenas por moedas obtidas jogando.
- [ ] Criar silhuetas Babylon proprias para as novas especies e uma fabrica tipada compartilhada
  pelo preview e pelo mundo, sem condicionais duplicadas.
- [ ] Calibrar coleiras, capas e mascaras para todas as especies, preservando o preview antes da
  compra e a paridade com o pet que segue o avatar.
- [ ] Manter no maximo oito malhas-base e dois materiais por pet; somente um companheiro adotado
  pode ser renderizado no mundo por vez.
- [ ] Cobrir catalogo, escala e regras existentes de adocao/equipamento com testes; verificar
  TypeScript forcado, testes, lint, build e o fluxo real no Edge.

## Fora de escopo (explicitamente adiado)

- Animacao esqueletal, textura externa 4K, pelo fisico, multiplos pets seguindo o avatar ou efeitos
  de particula permanentes.
- Assinatura, dinheiro real, gacha, loot box, item aleatorio ou vantagem de gameplay.
- Refazer os modelos de gato e cachorro existentes ou criar rotina nova de cuidado/recompensa.
