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
  const initialized = await runStep(
    'git',
    ['Initializing git repository...', 'Git initialization failed', 'warn'],
    async (logger) => {
      await runGit(['init'], projectPath);
      await runGit(['add', '.'], projectPath);
      await runGit(['commit', '-m', message], projectPath);

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
