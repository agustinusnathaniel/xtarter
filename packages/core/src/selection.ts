import { Cause, Effect } from 'effect';

import { isRecord } from '@/detect/package-manager.js';
import { findConfigFile, readJson } from '@/utils/fs.js';
import { logWarn } from '@/utils/logger.js';
import { readPackageJsonOrNull } from '@/utils/pkg.js';

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
 * Read the xtarterize configuration object from the first config file found,
 * else the `"xtarterize"` key in `package.json`. Returns null when there is no
 * config or it cannot be parsed.
 */
function readXtarterizeConfig(
  cwd: string
): Effect.Effect<Record<string, unknown> | null> {
  return Effect.gen(function* () {
    for (const basename of CONFIG_BASENAMES) {
      const path = yield* Effect.promise(() =>
        findConfigFile(cwd, basename, [''])
      );
      if (!path) {
        continue;
      }
      return yield* Effect.promise(() =>
        readJson(path).then(
          (parsed) => (isRecord(parsed) ? parsed : null),
          () => {
            logWarn('Failed to parse .xtarterizerc');
            return null;
          }
        )
      );
    }
    const pkg = yield* Effect.promise(() => readPackageJsonOrNull(cwd));
    return isRecord(pkg?.xtarterize) ? pkg.xtarterize : null;
  });
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
export function loadSelectionConfig(
  cwd: string
): Effect.Effect<TaskSelectionConfig> {
  return Effect.catchCause(
    Effect.map(readXtarterizeConfig(cwd), (config) => ({
      only: sanitizeStringArray(config?.only),
      skip: sanitizeStringArray(config?.skip),
    })),
    (cause) =>
      Cause.hasInterruptsOnly(cause)
        ? Effect.interrupt
        : Effect.succeed({ only: [], skip: [] })
  );
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
