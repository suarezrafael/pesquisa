# Contexto - Laboratorio 218 - Novas especies de pets

Preenchido em: 2026-09-21
Commit inicial -> final: e76377362b75245fa809ec8cf025b82499c9af0b..76e60e7183aba8b5e1b538bd0e720689f1979f07

## O que foi feito

- `data/pets.ts` passou de quatro para oito pets: duas variantes de gato, cachorro, coelho e
  tartaruga. Todos continuam compraveis somente com moedas obtidas jogando.
- `world3d/petFigure.ts` ganhou modelos proprios de coelho e tartaruga e a fabrica exaustiva
  `buildPetFigure`, usada tanto pelo preview quanto pelo mundo.
- O coelho usa sete malhas e um material. A tartaruga usa oito malhas e dois materiais para separar
  casco e pele. Somente o pet equipado e criado no mundo.
- A tabela tipada `PET_ACCESSORY_FIT` calibra coleira, capa e mascara para cada especie; adicionar
  uma especie nova sem definir encaixes agora falha no TypeScript.
- `data/pets.test.ts` protege ids unicos, duas opcoes por especie, custo em moedas e escala; os testes
  de progressao passaram a cobrir as escalas das duas novas especies.

## Decisoes tecnicas tomadas

- Os modelos continuam procedurais e baixo-poli, sem textura externa, esqueleto ou particulas. Isso
  preserva memoria, draw calls e tempo de carregamento depois do trabalho de performance do lab 217.
- `buildGato` e `buildCachorro` permanecem exportados porque o mundo os reutiliza para fauna
  ambiente. O pet adotado usa exclusivamente `buildPetFigure`, eliminando condicionais duplicadas
  no preview e no mundo.
- Variacoes de cor compartilham a mesma geometria por especie. O catalogo cresce sem multiplicar
  implementacoes 3D nem manter modelos ociosos em memoria.

## Pendencias / dividas conhecidas

- O ganho do lab 217 ainda precisa de baseline em desktop, Redmi/Poco e tablet fisicos por meio de
  `window.__perf.sample(15000)`. A automacao do Edge limita `requestAnimationFrame` e nao serve para
  comparar FPS.
- Gato e cachorro mantem os modelos anteriores, mais simples. Uma futura revisao visual deve
  respeitar o mesmo teto de oito malhas e dois materiais, ou provar o custo em hardware alvo.

## Funcionalidades planejadas que NAO foram concluidas

- Nenhuma. Todos os itens do escopo foram implementados e verificados.

## O que o proximo laboratorio deve desenvolver

- Coletar baseline fisico do lab 217 em pelo menos um desktop e um Android fraco, registrar FPS,
  frame time, meshes ativas e memoria antes de escolher nova otimizacao.
- Se a GPU for o gargalo, priorizar reducao de draw calls/materiais e qualidade adaptativa; se a
  CPU for o gargalo, usar o profiler para atacar o proximo trecho quente do loop, sem otimizar por
  suposicao.

## Estado do repositorio ao final

- Branch: `lab-218-novas-especies-pets`.
- Verificacao: em `app/`, rode `npx tsc -b --force`, `npm run test -- --run`, `npm run lint` e
  `npm run build`; depois abra Pets no jogo, experimente coelho/tartaruga e acessórios, adote um
  deles e confirme o companheiro ao lado do avatar.
