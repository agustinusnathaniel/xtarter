import { exec } from 'tinyexec';

import type { PackageManager } from '@/types';
import { runStep } from '@/utils/run-step';

const VALID_PACKAGE_MANAGERS: ReadonlySet<string> = new Set([
  'pnpm',
  'npm',
  'bun',
  'yarn',
]);

export interface InstallOptions {
  packageManager: PackageManager;
  projectPath: string;
}

export async function installDependencies({
  packageManager,
  projectPath,
}: InstallOptions): Promise<void> {
  if (!VALID_PACKAGE_MANAGERS.has(packageManager)) {
    throw new Error(
      `Invalid package manager: "${packageManager}". Must be one of: ${[...VALID_PACKAGE_MANAGERS].join(', ')}`
    );
  }

  await runStep(
    'install',
    [
      `Installing dependencies with ${packageManager}...`,
      'Failed to install dependencies',
    ],
    async (logger) => {
      const result = await exec(packageManager, ['install'], {
        nodeOptions: {
          cwd: projectPath,
          stdio: 'inherit',
        },
      });

      if (result.exitCode !== 0) {
        throw new Error(
          `${packageManager} install failed with exit code ${result.exitCode}`
        );
      }

      logger.success('Dependencies installed successfully');
    }
  );
}
