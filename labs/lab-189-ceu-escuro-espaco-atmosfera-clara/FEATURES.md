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

- [ ] Interpolar `scene.clearColor`/`scene.fogColor` com base em `drivingRocket.progress`: azul-claro
  de sempre perto das duas pontas (decolagem/pouso, usando `ROCKET_LAUNCH_HOLD_END`/
  `ROCKET_LANDING_FLIP_START` como referência), escuro/estrelado no meio (cruzeiro espacial) — sem
  flash brusco (transição suave, não degrau).
- [ ] Adicionar elemento visual de "espaço" (estrelas) durante o cruzeiro — critério de aceite do
  backlog exige que o fundo escuro seja "legível como espaço", não só uma cor sólida escura.
- [ ] Restaurar o céu/fog corretamente ao pousar em QUALQUER planeta (incluindo volta pro planeta
  principal) — mesma cor de sempre, sem depender de qual foi o destino (achado prévio: céu já é
  global/compartilhado, não precisa de cor por planeta).
- [ ] Garantir que a modulação de fog por chuva (`rainAmount`, já existente) continue funcionando
  sem conflito — compor as duas fontes de fog em vez de uma sobrescrever a outra
  incondicionalmente.
- [ ] Verificar ao vivo se a iluminação HDRI/ambiente também precisa de ajuste durante o voo (ou se
  só escurecer o fundo já basta) — decidir com base em screenshot real, não suposição.
- [ ] Confirmar que a transição não derruba FPS em mobile (critério de aceite do backlog) — dentro
  da limitação de ferramental já conhecida (sem emulação de dispositivo real nesta sessão).

## Fora de escopo (explicitamente adiado)

- Simulação astronômica real, cutscene longa, novo sistema de clima espacial (explicitamente fora
  de escopo no próprio item do backlog).
- Cor de atmosfera diferente por planeta-destino (ex. Marte avermelhado) — céu continua global/
  compartilhado, conforme decisão já registrada desde o lab-58.
- Trocar o HDRI de iluminação em si (só ajustar intensidade/exposição se a verificação ao vivo
  mostrar necessidade real) — trocar o HDRI expandiria bastante o escopo (recarregar textura,
  possível hitch de carregamento a cada viagem).
- Verificação em viewport mobile/touch real — mesma limitação de ferramental já conhecida de vários
  labs anteriores desta sessão.
