import type {
	FileDiff,
	ProjectProfile,
	Task,
	TaskScope,
	TaskSearchMeta,
	TaskStatus,
} from '@xtarterize/core'
import { findConfigFile, readFile, TaskError } from '@xtarterize/core'
import { injectVitePlugin } from '@xtarterize/patchers'
import { ensureTaskDependency, wrapTask } from './ops.js'

// ─── VitePluginTask ───

export interface VitePluginTaskOptions {
	id: string
	label: string
	group: string
	scope?: TaskScope
	searchMeta?: TaskSearchMeta
	applicable: (profile: ProjectProfile) => boolean
	depName: string
	importName: string
	importStyle: 'default' | 'named'
	pluginCall: string
	checkString: string
}

const VITE_CONFIG_EXTENSIONS = ['.ts', '.js', '.mts', '.mjs', '.cjs', '.cts']

function getVitePluginTaskDeps(options: VitePluginTaskOptions) {
	return [{ depName: options.depName, dev: true }]
}

async function checkVitePluginTask(
	cwd: string,
	options: VitePluginTaskOptions,
): Promise<TaskStatus> {
	const configPath = await findConfigFile(
		cwd,
		'vite.config',
		VITE_CONFIG_EXTENSIONS,
	)
	if (!configPath) return 'new'
	const content = await readFile(configPath)
	if (content.includes(options.checkString)) return 'skip'
	return 'new'
}

function buildViteImportSpecifier(options: VitePluginTaskOptions): string {
	return options.importStyle === 'named'
		? `{ ${options.importName} }`
		: options.importName
}

async function dryRunVitePluginTask(
	cwd: string,
	options: VitePluginTaskOptions,
): Promise<FileDiff[]> {
	const configPath = await findConfigFile(
		cwd,
		'vite.config',
		VITE_CONFIG_EXTENSIONS,
	)
	if (!configPath) return []
	const importSpecifier = buildViteImportSpecifier(options)
	const result = await injectVitePlugin({
		configPath,
		importPath: options.depName,
		importName: importSpecifier,
		pluginExpression: options.pluginCall,
		dryRun: true,
	})
	if (!result.success) return []
	return [
		{
			filepath: 'vite.config',
			before: result.beforeCode ?? null,
			after: result.generatedCode ?? result.beforeCode ?? '',
		},
	]
}

async function applyVitePluginTask(
	cwd: string,
	options: VitePluginTaskOptions,
): Promise<void> {
	await ensureTaskDependency({
		cwd,
		depName: options.depName,
		installDev: true,
	})
	const configPath = await findConfigFile(
		cwd,
		'vite.config',
		VITE_CONFIG_EXTENSIONS,
	)
	if (!configPath) {
		throw new TaskError({
			taskId: options.id,
			message: `No vite.config file found for ${options.id}`,
		})
	}
	const importSpecifier = buildViteImportSpecifier(options)
	const result = await injectVitePlugin({
		configPath,
		importPath: options.depName,
		importName: importSpecifier,
		pluginExpression: options.pluginCall,
	})
	if (!result.success) {
		throw new TaskError({
			taskId: options.id,
			message: result.fallback ?? `Failed to inject ${options.depName}`,
		})
	}
}

export function createVitePluginTask(options: VitePluginTaskOptions): Task {
	return {
		id: options.id,
		label: options.label,
		group: options.group,
		searchMeta: options.searchMeta,
		scope: options.scope,
		applicable: options.applicable,
		async getDeps(_cwd, _profile) {
			return getVitePluginTaskDeps(options)
		},
		async check(cwd, _profile): Promise<TaskStatus> {
			return wrapTask(options.id, 'createVitePluginTask.check', () =>
				checkVitePluginTask(cwd, options),
			)
		},
		async dryRun(cwd, _profile): Promise<FileDiff[]> {
			return wrapTask(options.id, 'createVitePluginTask.dryRun', () =>
				dryRunVitePluginTask(cwd, options),
			)
		},
		async apply(cwd, _profile): Promise<void> {
			return wrapTask(options.id, 'createVitePluginTask.apply', () =>
				applyVitePluginTask(cwd, options),
			)
		},
	}
}
