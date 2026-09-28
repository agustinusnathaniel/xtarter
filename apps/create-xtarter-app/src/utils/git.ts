import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { exec } from 'tinyexec';

import { runStep } from '@/utils/run-step';

export interface GitInitOptions {
  message?: string;
  projectPath: string;
}

async function runGit(args: Array<string>, cwd: string) {
  const result = await exec('git', args, {
    nodeOptions: { cwd, stdio: 'pipe' },
  });
  if (result.exitCode !== 0) {
    throw new Error(result.stderr.trim() || `git ${args.join(' ')} failed`);
  }
  return result;
}

export async function initializeGit({
  projectPath,
  message = 'Initial commit from create-xtarter-app',
}: GitInitOptions): Promise<boolean> {
  const gitDir = join(projectPath, '.git');
  const hadExistingGitDir = existsSync(gitDir);

  const initialized = await runStep(
    'git',
    ['Initializing git repository...', 'Git initialization failed', 'warn'],
    async (logger) => {
      try {
        await runGit(['init'], projectPath);
        await runGit(['add', '.'], projectPath);
        await runGit(['commit', '-m', message], projectPath);
      } catch (error) {
        // A failed commit must not leave a half-initialized repo (unborn
        // HEAD, no commits) inside a freshly scaffolded project. A `.git` that
        // predates this call belongs to the user, so it is never removed.
        if (!hadExistingGitDir) {
          // Cleanup is best-effort: a failed removal must not mask the git
          // failure the user needs to see.
          await rm(gitDir, { force: true, recursive: true }).catch(() => {});
        }
        throw error;
      }

      logger.success('Git repository initialized');
      return true;
    }
  );
  return initialized ?? false;
}

export async function isGitInstalled(): Promise<boolean> {
  try {
    const result = await exec('git', ['--version'], {
      nodeOptions: {
        stdio: 'pipe',
      },
    });
    return result.exitCode === 0;
  } catch {
    return false;
  }
}
