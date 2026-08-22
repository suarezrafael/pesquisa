# Laboratório 72 — Overlay de debug sobreposto ao HUD + fonte 1.6x no celular

Status: concluído
Início: 2026-08-22
Fim: 2026-08-22
Commit inicial: f2447d8622e1fb16556624e01fe788644b904784

## Objetivo do laboratório
Usuário mandou um screenshot real do Poco C75 (finalmente rodando código atual — "escala 1.40" É
um valor válido da tabela do lab-70, confirmando que a correção do lab-71 funcionou): "no celular
ainda nao consigo ler as legendas e nomes dos boneco a qualidade fica baixa demais no celular, o
fps esta bom agora."

O screenshot revelou DOIS problemas:
1. Um bug real de layout: o overlay de FPS/diagnóstico (`.world3d-debug`) — uma string longa numa
   linha só, sem largura máxima, ancorada pela borda direita — ficava mais largo que a tela
   inteira nesse aparelho, e a parte que "sobrava" pra esquerda ia parar em cima do painel
   avatar/nome/moedas, virando uma bagunça de texto ilegível sobreposto.
2. O aumento de fonte do lab-70 (1.2x) não foi suficiente — com FPS já bom (25) segundo o próprio
   usuário, tem folga pra aumentar mais a fonte sem custo de jogabilidade.

## Funcionalidades planejadas
- [x] Corrigir o overlay de debug pra caber na tela em qualquer largura (`max-width` + quebra de
      linha) e descer pra abaixo da fileira de ícones do HUD, em vez de disputar a mesma linha.
      Verificado AO VIVO: screenshot mostra o overlay quebrado em 2 linhas, abaixo do HUD, sem
      sobreposição nenhuma.
- [x] Aumentar `mobileFontSize` de 1.2x pra 1.6x.
- [x] Build (typecheck + produção) passa; verificado ao vivo que desktop continua sem regressão,
      zero erros de console.
- [x] Deploy em produção ao final — feito depois do wrap deste lab.

## Fora de escopo (explicitamente adiado)
- Auditoria de contraste (largura/cor do contorno do texto) em todos os pontos do código que
  criam `TextBlock` — são dezenas de pontos espalhados pelo arquivo; se 1.6x ainda não bastar,
  vale revisitar isso com mais cautela numa rodada dedicada.
