import checker from 'vite-plugin-checker';
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite-plus'

export default defineConfig({
				plugins: [react(), checker({ typescript: true })],
				resolve: {
								alias: {
												'@': '/src',
								},
				},
})