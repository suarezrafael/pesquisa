# Contexto - Laboratorio 224 - Materiais estaticos da Terra

Preenchido em: 2026-09-22
Commit inicial: 1fe3205d398455751ce4aad5a9fbae6614cfe303
PR: a preencher

## O que foi feito

- `staticMaterials.ts` define uma allowlist exata de 45 materiais de primitivas estaticas da
  Terra. Todo material fora dela continua dinamico por padrao.
- O congelamento ocorre uma vez, depois da configuracao inicial da cena e antes do render loop.
  O helper remove referencias duplicadas, e idempotente e relata materiais esperados, encontrados,
  congelados, previamente congelados e ausentes.
- Avatar/NPC/multiplayer, pets, GLBs importados, agua/clima/grama, quests, moedas/efeitos,
  puzzles/minijogos e interiores com fade foram explicitamente excluidos.
- HUD e `window.__perf` informam materiais totais, congelados, auditados e ausentes. No perfil
  medido, todos os 45 esperados foram encontrados entre 389 materiais.

## Comparacao antes/depois

O benchmark alternou o Lab 223 (`1fe3205`) e o Lab 224 na mesma origem, perfil salvo, Edge 153,
viewport 2552x866, Intel UHD/D3D11, escala 1,60, 2.264 meshes e 20 escolas habilitadas. Foram
coletadas amostras de 15 segundos depois de estabilizar a cena.

| Metrica | Lab 223 | Lab 224 | Diferenca |
| --- | ---: | ---: | ---: |
| FPS medio | 16,45 | 17,84 | +8,4% |
| FPS p5 | 12,08 | 13,72 | +13,6% |
| Frame medio | 58,29 ms | 54,02 ms | -7,3% |
| Frame p95 | 78,60 ms | 71,30 ms | -9,3% |
| Active evaluation | 9,85 ms | 8,62 ms | -12,5% |
| Render | 18,40 ms | 16,53 ms | -10,2% |
| Camera render | 52,61 ms | 48,86 ms | -7,1% |
| Draw calls medios | 2.020,92 | 2.025,54 | +0,2% |
| Meshes ativos medios | 760,92 | 763,27 | +0,3% |

Draw calls e meshes permaneceram estaveis, como esperado: este lab remove atualizacoes de
material por mesh, sem remover objetos. Os ganhos sao direcionais, pois automacao, coleta e camera
introduzem ruido; nao substituem a verificacao nos dispositivos Android fisicos.

## Verificacao

- `npx vitest run src/world3d/staticMaterials.test.ts`: 2/2 testes.
- `npx tsc -b --force`: passou.
- `npm run test -- --run`: 278/278 testes em 15 arquivos.
- `npm run lint`: passou sem erro; permanecem dois avisos preexistentes.
- `npm run build`: passou, incluindo a geracao do service worker PWA.
- Edge: HUD confirmou `materiais 45/389 fixos`; Terra, escolas, estrada, parkour e edificios
  renderizaram normalmente, sem erro no console e sem material auditado ausente.

## Decisoes tecnicas

- Usar allowlist por nome e manter o comportamento dinamico como padrao seguro. Isso torna a
  inclusao de uma nova familia deliberada e revisavel.
- Restringir o primeiro lote a materiais de primitivas `MeshBuilder`, sem morph targets nem
  mutacao posterior. A API instalada do Babylon 9.21.2 alerta que materiais congelados
  compartilhados por meshes com valores por mesh, como morph influences, podem reutilizar cache
  incorreto.
- Nao usar `scene.freezeActiveMeshes()`: o jogo depende de culling, planetas, entidades e estados
  visuais dinamicos.
- Nao congelar materiais apenas porque parecem estaticos em um quadro; agua, quests, efeitos,
  interiores e cosmeticos permanecem fora ate auditoria especifica.

## Proximo laboratorio recomendado

Lab 225 - centralizar o perfil de qualidade mobile e suas decisoes hoje dispersas, expondo no
relatorio quais recursos foram reduzidos. Pergunta tecnica: "um perfil unico, mensuravel e
reversivel reduz camera/render e GPU no Redmi Pad 2 e Poco C75 sem remover conteudo educativo,
interacao ou legibilidade?"

## Pendencias

- Repetir o benchmark dos Labs 223-224 no Redmi Pad 2, Poco C75 e um Android intermediario.
- Medir Terra, centro de jogos e um planeta secundario com roteiro e perfil controlados.
- Auditar separadamente novas familias antes de ampliar a allowlist.
