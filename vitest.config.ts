import { defineConfig, mergeConfig } from 'vite-plus'
import viteConfig from './vite.config'

export default mergeConfig(
	viteConfig,
	defineConfig({
		test: {
			globals: true,
			retry: 1,
			testTimeout: 15_000,
		},
	}),
)
