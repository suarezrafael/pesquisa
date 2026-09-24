# Contexto do laboratorio 235

Base: `origin/main` em `e387563840415333a670504adc87fbc7ca327382`.

`World3D` inicia o painel recolhido e atualiza um contador compacto de FPS
por ref. Ao expandir, o diagnostico completo e `Medir 15 s` continuam no mesmo
local. O texto detalhado agora muda a cada 500 ms, em vez de a cada quadro,
evitando montar a string longa enquanto o painel esta fechado. `index.css`
mantem o botao de 68x44 px e numeros tabulares para evitar salto de largura.

Verificacao: build/TypeScript, 297 testes e lint passaram (dois avisos
preexistentes). No navegador local, o FPS apareceu e o painel expandiu com
`Medir 15 s`. A 390x844, os retangulos do indicador e dos controles de toque
nao se sobrepuseram. Nao houve coleta comparavel de FPS/CPU no tablet; esta
validacao permanece aberta. Nenhum deploy neste laboratorio.

As PRs #116 (LOD), #119 (lojinha) e #123 (visuais de assinatura) seguem em
rascunho na data deste lab; esta mudanca parte da `main` e nao as incorpora.
