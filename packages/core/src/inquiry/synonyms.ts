export const SYNONYM_MAP: Record<string, Array<string>> = {
  agent: ['ai', 'claude', 'opencode', 'copilot', 'llm', 'assistant'],
  biome: ['linter', 'formatter', 'lint', 'format', 'all-in-one'],
  ci: [
    'continuous-integration',
    'github-actions',
    'workflow',
    'pipeline',
    'build',
    'automation',
  ],
  codegen: ['plop', 'scaffold', 'generator', 'generate', 'template'],
  commitlint: ['commit-message', 'conventional-commits', 'lint-commit'],
  deps: ['dependencies', 'renovate', 'dependabot', 'updates', 'upgrade'],
  editor: ['ide', 'vscode', 'cursor', 'vscodium', 'code'],
  format: ['formatter', 'style', 'pretty', 'prettify', 'fmt'],
  git: ['commit', 'commitlint', 'husky', 'hook', 'pre-commit', 'czg'],
  husky: ['git-hooks', 'pre-commit', 'commit-hooks'],
  knip: ['dead-code', 'unused-exports', 'tree-shaking'],
  lint: [
    'linter',
    'static-analysis',
    'analyze',
    'check',
    'quality',
    'style',
    'fmt',
  ],
  lintstaged: ['lint-staged', 'pre-commit', 'staged-files'],
  monorepo: ['turbo', 'workspace', 'multi-package', 'pnpm-workspace'],
  nx: ['monorepo', 'build-system', 'dependency-graph'],
  oxfmt: ['formatter', 'format', 'style', 'rust'],
  oxlint: ['linter', 'lint', 'static-analysis', 'rust'],
  plop: ['codegen', 'scaffold', 'generator'],
  quality: ['knip', 'lint-staged', 'pre-commit', 'hook', 'dead-code', 'unused'],
  release: [
    'publish',
    'version',
    'changelog',
    'semver',
    'deploy',
    'cut-release',
  ],
  renovate: ['dependabot', 'dependency-updates', 'auto-update'],
  strict: ['strict-mode', 'type-safe', 'typecheck', 'type-checking'],
  turbo: ['monorepo', 'workspace', 'build-orchestrator'],
  typescript: [
    'ts',
    'type',
    'types',
    'type-safe',
    'typecheck',
    'strict',
    'typing',
  ],
  vite: ['bundler', 'build-tool', 'rollup', 'plugin'],
  vscode: ['code', 'visual-studio-code', 'cursor', 'vscodium'],
};

export function expandQuery(tokens: Array<string>): Array<string> {
  const expanded = [...tokens];
  const allTokens = tokens.map((t) => t.toLowerCase());

  for (const token of allTokens) {
    const synonyms = SYNONYM_MAP[token];
    if (synonyms) {
      for (const syn of synonyms) {
        if (!expanded.includes(syn)) {
          expanded.push(syn);
        }
      }
    }
    for (const [key, values] of Object.entries(SYNONYM_MAP)) {
      if (values.includes(token)) {
        if (!expanded.includes(key)) {
          expanded.push(key);
        }
        // Transitive expansion: also add this key's synonym values
        const keySynonyms = SYNONYM_MAP[key];
        if (keySynonyms) {
          for (const syn of keySynonyms) {
            if (!expanded.includes(syn)) {
              expanded.push(syn);
            }
          }
        }
      }
    }
  }

  return expanded;
}
