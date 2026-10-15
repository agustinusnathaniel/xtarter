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
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          include: ['test/{core,patchers,tasks,docs,ui}/**/*.test.ts'],
          // These suites mock no modules and leave no global state behind, so
          // workers are reused and shared imports evaluate once per worker.
          isolate: false,
          name: 'shared',
        },
      },
      {
        extends: true,
        test: {
          // Integration suites spawn the CLIs; the create-xtarter-app suites
          // mock modules and stub process.env.
          include: ['test/integration/**/*.test.ts', 'apps/*/src/**/*.test.ts'],
          name: 'isolated',
        },
      },
    ],
    testTimeout: 15_000,
  },
});
