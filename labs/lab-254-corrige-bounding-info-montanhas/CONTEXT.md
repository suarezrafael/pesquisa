# Contexto — Laboratório 254 — Corrige bounding info desatualizado do planeta

Preenchido em: 2026-10-04
Commit inicial → final: d92c0aa55270523c19c95630a97e4aadeb3d677a..(ver PR)

## O que foi feito

- `app/src/world3d/World3D.tsx` (`setup()`, construção do mesh `planet`): a chamada
  `planet.updateVerticesData(VertexBuffer.PositionKind, planetPositions)` agora passa `true` como
  3º argumento (`updateExtends`). Antes, a caixa delimitadora (bounding info) do mesh ficava
  travada nos limites da esfera LISA original (raio `PLANET_RADIUS = 13`), mesmo depois do laço
  logo acima deslocar vértices radialmente até `PLANET_RADIUS + 2,6` nos platôs mais altos
  (`PLATEAU_CENTERS[0].height`).

## Como a causa foi encontrada

O usuário mandou um print mostrando escolas/personagens em posições elevadas, consistente com o
padrão já descrito desde o lab-95 ("casas sobre o morro aparecem flutuando no espaço"). Em vez de
tentar uma 4ª variação das 3 teorias já descartadas (culling de face traseira — lab-95;
iluminação de face traseira — lab-124; triângulo fino em certos ângulos — lab-151, que inclusive
MEDIU 0 triângulos genuinamente degenerados ao vivo, descartando a hipótese de "triângulo
dobrado"), reli o código de construção do `planet` procurando algo nunca verificado antes.

Achado: `planet.getVerticesData`/`updateVerticesData` para `PositionKind` em
`node_modules/@babylonjs/core/Meshes/geometry.js` só recalcula a caixa delimitadora quando o
parâmetro `updateExtends` é `true`:
```js
updateVerticesData(kind, data, updateExtends = false) {
  ...
  if (kind === VertexBuffer.PositionKind) {
    this._updateBoundingInfo(updateExtends, data)  // só atualiza a caixa se updateExtends
  }
  ...
}
```
A chamada em `World3D.tsx` não passava esse argumento (ficava `undefined` → `false`). Confirmado
com `grep` que nenhum outro ponto do arquivo chama `planet.refreshBoundingInfo()` depois.

## Por que essa teoria é plausível (e as 3 anteriores não resolveram)

A caixa delimitadora (bounding info) é o que o motor usa para decidir se um mesh está dentro do
campo de visão da câmera (frustum culling) — **não** a geometria real. A física (Havok) sempre lê
a malha de verdade (posições reais dos vértices), nunca essa caixa — por isso a colisão sempre
funcionou corretamente em todos os relatos anteriores, mesmo quando o visual falhava. Uma caixa
desatualizada, menor que o relevo real, pode levar o motor a avaliar errado se o mesh (ou a
região do pico de uma montanha) está dentro do frustum dependendo da posição/ângulo exatos da
câmera — consistente com "só em certos ângulos", relatado desde o lab-95.

## Limite honesto desta correção

**Não tenho confirmação visual ao vivo de que isso resolve o sintoma exato do print do usuário.**
Tentei duas vezes carregar o jogo no navegador automatizado desta sessão (`npm run dev`,
localhost) para testar antes de só declarar "corrigido" — nas duas vezes o carregamento do mundo
3D travou por mais de 3 minutos reais em "Carregando o mundo 3D...", sem nunca expor
`window.__scene`. Diagnosticado como limitação do ambiente, não do jogo: a aba fica com
`document.hidden === true` (confirmado via `javascript_exec`) mesmo sem nenhuma ação explícita de
backgrounding, e o Chrome limita timers (`setTimeout`) de abas em segundo plano a ~1 disparo por
segundo — o laço de aquecimento da física (`Havok`, até 180 rodadas, cada uma cedendo via
`setTimeout`) e outras etapas sequenciais do `setup()` parecem ficar presas nesse limite. `tsc -b`
e a build de produção passaram sem erro, e a lógica da mudança foi verificada lendo o código-fonte
real do `@babylonjs/core` instalado (não só documentação) — mas isso é verificação de código, não
confirmação visual.

## Decisões técnicas tomadas

- **Só o parâmetro `updateExtends: true`, nenhuma outra mudança.** Risco mínimo: é um parâmetro
  da própria API do Babylon.js feito exatamente para este cenário (atualizar posições e pedir o
  recálculo da caixa delimitadora junto). Não mexe em material, iluminação, normais nem física —
  nenhuma das 3 correções anteriores precisou ser revertida ou alterada.
- **Não tentei uma 4ª teoria especulativa adicional "por via das dúvidas".** As 3 tentativas
  anteriores falharam exatamente por serem teorias não verificadas contra o código/dado real;
  esta foi confirmada lendo o código-fonte do motor (não suposição), então não há motivo pra
  empilhar mais uma correção não verificada em cima.
- **Publicar mesmo sem confirmação visual própria, com a pendência documentada explicitamente**
  (tanto aqui quanto no `FEATURES.md`) — dado que é uma correção de baixíssimo risco, de causa
  verificada no código-fonte do motor, e que o usuário já indicou prioridade alta, esperar
  resolver a limitação do ambiente de automação (que pode levar muito mais investigação) antes de
  publicar atrasaria sem necessidade uma correção já pronta e segura. A alternativa — não
  publicar nada até conseguir testar ao vivo — contraria o pedido explícito de prioridade do
  usuário sem necessidade real.

## Pendências / dívidas conhecidas

- **Confirmação visual do usuário, na mesma situação do print, é o próximo passo obrigatório.**
  Se o sintoma persistir mesmo depois desta correção, a causa não é (só) bounding info — próximas
  hipóteses a considerar, em ordem de plausibilidade dada a leitura deste lab: (a) sombra
  (`shadowGenerator.bias`/`normalBias`) causando "shadow acne" severo nas rampas mais íngremes,
  já uma categoria de bug conhecida neste mesmo arquivo (lab-87, nunca confirmada visualmente de
  vez); (b) algo específico do mesh dos pedestais/rochas decorativas perto do platô, não do
  `planet` em si.
- Limitação de ambiente (aba em segundo plano travando o `setup()` do jogo por minutos) não
  resolvida — registrada como conhecimento geral de sessão, não só deste lab. Se precisar
  verificar algo ao vivo de novo, considerar testar direto em produção
  (`missaoaprendizado.com`, build já otimizada) em vez de `npm run dev` local, ou investigar se
  há como manter a aba em primeiro plano de verdade durante a automação.

## Funcionalidades planejadas que NÃO foram concluídas

- Validação ao vivo do usuário (ver "Limite honesto" acima) — não é código pendente, é
  confirmação visual que só o usuário pode dar.

## O que o próximo laboratório deve desenvolver

- **Aguardar o usuário testar depois do deploy e relatar se o sintoma do print sumiu.** Se sim,
  nenhuma ação adicional. Se não, seguir pelas hipóteses em "Pendências" acima — não inventar uma
  5ª teoria sem antes tentar as duas já listadas (sombra, ou isolar se é especificamente o
  `planet` vs. algo decorativo por perto).

## Estado do repositório ao final

- Branch: `lab-254-corrige-bounding-info-montanhas`.
- Suite: 377/377 (37 arquivos, inalterada — este lab não tem teste automatizado próprio, é uma
  mudança de engine 3D sem infraestrutura de teste visual no projeto). Lint: zero avisos. `tsc
  -b`: limpo. Build: TypeScript + Vite + PWA sem erro novo (mesmo aviso preexistente de chunk
  >500kB).
- `.github/copilot-instructions.md` e `.vscode/` locais não incluídos.
