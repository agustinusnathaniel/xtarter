/**
 * Shared citty argument definitions. Commands spread the groups they honor so
 * flag names, aliases, and defaults live in one place.
 */

export const cwdArg = {
  description: 'Target directory (default: current working directory)',
  type: 'string',
} as const;

export const jsonArg = {
  description: 'Output machine-readable JSON',
  type: 'boolean',
} as const;

export const quietArg = {
  description: 'Suppress interactive prompts and verbose output',
  type: 'boolean',
} as const;

export const formatArg = {
  description: 'Output format (terminal|json)',
  type: 'string',
} as const;

export const includeConflictsArg = {
  description: 'Include conflicting tasks when applying (default: false)',
  type: 'boolean',
} as const;

export const timingArg = {
  description: 'Show detailed per-task timing breakdown',
  type: 'boolean',
} as const;

export const yesArg = {
  alias: 'y',
  description: 'Skip all confirmations, apply all',
  type: 'boolean',
} as const;

/** Flags every command accepts. */
export const commonArgs = {
  cwd: cwdArg,
  json: jsonArg,
  quiet: quietArg,
} as const;

/** Commands that render through the terminal/JSON display pipeline. */
export const formatArgs = {
  format: formatArg,
} as const;

/** Apply-run flags for the init/sync run pipeline. */
export const runArgs = {
  dryRun: {
    description: 'Preview changes without applying',
    type: 'boolean',
  },
  includeConflicts: includeConflictsArg,
  only: {
    description: 'Apply only a specific task',
    type: 'string',
  },
  skip: {
    description: 'Exclude a specific task (comma-separated)',
    type: 'string',
  },
  timing: timingArg,
  yes: yesArg,
} as const;

export const sharedRunArgs = {
  ...commonArgs,
  ...formatArgs,
  ...runArgs,
} as const;
