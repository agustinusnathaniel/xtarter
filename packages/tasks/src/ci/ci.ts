import { defineTask } from '@/factory/define-task.js';
import { renderCiWorkflow } from '@/templates/workflows/ci-yml.js';

export const ciWorkflowTask = defineTask({
  applicable: (profile) => profile.hasGitHub,
  group: 'CI/CD',
  id: 'ci/ci',
  label: 'GitHub CI workflow',
  scope: 'root',
  searchMeta: {
    keywords: [
      'ci',
      'continuous integration',
      'github actions',
      'pipeline',
      'test',
      'build',
    ],
    tags: ['ci', 'testing', 'github-actions', 'quality'],
  },
  targets: [
    {
      filepath: '.github/workflows/ci.yml',
      kind: 'text',
      render: (profile) => renderCiWorkflow(profile),
    },
  ],
});
