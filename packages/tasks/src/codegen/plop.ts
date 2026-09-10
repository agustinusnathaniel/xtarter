import type { TaskTarget } from '@/factory/define-task.js';
import { defineTask } from '@/factory/define-task.js';
import {
  getPlopTemplateFiles,
  plopTemplates,
  renderPlopfile,
} from '@/templates/plopfile.js';

export const plopTask = defineTask({
  applicable: (profile) => profile.framework !== null,
  deps: [{ depName: 'plop', dev: true }],
  group: 'Codegen',
  id: 'codegen/plop',
  label: 'Plop (code generator)',
  searchMeta: {
    configTargets: ['plopfile.ts'],
    keywords: ['plop', 'code generator', 'scaffold', 'templates', 'codegen'],
    tags: ['codegen', 'scaffold', 'generator', 'templates'],
  },
  targets: (_cwd, profile): Array<TaskTarget> => [
    {
      filepath: 'plopfile.ts',
      kind: 'text',
      render: () => renderPlopfile(profile),
    },
    ...getPlopTemplateFiles(profile).map((filename) => ({
      filepath: `plop/${filename}`,
      kind: 'text' as const,
      render: () => plopTemplates[filename],
    })),
  ],
});
