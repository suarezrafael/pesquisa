# Contexto — Laboratório 256 — Busca de terreno mais ampla pras rochas de montanha

Preenchido em: 2026-10-04
Commit inicial → final: 0b41b5e336dcac7db8ea519e21fc8137d2aa1d54..(ver PR)

## O que foi feito

- `app/src/world3d/World3D.tsx`, `findFlatterUpReal`: novo 4º parâmetro opcional `ringStep = 0.065`
  (mantém o valor fixo anterior como padrão — chamadas existentes de escolas/"Minha Casa"/centro
  de jogos continuam idênticas, sem esse argumento). O laço interno agora usa
  `ring * ringStep` em vez de `ring * 0.065` fixo.
- No laço de rochas de montanha (`PLATEAU_CENTERS.forEach`), a chamada a `findFlatterUpReal` passa
  `rockFootprintAngularRadius * 0.9` como `ringStep` — fazendo a busca se afastar numa distância
  proporcional ao tamanho de CADA rocha (rochas maiores buscam mais longe), em vez do passo fixo
  de 0,065 rad usado pra fundação de prédio (muito menor que o footprint de uma rocha grande).

## Como a causa foi encontrada

Minutos depois do deploy do lab-255, o usuário mandou outro print — "se vc tivesse achado a causa
esse morro aqui nao estaria flutuando" — mostrando duas rochas enormes completamente destacadas do
chão perto de "Centro de Jogos", muito mais dramático que o caso original do lab-255 (ali pelo
menos a base da rocha encostava, só o "capacete" pairava; aqui não havia contato visível nenhum).

Reproduzido ao vivo no mesmo dev build (branch já atualizada com o lab-255 mesclado): localizado
como `mountainRock-1-1` (`rock_tallA`, escala 3,2), no platô 1. Confirmado com raycast de TELA real
(`scene.pick` pixel a pixel, de cima pra baixo na coluna onde a fresta aparecia): no pixel logo
abaixo do contorno visível da rocha, o raycast acerta `mountainRock-1-1` a 16,28 unidades da
câmera; vinte pixels abaixo (onde deveria estar o chão "atrás" da rocha, se ela estivesse só
flutuando um pouco), o raycast acerta `planet` a 14,79 — MAIS PERTO da câmera que a rocha. Ou
seja, o terreno próximo realmente está geometricamente "na frente" da rocha nessa linha de visão —
um gap real de perspectiva/posicionamento, confirmando que não é um bug de shader/renderização,
é a ROCHA que está no lugar errado.

Comparando com a medição do lab-255 (que já usa `findFlatterUpReal` pra rochas de montanha): o
`largestGap` (ponto mais "ancorado") já estava correto (-0,12, ou seja, o ponto mais baixo
amostrado da rocha encostava bem no chão) — então por que ainda flutuava tanto visualmente?
Resposta: `findFlatterUpReal` só se afasta até `3 * ringStep` do ponto candidato original —
com o `ringStep` fixo de 0,065 rad herdado da versão pra prédios, isso dá uma busca de no máximo
~0,195 rad (~2,5m). O footprint angular da própria rocha (`rockFootprintAngularRadius`, calculado
a partir da `scale`) já chega a ~0,135-0,16 rad pras rochas maiores — ou seja, a busca mal
conseguia se afastar além do PRÓPRIO tamanho da rocha, incapaz de escapar de uma região ruim mais
larga que ela mesma (como toda a borda de um platô, que pode ter vários metros de extensão). O
lab-255 corrigiu a ESCOLHA de levar em conta o footprint pra decidir SE vale a pena buscar, mas não
tinha corrigido o quão LONGE a busca se afasta.

## Decisões técnicas tomadas

- **`ringStep` como parâmetro opcional com o valor antigo como padrão**, em vez de mudar o
  comportamento de `findFlatterUpReal` globalmente. Escolas/"Minha Casa"/centro de jogos usam
  fundações bem menores que uma rocha de montanha grande — não há evidência de que esses lugares
  tenham o mesmo problema (nenhum print do usuário mencionou prédio flutuando), e mudar o raio de
  busca deles sem necessidade arrisca reposicionar prédios que já estão bem colocados, só pra
  "talvez" melhorar algo que não foi reportado como quebrado.
- **`rockFootprintAngularRadius * 0,9` como `ringStep`, não um valor fixo maior.** Rochas variam de
  escala 2,6 a 3,9×; um valor fixo ou sub-dimensionaria rochas grandes (mesmo problema de novo) ou
  faria rochas pequenas buscarem longe demais sem necessidade (mais raycasts, mais chance de
  pousar num lugar visualmente "errado" por estar longe do platô original).
- **Mantido o orçamento de 3 anéis × 6 ângulos (18 amostras)** — só mudou o PASSO entre anéis, não
  quantos. Evita aumentar o custo de raycast no carregamento (já são 160 rochas × até 18 buscas ×
  4 amostras de variância cada).

## Pendências / dívidas conhecidas

- **2 das 9 rochas remedidas (`mountainRock-1-3`, `mountainRock-4-0`) ainda ficam com `spread`
  acima de 1,0** (a pior, pouco mudou em relação ao lab-255) — não consegui confirmar visualmente
  se isso ainda aparece como fresta perceptível nesta sessão (câmera de órbito ociosa do jogo
  interferindo repetidamente nas tentativas de teleporte automatizado pra essas posições
  específicas — ver nota de ambiente abaixo). Se o usuário notar alguma rocha flutuando (mesmo que
  menos dramática) depois deste deploy, essas duas são os primeiros lugares a verificar.
- **Achado de ambiente, não deste bug**: `window.__debugSetFacing` com uma direção quase paralela
  ao "up" do personagem (em vez de tangente/perpendicular) deixa a câmera de 3ª pessoa instável
  (ela soma `look` com `up` em algum cálculo interno, produzindo posições de câmera erráticas,
  às vezes bem longe, às vezes olhando pro vazio). Sempre calcular `facing` como a projeção
  perpendicular de uma direção-alvo sobre o plano tangente ao ponto onde o personagem está (nunca
  passar `up` nem algo quase paralelo a ele). Mesmo depois de corrigir isso, uma segunda causa
  separada (câmera "ociosa"/de passeio que a cena ativa sozinha depois de um tempo sem input)
  também precisa de um pulso de tecla (`keydown`/`keyup` de 'w') pra devolver o controle à câmera
  de perseguição normal antes de qualquer captura.
- Validação do usuário continua sendo o critério final, como sempre.

## Funcionalidades planejadas que NÃO foram concluídas

- Confirmação visual das 2 rochas remanescentes com spread alto — ver "Pendências" acima.

## O que o próximo laboratório deve desenvolver

- Aguardar confirmação do usuário depois deste deploy.
- Se ainda houver rocha flutuando, checar primeiro `mountainRock-1-3` e `mountainRock-4-0`
  (coordenadas e spread já medidos, ver histórico desta sessão) antes de qualquer teoria nova.
- Se o padrão se repetir em MUITAS rochas (não só 1-2 pontuais), considerar uma correção mais
  estrutural: aumentar o número de anéis de busca (hoje 3) só pras rochas de montanha, ou reduzir
  a escala máxima/alcance de `radiusFrac` perto da borda dos platôs.

## Estado do repositório ao final

- Branch: `lab-256-busca-mais-ampla-rochas`.
- Suite: 377/377. Lint: zero avisos. `tsc -b`: limpo. Build sem erro novo.
- `.github/copilot-instructions.md` e `.vscode/` locais não incluídos.
