import { createMultiFileTask } from '@/factory'
import {
	getPlopTemplateFiles,
	plopTemplates,
	renderPlopfile,
} from '@/templates/plopfile.js'

export const plopTask = createMultiFileTask({
	id: 'codegen/plop',
	label: 'Plop (code generator)',
	group: 'Codegen',
	applicable: (profile) => profile.framework !== null,
	depName: 'plop',
	installDev: true,
	files: (profile) => [
		{
			filepath: 'plopfile.ts',
			content: (p) => renderPlopfile(p),
		},
		...getPlopTemplateFiles(profile).map((filename) => ({
			filepath: `plop/${filename}`,
			content: (_p: typeof profile) => plopTemplates[filename],
		})),
	],
})
