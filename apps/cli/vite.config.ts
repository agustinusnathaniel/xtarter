import { defineConfig } from 'vite-plus'

export default defineConfig({
	pack: {
		entry: ['src/index.ts'],
		target: 'node18',
		sourcemap: true,
		banner: '#!/usr/bin/env node',
		minify: true,
		treeshake: true,
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
