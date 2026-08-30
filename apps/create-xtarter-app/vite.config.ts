import { defineConfig } from 'vite-plus';

export default defineConfig({
  pack: {
    clean: true,
    dts: { sourcemap: true },
    entry: ['src/cli.ts', 'src/index.ts'],
    exports: {
      bin: './src/cli.ts',
    },
    format: ['esm'],
    minify: true,
    platform: 'node',
    sourcemap: false,
    target: 'node20',
    treeshake: true,
  },
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    exclude: ['**/node_modules/**', '**/dist/**'],
    include: ['**/*.test.ts'],
    name: 'create-xtarter-app',
    root: './src',
  },
});
