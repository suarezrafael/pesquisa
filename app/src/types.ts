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
}
