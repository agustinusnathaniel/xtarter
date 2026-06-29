import { createVitePluginTask } from '@/factory'

export const viteCheckerTask = createVitePluginTask({
	id: 'vite/checker',
	label: 'vite-plugin-checker',
	group: 'Vite Plugins',
	scope: 'package',
	applicable: (profile) =>
		profile.bundler === 'vite' && profile.runtime !== 'node',
	depName: 'vite-plugin-checker',
	importName: 'checker',
	importStyle: 'default',
	pluginCall: 'checker({ typescript: true })',
	checkString: 'vite-plugin-checker',
})
