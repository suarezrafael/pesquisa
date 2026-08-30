# Contexto — Laboratório 125 — Code-splitting real do chunk studentFigure (resultado negativo)

Preenchido em: 2026-08-29
Commit inicial → final: 901d35dc019b00481df5b6ed376e063e02fa085f..HEAD (nenhuma mudança de código
sobrevive — a única alteração real é a documentação deste laboratório)

## O que foi feito

Testou, mediu e **descartou** a hipótese de que converter os imports em barril de
`@babylonjs/core` (em `World3D.tsx`, `AvatarPreview3D.tsx`, `studentFigure.ts`) pra imports
individuais/`.pure` reduziria o tamanho total do bundle. A implementação foi completa (todos os 35
símbolos únicos convertidos, cada caminho de import verificado contra o pacote real antes de
editar) e o build passou sem erros — mas a MEDIÇÃO antes/depois mostrou que o tamanho TOTAL (soma
dos chunks `World3D` + `studentFigure`, que qualquer jogador que entra no mundo 3D baixa junto)
piorou de ~4,31MB pra ~5,85MB (+35%), não melhorou. Ver `FEATURES.md` pra tabela completa de
medição e a hipótese de por que isso aconteceu (as variantes `.pure.js` do Babylon.js favorecem o
caso de precisar de 1-2 classes isoladas, não uma fatia grande e interligada da API como este
jogo precisa).

A mudança foi revertida por completo antes de qualquer commit (`git checkout --` nos 3 arquivos).
`npm run build` confirmado voltando aos tamanhos exatos de antes; `npm run test` 47/47.

## Decisões técnicas tomadas

- **Medir antes de confiar** — a mesma disciplina já usada no lab-117 (que mediu com
  `vite-bundle-visualizer` antes de decidir o que cortar) evitou entregar/documentar como sucesso
  uma mudança que na verdade piorava as coisas. Sem essa medição, seria fácil relatar "convertido
  com sucesso, build sem erros" e nunca notar a regressão real.
- **Reverter e documentar o resultado negativo, não só abandonar silenciosamente** — um resultado
  negativo bem medido e documentado é informação valiosa: evita que um laboratório futuro tente a
  MESMA abordagem de novo sem saber que já foi tentada e não funcionou.
- **Descartada uma hipótese alternativa antes de aceitar a explicação final** — checado se
  `@babylonjs/loaders/glTF` (dependência de terceiro, não editada) importava o barril
  internamente e forçava o inchaço de volta; grep recursivo no pacote confirmou que não.

## Pendências / dívidas conhecidas

- O chunk `studentFigure` continua com 3,68MB — sem mudança nesta frente. Se o tamanho do bundle
  do mundo 3D precisar diminuir no futuro, esta técnica específica (imports `.pure` individuais)
  já foi tentada e não é o caminho — precisaria de uma abordagem diferente (ex.: uma ferramenta de
  build específica pra Babylon.js com tree-shaking mais inteligente pra esse cenário de "muitas
  classes interligadas", ou aceitar o tamanho atual dado que o mundo 3D já é carregado via
  `lazy()` e não bloqueia o carregamento inicial do app).

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — a investigação foi completa (implementada, medida, e a conclusão de reverter foi tomada
com dados reais, não deixada pela metade).

## O que o próximo laboratório deve desenvolver

Backlog está vazio no momento — nenhum item pendente sem depender de nova informação/pedido do
usuário. Aguardar próximo pedido.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`.
- Nenhuma mudança de código de produção neste laboratório (revertida). `npm run test`: 47/47.
  `npm run build`: sem erros, tamanhos de chunk confirmados idênticos aos de antes do laboratório.
- Como verificar de novo: `cd app && npm run build`, conferir `World3D-*.js` (~634kB) e
  `studentFigure-*.js` (~3.680kB) — devem bater com os valores documentados aqui.
