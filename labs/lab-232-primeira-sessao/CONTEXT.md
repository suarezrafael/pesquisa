# Contexto do Lab 232

## Entregue nesta branch

- `Tutorial.tsx` aceita `quickStart`, usado apenas na primeira entrada de um
  perfil; o botao de ajuda continua oferecendo as quatro telas completas.
- `firstSessionGuide.ts` define as fases sem depender do Babylon; `World3D.tsx`
  troca a antiga dica fixa por movimento -> primeira missao -> recompensa e
  esconde o guia quando a UI do jogo esta inerte.
- O guia so e elegivel para perfis que montaram o mundo sem missao concluida.
  A dica de recompensa some 15 segundos apos a volta ao mundo, ou na segunda
  missao. Nenhum progresso ou evento de analytics novo foi persistido.

## Verificacao

- 296 testes passaram; `npm run build` passou; `npm run lint` passou com dois
  avisos preexistentes em `domain.test.ts` e `PetPanel.tsx`.
- Ainda nao foi validado em crianca nem no Redmi Pad 2; UX 190 continua parcial.
- Apos integrar a main com o Lab 233, 297 testes, build e lint passaram
  novamente; o conflito ficou restrito ao indice `labs/CURRENT.md`.

## Proximo laboratorio

O usuario pediu controle touch da metade direita com resposta direcional tao
sensivel quanto o joystick esquerdo e pinça para zoom. Tratar separadamente;
validar no tablet fisico. O Lab 231 tambem continua aguardando teste da saida
do parkour no tablet, e a PR #119 (Lab 230) segue rascunho separado.
