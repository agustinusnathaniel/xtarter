import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

/**
 * Run `fn` against a unique temporary directory and remove it in `finally`.
 *
 * Behavior protected: every caller gets its own isolated directory, and a
 * failing assertion can no longer leak the directory because cleanup always
 * runs. The branch suites repeated `mkdtemp` plus `try/finally rm` blocks that
 * had no shared owner; no existing helper manages directory lifetimes.
 */
export async function withTempDir<Result>(
  prefix: string,
  fn: (dir: string) => Promise<Result>
): Promise<Result> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  try {
    return await fn(dir);
  } finally {
    await fs.rm(dir, { force: true, recursive: true });
  }
}
