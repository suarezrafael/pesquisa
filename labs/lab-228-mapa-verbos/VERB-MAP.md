# Mapa de verbos e affordances - Lab 228

Base: `main` em `377480b` (PR #117), auditada em 2026-09-23. Origem do
problema: UX Lab 187 em `docs/growth-retention-monetization-backlog.md`.
Este e um inventario de codigo e interface, nao resultado de playtest.

## Inventario

`Antes` = pista visivel antes da acao; `perto` = dica por proximidade;
`estado` = como a crianca reconhece que terminou ou mudou algo. `--` significa
que nao ha dica especifica identificada na leitura, nao que a acao e impossivel.

| Verbo / objeto | Antes; perto | Desktop; toque | Feedback; estado | Evidencia no codigo |
| --- | --- | --- | --- | --- |
| Andar e virar / avatar | Tutorial de movimento; joystick sempre visivel | WASD/setas; joystick esquerdo | Avatar e camera se movem; sem conclusao | `components/Tutorial.tsx`, `world3d/TouchJoystick.tsx`, `world3d/World3D.tsx` (input `x/y`, `facing`) |
| Olhar / camera | Botoes de giro e recentralizar; sem dica contextual | Arrastar mouse, botoes; arrastar metade direita, botoes/pinca | Vista muda; toque tambem gira suavemente o avatar desde PR #117; sem conclusao | `world3d/World3D.tsx` (`onCameraPointerMove`, `recenterCamera`), `touchCameraFollow.ts` |
| Pular e correr / avatar | Botoes persistentes com `aria-label`; nao dependem de proximidade | Espaco/Shift; botoes Pular/Correr | Salto/velocidade/animacao; sem conclusao | `world3d/TouchActionButton.tsx`, `world3d/World3D.tsx` (`touchJumpRef`, `touchRunRef`) |
| Descobrir missao / escolinha | Escola colorida, professor, numero e texto global; sem prompt de acao | Caminhar ate perto; mesmo no toque | Quiz abre automaticamente; missao completada persiste | `components/Tutorial.tsx`, `world3d/World3D.tsx` (`portalMeshes`, `TRIGGER_DISTANCE`) |
| Responder / quiz | Pergunta e alternativas no modal; sem dica de proximidade | Clique/teclado; toque nos botoes | Acerto/erro por texto e cor; recompensa apos acerto | `components/QuestModal.tsx`, `state/useProgress.ts` |
| Interagir / carro, foguete, casa, hub e arenas | Objeto/emoji; `Pressione E` so quando perto | E; botao visual `E` com nome acessivel `Interagir` | Entrar/sair, teleportar ou iniciar acao; depende do objeto | `world3d/World3D.tsx` (`handleInteractPress`, `addHubLabels`, hints de carro/foguete/casa), `TouchActionButton.tsx` |
| Coletar / moedas, bau e segredos | Objeto visual; sem hint de tecla | Aproximar; mesmo no toque | Some do mundo, som e/ou aviso de moedas; colecao persiste quando aplicavel | `world3d/World3D.tsx` (`coins`, `treasureChestMarkers`, `planetSecretMarkers`) |
| Comprar com moedas / lojinha | Balcao e icone do HUD; modal mostra saldo/preco | Aproximar ou abrir HUD, clicar; tocar | Item desbloqueado, saldo alterado; compra persiste | `world3d/World3D.tsx` (`shopCounterWorldPos`), `world3d/AvatarShop.tsx`, `world3d/HudHeader.tsx` |
| Equipar / visual e pet | Item e preview no modal; botoes `Usar`/`Equipar` | Clique/teclado; toque | Preview/avatar/pet mudam; selecao persiste | `world3d/AvatarShop.tsx`, `world3d/PetPanel.tsx`, `world3d/studentFigure.ts` |
| Cuidar / pet | Icone do HUD; painel com alimento e desafio | Clique/teclado; toque | Estado de cuidado e crescimento no painel/pet | `world3d/PetPanel.tsx`, `state/progression.ts` |
| Visitar / planeta | Foguete com hint perto; seletor de destinos apos embarque | E + seletor; botao `E` + toque no seletor | Voo/pouso e cena mudam; destino concluido e registrado | `world3d/World3D.tsx` (`boardRocket`, `landRocket`), `PlanetPickerPanel.tsx` |
| Dirigir / carro | Carro com hint `Pressione E` perto | E, frente/tras; botao `E`, joystick | Avatar entra no carro e camera o segue; sair por E | `world3d/World3D.tsx` (`handleInteractPress`, `drivingCar`) |
| Voar / foguete | Plataforma e hint `Pressione E` perto | E, frente/tras; botao `E`, joystick | Ceu/camera/nave mudam e pouso e automatico | `world3d/World3D.tsx` (`drivingRocket`, `sampleFlightArc`) |
| Mover / mobilia da casa | Peca fantasma e barra de posicao; dica de validade | WASD/setas + botoes; joystick + botoes | Realce vermelho e mensagem quando invalida; confirmacao posiciona | `world3d/World3D.tsx` (`placingFurnitureId`, `placingFurnitureInvalid`) |
| Reagir / chat fechado | Icone do HUD; radial e catalogo de frases | Clique/teclado; toque | Frase predefinida enviada/mostrada; sem texto livre | `world3d/HudHeader.tsx`, `ChatRadial.tsx`, `ChatPanel.tsx` |
| Jogar minijogo / hub e centro | Arco, portais e placas; `Pressione E` perto | E; botao `E` | Contagem, desafio e resultado/trofeu | `world3d/World3D.tsx` (`addHubLabels`, `arenaTargetHintLabels`, `trackMinigameCompleted`) |

## Evidencia visual e limites

- Edge, versao publicada `2026-09-23T17:44:47.497Z`, perfil local ja existente:
  mundo 3D, HUD e controles vistos em viewport padrao, 1138x633 (Redmi Pad 2)
  e 390x844 (celular). O painel de depuracao comecou expandido e ocupou parte
  superior direita; no viewport estreito ficou junto da area dos controles.
- A lojinha abriu via HUD em desktop e 390x844; abas e botoes apareceram na
  arvore de acessibilidade. O texto introdutorio exibiu pedido para que a
  crianca chame o responsavel para conferir itens de assinante.
- O Edge automatizado renderizou 1-2 FPS; isso nao mede desempenho do tablet
  nem permite julgar legibilidade de labels 3D em movimento. Nao houve gesto
  touch real, primeira sessao de perfil novo, nem visita a planeta secundario.
  Esses tres pontos e um playtest infantil seguem abertos.

## Inconsistencias priorizadas

| Prioridade | Achado e hipotese | Evidencia | Proximo lab pequeno / aceite |
| --- | --- | --- | --- |
| P0 | As placas dizem `Pressione E`, mas o toque oferece um botao `E`; a crianca pode nao associar os dois. | Strings em `World3D.tsx`; controle em `TouchActionButton.tsx`. Ainda sem playtest. | UX 188: padronizar dica contextual por tipo de entrada e botao de acao com icone/rotulo compreensivel. Testar entrar no carro, foguete, casa e portal sem instrucao oral em desktop/tablet. |
| P0 | A lojinha infantil pedia ao responsavel conferir itens de assinante, criando possivel pressao de compra mediada pela crianca. A frase direta foi retirada neste lab; tags de bloqueio e outras copias ainda exigem revisao. | Texto anterior visto em `AvatarShop.tsx` e no Edge; nova copia no diff do Lab 228. | UX 189: revisar todas as copias e estados de exclusividade; manter preco, compra e decisao apenas na area adulta. Revisao de seguranca antes do merge. |
| P1 | Painel tecnico inicia expandido na producao e pode disputar espaco com o giro/visao em viewport estreito. | `debugPanelExpanded` inicia `true` em `World3D.tsx`; observado no Edge a 390x844. | Lab de HUD: iniciar recolhido para criancas, preservar acesso manual a `Medir 15 s` para testes; conferir que nenhum controle fica coberto. |
| P1 | Escola e balcao abrem modais por aproximacao, enquanto outros objetos pedem E. A troca de regra pode surpreender na primeira volta. | `portalMeshes` e `shopCounterWorldPos` em `World3D.tsx`. | UX 190: playtest antes de trocar comportamento; medir abertura inesperada e tempo ate primeira missao. |
| P1 | A tela `Carregando o mundo 3D` persistiu durante varias leituras no Edge sem progresso exposto. Nao ha tempo confiavel nesta automacao. | `App.tsx` (fallback de `Suspense`), observacao no Edge. | Lab de primeira sessao: medir tempo ate interativo em Android real; se >1 s, indicar progresso/etapas de carregamento. |

## Contrato para novos interativos

1. Antes: objeto acionavel tem forma/rotulo distinto de decoracao, sem depender so
   da cor ou do iconico `E`. Declarar se acao e automatica por proximidade.
2. Perto: uma dica curta usa o input real disponivel (tecla no desktop, acao de
   toque no mobile), aparece so enquanto a acao e possivel e nao cobre o alvo.
3. Acao: mouse/teclado/toque chegam ao mesmo handler de dominio; alvo HTML tem
   pelo menos 44x44 px logicos, nome acessivel e estado de foco.
4. Depois: feedback visual e sonoro imediato, texto encorajador, mudanca de
   estado reconhecivel e protecao contra disparo duplo. Mute nao esconde o
   feedback visual.
5. Seguranca: nenhuma dica infantil abre pagamento, pede compra ou coleta PII.
   Testar com criancas e responsaveis antes de chamar uma hipotese de validada.

## Medicao e decisao

Usar eventos ja existentes `time_to_first_control`,
`time_to_first_learning_challenge`, `time_to_first_reward` e
`activation_cycle_completed` em `productAnalytics.ts` como linha de base.
Em 5-8 duplas, observar sem instruir: tempo ate reconhecer o primeiro objeto
acionavel, tentativas, pedidos de ajuda, conclusao da primeira missao em 10 min
e leitura do controle `E` em tablet. Registrar so contagens/tempos agregados e
citacoes anonimas; nao gravar voz, nome real ou texto livre da crianca.
Nao inferir melhora a partir de uma unica sessao automatizada.
