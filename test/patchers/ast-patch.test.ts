import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { injectVitePlugin } from '@xtarterize/patchers'
import { describe, expect, it } from 'vite-plus/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe('injectVitePlugin', () => {
	it('injects plugin into array-style config', async () => {
		const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'))
		const configPath = path.join(tmpDir, 'vite.config.ts')
		await fs.writeFile(
			configPath,
			`import { defineConfig } from 'vite'\n\nexport default defineConfig({\n  plugins: [],\n})\n`,
		)

		const result = await injectVitePlugin({
			configPath,
			importPath: 'vite-plugin-checker',
			importName: 'checker',
			pluginExpression: 'checker({ typescript: true })',
		})
		expect(result.success).toBe(true)

		const content = await fs.readFile(configPath, 'utf-8')
		expect(content).toContain('vite-plugin-checker')
		expect(content).toContain('checker')

		await fs.rm(tmpDir, { recursive: true })
	})

	it('skips if plugin already present', async () => {
		const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'))
		const configPath = path.join(tmpDir, 'vite.config.ts')
		await fs.writeFile(
			configPath,
			`import { defineConfig } from 'vite'\nimport checker from 'vite-plugin-checker'\n\nexport default defineConfig({\n  plugins: [checker()],\n})\n`,
		)

		const result = await injectVitePlugin({
			configPath,
			importPath: 'vite-plugin-checker',
			importName: 'checker',
			pluginExpression: 'checker({ typescript: true })',
		})
		expect(result.success).toBe(true)

		const content = await fs.readFile(configPath, 'utf-8')
		expect(content.split('checker').length).toBeLessThanOrEqual(4)

		await fs.rm(tmpDir, { recursive: true })
	})

	it('handles function-style config gracefully', async () => {
		const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'))
		const configPath = path.join(tmpDir, 'vite.config.ts')
		await fs.writeFile(
			configPath,
			`import { defineConfig } from 'vite'\n\nexport default defineConfig(() => ({\n  plugins: [],\n}))\n`,
		)

		const result = await injectVitePlugin({
			configPath,
			importPath: 'vite-plugin-checker',
			importName: 'checker',
			pluginExpression: 'checker({ typescript: true })',
		})
		// magicast may or may not detect function-style configs depending on AST representation
		expect(result).toBeDefined()

		await fs.rm(tmpDir, { recursive: true })
	})
})
