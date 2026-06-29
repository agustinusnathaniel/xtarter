import type { ProjectProfile } from '@xtarterize/core'
import { readPackageJson } from '@xtarterize/core'
import { createJsonMergeTask } from '@/factory'

interface TurboTaskConfig {
	dependsOn?: string[]
	outputs?: string[]
	cache?: boolean
	persistent?: boolean
	inputs?: string[]
}

interface TurboJsonTemplate {
	$schema: string
	tasks: Record<string, TurboTaskConfig>
}

function getBuildOutputs(profile: ProjectProfile): string[] {
	if (profile.bundler === 'nextjs') {
		return ['.next/**', '!.next/cache/**', 'public/**']
	}
	return ['dist/**']
}

function buildTurboJson(
	scripts: string[],
	profile: ProjectProfile,
): TurboJsonTemplate {
	const tasks: Record<string, TurboTaskConfig> = {}

	const turboTasks: Record<string, TurboTaskConfig> = {
		build: { dependsOn: ['^build'], outputs: getBuildOutputs(profile) },
		biome: { dependsOn: ['^biome'] },
		typecheck: { dependsOn: ['^typecheck'] },
		dev: { cache: false, persistent: true },
		test: { dependsOn: ['^build'] },
	}

	for (const [taskName, config] of Object.entries(turboTasks)) {
		if (scripts.includes(taskName)) {
			tasks[taskName] = config
		}
	}

	return {
		$schema: 'https://turbo.build/schema.json',
		tasks,
	}
}

export const turboTask = createJsonMergeTask({
	id: 'monorepo/turbo',
	label: 'Turbo',
	group: 'Monorepo',
	scope: 'root',
	applicable: (profile) =>
		profile.monorepoTool === 'turbo' || profile.existing.turbo,
	filepath: 'turbo.json',
	depName: 'turbo',
	installDev: true,
	incoming: async (cwd, profile: ProjectProfile) => {
		const pkg = await readPackageJson(cwd)
		const scripts = Object.keys(pkg?.scripts ?? {})
		return buildTurboJson(scripts, profile)
	},
})
