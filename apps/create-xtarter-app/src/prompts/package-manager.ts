import { select } from '@clack/prompts'
import { abortIfCancelled } from '@xtarterize/core'
import type { PackageManager } from '@/types'

const packageManagerOptions = [
	{ value: 'pnpm', label: 'pnpm (recommended)', hint: 'Fast, disk-efficient' },
	{ value: 'npm', label: 'npm', hint: 'Default Node.js' },
	{ value: 'bun', label: 'bun', hint: 'Ultra-fast' },
	{ value: 'yarn', label: 'yarn', hint: 'Classic choice' },
]

export async function promptPackageManager(
	selectedPm?: PackageManager,
): Promise<PackageManager> {
	if (selectedPm) {
		const validPms = packageManagerOptions.map((o) => o.value)
		if (!validPms.includes(selectedPm)) {
			throw new Error(
				`Unknown package manager "${selectedPm}". Valid options: ${validPms.join(', ')}`,
			)
		}
		return selectedPm
	}

	const result = await select({
		message: 'Which package manager would you like to use?',
		options: packageManagerOptions,
		initialValue: 'pnpm',
	})

	abortIfCancelled(result)

	return result as PackageManager
}
