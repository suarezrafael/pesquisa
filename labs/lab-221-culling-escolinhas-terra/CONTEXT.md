# Contexto - Laboratorio 221 - Culling das escolinhas da Terra

Preenchido em: 2026-09-22
Commit inicial: 20c2f4c157bcfb3ccdf2bf430cf1edb7aefd4f6c
PR: a preencher

## O que foi feito

- As 30 escolinhas da Terra foram identificadas como a maior familia estatica restante: cada uma
  possui quatro malhas de predio e um professor articulado com cerca de 16 malhas.
- `sphericalCulling.ts` calcula quanto o segmento entre camera e topo da escola atravessa a
  esfera-base do planeta, sem alocar vetores no loop.
- Um probe acima do telhado evita ocultar o predio enquanto qualquer parte alta ainda poderia
  aparecer por cima do horizonte.
- A decisao usa profundidades diferentes para ocultar (0,8) e reexibir (0,4), criando histerese e
  impedindo alternancia perto da tangente.
- O culling roda no tick existente de 10 Hz. Escolas ficam completas durante voos para preservar
  a transicao e ficam desabilitadas em interiores ou outros planetas.
- O pai da escola controla junto predio e professor; a label GUI acompanha explicitamente o mesmo
  estado. Materiais de progresso e o feixe da primeira missao mantêm seus estados filhos.
- `window.__perf.earthSchools()` e os relatorios de 15 segundos expõem quantas escolas ficaram
  habilitadas durante a amostra.

## Comparacao antes/depois

Roteiro comparavel: Terra recem-iniciada, Edge 153, viewport 2552x867, DPR 1, renderer Intel
UHD/ANGLE D3D11, escala 1,60 e amostra de 15 segundos. O antes veio do deploy imutavel do Lab 220;
o depois, do build local do Lab 221 na mesma aba/viewport.

| Metrica | Lab 220 | Lab 221 | Diferenca |
| --- | ---: | ---: | ---: |
| Escolas habilitadas | 30 | 20 | -10 (-33,3%) |
| Draw calls medio | 3.123,86 | 2.750,43 | -373,43 (-12,0%) |
| Draw calls maximo | 3.175 | 2.827 | -348 (-11,0%) |
| Meshes ativos medio | 903,07 | 816,71 | -86,36 (-9,6%) |
| Meshes ativos maximo | 929 | 855 | -74 (-8,0%) |
| Meshes totais | 2.264 | 2.264 | estavel |
| Camera render | 46,58 ms | 42,51 ms | -4,07 ms (-8,7%) |
| Render | 13,22 ms | 12,22 ms | -1,00 ms (-7,6%) |

O Edge automatizado limita `requestAnimationFrame` a aproximadamente 1 FPS. FPS e tempos de
quadro nao equivalem a hardware fisico; draw calls, meshes ativos, contagem de escolas e total de
meshes demonstram a mudanca estrutural, enquanto os tempos apenas reforcam a direcao observada.

## Verificacao

- `npx vitest run src/world3d/sphericalCulling.test.ts`: 7/7 testes.
- `npx tsc -b --force`: passou.
- `npm run test -- --run`: 274/274 testes em 14 arquivos.
- `npm run lint`: passou sem erro; permanecem os dois avisos preexistentes.
- `npm run build`: passou, incluindo service worker PWA.
- Edge: escolas/labels proximas visiveis, camera girada seis passos sem desaparecimento incoerente,
  medicao copiada e nenhum erro de console.

## Decisoes tecnicas

- Usar oclusao geometrica pela camera em vez de angulo fixo do avatar. A regra acompanha zoom e
  rotacao e oculta mais escolas sem adivinhar qual hemisferio a camera enxerga.
- Usar o topo da escola como probe e exigir penetracao de 0,8 unidade na esfera antes de ocultar;
  o menor relevo pode cair abaixo do raio-base, portanto essa margem evita falso bloqueio.
- Nao desligar corpos fisicos individualmente: as escolas ocultas estao longe e o corpo estatico
  permanece pronto quando o visual reaparece, reduzindo risco de colisao atrasada.
- Manter o backlog 193 parcial ate validar em Redmi/Poco e tratar as malhas repetidas restantes.

## Proximo laboratorio recomendado

Lab 222 - instanciar a figura estatica dos professores das escolinhas da Terra a partir de um
template compartilhado, preservando materiais, sombras, posicao e escala. Os professores nao
animam nem participam de fisica, mas cada escola hoje cria cerca de 16 geometrias semelhantes; as
20 escolas visiveis no spawn ainda podem representar aproximadamente 320 malhas de personagem.

Pergunta tecnica a responder: "compartilhar a geometria dos professores visiveis reduz mais draw
calls que outro corte de visibilidade, sem alterar a leitura de NPC em cada escola?"

## Pendencias

- Repetir a medicao no Redmi Pad 2 e Poco C75 fisicos.
- Testar aproximacao/afastamento de uma escola durante uma volta completa no planeta em hardware
  com `requestAnimationFrame` normal, observando o horizonte em zoom maximo.
- Preencher o numero da PR apos a abertura.
