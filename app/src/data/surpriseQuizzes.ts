import type { Quest } from '../types'

// Quizzes-bônus do Prédio dos Enigmas (lab-46) — cada andar libera um. Deliberadamente
// separados de `quests.ts`: não contam pra `completedQuestIds`/badges/lista de missões, só dão
// uma moeda-bônus na hora (ver `handleSurpriseQuizCorrect` em `App.tsx`), então não precisam de
// `xpReward` nem aparecem na `QuestListOverlay`.
export const surpriseQuizzes: Quest[] = [
  {
    id: 'surprise-01',
    type: 'logica',
    title: 'Quiz Surpresa — 1º andar',
    prompt: 'Se hoje é terça-feira, que dia será depois de amanhã?',
    choices: [
      { id: 'a', label: 'Quarta-feira' },
      { id: 'b', label: 'Quinta-feira' },
      { id: 'c', label: 'Sexta-feira' },
    ],
    correctChoiceId: 'b',
    xpReward: 0,
    coinReward: 8,
  },
  {
    id: 'surprise-02',
    type: 'matematica',
    title: 'Quiz Surpresa — 2º andar',
    prompt: 'Metade de 18 mais metade de 10 é igual a quanto?',
    choices: [
      { id: 'a', label: '13' },
      { id: 'b', label: '14' },
      { id: 'c', label: '15' },
    ],
    correctChoiceId: 'b',
    xpReward: 0,
    coinReward: 8,
  },
  {
    id: 'surprise-03',
    type: 'leitura',
    title: 'Quiz Surpresa — 3º andar',
    passage:
      'Uma formiga carregava uma folha bem maior que ela. Mesmo cansada, não parou até chegar ao formigueiro.',
    prompt: 'O que a formiga carregava?',
    choices: [
      { id: 'a', label: 'Um grão de açúcar' },
      { id: 'b', label: 'Uma folha' },
      { id: 'c', label: 'Um gravetinho' },
    ],
    correctChoiceId: 'b',
    xpReward: 0,
    coinReward: 8,
  },
  {
    id: 'surprise-04',
    type: 'logica',
    title: 'Quiz Surpresa — 4º andar',
    prompt: 'Qual número vem a seguir na sequência? 1, 2, 4, 8, ?',
    choices: [
      { id: 'a', label: '10' },
      { id: 'b', label: '12' },
      { id: 'c', label: '16' },
    ],
    correctChoiceId: 'c',
    xpReward: 0,
    coinReward: 10,
  },
]
