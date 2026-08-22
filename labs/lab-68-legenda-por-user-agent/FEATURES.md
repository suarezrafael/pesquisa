# Laboratório 68 — Corrigir detecção de tela pequena pra fonte das legendas

Status: concluído
Início: 2026-08-22
Fim: 2026-08-22
Commit inicial: 93543d0eabdb548e4879248513d353870178b7af

## Objetivo do laboratório
Usuário: "AS LEGENDAS DE TEXTO DO MUNDO FICOU COM TAMANHO MUITO PEQUENOS PROS DISPOSITIVOS
PEQUENOS AJUSTAR" — depois da correção do lab-67 (que trocou `isLowEndDevice` por `isSmallScreen`
baseado em `window.innerWidth/innerHeight` pra decidir o tamanho da fonte), a legenda continuou
errada. Suspeita mais forte: a detecção por dimensão de viewport (pixels CSS) é sensível demais a
densidade de pixels/orientação/zoom pra confiar sem o aparelho real na mão — um tablet grande
ainda pode reportar uma largura CSS "de celular" dependendo de como o Android configura a escala.

## Funcionalidades planejadas
- [x] Trocar a detecção de tela pequena de dimensão de viewport pra sinal de user-agent (mesma
      fonte de sinal já usada por `isLowEndDevice`, mas mais específico): token "Mobile" só conta
      quando combinado com "Android" (tablets Android não o incluem); iPhone/iPod são sempre tela
      pequena por nome.
- [x] Cuidado extra verificado AO VIVO (testei a regex contra amostras reais de user-agent no
      console do navegador antes de finalizar): a primeira tentativa (`/Mobile/` sozinho) dava
      `isSmallScreen: true` até pra iPad — o Safari do iOS inclui "Mobile/15E148" (build do
      WebKit) em QUALQUER aparelho iOS. Corrigido exigindo "Android" junto com "Mobile"; testado
      de novo contra Redmi Pad 2/celular Android/iPhone/iPad/desktop — os 5 casos bateram certo.
- [x] Suavizado o fator de redução da fonte (0.72 → 0.85).
- [x] Contador de FPS (lab-67) ganhou `fraco=<isLowEndDevice> telaP=<isSmallScreen>` — se esta
      correção ainda não bastar, o próximo relato já vem com os dois valores reais do aparelho.
- [x] Build (typecheck + produção) passa; verificado AO VIVO que desktop continua com fonte cheia
      (screenshot: legendas "Lojinha", números das escolas, bolhas de chat em tamanho normal).
- [x] Deploy em produção ao final — feito depois do wrap deste lab.

## Fora de escopo (explicitamente adiado)
- Nenhum item novo de escopo — laboratório curto e focado só em corrigir a regressão do lab-67.
