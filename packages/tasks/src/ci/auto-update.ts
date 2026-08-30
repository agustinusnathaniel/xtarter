import { createFileTask } from '@/factory';
import { renderAutoUpdateWorkflow } from '@/templates/workflows/auto-update-yml.js';

export const autoUpdateWorkflowTask = createFileTask({
  applicable: (profile) => profile.hasGitHub,
  filepath: '.github/workflows/auto-update.yml',
  group: 'CI/CD',
  id: 'ci/auto-update',
  label: 'GitHub auto-update workflow',
  render: (profile) => renderAutoUpdateWorkflow(profile),
  scope: 'root',
  searchMeta: {
    configTargets: ['.github/workflows/auto-update.yml'],
    keywords: [
      'auto update',
      'dependency update',
      'renovate',
      'dependabot',
      'schedule',
    ],
    tags: ['ci', 'dependencies', 'maintenance', 'github-actions'],
  },
});
