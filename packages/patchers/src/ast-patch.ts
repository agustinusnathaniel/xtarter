import { writeFile } from 'node:fs/promises'
import { generateCode, loadFile, parseExpression } from 'magicast'
import { basename } from 'pathe'

const CONFIG_FILE_NAMES: Record<string, string> = {
	'vite.config.ts': 'vite.config',
	'vite.config.js': 'vite.config',
	'vite.config.mts': 'vite.config',
	'vite.config.cjs': 'vite.config',
}

function getConfigLabel(configPath: string): string {
	const basenameName = basename(configPath)
	return CONFIG_FILE_NAMES[basenameName] || basenameName
}

export interface InjectVitePluginOptions {
	configPath: string
	importPath: string
	importName: string
	pluginExpression: string
}

export async function injectVitePlugin(
	options: InjectVitePluginOptions,
): Promise<{ success: boolean; fallback?: string }> {
	const { configPath, importPath, importName, pluginExpression } = options
	const configLabel = getConfigLabel(configPath)

	try {
		const mod = await loadFile(configPath)
		const code = mod.$code

		if (code.includes(importPath) || code.includes(importName)) {
			return { success: true }
		}

		const defaultExport = mod.exports.default
		if (!defaultExport) {
			return {
				success: false,
				fallback: `No default export found in ${configLabel}`,
			}
		}

		let plugins: unknown[]

		if (Array.isArray(defaultExport.plugins)) {
			plugins = defaultExport.plugins as unknown[]
		} else if (typeof defaultExport === 'function') {
			return {
				success: false,
				fallback: 'Function-style vite config not supported by AST patching',
			}
		} else if (typeof defaultExport === 'object' && defaultExport !== null) {
			const configObj = defaultExport.$args?.[0] ?? defaultExport
			if (Array.isArray(configObj.plugins)) {
				plugins = configObj.plugins
			} else {
				configObj.plugins = []
				plugins = configObj.plugins
			}
		} else {
			return {
				success: false,
				fallback: `Unsupported ${configLabel} structure. Manually add the plugin.`,
			}
		}

		mod.imports.$prepend({
			from: importPath,
			imported: importName === '{ visualizer }' ? 'visualizer' : 'default',
			local: importName === '{ visualizer }' ? 'visualizer' : importName,
		})

		plugins.push(parseExpression(pluginExpression))

		const { code: generatedCode } = generateCode(mod)
		await writeFile(configPath, generatedCode)

		return { success: true }
	} catch (error) {
		return {
			success: false,
			fallback: `AST patching failed: ${error instanceof Error ? error.message : 'Unknown error'}. Add plugin manually to ${configLabel}.`,
		}
	}
}
