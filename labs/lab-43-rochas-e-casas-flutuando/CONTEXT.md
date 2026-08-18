# Contexto — Laboratório 43 — Rochas e casas flutuando (raycast ricocheteando entre 2 colisores)

Preenchido em: 2026-08-17

## O que foi feito

1. **Diagnóstico ao vivo** — checagem por raycast de todas as 21 escolas encontrou `school-q06`
   com `gap: null` (nunca alcançava o planeta em 20 tentativas). Inspecionando a sequência de
   acertos: `["walls-q06", "mountainRockCollider-4-0", "walls-q06", "mountainRockCollider-4-0",
   ...]` repetindo — o raio alternava entre EXATAMENTE dois colisores não-planeta, sem nunca
   progredir.
2. **Causa raiz**: a API do Havok/Babylon (`IRaycastQuery.ignoreBody`) só aceita UM corpo pra
   ignorar por chamada. O padrão usado até o lab-42 (`ignoreBody = result.body` a cada tentativa)
   só lembra do ÚLTIMO acerto — se o raio acertasse o corpo A, depois B, a próxima tentativa
   ignora B mas NÃO ignora mais A (só lembra de um corpo por vez) — podendo acertar A de novo,
   depois B de novo, alternando pra sempre entre os dois sem nunca sair do lugar.
3. **Correção**: `terrainGroundRadial` (`src/world3d/World3D.tsx`, declarada logo depois do
   `havokPlugin` existir, no início de `setup()`) — em vez de tentar "lembrar" corpos pra ignorar,
   cada tentativa AVANÇA o ponto de partida do raio (`from`) pra logo depois (0,01 unidade, na
   mesma direção de viagem) do último ponto de acerto não-planeta. Geometricamente, o raio nunca
   pode acertar o MESMO colisor de novo (já passou fisicamente dele), então cada tentativa
   garante progresso real em direção ao planeta, não importa quantos ou quais colisores estejam
   no caminho — resolve não só o caso de 2 colisores alternando, mas qualquer número deles.
4. **Unificação** — `schoolGroundRadial` e `mountainRockGroundRadial` (duas cópias quase
   idênticas, a segunda criada às pressas no lab-42 só pra evitar o bug de "zona morta temporal"
   daquele laboratório) viraram uma função só, `terrainGroundRadial`, declarada logo depois do
   `havokPlugin = new HavokPlugin(...)` — bem no início de `setup()`, então PODE ser chamada de
   qualquer lugar mais adiante no arquivo sem repetir o bug do lab-42. As três chamadas (escolas,
   torre, rochas de montanha) foram atualizadas pra usar a função única.

## Decisões técnicas tomadas

- **Avançar o raio em vez de rastrear uma lista de corpos ignorados** — a alternativa óbvia seria
  manter um `Set<PhysicsBody>` crescente de corpos já vistos e continuar tentando `ignoreBody`
  (só suporta um corpo por vez na API, então teria que desabilitar temporariamente a colisão dos
  corpos extras, religando depois) — mais complexo, com mais estado pra gerenciar e mais chance
  de erro (esquecer de religar a colisão de algum corpo, por exemplo). Avançar o ponto de partida
  é geometricamente mais simples, não precisa desabilitar nada, e escala pra qualquer número de
  obstáculos sem precisar de uma estrutura de dados extra.
- **Por que só apareceu agora** — o padrão de raycast com `ignoreBody` já existia desde o lab-31
  (rio) e lab-33 (escolas), mas só ficou vulnerável de verdade a esse ricochete quando a
  DENSIDADE de colisores no mapa aumentou o bastante pra dois deles ficarem posicionados de um
  jeito que o raio alterna entre eles — as 48 rochas de montanha novas do lab-42 (perto de escolas
  já existentes) foram o gatilho, mas o bug em si sempre existiu na lógica do `ignoreBody`.

## Verificação feita (evidência, não só visual)

- `npm run build` passa (typecheck + build de produção, exit code 0).
- Ao vivo (checklist completo da regressão do lab-42, re-testado): 21/21 escolas, 39/39 bichos,
  torre presente, 8/8 lasers do parkour, 48/48 colisores de rocha de montanha, 65/65 colisores de
  prop geral — tudo confirmado presente, nenhuma regressão nova introduzida por este fix.
- **Confirmação direta do bug original**: raycast de diagnóstico nas 21 escolas — TODAS agora
  mostram folga ~0,000 (ruído de ponto flutuante), incluindo `school-q06` (a que estava travada
  no ricochete antes do fix). Zero problemas detectados (contra 1 antes: `school-q06` com `gap:
  null`).
- **Confirmação direta nas rochas**: os 48 modelos visuais de rocha de montanha (`mountainRock-
  {pi}-{ri}`, a malha raiz de cada uma) confirmados com folga ~0,000 contra o chão real.
- Confirmado visualmente: teleporte pra perto de `school-q06` + screenshot mostra o personagem e
  a "Lojinha" apoiados solidamente numa montanha, sem nenhum gap visível entre eles e o chão —
  bem diferente do screenshot do bug enviado pelo usuário (rochas suspensas com céu visível por
  baixo).

## Pendências / dívidas conhecidas

- `prop-58` (uma árvore/pedra/flor comum do scatter geral) mostrou um raycast de DIAGNÓSTICO sem
  resultado perto de uma montanha (`propCollider-58`/`mountainRockCollider-9-2`, mesmo padrão de
  2-colisores-próximos, mas essa checagem específica é só diagnóstico, não afeta o posicionamento
  de verdade). O scatter geral de props NUNCA usou raycast pra se posicionar (só a fórmula
  contínua, desde o início do projeto) — não é uma regressão deste laboratório nem do lab-41/42,
  é uma limitação pré-existente que só fica mais provável de aparecer perto de montanhas (mais
  montanhas = mais chance de um prop comum cair perto de uma borda íngreme). Se o usuário notar um
  tronco/pedra pequena flutuando (bem menos chamativo que uma escola ou formação de rocha inteira
  flutuando), vale estender `terrainGroundRadial` pro scatter geral também num laboratório futuro.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma das planejadas para este laboratório.

## O que o próximo laboratório deve desenvolver

1. Se o usuário confirmar que o bug relatado sumiu — nenhuma ação adicional necessária aqui.
2. Se aparecer relato de um prop pequeno (árvore/pedra/flor comum, não escola/rocha de montanha)
   flutuando — considerar estender `terrainGroundRadial` pro scatter geral de props também (hoje
   só escolas/torre/rochas de montanha usam raycast; árvores/flores/rochas pequenas ainda usam só
   a fórmula).
3. Nenhum outro pedido novo pendente.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl` (worktree isolado, ainda não mesclada em `main` —
  usuário pediu merge, mas esta sessão não pode mesclar em main). Pra mesclar manualmente:
  ```
  git checkout main
  git merge worktree-abstract-wobbling-owl
  ```
- Como rodar/verificar: `cd app && npm install && npm run dev`.
