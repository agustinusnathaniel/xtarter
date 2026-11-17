import { defineConfig } from 'vite-plus';
import { configDefaults } from 'vite-plus/test/config';

export default defineConfig({
  fmt: {
    ignorePatterns: ['**/*'],
    singleQuote: true,
  },
  lint: { options: { typeAware: true, typeCheck: true } },
  resolve: {
    tsconfigPaths: true,
  },
  staged: {
    '*.{js,ts,cjs,mjs,d.cts,d.mts,jsx,tsx,json,jsonc}':
      'biome check --write --no-errors-on-unmatched',
  },
  test: {
    // Agent worktrees live under .claude/worktrees/ inside the repo; their
    // unbuilt copies of the suite must not run as part of this checkout's.
    exclude: [...configDefaults.exclude, '.claude/**'],
    // `vp test --changed` and scripts/test-changed.mts run only the test files that import a
    // changed file. A changed file tests read without importing runs them all instead.
    forceRerunTriggers: [
      ...configDefaults.forceRerunTriggers,
      // Fixture projects are read from disk, whatever their file type.
      '**/test/fixtures/**',
      // Templates, the lockfile, CI config: anything that is not a JS, TS or Markdown module.
      '**/!(*.@(ts|tsx|mts|cts|js|jsx|mjs|cjs|md))',
      // Picks the tests a pull request runs, and no test imports it.
      '**/scripts/test-changed.mts',
    ],
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          include: ['test/{core,patchers,tasks,ui}/**/*.test.ts'],
          // No module mocks or leftover global state, so workers can be reused.
          isolate: false,
          name: 'shared',
        },
      },
      {
        extends: true,
        test: {
          // Needs the docs app's dependencies, which only the Docs CI job installs.
          include: ['test/docs/**/*.test.ts'],
          isolate: false,
          name: 'docs',
        },
      },
      {
        extends: true,
        test: {
          // These spawn CLIs, mock modules, or stub process.env.
          include: ['test/integration/**/*.test.ts', 'apps/*/src/**/*.test.ts'],
          name: 'isolated',
        },
      },
    ],
    testTimeout: 15_000,
  },
});
