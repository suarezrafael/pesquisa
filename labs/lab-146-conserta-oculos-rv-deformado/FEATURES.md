# Laboratório 146 — Conserta óculos de realidade virtual deformando o avatar na lojinha

Status: concluído
Início: 2026-09-03
Fim: 2026-09-03
Commit inicial: 63ddead7cd7a081fced378973496c8f10615767e

## Objetivo do laboratório

Investiga e corrige um bug reportado pelo usuário (pendência aberta desde uma sessão anterior,
registrada em `labs/CURRENT.md`): "avatar deformado na lojinha ao equipar óculos". Detalhes
coletados nesta sessão (o usuário respondeu quando perguntado): acontece em qualquer aparelho, só
com o item "Óculos de Realidade Virtual" (não com os outros óculos), só na tela da lojinha (não
dentro do jogo em si).

## Funcionalidades planejadas
- [x] Encontrar a causa raiz por leitura de código (`studentFigure.ts`/`applyGlasses`,
  `AvatarPreview3D.tsx`) — sem depender de reprodução visual ao vivo, já que o ambiente de
  automação de navegador continua com a mesma limitação de labs anteriores (aba perde
  `document.hidden`/rAF, mundo 3D nunca termina de carregar).
- [x] Corrigir a geometria da peça "correia" (`shape === 'vr'`) — era um disco sólido maior que a
  própria cabeça, virado de frente pra câmera (`CreateCylinder` girado 90°), não um aro fino
  contornando a cabeça.
- [x] `npx tsc -b` e `npm run test` limpos.

## Fora de escopo
- Verificação visual ao vivo (screenshot/zoom do preview 3D) — ambiente de automação bloqueado
  (mesma limitação documentada nos labs 140-142). Correção baseada em análise geométrica das
  dimensões reais (cabeça = esfera raio 0.16 centrada em y=1.15; peça antiga tinha diâmetro 0.34,
  maior que a cabeça inteira).
- Os outros itens de óculos (`shape: 'sunglasses'`) — não fazem parte do bug reportado, geometria
  deles não foi tocada.
