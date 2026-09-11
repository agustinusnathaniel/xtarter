import type { Task } from '@/_base.js';
import { findConfigFile, readJson } from '@/utils/fs.js';
import { logWarn } from '@/utils/logger.js';

/** Maximum time (ms) to wait for a plugin module to load. */
const PLUGIN_LOAD_TIMEOUT_MS = 10_000;

/**
 * Configuration file basenames searched in order.
 * The first match wins.
 */
const CONFIG_BASENAMES = [
  '.xtarterizerc',
  '.xtarterizerc.json',
  '.xtarterizerc.json5',
];

/**
 * @internal Plugin configuration.
 *
 * The plugin system loads external task packages from npm.
 * Plugin specifiers are validated against npm package name patterns
 * (local paths and URLs are rejected - see `validatePluginSpecifier`).
 *
 * @remarks This API is stable but has not been tested in production.
 * Plugin specifiers are validated to prevent arbitrary code execution
 * via dynamic import of attacker-controlled paths.
 */
export interface PluginConfig {
  /** npm package names exporting tasks */
  plugins?: Array<string>;
}

/**
 * Result of reading the raw xtarterize config. Separates "no config" from
 * "config exists but is invalid" so each caller can map it to its own
 * fallback behavior.
 */
type RawConfigResult =
  | { config: Record<string, unknown>; status: 'found' }
  | { status: 'missing' }
  | { status: 'parse-error' };

/**
 * Read the xtarterize configuration object.
 *
 * Searches for:
 *   1. `.xtarterizerc` / `.xtarterizerc.json` / `.xtarterizerc.json5`
 *   2. `"xtarterize"` key in `package.json`
 *
 * Reports whether a config was found, missing, or present but unparsable.
 */
async function readRawXtarterizeConfig(cwd: string): Promise<RawConfigResult> {
  // 1. Standalone config file
  for (const basename of CONFIG_BASENAMES) {
    const path = await findConfigFile(cwd, basename, ['']);
    if (path) {
      let config: unknown;
      try {
        config = await readJson(path);
      } catch {
        logWarn('Failed to parse .xtarterizerc');
        return { status: 'parse-error' };
      }
      if (config && typeof config === 'object') {
        return { config: config as Record<string, unknown>, status: 'found' };
      }
      return { status: 'parse-error' };
    }
  }

  // 2. package.json under "xtarterize" key
  try {
    const pkg = await readJson<{ xtarterize?: Record<string, unknown> }>(
      `${cwd}/package.json`
    );
    const config = pkg?.xtarterize;
    if (config && typeof config === 'object' && !Array.isArray(config)) {
      return { config, status: 'found' };
    }
  } catch {
    // Not a package.json or no such key - that's fine
  }

  return { status: 'missing' };
}

/**
 * Per-process memo for the raw config read. Selection and plugin loading in
 * the same session consume one parse instead of two.
 */
const rawConfigCache = new Map<string, Promise<RawConfigResult>>();

function loadRawXtarterizeConfig(cwd: string): Promise<RawConfigResult> {
  const cached = rawConfigCache.get(cwd);
  if (cached) {
    return cached;
  }
  const pending = readRawXtarterizeConfig(cwd);
  rawConfigCache.set(cwd, pending);
  return pending;
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
  cwd: string
): Promise<PluginConfig | null> {
  const result = await loadRawXtarterizeConfig(cwd);
  if (result.status === 'missing') {
    return null;
  }
  if (result.status !== 'found' || !Array.isArray(result.config.plugins)) {
    return { plugins: [] };
  }
  return result.config as PluginConfig;
}

export interface TaskSelectionConfig {
  only: Array<string>;
  skip: Array<string>;
}

function sanitizeStringArray(value: unknown): Array<string> {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((s): s is string => typeof s === 'string')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Load persisted task selection from `.xtarterizerc` (or the
 * `"xtarterize"` key in package.json). Returns empty arrays when
 * no config exists or the fields are absent/invalid.
 *
 * Semantics:
 * - Entries are trimmed; empty strings and non-string entries are dropped.
 * - An EMPTY or ABSENT `only` array means "no restriction" (never "apply nothing").
 * - If a task ID appears in both skip and only, skip wins (task excluded).
 */
export async function loadSelectionConfig(
  cwd: string
): Promise<TaskSelectionConfig> {
  try {
    const result = await loadRawXtarterizeConfig(cwd);
    if (result.status !== 'found') {
      return { only: [], skip: [] };
    }
    return {
      only: sanitizeStringArray(result.config.only),
      skip: sanitizeStringArray(result.config.skip),
    };
  } catch {
    return { only: [], skip: [] };
  }
}

interface TaskSelectionInput {
  /** CLI `--only` flag value (comma-separated), if provided */
  cliOnly?: string;
  /** CLI `--skip` flag value (comma-separated), if provided */
  cliSkip?: string;
  /** Persisted `only` entries from the selection config */
  configOnly?: Array<string>;
  /** Persisted `skip` entries from the selection config */
  configSkip?: Array<string>;
}

/**
 * Apply persisted + CLI task selection to a list of tasks.
 *
 * Precedence:
 * 1. CLI `--only` overrides config `only` when non-empty after parsing;
 *    an empty/absent CLI value falls back to config `only` (which itself,
 *    when empty, means "no restriction").
 * 2. CLI `--skip` extends (unions with) config `skip`.
 * 3. Tasks in the effective only-set are kept first, then every task whose
 *    id is in the effective skip-set is removed - so skip wins over only.
 *
 * Pure helper: no I/O, no status filtering.
 */
export function applyTaskSelection<T extends { id: string }>(
  tasks: Array<T>,
  input: TaskSelectionInput
): Array<T> {
  const parseCliIds = (value?: string): Set<string> =>
    new Set(
      (value ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    );

  const cliOnlyIds = parseCliIds(input.cliOnly);
  const only =
    cliOnlyIds.size > 0
      ? cliOnlyIds
      : new Set(sanitizeStringArray(input.configOnly));

  const skip = new Set([
    ...parseCliIds(input.cliSkip),
    ...sanitizeStringArray(input.configSkip),
  ]);

  let selected = tasks;
  if (only.size > 0) {
    selected = selected.filter((t) => only.has(t.id));
  }
  return selected.filter((t) => !skip.has(t.id));
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
  return /^(?:@[a-z0-9~][a-z0-9-._~]*\/)?[a-z0-9~][a-z0-9-._~]*$/.test(
    specifier
  );
}

/** Import a plugin module, failing if it does not resolve within the timeout. */
async function importWithTimeout(
  specifier: string
): Promise<Record<string, unknown>> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      import(/* @vite-ignore */ specifier),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(
                `Plugin "${specifier}" failed to load within ${PLUGIN_LOAD_TIMEOUT_MS / 1000}s`
              )
            ),
          PLUGIN_LOAD_TIMEOUT_MS
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
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
export async function loadPluginTasks(
  config: PluginConfig
): Promise<Array<Task>> {
  if (!config.plugins?.length) {
    return [];
  }

  const allTasks: Array<Task> = [];
  const seen = new Set<string>();

  for (const specifier of config.plugins) {
    if (!validatePluginSpecifier(specifier)) {
      logWarn(
        `Invalid xtarterize plugin specifier "${specifier}" - must be an npm package name. Skipping.`
      );
      continue;
    }

    try {
      const mod = await importWithTimeout(specifier);

      // Collect tasks from the module
      const moduleTasks: Array<Task> = [];

      // Default export: single Task
      if (
        mod.default &&
        typeof mod.default === 'object' &&
        'id' in mod.default
      ) {
        moduleTasks.push(mod.default as Task);
      }

      // Named export "tasks": Task[]
      if (Array.isArray(mod.tasks)) {
        moduleTasks.push(...(mod.tasks as Array<Task>));
      }

      // Named export "task": single Task
      if (mod.task && typeof mod.task === 'object' && 'id' in mod.task) {
        moduleTasks.push(mod.task as Task);
      }

      // Deduplicate by id within this load
      for (const t of moduleTasks) {
        if (!seen.has(t.id)) {
          seen.add(t.id);
          allTasks.push(t);
        }
      }
    } catch (cause) {
      logWarn(
        `Failed to load xtarterize plugin "${specifier}": ${cause instanceof Error ? cause.message : String(cause)}`
      );
    }
  }

  return allTasks;
}

/**
 * Convenience: load config + tasks in one call.
 * Returns an empty array when no plugins are configured or loading fails.
 */
export async function resolveExternalTasks(cwd: string): Promise<Array<Task>> {
  const config = await loadPluginConfig(cwd);
  return config ? loadPluginTasks(config) : [];
}
