import { isCI } from '@xtarterize/core';

import type { DisplayFormat } from '@/ui/diff-display.js';

export interface RuntimeArgs {
  _?: Array<string | number>;
  cwd?: string;
  format?: string;
  json?: boolean | string | number | Array<string>;
  quiet?: boolean | string | number | Array<string>;
}

export interface RuntimeContext {
  cwd: string;
  format: DisplayFormat;
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
  const format = resolveFormat(args.format, args.json === true);
  const quiet = args.quiet === true || isCI() || format === 'json';
  const cwd = typeof args.cwd === 'string' ? args.cwd : process.cwd();
  return { cwd, format, quiet };
}
