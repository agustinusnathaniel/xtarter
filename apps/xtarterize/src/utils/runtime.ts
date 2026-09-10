import { isCI } from '@xtarterize/core';

import type { DisplayFormat } from '@/ui/diff-display.js';

import { resolveCwd } from './cwd.js';

export interface RuntimeArgs {
  _?: Array<string | number>;
  cwd?: string;
  format?: string;
  json?: boolean | string | number | Array<string>;
  quiet?: boolean | string | number | Array<string>;
}

export interface RuntimeContext {
  /** True when the process runs in a CI environment. */
  ci: boolean;
  cwd: string;
  format: DisplayFormat;
  json: boolean;
  quiet: boolean;
}

function resolveFormat(
  formatArg: string | undefined,
  jsonFlag: boolean
): DisplayFormat {
  if (formatArg === 'json' || jsonFlag) {
    return 'json';
  }
  return 'terminal';
}

/**
 * Resolve the runtime context shared by every command. `quiet` is true when
 * the user passes `--quiet`, when JSON output is requested (`--json` or
 * `--format json`), or in CI.
 */
export function resolveRuntimeContext(args: RuntimeArgs): RuntimeContext {
  const json = args.json === true;
  const ci = isCI();
  const format = resolveFormat(args.format, json);
  const quiet = args.quiet === true || ci || json || format === 'json';
  return { ci, cwd: resolveCwd(args), format, json, quiet };
}
