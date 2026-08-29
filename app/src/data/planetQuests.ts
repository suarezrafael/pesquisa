import type { Quest } from '../types'

// Escolinhas de astronomia dos planetas do Sistema Solar (lab-115, pedido do usuário: "crie
// escolinhas com perguntas tbm nos planetas novos"). Uma pergunta por planeta, tema astronomia
// real (não lógica/matemática/leitura genérica, ao contrário de `quests.ts`) — combina com o
// contexto de "você acabou de pousar lá". Deliberadamente separadas de `quests.ts`: não contam
// pra `completedQuestIds`/badges do planeta principal (ver `applyPlanetQuestCompletion` em
// `progression.ts`), mas DÃO XP de verdade (ao contrário de `surpriseQuizzes.ts`, que dá só
// moeda) — é o próprio pedido do usuário: "ampliar a elevação dos níveis". Recompensa escalona
// com a distância real do planeta ao Sol, mesma lógica do `requiredLevel` em
// `DESTINATION_PLANETS` (`world3d/World3D.tsx`).
export const planetQuests: Record<string, Quest> = {
  mercurio: {
    id: 'planet-mercurio',
    type: 'logica',
    title: 'Escolinha de Mercúrio',
    prompt:
      'Mercúrio não tem atmosfera pra guardar calor — por isso o dia é escaldante e a noite é geladíssima. Qual é o planeta mais próximo do Sol?',
    choices: [
      { id: 'a', label: 'Mercúrio' },
      { id: 'b', label: 'Vênus' },
      { id: 'c', label: 'Terra' },
    ],
    correctChoiceId: 'a',
    xpReward: 15,
    coinReward: 8,
  },
  venus: {
    id: 'planet-venus',
    type: 'logica',
    title: 'Escolinha de Vênus',
    prompt:
      'Vênus é o planeta MAIS QUENTE do Sistema Solar, mesmo sem ser o mais perto do Sol. Por que isso acontece?',
    choices: [
      { id: 'a', label: 'Uma atmosfera espessa prende o calor (efeito estufa)' },
      { id: 'b', label: 'Ele é feito de fogo por dentro' },
      { id: 'c', label: 'Ele está mais perto das estrelas' },
    ],
    correctChoiceId: 'a',
    xpReward: 18,
    coinReward: 9,
  },
  jupiter: {
    id: 'planet-jupiter',
    type: 'logica',
    title: 'Escolinha de Júpiter',
    prompt: 'Júpiter é o maior planeta do Sistema Solar. O que é a Grande Mancha Vermelha, na verdade?',
    choices: [
      { id: 'a', label: 'Uma tempestade gigante' },
      { id: 'b', label: 'Um vulcão' },
      { id: 'c', label: 'Um oceano de lava' },
    ],
    correctChoiceId: 'a',
    xpReward: 25,
    coinReward: 12,
  },
  saturno: {
    id: 'planet-saturno',
    type: 'logica',
    title: 'Escolinha de Saturno',
    prompt: 'Saturno é famoso pelos seus anéis enormes. Os anéis são feitos principalmente de quê?',
    choices: [
      { id: 'a', label: 'Gás colorido' },
      { id: 'b', label: 'Pedaços de gelo e rocha' },
      { id: 'c', label: 'Nuvens congeladas' },
    ],
    correctChoiceId: 'b',
    xpReward: 30,
    coinReward: 15,
  },
  urano: {
    id: 'planet-urano',
    type: 'logica',
    title: 'Escolinha de Urano',
    prompt:
      'Urano gira "deitado de lado", bem diferente dos outros planetas. O que dá a cor azul-esverdeada pálida dele?',
    choices: [
      { id: 'a', label: 'Gás metano na atmosfera' },
      { id: 'b', label: 'Água do oceano' },
      { id: 'c', label: 'Poeira espacial' },
    ],
    correctChoiceId: 'a',
    xpReward: 35,
    coinReward: 18,
  },
  netuno: {
    id: 'planet-netuno',
    type: 'logica',
    title: 'Escolinha de Netuno',
    prompt:
      'Netuno é o planeta mais distante do Sol e tem os ventos mais fortes de todo o Sistema Solar. Qual é a cor de Netuno?',
    choices: [
      { id: 'a', label: 'Azul profundo' },
      { id: 'b', label: 'Vermelho' },
      { id: 'c', label: 'Amarelo' },
    ],
    correctChoiceId: 'a',
    xpReward: 40,
    coinReward: 20,
  },
}
