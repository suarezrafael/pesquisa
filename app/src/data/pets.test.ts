import { describe, expect, it } from 'vitest'
import { PET_CATALOG, PET_SPECIES_SCALE_MULTIPLIER, type PetSpecies } from './pets'

describe('catalogo de pets', () => {
  it('mantem ids unicos para persistencia local', () => {
    const ids = PET_CATALOG.map((pet) => pet.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('oferece pelo menos duas opcoes de cada especie', () => {
    const species: PetSpecies[] = ['gato', 'cachorro', 'coelho', 'tartaruga']
    for (const item of species) {
      expect(PET_CATALOG.filter((pet) => pet.species === item).length).toBeGreaterThanOrEqual(2)
    }
  })

  it('mantem todos os pets conquistaveis por moedas e com escala visual configurada', () => {
    for (const pet of PET_CATALOG) {
      expect(pet.cost).toBeGreaterThanOrEqual(0)
      expect(PET_SPECIES_SCALE_MULTIPLIER[pet.species]).toBeGreaterThan(1)
    }
  })
})
