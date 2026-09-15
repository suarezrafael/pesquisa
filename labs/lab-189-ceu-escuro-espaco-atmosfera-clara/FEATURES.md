# Laboratório 189 — Céu escuro no espaço e claro na atmosfera

Status: em andamento
Início: 2026-09-15
Fim: -
Commit inicial: ab2b0ff0bfa7d07b44ff55c605996ba3d8bae501

## Objetivo do laboratório

Fazer o céu escurecer de verdade durante o voo espacial entre planetas (comunicando "saí da
atmosfera") e voltar a ficar claro ao pousar — hoje o céu é uma única cor fixa, sempre igual, do
início ao fim do voo.

Origem: `docs/gameplay-market-expansion-backlog.md`, "Lab 204 - Céu escuro no espaço e claro na
atmosfera" (renumerado pra lab-189 na sequência real do repo, mesma convenção de labs anteriores) —
próximo item da "Recomendação priorizada" (seção 7) depois do lab-188, prioridade P0/P1.

## Investigação prévia (leitura do código, antes de codar)

- **Achado real, confirma a hipótese do backlog**: `scene.clearColor` (a cor de fundo/céu) é
  definida UMA ÚNICA VEZ, na criação da cena (`World3D.tsx:3008`,
  `new Color4(0.65, 0.82, 0.93, 1)` — o mesmo azul-claro sempre) e nunca mais alterada em lugar
  nenhum do arquivo. `scene.fogColor` (linha 3011) usa a mesma cor. Não existe nenhum starfield/
  skybox/plano de estrelas — a única ocorrência de "estrela" no arquivo é um tapete decorativo de
  mobília (`tapete_estrelas`), sem relação. Ou seja: hoje, voar de foguete no espaço mostra
  EXATAMENTE o mesmo céu azul-claro do chão, do início ao fim da viagem — bate 100% com o problema
  descrito no backlog.
- **Máquina de estado de voo já existente** (`drivingRocket.progress`, 0→1): `ROCKET_LAUNCH_HOLD_END
  = 0.15` (decolagem/ainda perto da atmosfera de origem) e `ROCKET_LANDING_FLIP_START = 0.75`
  (início da manobra de pouso/aproximação da atmosfera de destino) já dividem o voo em 3 fases
  reconhecíveis — decolagem (0-0.15), cruzeiro no espaço profundo (0.15-0.75) e pouso (0.75-1). Dá
  pra usar essas MESMAS fronteiras (já testadas/ajustadas por labs anteriores pra timing de
  animação) como base pra transição de cor, em vez de inventar novos limiares.
- **Risco real confirmado**: `scene.fogDensity` já é modulado TODO QUADRO por outro sistema (chuva,
  `World3D.tsx:10544` — `BASE_FOG_DENSITY + (RAIN_FOG_DENSITY - BASE_FOG_DENSITY) * rainAmount`).
  Qualquer transição nova de fog/clearColor por causa do voo espacial precisa compor com esse valor
  em vez de sobrescrevê-lo incondicionalmente (ou os dois sistemas vão brigar pelo mesmo campo,
  cada quadro vencendo o outro). Chuva é um efeito do planeta principal — não deveria disparar
  durante o voo espacial, mas a ORDEM de execução dos dois blocos no loop de render importa pra não
  haver conflito de "quem escreve por último".
- **Nota de escopo do próprio código**: um comentário perto da construção de Marte (`World3D.tsx`,
  função `buildMarsIfNeeded`) já documenta que céu/luz são "globais, compartilhados com o planeta
  principal... trocar exigiria salvar/restaurar o estado inteiro" e foi deixado assim de propósito
  desde o lab-58. Isso simplifica o escopo deste lab: não precisa de uma cor de atmosfera DIFERENTE
  por planeta-destino (ex. Marte avermelhado) — só precisa voltar pro MESMO azul-claro de sempre ao
  pousar em qualquer planeta, incluindo a volta pro planeta principal.
- **HDRI de iluminação** (`HDRCubeTexture`, `World3D.tsx:4303`,
  `kiara_4_mid-morning_1k.hdr`) é usado pra reflexos/iluminação ambiente (PBR), carregado uma vez —
  não é o "céu visível" (isso é `clearColor`), mas precisa ser considerado: escurecer só o
  `clearColor` sem tocar na intensidade da luz ambiente/HDRI poderia deixar objetos ainda
  "iluminados de dia" contra um fundo escuro, o que pareceria errado — precisa de verificação ao
  vivo pra julgar se isso é um problema real ou não (o foguete/nave já tem sua própria iluminação
  aplicada, pode já parecer suficiente).

## Funcionalidades planejadas

- [x] Interpolado `scene.clearColor`/`scene.fogColor` com base em `drivingRocket.progress`,
  reaproveitando `holdFlipHoldCurve` (a mesma função já usada pro "flip" de pouso) duas vezes —
  sobe de 0 a 1 até `SPACE_FADE_IN_END` (0.35), desce de 1 a 0 depois de `SPACE_FADE_OUT_START`
  (0.65) — sem flash brusco, transição suave ancorada nas mesmas fronteiras de fase
  (`ROCKET_LAUNCH_HOLD_END`/`ROCKET_LANDING_FLIP_START`) já usadas pra decolagem/pouso.
- [x] Adicionado starfield: cúpula grande (`infiniteDistance`, técnica padrão de skybox) com
  textura de pontos brancos pintada uma única vez num canvas (mesma técnica de `DynamicTexture` já
  usada pras chamas do foguete/gota de chuva), material `PBRMaterial` com `unlit = true` (sem
  depender de luz de cena, que fica bem escura durante o voo). Visibilidade ligada direto ao mesmo
  fator de transição (`spaceT`).
- [x] **Verificado ao vivo, ponta a ponta**: voou de verdade até Marte via `__handleInteractPress` +
  seletor + acelerador simulado. No meio do cruzeiro: `clearColor` bateu EXATAMENTE
  `SKY_COLOR_SPACE` (0.03, 0.03, 0.08), `fogDensity` em 0.001, `environmentIntensity` em 0.15 —
  screenshot confirma céu azul-marinho escuro com pontinhos brancos espalhados, foguete/estação
  alienígena claramente legíveis contra o fundo (critério de aceite atendido: "legível como
  espaço", não só uma cor sólida). Depois de pousar em Marte: `clearColor` voltou EXATAMENTE pro
  azul-claro original (0.65, 0.82, 0.93), `fogDensity`/`environmentIntensity` de volta à base,
  `starfieldDome.visibility` de volta a 0 — screenshot confirma céu claro normal na superfície.
  Sem erro nenhum no console durante o voo inteiro.
- [x] Restauração ao pousar não depende do destino (achado prévio confirmado): a transição volta
  sempre pros MESMOS valores base (`SKY_COLOR_ATMOSPHERE`/`FOG_COLOR_ATMOSPHERE`/`BASE_*`), qualquer
  que seja o planeta de chegada — sem cor por planeta, como já esperado.
- [x] Composição com a modulação de fog/luz por chuva: o bloco de clima roda ANTES do bloco de voo
  no mesmo quadro (confirmado lendo o código — linha do clima vem antes da linha do foguete no
  arquivo) — a transição espacial soma por CIMA do valor que o clima acabou de escrever
  (`scene.fogDensity += (SPACE_FOG_DENSITY - scene.fogDensity) * spaceT`, mesmo padrão pras 3
  intensidades de luz), em vez de sobrescrever incondicionalmente — as duas fontes compõem.
- [x] Iluminação HDRI/ambiente: decidido ajustar junto (`environmentIntensity`/`hemiLight`/
  `sunLight`, mesmas 3 variáveis que a chuva já modula, reaproveitando o padrão existente) — a
  verificação ao vivo confirmou que só escurecer `clearColor` sem isso deixaria o foguete
  "iluminado de dia" contra um fundo escuro; com o ajuste, o resultado ficou coerente (ver
  screenshot).
- [ ] Confirmar que a transição não derruba FPS em mobile (critério de aceite do backlog) — dentro
  da limitação de ferramental já conhecida (sem emulação de dispositivo real nesta sessão). Custo
  adicionado é baixo por construção: 1 malha extra (sem física/sombra), nenhuma textura nova
  recarregada por quadro (pintada uma única vez no início).
- [ ] Viagem de VOLTA (planeta-destino → principal) não foi verificada ao vivo separadamente — usa
  exatamente o MESMO bloco de código/mesma leitura de `drivingRocket.progress`, sem nenhum branch
  distinto pra direção da viagem, então funciona por construção; a tentativa de reproduzir ao vivo
  esbarrou em identificar a posição certa do foguete de volta em Marte (limitação de tempo desta
  sessão, não um problema de código).

## Review automático do Copilot (PR #69)

- **Rodada 1** (2026-09-15): 1 achado real. `scene.clearColor = Color4.Lerp(...)`/`scene.fogColor =
  Color3.Lerp(...)` alocavam um objeto `Color4`/`Color3` NOVO a cada quadro, durante os ~9 segundos
  inteiros de voo — o mesmo tipo de lixo de GC que o próprio loop de física já evita de propósito em
  outro lugar (`Vector3.LerpToRef` no acompanhamento do pet, achado de review de um lab anterior).
  Corrigido trocando por `Color4.LerpToRef`/`Color3.LerpToRef`, escrevendo direto nos objetos já
  existentes (`scene.clearColor`/`scene.fogColor`, atribuídos uma única vez na criação da cena, nunca
  substituídos por um objeto novo em nenhum outro lugar) em vez de criar um novo a cada quadro.
  **Reverificado ao vivo, mesmo voo até Marte**: valores numéricos idênticos aos da primeira
  verificação (clearColor exatamente `(0.03, 0.03, 0.08)` no meio do cruzeiro, de volta a `(0.65,
  0.82, 0.93)` depois de pousar) — comportamento visual inalterado, só sem a alocação por quadro.
  Achado extra da reverificação (não um bug, uma confirmação): depois de pousar, `fogDensity` estava
  em 0.035 (não 0.018) — bateu exatamente `RAIN_FOG_DENSITY`, ou seja, estava chovendo de verdade
  nesse instante (evento de clima independente, não relacionado a este lab) — confirma que a
  composição funciona como esperado: com `spaceT = 0` (fora do voo espacial), o código deste lab não
  toca em `fogDensity` nenhuma vez, deixando o valor inteiramente a cargo do sistema de clima já
  existente. `npx tsc -b`, `npm run test` (209/209) e `npm run build` limpos após a mudança.

- Simulação astronômica real, cutscene longa, novo sistema de clima espacial (explicitamente fora
  de escopo no próprio item do backlog).
- Cor de atmosfera diferente por planeta-destino (ex. Marte avermelhado) — céu continua global/
  compartilhado, conforme decisão já registrada desde o lab-58.
- Trocar o HDRI de iluminação em si (só ajustar intensidade/exposição se a verificação ao vivo
  mostrar necessidade real) — trocar o HDRI expandiria bastante o escopo (recarregar textura,
  possível hitch de carregamento a cada viagem).
- Verificação em viewport mobile/touch real — mesma limitação de ferramental já conhecida de vários
  labs anteriores desta sessão.
