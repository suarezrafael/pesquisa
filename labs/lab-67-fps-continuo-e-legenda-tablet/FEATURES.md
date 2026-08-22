# Laboratório 67 — Contador de FPS em produção, auto-ajuste contínuo e legenda ilegível no tablet

Status: concluído
Início: 2026-08-22
Fim: 2026-08-22
Commit inicial: 2bd207d5b90509da3627bcfd25c5cd698ef14e4e

## Objetivo do laboratório
Usuário, em duas mensagens seguidas (a segunda chegou no meio do trabalho da primeira):
1. "TESTEI NO TABLET MELHOROU ALGUNS FPS, MAS PRECISO DE INFORMACOES DE FPS NA TELA EM PRODUCAO,
   PODE SEGUIR TRABALHANDO NA MELHORIA DE FPS MAIS ALTO, AINDA TEM LAG AO MOVER A CAMERA E SE
   PERCEBE BAIXO FPS AO ANDAR. OTIMIZAR ISSO." — confirma que o corte da piscina/lagoa (lab-66)
   ajudou, pede o contador de FPS visível em produção (hoje só aparece em DEV) e pede pra
   continuar otimizando.
2. "EU ESTAVA ABRINDO COMO SITE PRA COMPUTADOR, QUANDO DESMARQUEI NO CHROME O FPS MELHOROU, POREM
   OS TEXTO DE LEGENDAS DOS OBJETOS FICARAM MUITO PEQUENO QUASE NAO DA PRA LER." — revela que o
   teste anterior rodava com "Site para computador" ligado no Chrome do tablet, mascarando o
   user-agent (o jogo tratava o Redmi Pad 2 como desktop, nenhuma otimização de aparelho fraco
   rodava). Ao desligar esse modo, as otimizações passaram a rodar de verdade (FPS melhorou), mas
   revelou um bug real: a redução de fonte das legendas (pensada pra tela PEQUENA de celular) se
   aplica a QUALQUER aparelho classificado como "fraco", incluindo tablets de tela grande — no
   Redmi Pad 2 (~11") isso deixa o texto minúsculo sem necessidade nenhuma.

## Funcionalidades planejadas
- [x] Contador de FPS (+ escala de resolução + draw calls + malhas) sempre visível, também em
      produção. Verificado AO VIVO (screenshot: "22 FPS · escala 1.00 · 0 draw calls · 771/1936
      meshes" no canto superior direito, sem depender de `import.meta.env.DEV`) — referência:
      pedido 1.
- [x] Auto-ajuste de resolução por FPS virar contínuo (repete ao longo de toda a sessão, a cada
      ~12s, em vez de rodar só uma vez no carregamento) — referência: pedido 1.
- [x] Corrigir o tamanho da legenda no tablet — `isSmallScreen` (dimensão real da janela) agora
      decide o tamanho da fonte, separado de `isLowEndDevice` (GPU, continua controlando
      resolução/sombra/contagens sem mudança) — referência: pedido 2.
- [x] Avaliada (não implementada) a alavanca de `createOrUpdateSelectionOctree()` — ver "Fora de
      escopo" para o raciocínio completo de por que foi adiada depois da investigação.
- [x] Build (typecheck + produção) passa.
- [x] Deploy em produção ao final — feito depois do wrap deste lab.

## Fora de escopo (explicitamente adiado)
- **Octree de seleção (`createOrUpdateSelectionOctree`)** — investigado a fundo (leitura direta do
  código-fonte do pacote `@babylonjs/core` instalado, não só da documentação): confirma que
  aceleraria de verdade a seleção de malhas ativas por quadro (exatamente o custo por trás de "lag
  ao mover a câmera", já que isso roda todo quadro independente de movimento). MAS o mecanismo
  troca `scene.getActiveMeshCandidates` pra usar SÓ o conteúdo do octree — malhas criadas
  dinamicamente DEPOIS da criação do octree (jogadores remotos entrando, feixe de laser/choque/
  fumaça do combate em Marte, e provavelmente mais pontos não mapeados) não entram automaticamente
  nele (o hook automático só existe pra `SceneLoader.ImportMesh`, não pra `.clone()`/
  `MeshBuilder`, que é como quase tudo neste jogo é criado). Sem atualizar o octree manualmente em
  TODO ponto do código que cria malha em tempo de execução — vários, espalhados, fácil esquecer um
  — o risco real é malha nova invisível (ex.: um jogador remoto sumir pros outros, ou um efeito de
  combate nunca aparecer), pior que o lag atual. Mesmo raciocínio de risco já registrado pro
  thin-instancing (labs anteriores e lab-66): sem conseguir testar exaustivamente num aparelho
  real, não vale arriscar. Documentado aqui pra não reconsiderar do zero numa sessão futura.
