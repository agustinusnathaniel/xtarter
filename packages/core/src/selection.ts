import { Cause, Effect } from 'effect';

import { isRecord } from '@/detect/package-manager.js';
import { findConfigFile, readJson } from '@/utils/fs.js';
import { logWarn } from '@/utils/logger.js';

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
function readRawXtarterizeConfig(cwd: string): Effect.Effect<RawConfigResult> {
  return Effect.gen(function* () {
    // 1. Standalone config file
    for (const basename of CONFIG_BASENAMES) {
      const path = yield* Effect.promise(() =>
        findConfigFile(cwd, basename, [''])
      );
      if (!path) {
        continue;
      }
      return yield* Effect.promise(() =>
        readJson(path).then(
          (parsed): RawConfigResult =>
            parsed && typeof parsed === 'object'
              ? { config: parsed, status: 'found' }
              : { status: 'parse-error' },
          (): RawConfigResult => {
            logWarn('Failed to parse .xtarterizerc');
            return { status: 'parse-error' };
          }
        )
      );
    }

    // 2. package.json under "xtarterize" key
    const config = yield* Effect.promise(() =>
      readJson<{ xtarterize?: Record<string, unknown> }>(
        `${cwd}/package.json`
      ).then(
        (pkg) => pkg?.xtarterize,
        () => undefined
      )
    );
    if (isRecord(config)) {
      return { config, status: 'found' };
    }

    return { status: 'missing' };
  });
}

/**
 * Per-process memo for the raw config read, keyed by cwd, so selection reads in
 * the same session consume one parse instead of one per call.
 *
 * Each entry is an `Effect.cached` memo; the map only addresses the memo per
 * cwd, preserving the pre-Effect behavior of sharing one read across every
 * Effect run in the process.
 */
const rawConfigCache = new Map<string, Effect.Effect<RawConfigResult>>();

function loadRawXtarterizeConfig(cwd: string): Effect.Effect<RawConfigResult> {
  return Effect.suspend(() => {
    const cached = rawConfigCache.get(cwd);
    if (cached) {
      return cached;
    }
    return Effect.flatMap(
      Effect.cached(readRawXtarterizeConfig(cwd)),
      (memoized) => {
        rawConfigCache.set(cwd, memoized);
        return memoized;
      }
    );
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
  const empty = (): TaskSelectionConfig => ({ only: [], skip: [] });
  return Effect.catchCause(
    Effect.map(loadRawXtarterizeConfig(cwd), (result) => {
      if (result.status !== 'found') {
        return empty();
      }
      return {
        only: sanitizeStringArray(result.config.only),
        skip: sanitizeStringArray(result.config.skip),
      };
    }),
    (cause) =>
      Cause.hasInterruptsOnly(cause)
        ? Effect.interrupt
        : Effect.succeed(empty())
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
