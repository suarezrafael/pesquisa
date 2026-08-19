# Laboratório 30 — Rio enterrado na malha do planeta

Status: concluído
Início: 2026-08-17
Fim: 2026-08-17
Commit inicial: a832750935072094f718cc62c2bd68172a1099a7

## Objetivo do laboratório
Relato do usuário logo depois do lab-29: "entendi, o rio fisicamente está lá mas ele não
aparece, eu até caio dentro dele mas o boneco afunda no planeta." Confirma que a bacia (física,
o "buraco" de verdade) sempre esteve certa — o problema era só a malha VISUAL da água, que ficava
enterrada dentro da malha renderizada do planeta em vários pontos, invisível.

Investigado com a mesma técnica do lab-29 (raycast físico real contra a malha do planeta,
`havokPlugin.raycast`), mas agora aplicada direto nos vértices da malha do RIO (não só nos
pontos da linha central) — achei um buraco de até **0,46 unidade** (bem maior que o ~0,11 da
rua): o mesmo tipo de erro de discretização da malha grossa (48 segmentos) contra a fórmula
contínua de `terrainHeight`, só que pior aqui porque o rio cruza uma faixa de theta bem mais
ampla (216°) que a rua.

## Funcionalidades planejadas
- [x] Água do rio (linha central E as duas margens) posicionada por raycast físico real contra a
      malha do planeta (`realGroundRadial`, novo helper), não mais só pela fórmula contínua de
      `terrainHeight` — a água nasce onde a malha RENDERIZADA de verdade está, não onde a fórmula
      (que a malha só aproxima) diz que deveria estar.
- [x] Margens também recalculadas por raycast independente (não só um deslocamento lateral plano
      a partir do centro já corrigido) — descoberto durante a própria correção que só ajustar o
      centro não bastava (gap ainda em 0,41 depois do primeiro fix): a margem lateral podia cair
      num ponto da malha real bem diferente do que o deslocamento presumia.
- [x] Verificação: `npm run build` passa; raycast físico varrendo os 66 vértices da malha de
      água de verdade (não só os pontos da linha central usados pra construir) confirmou folga
      constante de 0,03 em todos os pontos amostrados. Ver `CONTEXT.md`.

## Fora de escopo (explicitamente adiado)
- Aplicar a mesma técnica de raycast na RUA — já verificada como suficiente no lab-29 com uma
  margem fixa maior (o erro máximo medido lá, ~0,11, é bem menor e mais previsível que o do rio,
  ~0,46); trocar de abordagem ali não tem urgência.
