import { createVitePluginTask } from '@/factory'

export const viteVisualizerTask = createVitePluginTask({
	id: 'vite/visualizer',
	label: 'rollup-plugin-visualizer',
	group: 'Vite Plugins',
	scope: 'package',
	applicable: (profile) =>
		profile.bundler === 'vite' && profile.runtime !== 'node',
	depName: 'rollup-plugin-visualizer',
	importName: 'visualizer',
	importStyle: 'named',
	pluginCall: 'visualizer({ open: false, gzipSize: true })',
	checkString: 'rollup-plugin-visualizer',
})
