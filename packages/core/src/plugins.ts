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

/**
 * @internal Plugin configuration.
 *
 * The plugin system loads external task packages from npm.
 * Plugin specifiers are validated against npm package name patterns
 * (local paths and URLs are rejected — see `validatePluginSpecifier`).
 *
 * @remarks This API is stable but has not been tested in production.
 * Plugin specifiers are validated to prevent arbitrary code execution
 * via dynamic import of attacker-controlled paths.
 */
export interface PluginConfig {
	/** npm package names exporting tasks */
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
			let config: PluginConfig | null = null
			try {
				config = JSON.parse(content) as PluginConfig
			} catch {
				logWarn('Failed to parse .xtarterizerc')
				return { plugins: [] }
			}
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
		// Not a package.json or no such key - that's fine
	}

	return null
}

/**
 * Validate that a plugin specifier is a safe npm package name.
 *
 * Only bare npm package names are allowed (optionally scoped).
 * Local paths (`./`, `../`), absolute paths (`/`, drive letters),
 * URLs (`https://`, `file://`), and other non-package specifiers
 * are rejected.
 *
 * This prevents arbitrary code execution via dynamic import
 * of attacker-controlled paths (e.g. from a PR-supplied config).
 *
 * Valid: `@xtarterize/some-plugin`, `eslint-plugin-foo`, `@scope/pkg`
 * Invalid: `../../malicious.js`, `/etc/passwd`, `https://evil.com/pwn.js`
 */
function validatePluginSpecifier(specifier: string): boolean {
	// npm package name pattern:
	//   - optional scope: @scope/ (alphanumeric, hyphens, dots, underscores)
	//   - required name: same charset, at least one char
	//   - no leading dots, no leading hyphens, no consecutive dots
	return /^(?:@[a-z0-9][a-z0-9-._]*\/)?[a-z0-9][a-z0-9-._]*$/.test(specifier)
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
		if (!validatePluginSpecifier(specifier)) {
			logWarn(
				`Invalid xtarterize plugin specifier "${specifier}" — must be an npm package name. Skipping.`,
			)
			continue
		}

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
