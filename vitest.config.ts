import { defineConfig, mergeConfig } from 'vite-plus'
import viteConfig from './vite.config'

export default mergeConfig(
	viteConfig,
	defineConfig({
		test: {
			globals: true,
		},
	}),
)
