import type { PreflightResult } from '@xtarterize/core';
import { ensureXtarterizeGitignore, pc, runPreflight } from '@xtarterize/core';

import { resolveCwd } from './cwd.js';

export function handlePreflightFailure(
  preflight: PreflightResult,
  json: boolean
): void {
  if (preflight.valid) {
    return;
  }

  if (json) {
    console.log(
      JSON.stringify({
        errors: preflight.errors,
        ok: false,
      })
    );
    process.exit(1);
  }

  console.log('');
  console.log(`${pc.red('✖')} Preflight checks failed`);
  console.log('');
  for (const error of preflight.errors) {
    console.log(`${pc.red(`  ✗ ${error.message}`)}`);
    if (error.hint) {
      console.log(`  ${pc.dim(error.hint)}`);
    }
  }
  console.log('');
  process.exit(1);
}

export async function resolveCwdWithPreflight(
  args: { cwd?: string; _?: Array<string | number> },
  json = false
): Promise<string> {
  const cwd = resolveCwd(args);
  await ensureXtarterizeGitignore(cwd);
  const preflight = await runPreflight(cwd);
  handlePreflightFailure(preflight, json);
  return cwd;
}
