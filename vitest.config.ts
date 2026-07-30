import { defineConfig, mergeConfig } from 'vite-plus'
import viteConfig from './vite.config'

export default mergeConfig(
	viteConfig,
	defineConfig({
		test: {
			globals: true,
			testTimeout: 15_000,
			exclude: ['**/node_modules/**', '**/dist/**'],
		},
	}),
)
