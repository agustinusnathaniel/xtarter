import { defineTask, type TargetPolicy } from '@/factory/define-task.js';
import { renderReleaseWorkflow } from '@/templates/workflows/release-yml.js';

function hasReleaseJob(content: string): boolean {
  return /jobs:\s*\n\s+release:/s.test(content);
}

function usesChangesetsAction(content: string): boolean {
  return /changesets\/action@v\d+/.test(content);
}

/**
 * The rendered template identifies whether the project uses changesets, which
 * decides how an existing release job is classified.
 */
const releaseWorkflowPolicy: TargetPolicy = ({ before, after }) => {
  if (before === null || before.trim() === after.trim()) {
    return;
  }

  const changesetProject = usesChangesetsAction(after);
  if (usesChangesetsAction(before)) {
    return 'patch';
  }
  if (hasReleaseJob(before)) {
    return changesetProject ? 'conflict' : 'patch';
  }
  return changesetProject ? 'new' : 'conflict';
};

export const releaseWorkflowTask = defineTask({
  applicable: (profile) => profile.hasGitHub,
  group: 'CI/CD',
  id: 'ci/release',
  keywords: [
    'release',
    'publish',
    'npm publish',
    'github release',
    'cd',
    'deploy',
  ],
  label: 'GitHub release workflow',
  scope: 'root',
  tags: ['ci', 'cd', 'release', 'github-actions'],
  targets: [
    {
      filepath: '.github/workflows/release.yml',
      kind: 'text',
      policy: releaseWorkflowPolicy,
      render: (profile, existing) => renderReleaseWorkflow(profile, existing),
    },
  ],
});
