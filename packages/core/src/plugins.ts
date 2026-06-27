import type { Task } from '@/_base.js'
import { findConfigFile, readFile, readJson } from '@/utils/fs.js'
import { logWarn } from '@/utils/logger.js'

/**
 * Configuration file basenames searched in order.
 * The first match wins.
 */
const CONFIG_BASENAMES = [
	'.xtarterizerc',
	'.xtarterizerc.json',
	'.xtarterizerc.json5',
]

export interface PluginConfig {
	/** npm package names (or relative paths) exporting tasks */
	plugins?: string[]
}

export interface Plugin {
	name: string
	tasks: Task[]
}

/**
 * Load plugin configuration from the project directory.
 *
 * Searches for:
 *   1. `.xtarterizerc` / `.xtarterizerc.json` / `.xtarterizerc.json5`
 *   2. `"xtarterize"` key in `package.json`
 *
 * Returns `null` when no config is found.
 */
export async function loadPluginConfig(
	cwd: string,
): Promise<PluginConfig | null> {
	// 1. Standalone config file
	for (const basename of CONFIG_BASENAMES) {
		const path = await findConfigFile(cwd, basename, [''])
		if (path) {
			const content = await readFile(path)
			const config = JSON.parse(content) as PluginConfig
			if (
				!config ||
				typeof config !== 'object' ||
				!Array.isArray(config.plugins)
			) {
				return { plugins: [] }
			}
			return config
		}
	}

	// 2. package.json under "xtarterize" key
	try {
		const pkg = await readJson<{ xtarterize?: PluginConfig }>(
			`${cwd}/package.json`,
		)
		if (pkg?.xtarterize?.plugins?.length) {
			return pkg.xtarterize
		}
	} catch {
		// Not a package.json or no such key — that's fine
	}

	return null
}

/**
 * Given a plugin config, dynamically import each plugin package and
 * collect the tasks they export.
 *
 * A plugin module can export:
 *   - a default export that is a single `Task`
 *   - a named export `tasks` that is `Task[]`
 *   - a named export `task` that is a single `Task`
 */
export async function loadPluginTasks(config: PluginConfig): Promise<Task[]> {
	if (!config.plugins?.length) return []

	const allTasks: Task[] = []
	const seen = new Set<string>()

	for (const specifier of config.plugins) {
		try {
			const mod = await import(/* @vite-ignore */ specifier)

			// Collect tasks from the module
			const moduleTasks: Task[] = []

			// Default export: single Task
			if (
				mod.default &&
				typeof mod.default === 'object' &&
				'id' in mod.default
			) {
				moduleTasks.push(mod.default as Task)
			}

			// Named export "tasks": Task[]
			if (Array.isArray(mod.tasks)) {
				moduleTasks.push(...(mod.tasks as Task[]))
			}

			// Named export "task": single Task
			if (mod.task && typeof mod.task === 'object' && 'id' in mod.task) {
				moduleTasks.push(mod.task as Task)
			}

			// Deduplicate by id within this load
			for (const t of moduleTasks) {
				if (!seen.has(t.id)) {
					seen.add(t.id)
					allTasks.push(t)
				}
			}
		} catch (cause) {
			logWarn(
				`Failed to load xtarterize plugin "${specifier}": ${cause instanceof Error ? cause.message : String(cause)}`,
			)
		}
	}

	return allTasks
}

/**
 * Convenience: load config + tasks in one call.
 * Returns an empty array when no plugins are configured or loading fails.
 */
export async function resolveExternalTasks(cwd: string): Promise<Task[]> {
	const config = await loadPluginConfig(cwd)
	if (!config) return []
	return loadPluginTasks(config)
}
