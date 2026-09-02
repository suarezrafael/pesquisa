# Contexto — Laboratório 131 — Baús de tesouro escondidos

Preenchido em: 2026-08-30
Commit inicial → final: 257c404fe7f9bf3f29658b57f625bfc1da8a03cf..HEAD

## O que foi feito

Item do backlog de engajamento discutido em chat ("baús de tesouro escondidos"), escolhido pelo
usuário via `AskUserQuestion` entre 4 opções. Um baú de tesouro escondido por planeta-destino sem
combate (Mercúrio/Vênus/Júpiter/Saturno/Urano/Netuno — Marte fica de fora, já tem sua própria
recompensa exclusiva de exploração, o pote de moedas do lab-128), achado por proximidade real (sem
pergunta), dando 15 moedas de bônus. Achado UMA VEZ SÓ por planeta, PRA SEMPRE — persistido no
`Progress`, diferente das moedas comuns escondidas (resetam a cada sessão) e do pote de Marte
(reseta a cada visita).

- **`types.ts`/`state/storage.ts`**: `foundTreasureChestIds: string[]` novo em `Progress`/
  `emptyProgress` — migração automática pra saves antigos via `{...emptyProgress, ...raw}` já
  existente em `loadProgress`, sem caso especial (mesmo padrão de `completedPlanetQuestIds`/
  `unlockedFurnitureIds`).
- **`data/treasureChests.ts`** (novo): catálogo puro (`id`, `planetId`, `coinReward: 15`) dos 6
  baús + `findTreasureChestById`.
- **`state/progression.ts`**: `applyTreasureChestFound(progress, chestId)` novo — mesmo formato de
  retorno de `unlockMarsReward` (lab-94): idempotente, sem multiplicador de evento semanal/
  assinante (moeda flat, é recompensa de exploração, não de responder pergunta).
- **`state/useProgress.ts`/`App.tsx`/`World3D.tsx`**: `foundTreasureChest`/`onFindTreasureChest`
  novos, mesmo padrão prop→ref→gatilho de `onUnlockMarsReward`/`onUnlockMarsRewardRef`.
- **`World3D.tsx`**:
  - `TREASURE_CHEST_DIR` novo — reaproveita a MESMA parametrização de ângulo de ouro de
    `PLANET_SCHOOL_DIRS` (lab-127), só com `phi=165°` (perto do polo sul, fora da faixa 35°-145°
    das escolinhas e longe da plataforma de pouso em `phi≈0`) e `theta` continuando a sequência
    (índice 6) — mesma direção relativa reaproveitada pelos 6 planetas (todos com `landingUp =
    (0,1,0)` idêntico).
  - `buildTreasureChest(chestId, planetRoot, radius, localUp, nameSuffix)` novo — baú de madeira
    (base + tampa + fivela dourada), visual distinto das moedas comuns/pote de Marte. Sempre
    construído, mas `setEnabled(false)` de saída se `chestId` já estiver em
    `progressRef.current.foundTreasureChestIds` (achado numa sessão anterior) — mesmo padrão
    "constrói sempre, revela condicionalmente" já usado pra mobília da casa/pote de Marte.
    `label.isVisible` setado em conjunto com `setEnabled` (gotcha do `Control.linkWithMesh`, achado
    real do lab-128, aplicado proativamente aqui).
  - Chamado uma vez por planeta, logo após o loop de escolinhas, nos 6 `buildXIfNeeded()`.
  - Gatilho de proximidade novo (`treasureChestMarkers`) — como o achado é permanente (nunca
    reseta), o próprio `pivot.isEnabled()` já basta como guarda de idempotência, sem precisar do
    `Set` de histerese `triggered`/`RESET_DISTANCE` usado pelas escolinhas.
  - `treasureFoundMessage` (novo `useState`) — mensagem transitória ("💰 Baú encontrado! +15
    moedas!"), mesmo padrão de `marsDeathMessage`/`weaponMessage`/`survivalDeathMessage` (classe
    CSS `.mars-death-message`, some sozinha depois de 4s).

## Decisões técnicas tomadas

Ver `FEATURES.md` (seção "Decisões técnicas tomadas") pro racional completo. Resumo:
- Achado permanente (não por visita) — reforça a intenção de "descoberta rara", evita virar um
  jeito de farmar moeda saindo/voltando do planeta.
- 15 moedas flat, sem XP — mesma filosofia do pote de Marte: moeda pra cosmético, XP reservado pra
  responder pergunta de verdade.
- Aviso leve (texto transitório), não um modal/toast — é um bônus de fundo, não deveria interromper
  o jogo como uma missão faria.
- Todos os 6 `landingUp` sendo `(0,1,0)` IDÊNTICOS descartou a ideia inicial de derivar a direção
  do baú rotacionando `landingUp` (como o pote de Marte fez com `MARS_UFO_DIR`) — `Cross(landingUp,
  Up())` degenera pra vetor zero quando os dois são paralelos, exatamente o caso aqui. Resolvido
  reaproveitando a parametrização de ângulo de ouro já medida e comprovada segura no lab-127.

## Achado real na verificação ao vivo (lição nova de ferramenta, não bug de produto)

**`window.__debugTeleport` não respeita `currentWorldCenter` fora do planeta principal.** Descoberto
tentando testar a coleta do baú em Vênus: depois de uma viagem de foguete real (confirmada — o
label "💰 Baú de tesouro!" apareceu visivelmente na cena, prova de que a construção funcionou),
qualquer chamada de `__debugTeleport(x, y, z)` pra uma posição EXATA na superfície de Vênus
(calculada corretamente, `radius=7` do centro `(0,58,0)`, conferido matematicamente) fazia o avatar
"reaparecer" imediatamente na Terra (`avatarCollider.position.y ≈ 13`, batendo com `PLANET_RADIUS`
do planeta principal) assim que um quadro era renderizado — reproduzido de forma consistente em
múltiplas tentativas, mesmo variando ligeiramente a posição alvo. Teoria mais provável: `
__debugTeleport` é uma ferramenta de QA que só reposiciona o mesh do avatar diretamente, sem
atualizar `currentWorldCenter`/`currentGroundBaseFn` (o sistema de gravidade radial por planeta,
lab-110) — a física de "para onde é embaixo" continua calculada a partir do centro do planeta
PRINCIPAL, então uma posição fisicamente válida em outro planeta ainda "cai" de volta pra Terra.
Isso NUNCA tinha aparecido antes nesta sessão porque toda navegação anterior em planetas-destino
(labs 127-130) usava só voo de foguete real (`dispatchEvent` de teclado + quadros forçados) pra
CHEGAR lá, sem depois usar `__debugTeleport` pra se mover DENTRO do planeta — este laboratório foi
o primeiro a tentar isso.

**Isso é uma limitação da PRÓPRIA TÉCNICA de teste, não um bug no produto** — a construção do baú
(visualmente confirmada correta) e a lógica de domínio (8 testes cobrindo a concessão exata) não
dependem desse mecanismo. Registrado aqui como lição reutilizável: **verificação ao vivo em
qualquer planeta que não seja o principal deve usar voo de foguete + CAMINHADA REAL (teclado
sintético + quadros forçados) para navegar dentro do planeta, nunca `__debugTeleport` uma vez lá**.
Um "achado de ferramenta" no mesmo espírito de `keysDown['e']` travado (lab-112) e desincronia
avatar/físico (lab-128), agora registrado pra não repetir a mesma tentativa cega no futuro.

## Pendências / dívidas conhecidas

- **A coleta do baú por proximidade real não foi confirmada ao vivo** — só a construção/renderização
  (visual, correta) foi. Confiança na lógica de coleta vem de: (1) 4 testes unitários novos cobrindo
  exatamente a condição de concessão/idempotência/isolamento por planeta; (2) o gatilho de
  proximidade reaproveita literalmente o mesmo padrão (`Vector3.Distance` + `setEnabled(false)`)
  já comprovado ao vivo pro pote de moedas de Marte (lab-128) e pelas escolinhas de planeta
  (lab-127/129); (3) sem erro de console em nenhum momento da tentativa de verificação.
- **Se o usuário reportar que um baú não é coletado ao se aproximar de verdade**, o primeiro lugar a
  checar é `TREASURE_CHEST_TRIGGER_DISTANCE` (1.4, igual ao pote de Marte) contra a distância real
  de encontro — o `phi=165°` (perto do polo sul) é uma região do planeta pouco visitada, então vale
  confirmar que o baú está numa posição alcançável a pé (não atrás de alguma rocha/decoração que
  bloqueie o caminho), já que a colocação não foi verificada visualmente de perto (só à distância,
  via a legenda flutuante visível na câmera).

## Funcionalidades planejadas que NÃO foram concluídas

Todas as funcionalidades de código planejadas em `FEATURES.md` foram concluídas. Só a verificação
ao vivo da coleta (não da construção) ficou parcial, pelo motivo explicado acima.

## O que o próximo laboratório deve desenvolver

Do backlog maior discutido em chat, ainda não formalizado em labs: bônus por limpar um planeta
inteiro (distinto deste — bônus na hora, não um baú separado), combo de respostas certas seguidas,
persistência de "Minha Casa" pra assinante (arquitetural, G6 do doc de escala, precisa de conversa
de produto/privacidade antes), mini-desafios temáticos por planeta, corrida/parkour temático,
segundo "chefe" em Júpiter, vitrine de troféus mais visual, emotes/danças, evento sazonal,
mascote/pet colecionável, cartão-postal colecionável, boletim/certificado do explorador, clima
ativo por planeta, "distress call" de NPC perdido. Sem prioridade única — perguntar ao usuário
antes de escolher o próximo.

## Estado do repositório ao final

- Branch: `worktree-abstract-wobbling-owl`.
- `npm run test` (em `app/`): 64/64 passando (60→64, 4 testes novos em `progression.test.ts`).
- `npm run build` (em `app/`): typecheck + build de produção sem erros.
- Verificação ao vivo: PARCIAL — construção/renderização do baú em Vênus confirmada visualmente
  (label correta na cena, depois de viagem de foguete real), coleta por proximidade não confirmada
  ao vivo pela limitação de ferramenta descrita acima; sem erro de console em nenhum momento.
- Como verificar de novo (evitando a armadilha desta sessão): `cd app && npm run dev`, viajar de
  foguete até qualquer um dos 6 planetas, **andar de verdade** (teclado sintético + quadros
  forçados, NUNCA `__debugTeleport` depois de já estar no planeta) até achar o baú (perto do "polo
  sul" do planeta, lado oposto à plataforma de pouso), confirmar mensagem + moeda creditada, sair e
  voltar (ou recarregar a página) e confirmar que o baú já achado não aparece mais.
