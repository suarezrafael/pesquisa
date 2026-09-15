# Laboratório 188 — Pet maior, visível e com troca clara

Status: em andamento
Início: 2026-09-15
Fim: -
Commit inicial: 604b3e43ef06b605f17a0e0a703987b248b8190b

## Objetivo do laboratório

Corrigir o pet adotável (loop emocional de retenção) pra ficar mais fácil de ver, acompanhar e
trocar: aumentar escala visual com limite por espécie, corrigir qualquer caso real de
enterramento/flutuação, revisar o offset de acompanhamento e melhorar o feedback ao trocar de pet
equipado no painel.

Origem: `docs/gameplay-market-expansion-backlog.md`, "Lab 203 - Pet maior, visível e com troca
clara" (renumerado pra lab-188 na sequência real do repo, mesma convenção de labs anteriores) —
próximo item da "Recomendação priorizada" (seção 7) depois do lab-187, prioridade P0/P1.

## Investigação prévia (leitura do código, antes de codar)

- **Escala atual** (`progression.ts:1082`, `petStageScale`): filhote 0.55, jovem 0.8, adulto/idoso
  1.0 — o MESMO 1.0 usado pelos outros bichos que já vagam pelo planeta (`critters`). O backlog
  descreve o pet como "parece pequeno" mesmo nessa escala — precisa de comparação visual ao vivo
  (screenshot lado a lado com o avatar) pra confirmar se o problema é a escala em si ou outra coisa
  (distância/oclusão/pulo pequeno demais pra chamar atenção).
- **Achado real, concreto**: o pet é puramente CINEMÁTICO (reposicionado a cada quadro por
  `petRoot.position.copyFrom(...)`, `World3D.tsx` ~linha 10629), nunca um corpo físico — diferente
  do avatar, que É um corpo físico real (Havok) e por isso escala/desce/sobe qualquer relevo
  colidindo de verdade contra os colisores `MESH`/`SPHERE` do mundo. No planeta principal, o pet já
  usa `terrainGroundRadial` (raycast físico real, corrigido no lab-168) — mas em planetas-destino,
  usa `currentGroundBaseFn(petUp)`, que pra planetas-destino é `() => planet.radius` (~linha 3694):
  um raio FIXO, que nunca muda mesmo se o avatar estiver em cima de um morro. **Marte tem morros
  reais com colisor `MESH`** (`buildMarsHill`, corrigido no lab-177 exatamente pra deixar o avatar
  SUBIR neles de verdade, física real) — se o jogador sobe um morro de Marte, o avatar physically
  sobe (colidindo com a malha do morro), mas o pet, preso ao raio fixo `planet.radius`, continua no
  nível de base do planeta: o pet ficaria visualmente enterrado dentro do morro/abaixo do avatar
  exatamente nesse momento. Isso bate quase literalmente com o critério de aceite do backlog ("pet
  não fica enterrado no planeta principal nem em planetas secundários... quando aplicável") — o
  "quando aplicável" provavelmente já reconhecia que só Marte tem relevo de verdade pra isso
  acontecer (os outros planetas-destino são esferas uniformes, confirmado na investigação do
  lab-187). **Este é o candidato mais forte e concreto pra corrigir.**
- **Offset de acompanhamento** (`PET_SIDE_DISTANCE = 0.65`, `World3D.tsx:284`): pet persegue um
  ponto ao LADO do jogador (perpendicular ao `facing`), reprojetado de volta pra esfera — já é um
  design deliberado do lab-168 (antes só perseguia atrás, sem virar). Aumentar a escala do pet pode
  fazer esse offset lateral de 0.65 unidade não ser mais suficiente (pet maior mais perto do avatar
  = mais chance de tampar a visão/atrapalhar clique em objetos) — precisa reavaliar
  `PET_SIDE_DISTANCE` proporcionalmente ao aumento de escala, não só a escala isolada.
- **Painel de troca** (`PetPanel.tsx`): já tem um botão "Escolher" por pet possuído e uma tag "✓
  Ativo" no pet equipado — trocar já re-renderiza a tag imediatamente (`onEquip={equipPet}` em
  `App.tsx:747` chama a função de estado direto, sem passo intermediário). Meio caminho andado, mas
  não há nenhuma confirmação TRANSIENTE (toast/animação) — só a tag mudando de lugar na mesma tela;
  precisa de verificação ao vivo pra julgar se isso já conta como "feedback claro" o suficiente ou
  se falta alguma coisa (ex.: o pet só reconstrói de verdade no mundo 3D depois de fechar o painel?
  — checar se há uma reação imediata visível no mundo, não só no próprio painel).

## Funcionalidades planejadas

- [ ] Verificação ao vivo (Chrome real): comparar escala do pet equipado lado a lado com o avatar
  (screenshot) — confirmar se "parece pequeno" é real hoje antes de aumentar a escala.
- [ ] Corrigir o pet ficando preso ao raio fixo `planet.radius` em planetas-destino com relevo real
  (Marte) — usar o mesmo raycast físico (`terrainGroundRadial`-equivalente) já usado pro planeta
  principal, ou uma alternativa que funcione contra o colisor `MESH` de qualquer planeta-destino,
  não só a fórmula/raio fixo.
- [ ] Aumentar escala visual do pet adulto/idoso (hoje 1.0) com um limite por espécie, se a
  verificação ao vivo confirmar que o tamanho atual realmente lê como "pequeno demais".
- [ ] Reavaliar `PET_SIDE_DISTANCE` (offset lateral) proporcionalmente a qualquer aumento de
  escala — verificar ao vivo que o pet maior não tampa a visão da câmera nem atrapalha clique em
  objetos/NPCs próximos.
- [ ] Verificar ao vivo a troca de pet no painel: confirmar que o pet no MUNDO 3D reflete a troca
  imediatamente (não só a tag do painel) e decidir se falta algum feedback adicional.
- [ ] Confirmar que o pet continua visível/legível em viewport mobile (critério de aceite do
  backlog) — dentro da limitação de ferramental já conhecida (sem emulação de dispositivo real
  nesta sessão).

## Fora de escopo (explicitamente adiado)

- Pets premium pagos, roupas/máscaras de pet (Lab 206 do documento, depende deste lab estar
  "confiável" primeiro, conforme a própria recomendação priorizada).
- Combate de pet, IA complexa (explicitamente fora de escopo no próprio item do backlog).
- Redesenho de modelo 3D do pet (cachorro/gato) — só escala/posicionamento/offset, não a malha em
  si.
- Verificação em viewport mobile/touch real — mesma limitação de ferramental já conhecida de vários
  labs anteriores desta sessão.
