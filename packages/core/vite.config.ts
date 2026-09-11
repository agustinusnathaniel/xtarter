import { defineConfig } from 'vite-plus';

export default defineConfig({
  pack: {
    entry: ['src/index.ts', 'src/plain.ts'],
    target: 'node20',
  },
});
