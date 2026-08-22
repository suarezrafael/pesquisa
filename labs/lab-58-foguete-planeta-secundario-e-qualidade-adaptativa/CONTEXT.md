# Contexto — Laboratório 58 — Foguete pro planetinha secundário + qualidade gráfica adaptativa

Preenchido em: 2026-08-20
Commit inicial → final: 796245e6b34c6bbce5f98cf37e5937f8838cf3b4..HEAD

## O que foi feito

1. **Qualidade adaptativa por FPS medido** (`World3D.tsx`, fora de `setup()`, perto de `onResize`):
   valor inicial de `hardwareScalingLevel` moderado (1.3) em dispositivo móvel; 6s depois (tempo
   pro carregamento inicial de física/glTF/texturas passar), mede `engine.getFps()` 3 vezes (a
   cada 1.3s) e calcula a média, então ajusta pra 1.0/1.3/1.8/2.2 dependendo da faixa de FPS
   medida — substitui de vez o ciclo de "chutar um número, usuário reporta que ficou ruim, chutar
   outro número" dos laboratórios 53/56/57.
2. **HUD fluido com `clamp()`** (`index.css`): `.hud-overlay`, `.hud-top-row`, `.hub-header`,
   `.help-button`, `.hub-avatar`, `.hub-header-info h1`, `.hub-level`, `.hub-coins` — todos os
   tamanhos trocados de valores fixos (ou o breakpoint único do lab-57) pra
   `clamp(mínimo, X vw, máximo)`. Motivo: o usuário reportou que o cabeçalho continuava grande
   demais no Poco C75 mesmo depois do breakpoint de 420px do lab-57 — sem conseguir emular o
   viewport exato desse aparelho neste ambiente, uma escala contínua por `vw` é mais robusta que
   apostar num número de corte específico.
3. **Foguete + estação de lançamento** (`buildRocket`, função module-level reaproveitada duas
   vezes — planeta principal e planetinha secundário): plataforma cilíndrica + 4 pilares curtos
   ("como se fosse um prédio", pedido do usuário) + corpo cilíndrico + nariz cônico + janela +
   3 barbatanas em tripé. Só primitivas, sem asset externo, mesmo padrão do carro/cacto/bichos já
   existentes. Posição no planeta principal (`ROCKET_LAUNCH_DIR`) escolhida por um script Node
   avulso que varreu candidatos contra TODOS os marcos existentes (platôs, lagoa, piscina,
   deserto, torre dos enigmas, escolas, ponto de nascimento) e escolheu o de maior folga (~34° do
   mais próximo) — mesma técnica já documentada no código pro deserto/piscina.
4. **Planetinha secundário** (`buildSecondPlanetIfNeeded`, dentro de `setup()`): só é construído
   na PRIMEIRA vez que o jogador embarca (`if (secondPlanetBuilt) return` — guarda contra
   reconstrução/duplicação em visitas seguintes, confirmado ao vivo). Esfera lisa (`MeshBuilder.
   CreateSphere`, sem relevo/bacia/bioma), raio 6 (bem menor que o planeta principal, raio 13),
   cor distinta (verde-oliva acinzentado) pra sinalizar "lugar diferente" sem precisar trocar
   céu/luz (globais, compartilhados). ~22 árvores/rochas reaproveitando os mesmos modelos glTF já
   carregados (índices 0-5 árvore, 6-11 rocha em `propFiles`), distribuição uniforme por esfera
   (`Math.acos(1-2t)` em vez da faixa habitável do planeta principal, que não faz sentido aqui).
   Sem shadow caster nos objetos do planetinha (o `ShadowGenerator` já tem alcance ajustado pro
   planeta principal; não vale o custo de sombra própria pra um bônus pequeno e distante). Colisor
   físico: uma única esfera (`PhysicsShapeType.SPHERE`), bem mais barato que a malha deformada do
   planeta principal. Fica centrado em `(0,0,400)` — bem longe da origem, nunca visível/alcançável
   antes de embarcar, o que já satisfaz sozinho o pedido "só aparece quando você embarca".
5. **Sistema de gravidade/chão generalizado pra múltiplos planetas** (o ponto tecnicamente mais
   delicado deste laboratório): TODO o resto do jogo (gravidade radial, altura do chão, o boneco
   visual "grudado" na superfície) assumia implicitamente que "o planeta" tinha centro fixo na
   origem (`0,0,0`) — `localUp = avatarMesh.position.normalize()`, `groundDist = PLANET_RADIUS +
   terrainHeight(localUp) + ...`. Em vez de reescrever esse sistema inteiro pra saber lidar com
   múltiplos planetas ao mesmo tempo, duas variáveis (`currentWorldCenter`, `currentGroundBaseFn`)
   substituem essas duas constantes fixas — trocadas ao embarcar/desembarcar
   (`travelToOtherPlanet`), todo o resto do sistema de física (gravidade, pulo, raycast de chão,
   câmera, orientação visual) continua exatamente igual, sem saber que existe um segundo planeta.
   Só 3 pontos precisaram mudar de verdade: o cálculo de `localUp`/`dist` (relativo a
   `currentWorldCenter`, não mais à origem fixa), `groundDist` (usa `currentGroundBaseFn(localUp)`
   em vez da fórmula fixa do planeta principal), e a posição visual do boneco (idem).
6. **Ação da tecla E extraída numa função nomeada** (`handleInteractPress`, antes só inline em
   `onKeyDown`) — cobre entrar/sair do carro (lab-25, comportamento idêntico, só reorganizado) E
   embarcar/desembarcar do foguete, nessa ordem de prioridade (carro primeiro, já que o carro só
   existe no planeta principal). Exposta via ponte (`(scene as any).__handleInteractPress`, mesmo
   padrão de `__setAvatarShirtColor` etc.) pro botão de toque conseguir chamar a mesma função.
7. **Botão de toque "E"** (`TouchActionButton`, reaproveitado) posicionado acima do botão de
   pular, no canto inferior direito — cobre carro E foguete com o mesmo botão (nunca os dois ao
   mesmo tempo, já que o carro só existe no planeta principal).

## Decisões técnicas tomadas

- **Qualidade adaptativa por medição em vez de mais um chute estático** — depois de TRÊS rodadas
  seguidas (labs 53/56/57) ajustando um número fixo às cegas e errando pra mais ou pra menos
  dependendo do aparelho específico do usuário, medir o FPS real do dispositivo é a solução
  correta de verdade pro problema, não mais um Band-Aid. Atraso de 6s antes da primeira amostra é
  proposital — sem isso mediria FPS ainda durante o carregamento inicial (enganosamente baixo).
- **`clamp()` em vez de mais um breakpoint** — mesmo raciocínio: depois do breakpoint fixo do
  lab-57 não ter resolvido (segundo o usuário), a causa provável é a largura real do Poco C75 não
  bater com o número escolhido — `clamp()` com `vw` elimina essa dependência de acertar um número
  específico, escalando continuamente com qualquer largura de tela real.
- **`settleMeshOnTerrain` NÃO usada no foguete** — bug real encontrado testando ao vivo: essa
  função (desenhada pras rochas de montanha, objetos de silhueta baixa e uniforme) pega o ponto
  mais baixo de CADA malha-filha dentro do próprio contorno; pro foguete, o nariz cônico (uma
  malha-filha isolada, alta, que nunca encosta no chão) tem seu "ponto mais baixo" ~3 unidades
  acima da base — lido erroneamente como "o nariz está flutuando 3 unidades", afundando o foguete
  inteiro no chão até a ponta do nariz "pousar". A posição inicial via `terrainGroundRadial`
  (mesmo raycast físico real usado em todo o resto do jogo) já é suficiente e correta sozinha.
- **`getAbsolutePosition()`, não `.position`, nas checagens de distância do foguete** — segundo
  bug real encontrado ao vivo: o foguete de volta é filho de `secondPlanetRoot` (parentado, pra
  herdar a posição do planetinha automaticamente), então `.position` devolve a posição LOCAL
  (perto de `0,6,0`), não a posição real no mundo (perto de `SECOND_PLANET_CENTER`) — a checagem
  de distância comparava contra o valor local errado, dando sempre uma distância gigante e nunca
  deixando o jogador voltar (embarcar funcionava, voltar não fazia nada, sem erro nenhum).
- **Planeta 2 sem sombra própria** — decisão deliberada, não testada a fundo: adicionar ~30 novos
  shadow casters a ~400 unidades de distância do planeta principal poderia forçar o frustum do
  `ShadowGenerator` (compartilhado, uma luz direcional só) a crescer pra cobrir ambos, diluindo a
  resolução da sombra no planeta principal à toa por um bônus pequeno e opcional. Não confirmado
  que isso realmente aconteceria (não deu tempo de verificar o comportamento exato de auto-fit do
  Babylon aqui), mas o custo de simplesmente não registrar esses casters é baixo e elimina o
  risco por completo.

## Pendências / dívidas conhecidas

- **Câmera demora ~1-2s reais pra "alcançar" o jogador depois de embarcar/desembarcar** — o
  `Vector3.Lerp(camera.position, desiredCamPos, 0.08)` por quadro precisa de dezenas de quadros
  pra convergir numa distância de ~400 unidades (a distância entre os dois planetas). Em 60fps
  real isso é ~1.2s, imperceptível como delay mas visível como um "borrão"/transição suave — não
  é um bug, é o comportamento existente do jogo (mesma suavização usada em toda câmera do jogo),
  só fica mais NOTÁVEL numa viagem de 400 unidades do que nos movimentos normais do dia a dia.
  Verificado ao vivo (com dificuldade real: numa aba de automação genuinamente em segundo plano,
  o loop de render quase para — 0.2 FPS — fazendo a câmera "congelar" visualmente por vários
  segundos reais antes de convergir; forçar frames reais via screenshot revelou que a câmera SIM
  estava convergindo normalmente por trás, só precisando de quadros de verdade pra avançar —
  mesmo padrão de throttle de aba em segundo plano já documentado em memória desta sessão).
- Ver "Fora de escopo" em `FEATURES.md` — sem sincronização de multiplayer durante a viagem, sem
  céu/luz diferentes no planetinha, só um planetinha secundário fixo por enquanto.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma — tudo que foi pedido nesta rodada foi entregue e verificado ao vivo.

## O que o próximo laboratório deve desenvolver

1. Usuário testar no celular/tablet real: (a) se a qualidade adaptativa melhorou a experiência
   sem precisar de mais um chute manual, (b) se o cabeçalho do HUD agora fica em tamanho
   razoável de verdade, (c) o foguete/planetinha secundário (localização: bem ao sul do planeta,
   ~156° de phi — o jogador precisa caminhar até lá pra encontrar, não é perto do ponto de
   nascimento).
2. Se ainda pesado no Redmi Pad 2 mesmo com a qualidade adaptativa: thin instancing de verdade
   continua sendo o maior alavanca de performance não puxado (documentado desde o lab-53).

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`. PRs #2 e #3 já foram mesclados pelo usuário — este
  laboratório abre mais um PR novo (ver link no resumo final da sessão).
- Jogo ao vivo (republicado com este laboratório): https://app-two-flax-92.vercel.app
- Como rodar/verificar localmente: `cd app && npm install && npm run dev`.
- Como testar o foguete sem andar até lá: no console do navegador (`npm run dev`, não o build de
  produção — o helper só existe em DEV), `window.__debugTeleport(-0.3797213687147455,
  -0.913545457642601, 0.14576137678401327)` teleporta bem em cima da estação de lançamento.
- Como redeployar o jogo: `cd app && npx vercel --prod --yes`.
