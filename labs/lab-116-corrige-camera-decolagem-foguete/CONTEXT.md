# Contexto — Laboratório 116 — Corrige câmera do foguete na decolagem (ida pros planetas)

Preenchido em: 2026-08-29
Commit inicial → final: 8a6dfa953de2d488e75c2b196026cd96934a6075..HEAD

## O que foi feito
Pedido do usuário: "a viagem do foguete pra ida pros outros planetas ta um pouco bugada a camera,
fica uma visao dentro da terra. na volta pra terra ta ok." Corrigida a câmera do foguete nas DUAS
fases de repouso do voo (decolagem E flip final de pouso) — a decolagem era o único caso
visivelmente quebrado, mas a causa raiz era a mesma nos dois lados.

- **`app/src/world3d/World3D.tsx`**:
  - `RocketFlight` (interface) ganhou `fromUp: Vector3`/`toUp: Vector3` — os mesmos vetores já
    calculados como variáveis locais em `boardRocket` (usados pra construir
    `fromRestQuat`/`toRestQuat` e os pontos de controle da curva), agora também guardados na
    struct pra a câmera não precisar redescobri-los a partir do quaternion.
  - `boardRocket`: `drivingRocket = {...}` agora inclui `fromUp`/`toUp`.
  - Laço de física/câmera do foguete (dentro do `if (drivingRocket && flyingRocket)`): a câmera
    "atrás da cauda" (nariz invertido, pedido original do lab-61) agora só é usada no CRUZEIRO
    (longe de qualquer planeta). Durante `progress <= ROCKET_LAUNCH_HOLD_END` (decolagem) OU
    `progress >= ROCKET_LANDING_FLIP_START` (flip de pouso), usa uma câmera "de lado": tangente
    horizontal (baseada em `facing`, projetada perpendicular ao "pra cima" do planeta relevante) +
    altura no PRÓPRIO "pra cima" do planeta (`fromUp` na decolagem, `toUp` no pouso) — garantido
    pra FORA da superfície, mesmo princípio já usado pela câmera do avatar andando.

## Decisões técnicas tomadas
- **Causa raiz**: nas duas fases de repouso, o nariz da nave fica travado apontando pra LONGE do
  planeta relevante (reto pra cima da plataforma, mesma orientação do foguete parado). "Atrás da
  cauda" = direção OPOSTA a essa — ou seja, DIRETO PRA DENTRO do planeta. `shipUp` (usado só pra
  altura) é perpendicular ao nariz, quase TANGENTE à superfície nessa fase — não ajuda a levantar a
  câmera pra fora do chão. Com o planeta principal tendo raio 13 e `CAMERA_DISTANCE=9`, a câmera
  calculada cai ~9 unidades pra dentro do sólido, só parcialmente compensada pelo deslocamento
  tangencial de `CAMERA_HEIGHT=4.5`.
- **Por que só a decolagem (saindo do planeta principal) tinha sido reportada, não o pouso de
  volta**: a decolagem é um HOLD real controlado pelo jogador (pode ficar parado na plataforma por
  vários quadros com a câmera ruim); o pouso equivalente tem a MESMA geometria problemática, mas
  `landRocket()` dispara assim que `progress >= 1`, cortando o quadro ruim quase instantaneamente —
  imperceptível na prática, mas ainda assim a lógica estava errada, não só "por sorte". Corrigidas
  as DUAS pontas pra não depender dessa sorte de timing (ex.: framerate baixo, ou pousar em Marte
  em vez de voltar pro planeta principal, prolongando a visibilidade do bug).
- **Por que não incomodava visivelmente nos gigantes gasosos/gelo** (Júpiter/Saturno/Urano/Netuno,
  raios 20/17/15/14 — TODOS maiores que o planeta principal=13): são esferas lisas com material
  padrão (`backFaceCulling` ligado) — câmera "dentro" delas não renderiza o interior, só mostra o
  vazio atrás. O planeta principal teve `backFaceCulling = false` deliberadamente ligado no lab-95
  (correção do bug de morros invisíveis) — é o único corpo que MOSTRA seu próprio interior
  (terreno, escolas, NPCs) quando a câmera cai lá dentro, o que tornava o bug óbvio especificamente
  nele. Isso também explica um artefato mal-atribuído durante a verificação ao vivo do lab-115 (a
  viagem a Mercúrio mostrou de relance "Torre do Tesouro"/números de escola do planeta principal
  atrás do foguete) — era este bug de verdade, não um artefato de câmera de automação atrasada
  como foi registrado na hora.
- **Câmera "de lado" reaproveita `facing`** (a direção que o avatar estava olhando antes de
  embarcar) como referência de tangente horizontal — transição suave com o que o jogador já estava
  vendo ao entrar no foguete, com fallback (`Vector3.Cross`) se `facing` acabar quase paralelo ao
  "pra cima" do planeta (caso raro/degenerado).

## Pendências / dívidas conhecidas
- Nenhuma nova.

## Funcionalidades planejadas que NÃO foram concluídas
- Nenhuma das planejadas para este laboratório.

## O que o próximo laboratório deve desenvolver
- Nenhum pedido novo de produto surgiu deste laboratório — era uma correção pontual de bug.
- Itens de backlog em aberto continuam os mesmos de antes (todos esperando ação do usuário, sem
  mudança neste laboratório): bug de morros invisíveis (lab-95), secrets
  `VERCEL_TOKEN`/`CLOUDFLARE_API_TOKEN` + merge do PR `#8` (lab-104), deploy real em produção
  (Cloudflare Pages paralelo como alternativa em uso), corte de DNS (lab-109).

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`
- Como rodar/verificar o que foi construído neste laboratório:
  - `cd app && npm run test` — 47 testes, sem mudança de contagem (bug de câmera, não lógica de
    domínio).
  - `cd app && npm run build` — typecheck + build de produção, sem erros.
  - `cd app && npm run dev`, `window.__debugTeleport(-0.3797213687147455, -0.913545457642601,
    0.14576137678401327)` (dev-only), "E" embarca/abre o seletor — decolar rumo a qualquer planeta
    agora mostra a nave de fora (chão/montanhas ao redor), nunca o interior do planeta principal.
  - **Verificado ao vivo, nas 4 combinações**: decolagem do planeta principal rumo a Marte (câmera
    limpa, sem interior visível) e rumo a Mercúrio (idem); pouso em Mercúrio (câmera de fora,
    aproximação limpa); decolagem de Mercúrio de volta (câmera de fora); pouso de volta no planeta
    principal (aproximação externa da superfície, sem regressão da parte que o usuário já disse
    estar ok). Sem erro de console em nenhuma etapa.
