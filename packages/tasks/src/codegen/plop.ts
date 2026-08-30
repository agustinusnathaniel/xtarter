import { createMultiFileTask } from '@/factory';
import {
  getPlopTemplateFiles,
  plopTemplates,
  renderPlopfile,
} from '@/templates/plopfile.js';

export const plopTask = createMultiFileTask({
  applicable: (profile) => profile.framework !== null,
  depName: 'plop',
  files: (profile) => [
    {
      content: (p) => renderPlopfile(p),
      filepath: 'plopfile.ts',
    },
    ...getPlopTemplateFiles(profile).map((filename) => ({
      content: (_p: typeof profile) => plopTemplates[filename],
      filepath: `plop/${filename}`,
    })),
  ],
  group: 'Codegen',
  id: 'codegen/plop',
  installDev: true,
  label: 'Plop (code generator)',
  searchMeta: {
    configTargets: ['plopfile.ts'],
    keywords: ['plop', 'code generator', 'scaffold', 'templates', 'codegen'],
    tags: ['codegen', 'scaffold', 'generator', 'templates'],
  },
});
