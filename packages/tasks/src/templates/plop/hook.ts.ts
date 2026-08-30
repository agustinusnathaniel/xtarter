export default `import { useMemo } from 'react'

export function use{{pascalCase name}}() {
  return useMemo(() => ({ ready: true }), [])
}
`;
