/**
 * Pipe-delimited alias groups for task search. Every term expands to the other
 * terms in its group; a term listed in two groups gets the union of both, and
 * aliases are never expanded again (no cross-group transitivity). Terms are
 * lowercase to match tokenizer output.
 */
export const TASK_ALIAS_GROUPS: ReadonlyArray<string> = [
  'typescript|ts|type|types|typing|typecheck|type checking|type safety|type-safe|strict',
  'dependency|dependencies|deps|update|updates|upgrade|renovate|dependabot|maintenance|auto update|dependency updates|package manager',
  'git hooks|git-hooks|hooks|hook|husky|pre-commit|pre-push|commit-msg|prepare-commit-msg|lint-staged|staged files',
  'commit|commitlint|commitizen|czg|conventional commits|commit message|lint commit|husky',
  'editor|ide|vscode|code|visual studio code|cursor|vscodium|settings|extensions',
  'codegen|code generator|plop|scaffold|generator|generate|template|templates',
  'release|version|versioning|changelog|publish|versionrc|changeset',
  'ci|continuous integration|github actions|github-actions|pipeline|workflow|build|cd|deploy|schedule|release workflow',
  'lint|linting|linter|format|formatting|formatter|style|static analysis',
  'turbo|turborepo|monorepo|build cache|task orchestration',
  'workspace|pnpm-workspace|multi-package|monorepo|package manager',
  'scripts|npm scripts|package scripts|engines|devEngines|node version|runtime',
  'agent|agents|ai|claude|opencode|llm',
  'skills|skill|install',
  'test|tests|testing|vitest|jest|mocha|tdd',
  'quality|knip|dead code|unused|quality gate|analysis',
  'vite|bundler|plugin|rollup|build|visualizer|bundle analysis',
  'tsconfig|paths|aliases|import paths|module resolution',
];

const aliasIndex = new Map<string, Array<string>>();
for (const group of TASK_ALIAS_GROUPS) {
  const terms = group.split('|');
  for (const term of terms) {
    const siblings = aliasIndex.get(term) ?? [];
    for (const sibling of terms) {
      if (sibling !== term && !siblings.includes(sibling)) {
        siblings.push(sibling);
      }
    }
    aliasIndex.set(term, siblings);
  }
}

/** Every alias of `token` (excluding itself); empty when the token is unknown. */
export function expandAliases(token: string): Array<string> {
  return aliasIndex.get(token.toLowerCase()) ?? [];
}
