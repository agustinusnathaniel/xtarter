import { defineConfig } from 'vite-plus'

export default defineConfig({
	staged: {
		'*.{js,ts,cjs,mjs,d.cts,d.mts,jsx,tsx,json,jsonc}':
			'biome check --write --no-errors-on-unmatched',
	},
	fmt: {
		ignorePatterns: ['**/*'],
		singleQuote: true,
	},
	lint: { options: { typeAware: true, typeCheck: true } },
	resolve: {
		tsconfigPaths: true,
	},
})
