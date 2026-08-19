# Contexto — Laboratório 57 — Legendas gigantes/borradas e HUD grande demais no celular

Preenchido em: 2026-08-19
Commit inicial → final: a7efbe0dbd42da7106dc06574f2713a67c123a3d..HEAD

## O que foi feito

1. **Diagnóstico com evidência visual real**: o usuário mandou duas capturas de tela de um celular
   real (Poco C75) — uma mostrando o mundo 3D com as legendas ("Prédio dos Enigmas", "Lojinha",
   números de missão, bolhas "Oi!") enormes e serrilhadas, e o mundo em si visivelmente
   pixelizado; outra mostrando o modal de quiz (HTML/CSS normal, sem problema — confirma que o
   bug é específico do canvas 3D/GUI do Babylon, não da UI React).
2. **Causa raiz real, não só sintoma**: lida a implementação do `AdvancedDynamicTexture` do
   Babylon.GUI (`node_modules/@babylonjs/gui/2D/advancedDynamicTexture.js`, método `_onResize()`)
   pra confirmar por que isso acontecia. `CreateFullscreenUI` cria o ADT com `renderWidth =
   engine.getRenderWidth() * renderScale` — e `engine.getRenderWidth()` já devolve o tamanho do
   framebuffer DEPOIS de aplicado o `hardwareScalingLevel` (que os laboratórios 53/55/56 foram
   aumentando de propósito pra ganhar FPS em dispositivo fraco). Resultado: o texto/legendas
   (medidos em "pixels" dessa textura menor) ficam desenhados numa resolução baixa e depois
   esticados junto com o resto do frame — daí "fonte gigante e borrada", não um problema de
   `fontSize` em si.
3. **Correção** (`World3D.tsx`, logo após criar `guiTexture`): função `syncGuiResolution()` chama
   `guiTexture.scaleTo(canvas.clientWidth * devicePixelRatio, canvas.clientHeight *
   devicePixelRatio)` — força a textura do GUI pro tamanho real em pixels de dispositivo,
   independente de `hardwareScalingLevel`. Chamada uma vez na criação, e de novo a cada resize da
   janela: o Babylon tenta resincronizar o ADT sozinho a cada `engine.resize()` (via
   `onResizeObservable`, confirmado lendo `_onResize()`), então sem reaplicar depois do resize a
   correção seria desfeita na próxima mudança de tamanho de tela/orientação. Como `syncGuiResolution`
   vive dentro da closure de `setup()` (função `async`) e o handler de resize vive no escopo do
   efeito principal, lá fora, foi exposta uma ponte `(scene as any).__syncGuiResolution` — mesmo
   padrão já usado várias vezes neste arquivo pra cruzar essa fronteira de closure.
4. **`hardwareScalingLevel` revertido de 1.75 (lab-56) pra 1.5`**: 1.75 tinha sido escolhido às
   cegas (sem aparelho real pra testar) tentando resolver "ainda pesado" — alto demais, deixa o
   MUNDO 3D em si (não só o GUI, que já foi corrigido acima) visivelmente mais borrado num celular
   de verdade. 1.5 é o valor original testado desde o lab-53.
5. **HUD responsivo**: `@media (max-width: 420px)` em `index.css` encolhendo avatar (3.25rem →
   2.4rem), fonte do nome/nível/moedas, botões redondos (2.25rem → 1.8rem) e paddings/gaps — só
   abaixo desse ponto de corte de largura de tela.

## Decisões técnicas tomadas

- **Corrigir a causa raiz da resolução do GUI, não só aumentar `fontSize`** — aumentar o tamanho
  da fonte pra "compensar" o achatamento não resolveria a borragem (o problema real é resolução
  de textura baixa sendo esticada, não o tamanho lógico do texto) e pioraria ainda mais a
  proporção em dispositivos onde a resolução do GUI JÁ está correta (ex.: desktop, onde
  `hardwareScalingLevel` nunca é alterado). Decoplar a resolução do GUI do `hardwareScalingLevel`
  resolve os dois sintomas relatados ("fonte grande" E "borrada") de uma vez, na raiz.
- **`scaleTo` reaplicado a cada resize, não só uma vez na criação** — confirmado lendo o código
  do Babylon que `_onResize()` roda a cada `engine.resize()` e recalcula o tamanho da textura a
  partir de `engine.getRenderWidth()` (ainda escalado) sempre que o tamanho salvo não bate mais —
  sem reaplicar a correção depois de cada resize, ela seria desfeita na próxima rotação de tela/
  mudança de viewport.
- **Não foi possível testar visualmente num viewport estreito de verdade nesta sessão** — a
  ferramenta de resize de janela disponível no ambiente de automação não altera o viewport real
  do Chrome (`window.innerWidth` continuou reportando a largura do monitor inteiro mesmo depois
  de "resize"). Em vez de forçar um teste visual não confiável, a correção foi verificada por
  outra via, mais forte pra este caso específico: leitura direta do código-fonte da biblioteca
  (`_onResize()`) confirmando exatamente o mecanismo do bug e por que a correção o neutraliza, e
  confirmação de que o CSS/JS compilado contém a media query e o `scaleTo` certos. Pendência real:
  o usuário confirmar visualmente no Poco C75 de novo.
- **`hardwareScalingLevel` revertido em vez de mantido com a correção do GUI aplicada por cima** —
  mesmo com o GUI corrigido, o MUNDO 3D em si (terreno, árvores, avatar) continuaria borrado em
  1.75; como o usuário reportou "qualidade gráfica está muito baixa" como reclamação separada (não
  só sobre o texto), fazia sentido também recuar esse valor, não só corrigir o GUI.

## Pendências / dívidas conhecidas

- Usuário precisa confirmar no Poco C75 real se as legendas ficaram do tamanho/nitidez certos e
  se o HUD do topo ficou proporcional agora — não foi possível verificar visualmente nesta sessão
  (ver "Decisões técnicas" acima).
- Detecção de dispositivo continua binária (é móvel ou não) — se aparelhos muito diferentes entre
  si (ex.: Poco C75 vs. Redmi Pad 2) continuarem precisando de ajustes finos diferentes, pode
  valer a pena estratificar por classe de aparelho no futuro (fora de escopo aqui, ver
  `FEATURES.md`).

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — tudo que foi decidido como escopo foi entregue (com a ressalva de verificação visual
documentada acima).

## O que o próximo laboratório deve desenvolver

1. Usuário testar no Poco C75 real (e no Redmi Pad 2, já que `hardwareScalingLevel` mudou de
   novo) e reportar se os três problemas (fonte, qualidade geral, HUD) foram resolvidos.
2. Se a resolução do GUI ainda não estiver certa na prática (apesar da análise de código), pode
   ser necessário instrumentar com um log/HUD de debug mostrando o tamanho real do ADT
   (`guiTexture.getSize()`) num dispositivo de verdade pra confirmar o valor aplicado.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`. PRs anteriores (#2, #3) já foram mesclados pelo
  usuário — este laboratório precisa de um PR novo (aberto ao final desta sessão, ver link no
  resumo passado ao usuário).
- Jogo ao vivo (republicado com este laboratório): https://app-two-flax-92.vercel.app
- Como rodar/verificar localmente: `cd app && npm install && npm run dev`.
- Como redeployar o jogo: `cd app && npx vercel --prod --yes`.
