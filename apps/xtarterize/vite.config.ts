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
      // tsdown <0.23 compatibility: resolve external dependency subpaths.
      // Remove to preserve subpath imports as written (the new default).
      // https://tsdown.dev/options/dependencies#deps-resolvedepsubpath
      resolveDepSubpath: true,
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
