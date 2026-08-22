# Contexto — Laboratório 75 — rochas flutuando perto de platôs

Preenchido em: 2026-08-22
Commit inicial → final: c420465dec49d7124470f1079db84bf8567fb964..234ab39

## O que foi feito
- **Investigação ao vivo** (dev server, `window.__debugTeleport`/`__debugSetFacing`/`__forceRain`
  já existentes, mais scripts ad-hoc via `javascript_exec` pra fazer picking geométrico contra a
  malha `planet` reproduzindo a mesma lógica de `terrainGroundRadial`): a hipótese inicial do
  usuário (correlação com `escala`/`hardwareScalingLevel`) foi descartada — forçar escala 1.0/1.4
  e mesmo desligar o SSAO não mudou o resultado de forma consistente; o que de fato mudava a cena
  de forma dramática entre tentativas era o sistema de chuva dinâmica (`__forceRain`), um red
  herring completamente não relacionado. O computador só "correlaciona" com escala 1.00 porque
  nunca sai desse valor (`if (isLowEndDevice) engine.setHardwareScalingLevel(1.15)` — computador
  não é `isLowEndDevice`, então nunca entra nesse ramo nem no auto-ajuste por FPS, que também só
  roda `if (isLowEndDevice)`).
- **Causa raiz real**, achada só depois que o usuário mandou um segundo print mostrando rochas
  claramente flutuando perto do Prédio dos Enigmas: o sorteio geral de decoração (`PROP_COUNT`,
  `app/src/world3d/World3D.tsx`) posicionava cada prop com `terrainGroundRadial` num ÚNICO ponto (o
  pivô), sem a correção multi-vértice (`settleMeshOnTerrain`) que rochas de montanha
  (`PLATEAU_CENTERS`)/escolas/torre já recebem. Rochas grandes (`rock_largeA`/`rock_largeC`/etc.)
  caindo perto da borda íngreme de um platô — onde a fórmula analítica de altura diverge da malha
  renderizada de verdade, erro já documentado no comentário de `terrainGroundRadial` — ficavam
  visivelmente suspensas, até ~0,8 unidade medido ao vivo (`prop-19`, `rock_largeC`) antes da
  correção.
- **Por que só no computador**: `PROP_COUNT = isLowEndDevice ? 24 : 65` — o computador tem quase
  3× mais props que o celular, então a chance de algum cair perto de uma borda problemática (e o
  usuário notar) é bem maior lá, mesmo o bug existindo (silenciosamente, com menos chance de
  aparecer) em qualquer dispositivo.
- **Correção**: `settleMeshOnTerrain(instance, localUp)` chamado pros props do sorteio geral E do
  deserto, mas **só pra objetos compactos** (rocha/cacto — ver `isCompactProp`), antes do
  `freezeWorldMatrix()` que trava a posição pro resto da sessão. Os colisores-esfera invisíveis de
  cada prop (`propCollider-*`/`desertPropCollider-*`) também foram corrigidos pra usar
  `instance.position` (já ajustada) em vez do `pos` original — sem isso o colisor físico ficaria
  desalinhado da malha visual depois do ajuste.
- **Regressão pega antes de ir pra produção**: a primeira versão aplicava `settleMeshOnTerrain` a
  TODOS os props, inclusive árvores — testado ao vivo e o tronco delas afundou até ~1,9 unidade no
  chão. Causa: a função pega o vértice mais BAIXO de cada região XZ da malha; numa árvore, a copa é
  bem mais larga que o tronco, então cantos sem tronco por perto pegavam uma folha alta como "ponto
  mais baixo" daquele canto, e a função descia a árvore inteira até essa folha alta encostar no
  chão. Corrigido restringindo a correção só a rocha/cacto (`isCompactProp`), cuja malha compacta
  não tem essa armadilha — árvore/flor/cogumelo/tronco continuam usando só o único ponto de antes
  (nunca reportados como flutuando).

## Decisões técnicas tomadas
- **Reaproveitar `settleMeshOnTerrain` em vez de criar uma correção nova** — já é a função
  comprovada usada por rochas de montanha/escolas/torre; o problema nunca foi a função em si, foi
  o sorteio geral de props nunca ter sido migrado pra usá-la (só ganhou a correção de ponto único
  `terrainGroundRadial` num laboratório anterior).
- **Restringir a objetos compactos, não desativar globalmente** — a alternativa mais simples
  (reverter tudo, não aplicar a ninguém) deixaria o bug de rocha voltando; a alternativa mais
  arriscada (ajustar a lógica de bucket pra ser ciente de "objetos altos e estreitos") mudaria o
  comportamento de uma função compartilhada usada por sistemas já validados (risco de regressão em
  escolas/torre/montanhas sem necessidade). Um filtro por tipo de objeto na CHAMADA é a mudança
  mínima que resolve o problema sem tocar em nada já funcionando.

## Pendências / dívidas conhecidas
- Não foi possível confirmar 100% que os objetos flutuantes do PRINT do usuário eram exatamente
  estas rochas do `PROP_COUNT` (a investigação ao vivo não conseguiu reproduzir exatamente a
  mesma cena/ângulo) — mas a medição ao vivo confirmou que essa classe de objeto (rocha grande do
  sorteio geral, perto de borda de platô) tinha um bug real e mensurável (~0,8 unidade de
  flutuação), e a correção elimina esse bug sem introduzir regressão (medido antes/depois: rochas
  0,81→-0,09, árvores continuam com gap ~0). Se o usuário reportar QUALQUER objeto ainda flutuando
  depois deste laboratório, é sinal de que existe uma segunda fonte além desta, e vale pedir outro
  print pra localizar exatamente onde.
- Chuva dinâmica: confirmado que `window.__forceRain(true/false)` (hook de DEV) funciona bem pra
  descartar esse red herring em investigações futuras — vale lembrar disso antes de investigar
  qualquer relato de "tudo ficou escuro/acinzentado" no jogo.

## Funcionalidades planejadas que NÃO foram concluídas
Nenhuma — as 4 funcionalidades planejadas foram implementadas e verificadas ao vivo (medição de
gap antes/depois via picking geométrico contra a malha do planeta).

## O que o próximo laboratório deve desenvolver
- Sem pedido novo pendente no momento — se o usuário confirmar que os morros continuam
  aparecendo flutuando depois deste deploy, pedir um print novo (de preferência com o jogador
  parado bem perto do objeto flutuante) pra localizar exatamente qual sistema de props ainda não
  foi coberto.
- Retomar pendências antigas (`labs/lab-73.../CONTEXT.md`, `labs/lab-74.../CONTEXT.md`): arma/
  ataque compartilhado e colisão jogador-jogador do lab-73 ainda não testados ao vivo; recompensa
  de combate no HUD; Fly.io v1.

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl` (worktree, a partir de `main`; PR #5 ainda aberto).
- Como rodar/verificar: `cd app && npm run dev`, ir a qualquer platô com rochas grandes de sorteio
  geral perto da borda (ex. usar `window.__debugTeleport` no console em dev) e confirmar que
  nenhuma rocha aparece suspensa no ar; árvores continuam com o tronco no nível do chão, não
  afundadas. `npx tsc -b` e `npm run build` confirmam o build de produção limpo.
