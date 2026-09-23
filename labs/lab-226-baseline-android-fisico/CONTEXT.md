# Contexto - Laboratorio 226 - Baseline Android fisico

Preenchido em: 2026-09-23
Commit inicial -> final: 4b242896698b1e56c9c8a5323026b834a0588d3e..2bdbe1792b8915c2b16284baa1fb2529f9b46944

## O que foi feito

- A partir do JSON do Redmi Pad 2 (11,45 FPS na Terra), o render adaptativo passou a
  desligar SSAO, glow, MSAA 4x e, se necessario, sombras depois de medir FPS da cena
  real. A primeira coleta publicada chegou a 22,25 FPS e 427,26 draw calls medias.
- As hierarquias estaticas das escolas passaram a congelar matrizes apos o
  assentamento; o pulso do telhado deixou de alocar `Color3` por quadro. O JSON
  ganhou tempo do loop e contagens de geometrias, texturas e vertices.
- Uma coleta posterior no Redmi Pad 2 registrou 28,29 FPS e p5 de 23,58 FPS, mas
  mostrou 13,53 escolas ativas em media contra 17,99 antes. Logo, o ganho nao pode
  ser atribuido isoladamente ao congelamento.
- Professores distantes passaram a ter representacao de duas malhas instanciadas
  somente no nivel adaptativo 2, com histerese e modelo completo perto da camera.
  `earthSchools.detailedTeachersAvg`/`simpleTeachersAvg` foram adicionados ao JSON.
- PRs #110 a #113 foram mescladas e publicadas. Testes, lint e build passaram
  nas iteracoes; a ultima PR passou no CI.

## Decisoes tecnicas tomadas

- O autoajuste usa FPS da cena real, pois o benchmark inicial classificou o Mali-G57
  MC2 como `strong` apesar dos 11,45 FPS com efeitos completos.
- Nao foi aplicado `freezeActiveMeshes` global nem octree indiscriminado: o jogo
  altera visibilidade e movimento de muitos objetos. Ver `PERFORMANCE-AUDIT.md`.
- O detalhe simplificado preserva o professor completo no desktop/niveis 0 e 1.
  O limite de 25/30 unidades e uma hipotese a validar, nao um ganho comprovado.

## Pendencias / dividas conhecidas

- Falta medir a build `2026-09-23T12:51:14.064Z` (PR #113, ou build posterior
  sem mudanca no codigo 3D) no Redmi Pad 2 e verificar se
  `simpleTeachersAvg` fica acima de zero, se o professor e legivel e se a troca nao
  produz pop visivel. Nao ha numero de FPS dessa mudanca.
- O Edge local apresentou cerca de 1 FPS e perda de enquadramento tambem antes
  desta iteracao; nao serve para estimar FPS fisico.
- Faltam amostras controladas no Poco C75, centro de jogos e Marte; manter no
  backlog 191/193, sem marcar a auditoria multi-dispositivo como concluida.

## Funcionalidades planejadas que NAO foram concluidas

- Validacao fisica do detalhe dos professores e comparacao pareada de FPS/nitidez:
  transferidas ao Lab 227.
- Matriz Redmi/Poco e outras cenas: permanece no backlog 191/193 apos o Lab 227.

## O que o proximo laboratorio deve desenvolver

- Medir no Redmi Pad 2 a build publicada do detalhe dos professores com duas
  amostras comparaveis na Terra. Confirmar ativacao do LOD e qualidade perto/longe.
- Se o LOD nao ativar ou piorar a leitura visual, corrigir limite/representacao
  com uma mudanca pequena e repetir a comparacao antes de declarar ganho.

## Estado do repositorio ao final

- Base publicada: `main` em `2bdbe1792b8915c2b16284baa1fb2529f9b46944`.
- Verificar: `cd app && npm run test && npm run build`; comparar JSON do painel
  `Medir 15 s` no Redmi Pad 2, nao o FPS do Edge local.
