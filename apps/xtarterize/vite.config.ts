import { defineConfig } from 'vite-plus';

export default defineConfig({
  pack: {
    deps: {
      alwaysBundle: [
        '@xtarterize/core',
        '@xtarterize/tasks',
        '@xtarterize/patchers',
        'nypm',
      ],
      neverBundle: ['jsonc-parser'],
    },
    entry: ['src/index.ts'],
    exports: {
      bin: './src/index.ts',
    },
    minify: true,
    sourcemap: true,
    target: 'node20',
    treeshake: true,
  },
});
