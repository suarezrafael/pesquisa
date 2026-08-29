# Laboratório 117 — Reduz o peso do bundle de World3D (imports escopados do Babylon.js)

Status: em andamento
Início: 2026-08-29
Commit inicial: 90dcaa7742bb6e355014c626b53fa266d901f796

## Objetivo do laboratório
Escolhido pelo usuário entre 3 opções de débito técnico já identificadas em `labs/CURRENT.md`
("Frentes de profissionalização ainda não construídas"): "Code-splitting do World3D.tsx" — o
chunk do mundo 3D está em ~918KB minificado (194KB gzip).

## Investigado antes de planejar
- Instalado temporariamente `vite-bundle-visualizer` (via `npx`, não vira dependência do projeto)
  pra medir a composição REAL dos dois maiores chunks (`World3D-*.js`=918KB,
  `studentFigure-*.js`=3,68MB!) em vez de adivinhar onde cortar.
- **Achado principal**: `World3D.tsx` importa só `AdvancedDynamicTexture`/`TextBlock` de
  `@babylonjs/gui`, mas como não existe um `"exports"` restritivo no `package.json` do pacote e o
  código importa do BARRIL (`from '@babylonjs/gui'`), o bundler inclui o pacote `@babylonjs/gui`
  inteiro — 695KB (unminificado) dentro do chunk `World3D`, sendo:
  - `2D/controls` (419KB) — TODOS os controles 2D (botões, sliders, checkbox, grid, imagem etc.),
    embora só `TextBlock` seja usado.
  - `3D/materials` (222KB) — materiais de GUI 3D (handle/fluent/fluentButton/fluentBackplate),
    usados por controles 3D que este jogo NUNCA usa (não há GUI 3D neste jogo, só
    `AdvancedDynamicTexture` 2D pra legendas flutuantes).
  - Confirmado lendo o código-fonte do pacote: `advancedDynamicTexture.js` e `textBlock.js` (os
    arquivos individuais, não os índices de pasta) só dependem de `Container`/`Control`/`Style`/
    `Measure` — uma fração pequena da árvore acima —, então importar direto desses arquivos (em
    vez do barril `@babylonjs/gui`) deve eliminar praticamente todo esse peso sem tocar
    funcionalidade nenhuma (mesmo padrão de tree-shaking que a própria documentação do Babylon.js
    recomenda pra bundles menores).
- **Achado secundário, adiado**: `import '@babylonjs/loaders/glTF'` inclui o loader de glTF 1.0
  (65KB) além do 2.0 (317KB) — o jogo só usa modelos glTF 2.0 (`.glb` modernos). Não há um jeito
  documentado/confirmado de importar só a versão 2.0 sem reconstruir manualmente a cadeia de
  registro do loader (`glTFFileLoader.js` + `2.0/index.js`, sem `1.0/index.js`) — risco real de
  quebrar silenciosamente o carregamento de modelos glTF em produção pra uma economia pequena
  (~65KB de ~918KB). Fica documentado como oportunidade futura, não implementado agora.
- **Achado maior, também adiado (fora do que dá pra resolver só mudando imports)**: o chunk
  `studentFigure-*.js` (3,68MB minificado!) é quase inteiramente (>99%) código de
  `@babylonjs/core` — não é `studentFigure.ts` que está inchado, é que o bundler colocou ali a
  MAIOR parte do `@babylonjs/core` genuinamente usado pelo jogo inteiro (física, PBR, partículas,
  sombras — tudo real, não lixo). Dentro dele, blocos como `XR` (450KB) e `FrameGraph` (587KB)
  aparecem mesmo o jogo NUNCA usando WebXR — mas isso vem de acoplamento INTERNO do próprio
  `Scene`/`Engine` do Babylon.js (essas classes referenciam esses subsistemas por dentro,
  independente de como o app importa), não de um import específico deste projeto — corrigir
  isso exigiria reescrever TODOS os imports de `@babylonjs/core` do projeto inteiro pra caminhos
  profundos (`@babylonjs/core/Meshes/meshBuilder` em vez de `from '@babylonjs/core'`), sem garantia
  de eliminar o acoplamento (é limitação documentada do próprio motor, não só estilo de import) —
  escopo grande demais e resultado incerto pra este laboratório; fica registrado como
  possibilidade de um laboratório futuro dedicado, não tentado aqui.

## Decisões técnicas tomadas
- **Só o import de `@babylonjs/gui` muda neste laboratório** — é o único achado com alta confiança
  (código-fonte do pacote confirma a dependência mínima) E alto retorno (695KB de 918KB do chunk
  principal) E baixo risco (só 2 símbolos, usados num único lugar, fácil de verificar ao vivo que
  as legendas flutuantes continuam funcionando).
- **glTF 1.0 e o acoplamento interno de `@babylonjs/core` ficam fora de escopo** — riscos/esforço
  não compensam o ganho nesta rodada (ver "Investigado antes de planejar" acima).
- **`vite-bundle-visualizer` não vira dependência do projeto** — rodado só via `npx` durante a
  investigação, não precisa ficar instalado pra manutenção futura (qualquer um pode rodar de novo
  do mesmo jeito quando precisar medir de novo).

## Funcionalidades planejadas
- [ ] `World3D.tsx`: trocar `import { AdvancedDynamicTexture, TextBlock } from '@babylonjs/gui'`
      por imports diretos dos arquivos individuais (`@babylonjs/gui/2D/advancedDynamicTexture`,
      `@babylonjs/gui/2D/controls/textBlock`).
- [ ] Medir o tamanho do chunk `World3D` antes/depois via `npm run build` (comparar o número
      reportado pelo Vite, minificado + gzip).
- [ ] Verificação ao vivo (dev server + browser automation): legendas flutuantes (números de
      escola, "Pressione E pra voltar", labels de moeda/planeta) continuam aparecendo
      normalmente — é a única funcionalidade que depende de `@babylonjs/gui` neste jogo.
- [ ] `npm run test`/`npm run build` sem erros.

## Fora de escopo (explicitamente adiado)
- Import escopado de `@babylonjs/loaders/glTF` (só 2.0) — risco de quebrar carregamento de modelo
  sem um jeito confirmado de reconstruir a cadeia de registro do loader.
- Reescrever os imports de `@babylonjs/core` do projeto inteiro pra caminhos profundos — escopo
  grande, resultado incerto (acoplamento interno do próprio Babylon.js entre `Scene`/`XR`/
  `FrameGraph`), laboratório próprio se o usuário quiser perseguir depois.
- Qualquer mudança de arquitetura de jogo (mover lógica de planeta pra módulos importados sob
  demanda) — a real "code-splitting por planeta" exigiria desacoplar cada `buildXIfNeeded()` das
  dezenas de variáveis compartilhadas do closure de `setup()`, um refactor grande e arriscado pra
  este laboratório; o ganho de bundle encontrado no import do `@babylonjs/gui` é maior e muito mais
  seguro.
