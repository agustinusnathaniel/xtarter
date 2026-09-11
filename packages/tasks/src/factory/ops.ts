import type { FileDiff } from '@xtarterize/core';
import {
  ensureDir,
  readPackageJson,
  resolvePath,
  writeFile,
} from '@xtarterize/core';

/**
 * Check if required dependencies are missing from package.json.
 * Returns 'patch' if any dep is missing, null if all present or no deps specified.
 */
export async function checkMissingDeps(
  cwd: string,
  depNames: Array<string>
): Promise<'patch' | null> {
  if (depNames.length === 0) {
    return null;
  }
  const pkg = await readPackageJson(cwd);
  for (const dep of depNames) {
    if (!(pkg?.devDependencies?.[dep] || pkg?.dependencies?.[dep])) {
      return 'patch';
    }
  }
  return null;
}

export function isExecutableFile(filepath: string): boolean {
  return filepath.startsWith('.husky/') || filepath.startsWith('.vite-hooks/');
}

export async function writeTaskDiffs(
  cwd: string,
  diffs: Array<FileDiff>
): Promise<void> {
  for (const diff of diffs) {
    const fullPath = resolvePath(cwd, diff.filepath);
    await ensureDir(resolvePath(fullPath, '..'));
    await writeFile(
      fullPath,
      diff.after,
      isExecutableFile(diff.filepath) ? 0o755 : undefined
    );
  }
}
