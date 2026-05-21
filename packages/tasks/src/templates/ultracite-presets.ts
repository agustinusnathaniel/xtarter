import type { ProjectProfile } from '@xtarterize/core'

const FRAMEWORK_PRESET_SUFFIX: Record<string, string> = {
	react: 'react',
	vue: 'vue',
	svelte: 'svelte',
	solid: 'solid',
}

export function getUltraciteFrameworkPresetSuffix(
	profile: ProjectProfile,
): string | null {
	return FRAMEWORK_PRESET_SUFFIX[profile.framework ?? ''] ?? null
}

export function getUltraciteRouterPresetSuffix(
	profile: ProjectProfile,
): string | null {
	if (profile.bundler === 'nextjs') {
		return 'next'
	}

	if (
		profile.router === 'tanstack-router' ||
		profile.router === 'react-router'
	) {
		return 'remix'
	}

	return null
}
