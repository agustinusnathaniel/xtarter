import { createVitePluginTask } from '@/factory'

export const viteVisualizerTask = createVitePluginTask({
	id: 'vite/visualizer',
	label: 'rollup-plugin-visualizer',
	group: 'Vite Plugins',
	searchMeta: {
		tags: ['vite', 'plugin', 'bundle', 'analysis'],
		configTargets: ['vite.config.ts'],
		keywords: [
			'visualizer',
			'bundle analysis',
			'vite plugin',
			'rollup',
			'size',
		],
	},
	scope: 'package',
	applicable: (profile) =>
		profile.bundler === 'vite' && profile.runtime !== 'node',
	depName: 'rollup-plugin-visualizer',
	importName: 'visualizer',
	importStyle: 'named',
	pluginCall: 'visualizer({ open: false, gzipSize: true })',
	checkString: 'rollup-plugin-visualizer',
})
