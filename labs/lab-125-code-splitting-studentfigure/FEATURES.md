# Laboratório 125 — Code-splitting real do chunk studentFigure (3,68MB)

Status: concluído (resultado negativo — mudança testada e revertida)
Início: 2026-08-29
Fim: 2026-08-29
Commit inicial: 901d35dc019b00481df5b6ed376e063e02fa085f

## Objetivo do laboratório

Escolhido pelo usuário como único item restante no backlog. Retomar a investigação feita durante o
lab-122 (não formalizada como lab próprio na época): o chunk `studentFigure-*.js` (3,68MB
minificado / ~788KB gzip) é o maior do projeto, e a causa raiz já tinha sido confirmada com dados
reais.

## Investigado antes de planejar

- **Causa raiz já confirmada** (investigação do lab-122, revalidada aqui): o `package.json` do
  `@babylonjs/core` marca todo `**/index.js` como tendo efeitos colaterais. Assim que qualquer
  arquivo importa do barril `@babylonjs/core` (o especificador nu), o Rollup é forçado a incluir o
  grafo de módulos inteiro (XR, FrameGraph, editor de nó-material, engine WebGPU, partículas GPU —
  nada disso usado neste jogo), porque não consegue provar que os registros de efeito colateral
  (`Scene.prototype.xxx = ...`) são seguros de descartar.
- **Confirmado por leitura de código: TRÊS arquivos importam o barril `@babylonjs/core`** —
  `World3D.tsx` (34 símbolos), `AvatarPreview3D.tsx` (11 símbolos), `studentFigure.ts` (9
  símbolos) — com bastante sobreposição entre eles (`Color3`, `MeshBuilder`, `PBRMaterial`,
  `Scene`, `ShadowGenerator`, `Vector3` aparecem nos três).
- **Testado no lab-122 e confirmado insuficiente sozinho**: trocar só os imports de
  `studentFigure.ts` pra caminhos individuais (mesma técnica do lab-117 pro pacote GUI) teve efeito
  ZERO no tamanho do chunk — os outros dois arquivos ainda importam o barril e forçam o mesmo grafo
  bloatado pro mesmo chunk de qualquer forma. **A correção só funciona se os TRÊS arquivos forem
  convertidos ao mesmo tempo.**
- **Caminho de import individual verificado pra cada um dos 35 símbolos únicos** (não suposição —
  cada arquivo `.d.ts` foi conferido em `node_modules/@babylonjs/core`, e a existência do `.js`
  correspondente foi checada com um script antes de tocar qualquer código-fonte). A maioria tem uma
  variante `.pure.js` (build específica do próprio Babylon.js pra tree-shaking, sem os registros de
  efeito colateral do barril) — usada sempre que existe; onde não existe variante `.pure` (ex.:
  `ShadowGenerator`, `PhysicsAggregate`, `SceneLoader`, `HavokPlugin`), o caminho aponta pro arquivo
  individual normal (ainda bypassa o `index.js`, que é o que realmente importa pra esse fix).

## Decisões técnicas tomadas

- **Converter os TRÊS arquivos na mesma mudança** — o lab-122 já provou que fazer só um não
  funciona; qualquer PR/commit intermediário com só um arquivo convertido não teria efeito
  mensurável (dado real, não suposição).
- **Preferir a variante `.pure` quando existir** — é a build que o próprio time do Babylon.js
  publica especificamente pra este cenário (tree-shaking), evita reinventar a curadoria de
  dependência interna.
- **Sem mudança de comportamento nenhuma** — é 100% troca de caminho de import, mesmos símbolos,
  mesmas classes, mesmo uso em todo o resto do código. Risco fica concentrado em digitar o caminho
  errado (typo) pra algum dos 35 símbolos — mitigado verificando CADA caminho contra o pacote real
  antes de editar, e pelo próprio TypeScript/build falhando imediatamente se algo estiver errado.
- **Medição antes/depois obrigatória** — sem medir o tamanho real do chunk antes e depois, não dá
  pra confirmar que a mudança teve o efeito esperado (lição do lab-117, que também mediu com
  `vite-bundle-visualizer`/tamanho de build).

## Funcionalidades planejadas

- [x] `World3D.tsx`: trocar os 34 símbolos importados do barril `@babylonjs/core` por imports
      individuais (caminho verificado por símbolo) — **implementado, medido, e REVERTIDO** (ver
      "Resultado" abaixo).
- [x] `AvatarPreview3D.tsx`: mesma troca pros 11 símbolos — mesmo destino.
- [x] `studentFigure.ts`: mesma troca pros 9 símbolos — mesmo destino.
- [x] Verificação: `npm run build` sem erros, tamanho do chunk `studentFigure`/`World3D` medido
      antes e depois (byte a byte, não estimativa) — **foi exatamente essa medição que revelou que
      a mudança piorava o resultado, antes de qualquer commit.**

## Resultado: a correção PIOROU o tamanho total, não melhorou — revertida

Medido com `npm run build` antes e depois da troca dos 3 arquivos pra imports individuais:

| | Antes (barril) | Depois (imports individuais) |
|---|---|---|
| `World3D-*.js` | 633,81 kB / 150,17 kB gzip | 5.148,96 kB / 1.119,53 kB gzip |
| `studentFigure-*.js` | 3.679,98 kB / 788,24 kB gzip | 699,31 kB / 167,77 kB gzip |
| **Total (os 2 chunks)** | **4.313,79 kB / 938,41 kB gzip** | **5.848,27 kB / 1.287,30 kB gzip** |

`studentFigure` de fato encolheu bastante sozinho (-81%), mas isso só empurrou a maior parte do
peso pro chunk `World3D` — que INCHOU quase 8× (633kB → 5,15MB). Como qualquer jogador que entra
no mundo 3D precisa baixar OS DOIS chunks juntos (`World3D.tsx` importa funções de
`studentFigure.ts` pra montar o boneco), o total real que o jogador baixa piorou em ~1,53MB
(+35% em bytes brutos, +37% gzip) — uma regressão clara, não uma melhoria.

**Hipótese de por que isso aconteceu** (não confirmada com certeza absoluta, mas consistente com o
padrão observado): as variantes `.pure.js` do Babylon.js são feitas pra cenário de "preciso de UMA
ou DUAS classes isoladas" (exatamente o caso do lab-117 com o pacote GUI, só 2 símbolos) — cada
arquivo `.pure` é mantido o mais AUTOCONTIDO possível, à custa de duplicar pequenos trechos de
lógica interna em vez de compartilhar via um módulo comum. Isso é uma ótima troca quando só se
precisa de 1-2 classes, mas vira desvantagem quando se precisa de uma fatia GRANDE e interligada da
API (34 classes em `World3D.tsx`, várias delas dependendo pesadamente umas das outras) — nesse
caso, o barril original provavelmente já compartilhava/deduplicava melhor o código comum entre as
classes usadas, e trocar pra 34 pontos de entrada `.pure` separados quebrou parte dessa
deduplicação.

**Investigado e descartado como causa**: `@babylonjs/loaders/glTF` (importado sem mudança em
`World3D.tsx`) poderia estar forçando o barril de volta por conta própria — checado com grep
recursivo em todo `node_modules/@babylonjs/loaders`: **zero** ocorrências de
`from "@babylonjs/core"` (barril nu) em qualquer arquivo do pacote. Não é a causa.

**Ação tomada**: as mudanças nos 3 arquivos foram revertidas por completo
(`git checkout -- src/world3d/World3D.tsx src/world3d/AvatarPreview3D.tsx src/world3d/studentFigure.ts`)
antes de qualquer commit. `npm run build` confirmado voltando exatamente aos tamanhos originais
(633,81 kB / 3.679,98 kB), `npm run test` 47/47.

## Fora de escopo (explicitamente adiado)

- glTF 1.0 morto dentro de `@babylonjs/loaders/glTF` (~65KB) — identificado no lab-117, sem
  confirmação de como remover com segurança; não revisitado aqui.
- Qualquer mudança de comportamento/funcionalidade — este laboratório é só sobre tamanho de bundle.
