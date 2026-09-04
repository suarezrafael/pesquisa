# Laboratório 151 — Morros/platôs invisíveis (retomada 3, lab-95/lab-124)

Status: concluído
Início: 2026-09-04
Fim: 2026-09-04
Commit inicial: 8244f6479253468c3921a84491fc81b33d015b4a

## Objetivo do laboratório

Retomar de novo o bug de "morros/platôs invisíveis" — confirmado pelo usuário que **ainda ocorre**
no mesmo aparelho (Android/Chrome) mesmo depois das duas correções do lab-124
(`twoSidedLighting = true` + substituição de normais degeneradas). Usuário confirmou que o morro
continua **sólido** (não dá pra atravessar) — mesma conclusão de sempre: é um bug puramente de
renderização, não de física/geometria de colisão.

## Investigado antes de planejar

- **Por que as duas correções do lab-124 não bastaram**: ambas atacam CONSEQUÊNCIAS da dobra de
  triângulo (iluminação de face traseira sem `twoSidedLighting`; normal com `NaN` depois de
  normalizada), mas nenhuma das duas ataca a dobra em si. Um triângulo genuinamente degenerado
  (dobrado até ficar com quase zero de área, porque 3 vértices ficaram quase colineares) tem
  **área de tela ~0 independente de qualquer normal/material** — não rasteriza nenhum pixel. Isso
  bate exatamente com a descrição original do usuário ("flutuando no espaço", não "escuro
  demais") — é a explicação mais direta pro sintoma persistir depois de duas correções de
  iluminação/normal que nunca tocaram a geometria.
- **A causa raiz já está documentada no próprio arquivo, nunca endereçada**: comentário em
  `World3D.tsx` (linhas ~734-765, escrito no lab-95 investigando um bug relacionado de escolas
  enterradas) mede que a esfera do planeta tem só **48 segmentos (~1,7m por segmento)**, e que
  `PLATEAU_CENTERS` tem rampas de até **3,2 unidades de altura com inclinação > 0,8 unidade de
  altura por metro** — a malha renderizada de verdade "se afasta MUITO" da fórmula suave de
  `terrainHeight` perto dessas rampas. Tanto lab-95 quanto lab-124 trataram mudar a
  intensidade do relevo/resolução da malha como fora de escopo (mudança de impacto visual global).
  Como o sintoma persiste depois de duas tentativas nas consequências, chegou a hora de tratar essa
  causa mais profunda — mas de forma cirúrgica (só a inclinação das rampas mais íngremes), não
  aumentando a resolução da malha inteira (custo de performance global, especialmente em mobile,
  que é justamente o dispositivo afetado).
- **Ainda não medido neste laboratório**: quantos/quais triângulos perto de `PLATEAU_CENTERS`
  têm área real ~0 na malha atual (48 segmentos). O lab-124 mediu normais degeneradas (1 em 5151)
  mas não a área dos triângulos em si — é o primeiro passo do plano abaixo, pra confirmar a
  hipótese com dado real antes de mudar a geometria (mesmo padrão de rigor dos labs 95/124).

## Funcionalidades planejadas

- [x] Diagnóstico temporário (removido antes do commit final, como no lab-124): medir a área dos
      triângulos da malha do planeta perto de cada `PLATEAU_CENTERS`, contar quantos têm área
      abaixo de um limiar desprezível — resultado: **0 de 3954**, refuta a hipótese de triângulo
      genuinamente degenerado.
- [x] Mesmo com a hipótese refutada, o usuário pediu explicitamente pra tentar a mudança de
      geometria assim mesmo: reduzida a `height` (não o `radius`, pra não crescer a pegada) de
      todos os 12 `PLATEAU_CENTERS`, trazendo a inclinação máxima de cada rampa de ~0,73-0,87 pra
      ~0,64-0,67.
- [x] Verificado sem regressão: diagnóstico `ENTERRADAS` do HUD comparado antes/depois (git stash)
      com o mesmo perfil salvo — valores praticamente idênticos, escolas não afetadas.
- [x] `npx tsc -b` / `npm run test` sem erros (101/101); verificação visual (Chrome desktop,
      teleporte real pro topo do platô mais alto) sem regressão perceptível no relevo.

## Fora de escopo (explicitamente adiado)

- Aumentar o número de segmentos da esfera do planeta (custo de performance global, pior ainda em
  mobile — o próprio dispositivo afetado pelo bug).
- Remover o diagnóstico `ENTERRADAS:...` do HUD (espera confirmação contínua do usuário).
- Reproduzir o bug visualmente neste ambiente (Chrome desktop) — específico de GPU/driver
  Android/Chrome, como nas duas tentativas anteriores.
