import { defineConfig } from 'vite-plus';

export default defineConfig({
  pack: {
    clean: true,
    deps: {
      // tsdown <0.23 compatibility: resolve external dependency subpaths.
      // Remove to preserve subpath imports as written (the new default).
      // https://tsdown.dev/options/dependencies#deps-resolvedepsubpath
      resolveDepSubpath: true,
    },
    dts: true,
    entry: ['src/cli.ts', 'src/index.ts'],
    exports: {
      bin: './src/cli.ts',
      inlinedDependencies: false,
    },
    format: ['esm'],
    minify: true,
    platform: 'node',
    target: 'node20',
    treeshake: true,
  },
  resolve: { tsconfigPaths: true },
  test: {
    // Vitest v4 compatibility: preserve mock call history.
    // Remove after tests no longer rely on calls from setup or earlier tests.
    // https://viteplus.dev/guide/vitest-v5#remove-unneeded-compatibility-settings
    // https://vitest.dev/guide/migration/#clearmocks-is-enabled-by-default
    clearMocks: false,
    environment: 'node',
    exclude: ['**/node_modules/**', '**/dist/**'],
    include: ['**/*.test.ts'],
    name: 'create-xtarter-app',
    root: './src',
  },
});
