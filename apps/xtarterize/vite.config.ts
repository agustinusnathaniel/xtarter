import { defineConfig } from 'vite-plus'

export default defineConfig({
	pack: {
		entry: ['src/index.ts'],
		target: 'node20',
		sourcemap: true,
		minify: true,
		treeshake: true,
		exports: {
			bin: './src/index.ts',
		},
		deps: {
			alwaysBundle: [
				'@xtarterize/core',
				'@xtarterize/tasks',
				'@xtarterize/patchers',
				'nypm',
			],
			neverBundle: ['jsonc-parser'],
		},
	},
})
