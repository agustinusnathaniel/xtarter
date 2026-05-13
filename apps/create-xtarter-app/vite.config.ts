import { defineConfig } from 'vite-plus'

export default defineConfig({
	pack: {
		entry: ['src/cli.ts', 'src/index.ts'],
		target: 'node20',
		platform: 'node',
		format: ['esm'],
		clean: true,
		sourcemap: false,
		dts: { sourcemap: true },
		minify: true,
		treeshake: true,
		exports: {
			bin: './src/cli.ts',
		},
	},
	test: {
		name: 'create-xtarter-app',
		root: './src',
		environment: 'node',
		include: ['**/*.test.ts'],
		exclude: ['**/node_modules/**', '**/dist/**'],
	},
	resolve: { tsconfigPaths: true },
})
