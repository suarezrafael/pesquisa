# Laboratório 254 — Corrige bounding info desatualizado do planeta (morros "invisíveis")

Status: implementado; validação ao vivo do usuário pendente
Início: 2026-10-04
Fim: 2026-10-04 (implementação local)
Commit inicial: d92c0aa55270523c19c95630a97e4aadeb3d677a
Prioridade: P0 — bug reportado pelo usuário, prioridade explícita

## Objetivo do laboratório

Usuário reportou (com print, personagem visivelmente "flutuando" perto de escolas no topo de
elevações do planeta principal): "quando eu caminho no planeta o terreno invisível de montanhas
persiste, chego a caminhar em morros invisíveis". Esse sintoma exato (sólido mas invisível) já
foi atacado **3 vezes antes** (labs 95, 124, 151), cada vez com uma teoria de causa diferente
(culling de face traseira, iluminação de face traseira sem normal correta, triângulo fino em
certos ângulos de tela), **nenhuma confirmada pelo usuário** no aparelho real dele.

## Funcionalidades planejadas

- [x] Investigar o código de construção do relevo (`World3D.tsx`) procurando uma causa ainda não
  tentada nas 3 rodadas anteriores, em vez de repetir uma correção já descartada.
- [x] Corrigir a causa encontrada: `planet.updateVerticesData(VertexBuffer.PositionKind, ...)`
  nunca recalculava a caixa delimitadora (bounding info) do mesh depois de deslocar os vértices
  radialmente até `PLANET_RADIUS + 2,6` nos platôs — confirmado lendo o código-fonte do
  `@babylonjs/core` instalado (`updateVerticesData(kind, data, updateExtends, makeItUnique)`,
  `updateExtends` default `false`, só recalcula a caixa quando `true`). Corrigido passando `true`.
- [x] Confirmar `npm run test` (377/377), `npm run lint` (zero avisos) e `npm run build` sem
  regressão. `tsc -b` limpo.
- [ ] **Validação ao vivo do usuário, no mesmo tipo de situação do print** — esta sessão não
  conseguiu carregar o mundo 3D no navegador automatizado (travou mais de 3 minutos em
  "Carregando o mundo 3D...", limitação conhecida do ambiente: abas em segundo plano travam os
  timers internos do jogo). Sem essa validação, este lab não pode ser declarado resolvido —
  mesmo erro das 3 tentativas anteriores que este lab está tentando não repetir.

## Fora de escopo (explicitamente adiado)

- Reverter ou alterar qualquer uma das 3 correções anteriores (culling, `twoSidedLighting`,
  inclinação reduzida) — continuam corretas e não conflitam com esta.
- Qualquer mudança de jogabilidade, recompensa ou regra de missão.
- Declarar o bug resolvido sem confirmação visual do usuário no mesmo cenário do print.
