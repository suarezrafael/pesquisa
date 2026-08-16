# Contexto — Laboratório 05 — Avatar de estudante, escolas, rio corrigido e trilha musical

Preenchido em: 2026-08-16
Commit inicial → final: 7db602a1bfe3ee1bd9e78915a88bbabe1c58b392..HEAD (commit deste wrap)

## O que foi feito

1. **Rio corrigido**: era um `MeshBuilder.CreateTube` (seção circular, raio 0.7) flutuando
   0,06 unidades acima da superfície — de qualquer ângulo lia como um cano/cobra solto no ar, daí
   o "sobressalente"/"bizarro". Trocado por `MeshBuilder.CreateRibbon`: pra cada ponto do caminho
   central, calculo a normal local (`up = p.normalize()`), a direção ao longo do rio (`along`) e
   a lateral perpendicular (`side = Cross(up, along)`), gerando duas margens (esquerda/direita)
   que ficam rente à curvatura do planeta (só +0,025 de elevação, o mínimo pra evitar
   z-fighting com o chão). Agora lê como uma faixa de água embutida no terreno.
2. **Avatar de estudante** (`buildStudentFigure` em `World3D.tsx`): torso (cápsula), cabeça
   (esfera), cabelo, mochila (caixa nas costas — alargada depois de testar, ficava escondida
   atrás do torso), 2 pernas e 2 braços como cápsulas penduradas em `TransformNode` pivô (quadril/
   ombro), tudo construído com primitivas, sem asset externo. A física agora usa um colisor
   cápsula **invisível** (`avatarMesh`, física continua no mesmo lugar: gravidade radial,
   controle carrinho) com a rotação física travada a cada quadro
   (`body.setAngularVelocity(Vector3.Zero())`) pra não tombar. O personagem visual é reposicionado
   e reorientado por cima, todo quadro, via `Matrix.FromXYZAxesToRef(right, localUp, facing, ...)`
   — ele "gruda" na superfície do planeta (raio do chão + 0,02), não na altura elevada do colisor.
3. **Animação de caminhada**: fase de ciclo (`walkPhase`) só avança enquanto `|throttle| > 0.05`;
   pernas/braços giram em seno (`LEG_SWING_MAX = 0.55 rad`) em torno do pivô, braços em contra-
   fase das pernas. Parado, os ângulos decaem suavemente (×0.8/quadro) de volta a zero.
4. **Som de passo**: `playFootstep()` em `ambientAudio.ts` (ruído curto filtrado, tipo "tap"),
   disparado quando o sinal de `sin(walkPhase)` muda (cruzamento de zero = troca de perna),
   só durante o movimento real.
5. **Trilha chiptune**: substitui o pad ambiente do lab-04 por uma melodia de 12 notas em dó
   maior (onda quadrada) com um baixo em triângulo no início de cada loop, agendada via
   `setTimeout` recursivo (não Web Audio scheduling de precisão de sample — suficiente pra uma
   trilha de fundo casual). Vento mantido exatamente como estava (usuário aprovou explicitamente).
6. **Miniescolas** substituindo os anéis: `TransformNode` raiz alinhado à curvatura (mesma
   `alignmentQuaternion` de antes) com paredes (caixa), porta (caixa escura) e telhado piramidal
   (`CreateCylinder` com `diameterTop: 0.05`) que carrega a cor/estado da missão (cinza/colorido/
   verde — a mesma lógica de bloqueado/desbloqueado/concluído que o anel tinha). Um professor
   (mesmo `buildStudentFigure`, parado, roupa roxa pra diferenciar) fica ao lado da porta,
   parentado direto no `TransformNode` da escola (herda o alinhamento automaticamente). A
   animação de "bobbing" (flutuar/girar) do anel foi trocada por um brilho pulsante no telhado —
   prédio não flutua nem gira, só o brilho pulsa.
7. Textos da UI atualizados pra parar de mencionar "bolinha"/"role"/"portal": `Tutorial.tsx`,
   `TitleScreen.tsx`, `QuestListOverlay.tsx` e o hint na tela do mundo agora falam em
   "estudante"/"caminhe"/"escolinha".
8. Testado de ponta a ponta no navegador: personagem anda com animação visível (mochila
   aparecendo nas laterais do torso), chega numa escola via teleporte de QA, quiz abre, resposta
   certa dá recompensa (XP/moedas), sem erros de console em nenhum passo.

## Decisões técnicas tomadas

- **Colisor físico separado do personagem visual** — a cápsula física fica invisível e o
  boneco articulado é só desenhado por cima, reorientado a cada quadro. Isso evita ter que lidar
  com a rotação física real da cápsula (que giraria de forma não natural com o contato/atrito do
  chão) — a orientação visual é 100% controlada por código, sempre "em pé" e olhando pra
  `facing`.
- **Professor reaproveita o mesmo `buildStudentFigure`** do jogador, só com cor de roupa
  diferente e sem animação — evita duplicar código de construção de personagem pra um caso que só
  precisa ficar parado.
- **Trilha musical sintetizada por `setTimeout`, não Web Audio precisamente agendado
  (`AudioContext.currentTime` scheduling em lote)** — mais simples de implementar e manter, com
  deriva de tempo imperceptível numa trilha de fundo casual de jogo infantil. Se algum dia a
  trilha precisar de sincronismo mais apertado (ex.: minigame de ritmo), essa decisão precisa ser
  revisitada.

## Pendências / dívidas conhecidas

- **Multiplayer + chat**, pedido pelo usuário no meio desta sessão, ainda não implementado —
  ficou combinado que seria tratado logo depois deste laboratório (ver próxima seção). O pedido
  de chat de texto livre entre crianças conflita com `docs/prompts/01-seguranca.md` §1 (MUST:
  "Nenhum chat de texto livre entre crianças no MVP") — isso precisa ser alinhado com o usuário
  antes de qualquer implementação, não decidido unilateralmente.
- Continuam de pé as pendências anteriores: deploy real, trilha como asset de música real (se o
  usuário preferir à sintetizada), suporte ao polo sul do planeta, texturas PBR completas.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma das 7 funcionalidades do `FEATURES.md` ficou de fora.

## O que o próximo laboratório deve desenvolver

- **Multiplayer local** (ver-se mutuamente na mesma rede) — provavelmente precisa de um
  servidor leve (Node + WebSocket) rodando nesta máquina, já que o jogo hoje não tem nenhum
  backend; navegadores diferentes conectariam nele pelo IP da rede local. Arquitetura a definir
  com o usuário antes de implementar (é a primeira peça de servidor do projeto).
- **Chat** — propor a alternativa seletiva (mensagens pré-definidas/emotes) em vez de texto
  livre, conforme `docs/prompts/01-seguranca.md`, e confirmar com o usuário antes de construir
  qualquer uma das duas versões.
- Deploy real (pendente do usuário criar conta).

## Estado do repositório ao final

- Branch: `copilot/pesquisa-mercado-jogo-educativo`
- Como rodar: `cd app && npm install && npm run dev`.
