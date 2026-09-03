export type QuestType = 'logica' | 'matematica' | 'leitura'

export interface QuestChoice {
  id: string
  label: string
}

export interface Quest {
  id: string
  type: QuestType
  title: string
  passage?: string
  prompt: string
  choices: QuestChoice[]
  correctChoiceId: string
  xpReward: number
  coinReward: number
}

export interface Profile {
  name: string
  avatarEmoji: string
  createdAt: string
  // Chapéu equipado (lab-24) — eixo de customização independente da criatura (`avatarEmoji`):
  // null = nenhum chapéu, não amarrado a qual criatura está em uso.
  equippedHatId: string | null
  // Cores/cabelo do boneco (lab-73, pedido do usuário: "escolher na lojinha a cor da camiseta e
  // da mochila... a cor da calça, a cor do sapato, e o formato do cabelo") — cada eixo é
  // independente dos outros e da criatura escolhida, mesmo espírito do chapéu. `null` = usa o
  // visual padrão atual (não a primeira opção do catálogo — são a mesma cor, mas `null` cobre
  // perfis salvos antes deste laboratório sem precisar de migração).
  equippedShirtColorId: string | null
  equippedPantsColorId: string | null
  equippedShoeColorId: string | null
  equippedBackpackColorId: string | null
  equippedHairShapeId: string | null
  // Óculos (lab-92) — eixo de customização independente, mesmo espírito do chapéu. null = nenhum
  // óculos equipado.
  equippedGlassesId: string | null
}

export interface Progress {
  completedQuestIds: string[]
  xp: number
  coins: number
  badges: string[]
  unlockedAvatarIds: string[]
  unlockedHatIds: string[]
  unlockedShirtColorIds: string[]
  unlockedPantsColorIds: string[]
  unlockedShoeColorIds: string[]
  unlockedBackpackColorIds: string[]
  unlockedHairShapeIds: string[]
  unlockedGlassesIds: string[]
  // Mobília de Minha Casa (lab-106) — sem eixo de "equipar" (não é uma peça de roupa do boneco):
  // cada id presente aqui significa "o jogador possui este item", mostrado como lista no
  // `MyHousePanel`.
  unlockedFurnitureIds: string[]
  // Escolinhas de astronomia dos planetas do Sistema Solar (lab-115) — chave = id do planeta
  // (`data/planetQuests.ts`). Deliberadamente separado de `completedQuestIds`: aquele array conta
  // contra `quests.length` (30, fixo) pra emblemas ("Metade do Caminho"/"Mestre das Missões") —
  // misturar essas perguntas ali inflaria a contagem e concederia emblema cedo demais. Mesmo
  // espírito de isolamento do Quiz Surpresa (`surpriseQuizzes.ts`), mas com XP de verdade (o
  // pedido do usuário é "ampliar a elevação dos níveis", diferente do quiz surpresa que só dá
  // moeda de propósito).
  completedPlanetQuestIds: string[]
  // Baús de tesouro escondidos (lab-131, pedido do usuário: "baús de tesouro escondidos") — um id
  // aqui significa "este baú já foi achado, pra sempre" (diferente das moedas comuns escondidas,
  // que resetam a cada sessão, e do pote de moedas de Marte, que reseta a cada visita): é uma
  // descoberta rara e permanente, não um bônus repetível por visita.
  foundTreasureChestIds: string[]
  // Combo de respostas certas seguidas (lab-132, pedido do usuário: "combo de respostas certas
  // seguidas") — cresce a cada resposta certa GENUÍNA de missão real (principal ou de planeta;
  // nunca quiz surpresa, que não é idempotente por id e seria fácil de farmar), zera ao fechar
  // uma missão ainda não respondida (`applyStreakReset`, `state/progression.ts`). Concede moeda
  // bônus em marcos (`streakBonusFor`).
  currentStreak: number
  // Posição/ângulo escolhidos pelo jogador pra cada peça de mobília dentro de Minha Casa (lab-136,
  // pedido do usuário: "tem que ter opção... de escolher em que posição da casa deve ficar a
  // peça... o ângulo e posição onde fica o objeto"). Chave = "chave da cópia"
  // (`${itemId}#${índice}`, ex. `cama#0`, `cama#1` pra duas camas — lab-138, "tem que dar pra
  // colocar mais de um item na casa do mesmo"), não mais o id puro do item; ausência de uma chave
  // significa "esta cópia ainda na posição padrão" (layout em anel ao redor do balcão, ver
  // `World3D.tsx`).
  housePlacements: Record<string, { x: number; z: number; rotY: number }>
  // Recompensa de login diário (lab-138, item do backlog de engajamento discutido em chat) —
  // dias CONSECUTIVOS que o jogo foi aberto, comparando `lastPlayedAt` (lab-91, `state/
  // storage.ts`) da sessão anterior contra hoje. Zera pra 1 (não pra 0) num hiato de 2+ dias —
  // sempre existe "um dia" ao abrir o jogo, mesmo depois de ficar muito tempo sem jogar.
  loginStreak: number
}
