# Laboratório 57 — Legendas gigantes/borradas e HUD grande demais no celular

Status: concluído
Início: 2026-08-19
Fim: 2026-08-19
Commit inicial: a7efbe0dbd42da7106dc06574f2713a67c123a3d

## Objetivo do laboratório
Usuário mandou capturas de tela de um celular real (Poco C75): "no celular poco c75 as legendas
flutuantes ficam com a fonte muito grande, e a qualidade gráfica está muito baixa, e o componente
fixo no topo tá um pouco grande pra essa resolução." As capturas confirmaram os três problemas de
forma bem visível: texto/legendas 3D enormes e serrilhados, mundo 3D bem pixelizado, e o cabeçalho
(avatar+nome+XP+moedas+6 botões) ocupando quase a largura toda da tela.

## Funcionalidades planejadas
- [x] **Causa raiz das legendas gigantes/borradas identificada e corrigida**: o `AdvancedDynamicTexture`
      do Babylon.GUI (nomes de jogador, bolhas de chat, "Prédio dos Enigmas"/números de missão/
      "Lojinha", etc.) usa por padrão a MESMA resolução interna reduzida da cena 3D
      (`engine.getRenderWidth/Height()`, já reduzida de propósito por `hardwareScalingLevel` em
      dispositivo fraco) — confirmado lendo o código-fonte do Babylon.GUI (`_onResize()` em
      `advancedDynamicTexture.js`). Corrigido forçando a resolução do GUI pro tamanho real do
      canvas em pixels de dispositivo (`guiTexture.scaleTo(...)`), independente de quanto a cena
      3D está escalada — reaplicado a cada resize da janela, já que o Babylon tenta resincronizar
      sozinho a cada `engine.resize()`.
- [x] **`hardwareScalingLevel` 1.75 → 1.5**: 1.75 (lab-56) tinha sido ajustado sem poder testar
      num aparelho real; alto demais deixa o mundo 3D borrado demais num celular. Volta pro valor
      original do lab-53, mais conservador nesse trade-off qualidade/FPS.
- [x] **HUD responsivo pra tela estreita** (`@media (max-width: 420px)`): avatar, fonte do nome/
      nível/moedas, botões redondos e espaçamento encolhidos só abaixo desse ponto de corte —
      telas maiores (tablet, desktop) continuam do jeito que já estavam.
- [x] Build (typecheck + produção) passa.
- [x] Verificado: a media query e o código de `scaleTo` confirmados presentes no bundle compilado
      (`dist/assets/*.css`/`*.js`) com os valores certos. Caminho desktop testado ao vivo (build
      de produção) sem erro no console e sem regressão visual. **Não foi possível emular de
      verdade um viewport estreito + user agent móvel neste ambiente de automação** (a ferramenta
      de resize de janela não altera o viewport real do Chrome aqui) — a correção da resolução do
      GUI foi verificada por leitura direta do código-fonte do Babylon.GUI (`_onResize`), não por
      teste visual ao vivo; pendência real é o usuário confirmar no Poco C75 de novo.

## Fora de escopo (explicitamente adiado)
- Detecção de dispositivo por camadas (diferenciar tablet fraco de celular médio, em vez do
  binário atual "é móvel ou não") — poderia permitir configurações mais finas por classe de
  aparelho, mas não foi pedido e adicionaria complexidade sem necessidade clara ainda.
