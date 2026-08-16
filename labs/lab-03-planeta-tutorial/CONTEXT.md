# Contexto — Laboratório 03 — Mini-planeta, tutorial e tela inicial

Preenchido em: 2026-08-16
Commit inicial → final: c5b6e12708de23f2c001221a6782c2507e0b1e51..HEAD (commit deste wrap)

## O que foi feito

Resposta ao feedback do usuário depois de ver o lab-02 rodando pela primeira vez: sem contexto
(tela inicial/tutorial), controles de teclado sentidos como invertidos, mundo visualmente vazio,
e a esfera como avatar sem motivo aparente.

1. **Tela inicial** (`app/src/components/TitleScreen.tsx`): título, emoji de planeta, resumo do
   jogo, botão "Jogar". Só aparece pra quem ainda não tem perfil salvo — jogador que já jogou
   antes vai direto pro mundo (sem fricção de repetir telas, critério já documentado em
   `docs/prompts/02-design-profissional.md` §7).
2. **Tutorial** (`app/src/components/Tutorial.tsx`): 4 passos curtos (o que é o planeta, como se
   move, o que são os portais, como funcionam as recompensas), pulável a qualquer momento, com
   dots de progresso. Aparece uma vez (flag `jogo-educativo:tutorialSeen` no localStorage) e fica
   acessível de novo via botão "?" no HUD do mundo 3D (`HudHeader.tsx`) — não trava quem já sabe
   jogar.
3. **Mundo reconstruído como mini-planeta esférico** (`World3D.tsx`, reescrito quase por
   inteiro): o chão virou uma esfera de raio 13 com **gravidade radial real** — a cada quadro,
   uma força é aplicada no avatar na direção do centro do planeta (`body.applyForce(localUp.scale(-GRAVITY), pos)`),
   não a gravidade uniforme padrão da engine (que foi zerada: `scene.enablePhysics(Vector3.Zero(), ...)`).
   Isso é física de verdade, não um efeito visual — a bola realmente é "puxada" pro centro da
   esfera de qualquer ponto da superfície.
4. **Movimento tangencial à curvatura**: a cada quadro, a direção "facing" da bola é mantida
   tangente à superfície local (removendo a componente radial e renormalizando — transporte
   paralelo simplificado), e o input do jogador (teclado/joystick) é projetado nesse plano
   tangente via produto vetorial (`right = Cross(localUp, facing)`). A velocidade linear do corpo
   físico é recomposta a cada quadro como `tangencial (do input) + radial (preservada da física)`
   — mantém gravidade/colisão reais enquanto o jogador controla o movimento lateral.
5. **Câmera 100% script-driven** (`UniversalCamera`, sem `attachControl`): reposicionada todo
   quadro atrás da bola (`pos - facing*distância + localUp*altura`), com `upVector` interpolado
   pra a normal local da superfície — sem isso a câmera desalinharia visualmente conforme a bola
   rola pra outros pontos da esfera.
6. **Portais apoiados na curvatura**: cada portal (base + anel) é posicionado num ponto da esfera
   (distribuição por ângulo áureo) com um quaternion de alinhamento (`alignmentQuaternion`) que
   gira o objeto pra "ficar em pé" relativo à normal local — sem isso os portais ficariam todos
   apontando pra cima no eixo Y do mundo, flutuando tortos em qualquer lugar que não fosse o
   topo do planeta.
7. **Mundo mais denso**: 42 props espalhados pela superfície (distribuição por ângulo áureo,
   phi de ~14° a ~122° a partir do polo onde a bola nasce), usando 18 modelos diferentes do
   Kenney Nature Kit já baixado no lab-02 (mais variedade extraída do mesmo zip: mais tipos de
   árvore/rocha, flores de 3 cores, cogumelo, tronco) — sem precisar de nova permissão de
   download. Cada prop tem um colisor de esfera simplificado e invisível (nunca a malha visual).
8. **Testado de ponta a ponta e a direção dos controles verificada empiricamente** no Chrome:
   despachei `KeyboardEvent('keydown')`/`keyup` reais via JS (segurando ~1s, não só um clique)
   pra ArrowUp e ArrowRight separadamente (com reload entre os testes pra isolar), e conferi por
   screenshot que cada tecla revela terreno novo na direção esperada (frente = longe da câmera,
   direita = lado direito da tela). Fluxo completo (título → onboarding → tutorial → mundo →
   portal → quiz → recompensa → botão de ajuda reabre o tutorial) testado sem erros de console.

## Decisões técnicas tomadas

- **Avatar continua sendo uma esfera** — decisão consciente, não omissão. Um personagem
  articulado exigiria alinhar sua orientação à normal da superfície a cada quadro, animação de
  caminhada, e um rig — complexidade desproporcional pro MVP. Uma bola rolando é fisicamente a
  forma mais simples de "andar" numa esfera com física real, e o tutorial agora explica o porquê
  (“você é uma bolinha rolando pela superfície”), resolvendo a confusão relatada sem precisar
  reescrever o avatar.
- **"Facing" (direção da bola) dobra como base de controle E de câmera** — pressionar uma tecla
  usa a orientação atual da bola como referência, então o controle é relativo a pra onde você
  está indo (como em jogos de bolinha em 3ª pessoa, ex. Super Monkey Ball), não a eixos fixos do
  mundo. Isso significa que testar teclas isoladamente em sessões separadas pode parecer confuso
  (a mesma tecla "gira" a referência) — mas numa sessão de jogo contínua o comportamento é
  consistente e é o padrão esperado desse gênero de jogo.
- **Sem paredes/limites no planeta** — removidas as 4 caixas invisíveis do lab-02. Numa esfera
  fechada não existe "borda" pra cair; o jogador só continua rolando ao redor do planeta.
- **Cobertura da esfera limitada a ~14°–133° a partir do polo norte** (onde a bola nasce), tanto
  pra portais quanto pra props — evita ter que lidar com a câmera "de cabeça pra baixo" no polo
  sul, que não foi implementado (ver pendências).

## Pendências / dívidas conhecidas

- **Polo sul do planeta vazio/não alcançável de forma confortável** — a câmera script-driven não
  foi testada/ajustada pra funcionar bem quando a bola vai muito além do equador; portais e props
  ficam deliberadamente fora dessa região.
- **Direção dos controles verificada visualmente, não com teste automatizado** — a verificação
  foi por screenshot + raciocínio vetorial manual, não um teste unitário da função de movimento
  (ela está inline no loop de render, não extraída — poderia virar uma função pura testável,
  ver `docs/prompts/03-arquitetura-sistema.md` §1).
- Continuam de pé as pendências já registradas no lab-02: texturas PBR com normal/AO map, e
  nenhum teste automatizado da lógica 3D.
- **Deploy real não feito nesta sessão** — usuário pediu deploy, mas criar conta em
  Vercel/Cloudflare/Netlify é uma ação que só o usuário pode fazer (não posso criar contas por
  ele). Links diretos de cadastro foram passados na resposta desta sessão; deploy fica pro
  próximo laboratório assim que o usuário tiver uma conta/token pra eu usar.

## Funcionalidades planejadas que NÃO foram concluídas

Nenhuma das 6 funcionalidades do `FEATURES.md` ficou de fora.

## O que o próximo laboratório deve desenvolver

- Deploy real (Vercel, Cloudflare Pages ou Netlify — usuário escolhe e cria a conta; eu conduzo
  o resto do processo com um token/login que ele fornecer).
- Extrair a lógica de movimento tangencial pra uma função pura testável (crítério de
  `docs/prompts/04-manutencao-clean-code.md` §5), já que hoje ela vive inline no loop de render.
- Avaliar suporte ao polo sul do planeta (câmera + distribuição de props/portais) se o jogo
  crescer e precisar de mais espaço de exploração.
- Candidatos ainda pendentes de laboratórios anteriores: hub social, Supabase real, texturas PBR
  completas.

## Estado do repositório ao final

- Branch: `copilot/pesquisa-mercado-jogo-educativo`
- Como rodar: `cd app && npm install && npm run dev`.
