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
    testTimeout: 15_000,
  },
});
