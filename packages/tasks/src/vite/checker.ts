import { createVitePluginTask } from '@/factory'

export const viteCheckerTask = createVitePluginTask({
	id: 'vite/checker',
	label: 'vite-plugin-checker',
	group: 'Vite Plugins',
	searchMeta: {
		tags: ['vite', 'plugin', 'type-checking', 'linting'],
		configTargets: ['vite.config.ts'],
		keywords: [
			'vite checker',
			'type checking',
			'vite plugin',
			'build validation',
		],
	},
	scope: 'package',
	applicable: (profile) =>
		profile.bundler === 'vite' && profile.runtime !== 'node',
	depName: 'vite-plugin-checker',
	importName: 'checker',
	importStyle: 'default',
	pluginCall: 'checker({ typescript: true })',
	checkString: 'vite-plugin-checker',
})
