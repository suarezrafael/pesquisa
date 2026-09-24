import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { FamilyVisualTag } from './FamilyVisualTag'

describe('FamilyVisualTag', () => {
  it('describes the cosmetic without a purchase action or price', () => {
    const markup = renderToStaticMarkup(<FamilyVisualTag />)
    expect(markup).toContain('Visual da família')
    expect(markup).not.toMatch(/<button|<a\s|R\$|Assine|Comprar/)
  })
})
