import { select } from '@clack/prompts';
import { abortIfCancelled } from '@xtarterize/core/plain';

import { PACKAGE_MANAGERS, type PackageManager } from '@/types';

const PACKAGE_MANAGER_META: Record<
  PackageManager,
  { hint: string; label: string }
> = {
  bun: { hint: 'Ultra-fast', label: 'bun' },
  npm: { hint: 'Bundled with Node.js', label: 'npm' },
  pnpm: { hint: 'Fast, disk-efficient', label: 'pnpm (recommended)' },
  yarn: { hint: 'Classic choice', label: 'yarn' },
};

const packageManagerOptions = PACKAGE_MANAGERS.map((value) => ({
  ...PACKAGE_MANAGER_META[value],
  value,
}));

export async function promptPackageManager(
  selectedPm?: PackageManager
): Promise<PackageManager> {
  if (selectedPm) {
    if (!(PACKAGE_MANAGERS as ReadonlyArray<string>).includes(selectedPm)) {
      throw new Error(
        `Unknown package manager "${selectedPm}". Valid options: ${PACKAGE_MANAGERS.join(', ')}`
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
