# Contexto — Laboratório 111 — Sistema Solar: Vênus

Preenchido em: 2026-08-29
Commit inicial → final: 2f4968ba3a19dc67102f5f90dbdedf3e5f934099..HEAD

## O que foi feito
Segundo planeta novo da frente "Sistema Solar" (continuação do lab-110) — mesmo escopo já
confirmado com o usuário (moedas escondidas, sem combate).

- **`app/src/world3d/World3D.tsx`**:
  - `VENUS_RADIUS = 7` (entre Marte=6 e o planeta principal=13, mantendo a ordem real de tamanho:
    Mercúrio < Marte < Vênus), `VENUS_CENTER = (0, 58, 0)` (terceiro eixo — Marte usa Z, Mercúrio
    usa X), `VENUS_LANDING_UP = (0, 1, 0)`.
  - Entrada `venus` em `DESTINATION_PLANETS` (nome "Vênus", emoji ♀️).
  - `buildVenusIfNeeded()` (novo): esfera de chão alaranjada-amarelada (`Color3(0.62, 0.42, 0.22)`,
    superfície vulcânica), esfera de atmosfera translúcida por cima (`VENUS_RADIUS + 0.7`, alpha
    0.35, `backFaceCulling = false` — decorativa, sem `PhysicsAggregate`, não afeta luz/céu
    globais), 18 rochas vulcânicas esparsas (mesmos templates glTF de Marte/Mercúrio), 6 moedas
    escondidas (mesmo padrão de pivot+`alignmentQuaternion`+`coins.push`), foguete de volta.
    **Sem cratera nenhuma** — decisão deliberada, contraste com Mercúrio (ver "Decisões técnicas").
  - `buildPlanetIfNeeded` ganhou o `case 'venus'`.
- Nenhuma mudança em `boardRocket`/`landRocket`/`PlanetPickerPanel.tsx` — a arquitetura genérica do
  lab-110 já suportava qualquer quantidade de planetas sem alteração; adicionar Vênus foi só
  registrar as constantes + escrever o construtor + um `case` no dispatcher.

## Decisões técnicas tomadas
- **Vênus sem cratera nenhuma, ao contrário de Mercúrio** — baseado em geologia real (vulcanismo
  constante em Vênus apaga crateras antigas; Mercúrio, sem atmosfera/água/vento, preserva todas as
  suas desde sempre) — reforça visualmente que os dois primeiros planetas da frente são
  diferentes um do outro, não só reskins da mesma fórmula.
- **Atmosfera como esfera translúcida decorativa** — mesma decisão já tomada pra Marte no lab-59
  (luz/céu continuam globais/compartilhados, trocar isso exigiria salvar/restaurar estado ao
  entrar/sair de cada planeta) — a "atmosfera" de Vênus é só uma casca visual ao redor do PRÓPRIO
  planeta, não uma mudança de iluminação/skybox do jogo inteiro.
- **Raio entre Marte e o planeta principal** — mantém a ordem de tamanho real dos planetas já
  estabelecida no lab-110, mesmo a ordem de distância ao Sol sendo diferente (Vênus é o 2º mais
  perto do Sol mas maior que Marte, o 4º).

## Pendências / dívidas conhecidas
- **Viagem de VOLTA de Vênus não confirmada ao vivo nesta sessão** — a ida foi verificada
  completamente (posição/geometria/ausência de erro), mas a automação perdeu a posição do avatar
  em relação ao foguete de retorno entre chamadas (deriva de ~12 unidades) antes de conseguir
  reembarcar. Risco considerado desprezível: o caminho de volta é código genérico idêntico ao já
  comprovado pra Marte e Mercúrio no lab-110, nada específico de Vênus nele. Se algum bug aparecer
  ao vivo (jogador de verdade), é o primeiro lugar a olhar, mas não há razão de código pra esperar
  um.

## Funcionalidades planejadas que NÃO foram concluídas
- Nenhuma das planejadas para este laboratório.

## O que o próximo laboratório deve desenvolver
- **Júpiter e/ou Saturno** — gigantes gasosos, precisam de faixas horizontais (`DynamicTexture`
  procedural — já usado no projeto pra chama do foguete/gota de chuva, nunca ainda pra textura de
  planeta inteiro) pra reproduzir a característica visual mais reconhecível dos dois. Saturno
  também precisa de anéis (`MeshBuilder.CreateTorus` achatado no eixo Y, mesma técnica já usada no
  anel sonoro de combate de Marte, só numa escala bem maior e sem animação de pulso).
- **Urano/Netuno** depois — gigantes de gelo, azul-esverdeado/azul profundo; Urano tem eixo de
  rotação bem tombado na vida real, possível toque visual reconhecível (a decidir na hora).
- Bug de morros invisíveis (lab-95), secrets do lab-104 e corte de DNS do lab-109 continuam em
  aberto, esperando o usuário.

## Estado do repositório ao final
- Branch: `worktree-abstract-wobbling-owl`
- Como rodar/verificar o que foi construído neste laboratório:
  - `cd app && npm run test` — 44 testes, sem mudança de contagem.
  - `cd app && npm run build` — typecheck + build de produção, sem erros.
  - `cd app && npm run dev`, `window.__debugTeleport(-0.3797213687147455, -0.913545457642601,
    0.14576137678401327)` (dev-only) pra chegar perto do foguete principal, "E" abre o seletor
    (agora com 3 opções: Marte/Mercúrio/Vênus).
