import { createFileTask } from '@/factory';
import { renderCiWorkflow } from '@/templates/workflows/ci-yml.js';

export const ciWorkflowTask = createFileTask({
  applicable: (profile) => profile.hasGitHub,
  filepath: '.github/workflows/ci.yml',
  group: 'CI/CD',
  id: 'ci/ci',
  label: 'GitHub CI workflow',
  render: (profile) => renderCiWorkflow(profile),
  scope: 'root',
  searchMeta: {
    configTargets: ['.github/workflows/ci.yml'],
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
});
