# Contexto — Laboratório 04 — Imersão: controle, vegetação, rios, clima e som

Preenchido em: 2026-08-16
Commit inicial → final: 180d32a7a388a332b4edeae8f30d07c2e0348032..HEAD (commit deste wrap)

## O que foi feito

1. **Bug de controle corrigido** (`World3D.tsx`): o modelo de movimento do lab-03 redefinia a
   direção ("facing") da bola instantaneamente pra bater com o vetor de input a cada quadro.
   Isso degenerava quando só esquerda/direita era pressionado sem cima/baixo — sem um componente
   de avanço, o "facing" ficava preso girando 90°/180° a cada quadro, o que na prática parecia
   "não funcionar" ou "ser extremamente sensível". Substituído por um modelo estilo carrinho:
   esquerda/direita **giram** a direção atual a uma taxa fixa (`TURN_RATE = 2.6 rad/s`, função
   `rotateAroundAxis` — fórmula de Rodrigues), cima/baixo aceleram/freiam **na direção atual**
   (nunca redefinem pra onde a bola está olhando). Verificado empiricamente segurando
   `KeyboardEvent` reais via JS por ~1–2s (não só clique): girar sozinho corretamente não desloca
   a bola (comportamento físico esperado — não dá pra "virar em pé" sem tração), segurar
   cima/baixo move a magnitude esperada (~5–6 unidades/s), e segurando cima+direita juntos a bola
   faz uma curva controlada. Um portal foi alcançado por navegação de verdade (não teleporte de
   debug) numa sequência de comandos de teclado reais.
2. **Lista de missões** (`world3d/QuestListOverlay.tsx`, botão 🗺️ no HUD): mostra os 10 títulos e
   tipos de quest, com "???" nas ainda bloqueadas (evita spoiler) e ✓/✨/🔒 pro estado de cada
   uma — resolve "não entendi quais são as missões que posso encontrar".
3. **Nuvens**: grupos de esferas achatadas com material sem luz (`disableLighting=true`,
   emissivo branco — tentei PBR primeiro e ficou escuro por interação com sombra/SSAO, troquei
   pra unlit e resolveu, ver decisões), cada grupo derivando lentamente ao redor do eixo polar do
   planeta via a mesma função `rotateAroundAxis` usada no giro da bola.
4. **Rio**: `MeshBuilder.CreateTube` seguindo um caminho de pontos calculados sobre a esfera
   (coordenadas esféricas com uma leve ondulação senoidal pro visual de "serpenteante"), material
   azul brilhante e liso. Sem colisor — a bola rola por cima/atravessa visualmente, sem física de
   flutuação (fora de escopo).
5. **Grama com vento real via shader**: `ShaderMaterial` customizado (vertex+fragment GLSL
   inline via `Effect.ShadersStore`) aplicado a ~2600 lâminas via **thin instances** (1 único
   draw call). O balanço do vento é calculado no vertex shader em espaço local do vértice, antes
   da matriz de mundo por instância ser aplicada — por isso cada lâmina já nasce alinhada à
   curvatura do planeta (mesma `alignmentQuaternion` usada nos props) sem lógica extra no shader.
6. **Áudio**: `world3d/ambientAudio.ts`, tudo sintetizado via Web Audio API — vento (ruído
   "marrom" filtrado com rajadas via LFO lento) + trilha ambiente suave (acorde de 4 notas com
   vibrato leve por oscilador). Inicia dentro do `setup()` do mundo 3D (depois que o jogador já
   interagiu com telas anteriores, então autoplay não é bloqueado pelo navegador). Botão de mute
   (🔊/🔇) no HUD.
7. Testado de ponta a ponta no navegador sem erros de console: lista de missões abre e mostra o
   estado certo, botão de mute alterna, mundo carrega com grama/rio/nuvens visíveis.

## Decisões técnicas tomadas

- **Áudio sintetizado, não baixado.** O usuário pediu "trilha sonora" e "barulho do planeta ao
  ar livre". Decidi sintetizar tudo via Web Audio em vez de buscar/baixar um arquivo de música
  CC0: evita mais uma rodada de permissão de download, elimina qualquer risco de licença, e
  fica sob controle total de volume/estilo. Trade-off: a "música" é um pad simples, não uma
  composição real — se o usuário preferir uma faixa de verdade, é só pedir (aí sim baixo, com
  confirmação de arquivo/fonte/tamanho como das outras vezes).
- **Nuvens com material unlit (`disableLighting=true`)**, não PBR — testei PBR primeiro
  (`roughness=1, metallic=0, albedo branco`) e o resultado visual saiu escuro/acinzentado,
  provavelmente por interação com SSAO/sombra em geometria alfa-blended que a pipeline não foi
  pensada pra cobrir bem. Unlit ficou branco e "fofo" de forma confiável, e combina melhor com o
  resto do visual estilizado/cartoon do planeta.
- **Sem colisor no rio** — atravessar visualmente em vez de física de água (boiar, arrastar) é
  uma simplificação consciente; física de fluido/flutuação está fora de escopo do MVP.
- **Grama via shader + thin instances, não texturas animadas** — thin instances com um shader
  customizado dá 1 draw call pra milhares de lâminas, e o balanço calculado em espaço local
  (antes da matriz de mundo) evita ter que lidar com a curvatura do planeta dentro do shader.

## Pendências / dívidas conhecidas

- **Turno estilo carrinho ainda não testado em dispositivo touch** — o joystick já alimenta os
  mesmos `x`/`y` que o teclado, então deveria funcionar igual (girar com `x`, acelerar com
  `-y`), mas não testei numa tela touch de verdade nesta sessão.
- **Trilha sonora é sintetizada, não uma composição real** — ver decisão acima; trocar por um
  asset de música de verdade fica pendente de o usuário confirmar que quer isso.
- Continuam de pé as pendências dos laboratórios anteriores (polo sul do planeta, texturas PBR
  completas, deploy real).

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma das 8 funcionalidades do `FEATURES.md` ficou de fora.

## O que o próximo laboratório deve desenvolver

- Deploy real (segue pendente do usuário criar conta — links já passados numa resposta anterior
  desta sessão).
- Se o usuário quiser uma trilha sonora "de verdade" em vez da sintetizada, buscar e baixar um
  asset CC0 específico (com confirmação de arquivo/fonte/tamanho).
- Testar o joystick touch em dispositivo real.
- Candidatos herdados: hub social, Supabase real, texturas PBR completas, suporte ao polo sul.

## Estado do repositório ao final

- Branch: `copilot/pesquisa-mercado-jogo-educativo`
- Como rodar: `cd app && npm install && npm run dev`.
