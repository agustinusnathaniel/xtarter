import { defineSingleTargetTask } from '@/factory/define-task.js';
import { renderCiWorkflow } from '@/templates/workflows/ci-yml.js';

export const ciWorkflowTask = defineSingleTargetTask({
  applicable: (profile) => profile.hasGitHub,
  group: 'CI/CD',
  id: 'ci/ci',
  keywords: [
    'ci',
    'continuous integration',
    'github actions',
    'pipeline',
    'test',
    'build',
  ],
  label: 'GitHub CI workflow',
  scope: 'root',
  tags: ['ci', 'testing', 'github-actions', 'quality'],
  target: {
    filepath: '.github/workflows/ci.yml',
    kind: 'text',
    render: (profile) => renderCiWorkflow(profile),
  },
});
