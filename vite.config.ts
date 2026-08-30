import { defineConfig } from 'vite-plus';

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
    globals: true,
    testTimeout: 15_000,
  },
});
