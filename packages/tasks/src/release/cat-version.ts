import { createPackageJsonTask } from '@/factory'

const VERSIONRC_TEMPLATE = `{
  "packageFiles": ["package.json"],
  "bumpFiles": ["package.json"],
  "types": [
    { "type": "feat", "section": "Features" },
    { "type": "fix", "section": "Bug Fixes" },
    { "type": "chore", "hidden": true },
    { "type": "docs", "section": "Documentation" },
    { "type": "style", "hidden": true },
    { "type": "refactor", "section": "Refactors" },
    { "type": "perf", "section": "Performance" },
    { "type": "test", "hidden": true }
  ]
}`

export const catVersionTask = createPackageJsonTask({
	id: 'release/cat-version',
	label: 'commit-and-tag-version',
	group: 'Release',
	searchMeta: {
		tags: ['release', 'version', 'changelog', 'semver'],
		configTargets: ['.versionrc'],
		keywords: [
			'commit-and-tag-version',
			'version bump',
			'changelog',
			'release',
			'semver',
		],
	},
	scope: 'root',
	applicable: () => true,
	scripts: [{ script: 'release', value: 'commit-and-tag-version' }],
	depName: 'commit-and-tag-version',
	installDev: true,
	files: [
		{
			filepath: '.versionrc',
			render: () => VERSIONRC_TEMPLATE,
		},
	],
})
