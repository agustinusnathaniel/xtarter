import { defineSingleTargetTask } from '@/factory/define-task.js';
import { renderAutoUpdateWorkflow } from '@/templates/workflows/auto-update-yml.js';

export const autoUpdateWorkflowTask = defineSingleTargetTask({
  applicable: (profile) => profile.hasGitHub,
  group: 'CI/CD',
  id: 'ci/auto-update',
  label: 'GitHub auto-update workflow',
  scope: 'root',
  searchMeta: {
    keywords: [
      'auto update',
      'dependency update',
      'renovate',
      'dependabot',
      'schedule',
    ],
    tags: ['ci', 'dependencies', 'maintenance', 'github-actions'],
  },
  target: {
    filepath: '.github/workflows/auto-update.yml',
    kind: 'text',
    render: (profile) => renderAutoUpdateWorkflow(profile),
  },
});
