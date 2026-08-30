export default `import { describe, expect, it } from 'vitest'
import { {{camelCase name}} } from './{{kebabCase name}}'

describe('{{camelCase name}}', () => {
  it('returns null by default', () => {
    expect({{camelCase name}}()).toBeNull()
  })
})
`;
