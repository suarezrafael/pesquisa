import { describe, expect, it } from 'vitest'
import { planetQuests } from '../data/planetQuests'
import { shuffleQuestChoices } from './questChoiceOrder'

const mercuryQuest = planetQuests.mercurio[0]

function correctPosition(choices: ReturnType<typeof shuffleQuestChoices>): number {
  return choices.findIndex((choice) => choice.id === mercuryQuest.correctChoiceId)
}

describe('quest choice order', () => {
  it('can place the correct planet answer in any of the three positions', () => {
    let calls = 0
    const middle = shuffleQuestChoices(mercuryQuest.choices, () => calls++ === 0 ? 0.5 : 0)
    const last = shuffleQuestChoices(mercuryQuest.choices, () => 0)
    const first = shuffleQuestChoices(mercuryQuest.choices, () => 0.99)
    expect([correctPosition(first), correctPosition(middle), correctPosition(last)]).toEqual([0, 1, 2])
  })

  it('preserves choice identities without mutating the catalog', () => {
    const original = mercuryQuest.choices.map((choice) => choice.id)
    const ordered = shuffleQuestChoices(mercuryQuest.choices, () => 0)
    expect(ordered).not.toBe(mercuryQuest.choices)
    expect(ordered.map((choice) => choice.id).sort()).toEqual([...original].sort())
    expect(mercuryQuest.choices.map((choice) => choice.id)).toEqual(original)
    expect(ordered.find((choice) => choice.id === mercuryQuest.correctChoiceId)?.label)
      .toBe(mercuryQuest.choices.find((choice) => choice.id === mercuryQuest.correctChoiceId)?.label)
  })
})
