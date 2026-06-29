import { readJsonIfExists } from '@xtarterize/core'
import { mergeJson } from '@xtarterize/patchers'
import { createJsonMergeTask, deepEqual, normalizeExtends } from '@/factory'

const incomingRenovate = () => ({
	$schema: 'https://docs.renovatebot.com/renovate-schema.json',
	extends: ['config:base', 'group:all'],
	timezone: 'Asia/Jakarta',
	rangeStrategy: 'bump',
	ignoreDeps: ['node', 'pnpm'],
	updatePinnedDependencies: false,
	stabilityDays: 2,
	packageRules: [
		{
			groupName: 'all non-major dependencies',
			groupSlug: 'all-minor-patch',
			matchUpdateTypes: ['minor', 'patch'],
			matchPackagePatterns: ['*'],
			automerge: true,
			automergeType: 'branch',
		},
	],
	major: { enabled: false },
	schedule: ['before 1am on the first day of the month'],
})

export const renovateTask = createJsonMergeTask({
	id: 'deps/renovate',
	label: 'Renovate config',
	group: 'Dependencies',
	searchMeta: {
		tags: ['dependencies', 'updates', 'maintenance', 'automation'],
		configTargets: ['renovate.json'],
		keywords: [
			'renovate',
			'dependencies',
			'dependency updates',
			'dependabot',
			'auto',
		],
	},
	scope: 'root',
	applicable: (profile) => profile.hasGitHub,
	filepath: 'renovate.json',
	extensions: ['.json', '.json5'],
	incoming: incomingRenovate,
	async checkFn({ fullPath, content }) {
		if (!fullPath || !content) return 'new'
		const actual = normalizeExtends((await readJsonIfExists(fullPath)) ?? {})
		const expected = normalizeExtends(incomingRenovate())
		const merged = mergeJson(actual, expected)
		if (deepEqual(actual, merged)) return 'skip'
		return 'patch'
	},
})
