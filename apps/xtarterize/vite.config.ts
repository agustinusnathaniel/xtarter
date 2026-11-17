import { defineConfig } from 'vite-plus';

export default defineConfig({
  pack: {
    deps: {
      alwaysBundle: [
        '@xtarter/config',
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
      inlinedDependencies: false,
    },
    minify: true,
    target: 'node20',
    treeshake: true,
  },
});
