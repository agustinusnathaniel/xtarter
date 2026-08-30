import { select } from '@clack/prompts';
import { abortIfCancelled } from '@xtarterize/core';

import type { PackageManager } from '@/types';

const packageManagerOptions = [
  { hint: 'Fast, disk-efficient', label: 'pnpm (recommended)', value: 'pnpm' },
  { hint: 'Default Node.js', label: 'npm', value: 'npm' },
  { hint: 'Ultra-fast', label: 'bun', value: 'bun' },
  { hint: 'Classic choice', label: 'yarn', value: 'yarn' },
];

export async function promptPackageManager(
  selectedPm?: PackageManager
): Promise<PackageManager> {
  if (selectedPm) {
    const validPms = packageManagerOptions.map((o) => o.value);
    if (!validPms.includes(selectedPm)) {
      throw new Error(
        `Unknown package manager "${selectedPm}". Valid options: ${validPms.join(', ')}`
      );
    }
    return selectedPm;
  }

  const result = await select({
    initialValue: 'pnpm',
    message: 'Which package manager would you like to use?',
    options: packageManagerOptions,
  });

  abortIfCancelled(result);

  return result as PackageManager;
}
