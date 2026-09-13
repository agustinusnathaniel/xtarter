import { describe, expect } from 'vite-plus/test';

import { autoUpdateWorkflowTask } from '../../packages/tasks/src/ci/auto-update.js';
import { ciWorkflowTask } from '../../packages/tasks/src/ci/ci.js';
import { releaseWorkflowTask } from '../../packages/tasks/src/ci/release.js';
import { renovateTask } from '../../packages/tasks/src/deps/renovate.js';
import { fixtureDir, fixtureProfile } from '../helpers/project.js';
import { run } from '../helpers/run.js';

describe('ciWorkflowTask', () => {
  test('renders package-manager-aware quality steps', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const [diff] = await run(
      ciWorkflowTask.dryRun(fixtureDir('react-vite-tailwind'), profile)
    );

    expect(diff.after).toContain('cache: true');
    expect(diff.after).toContain('pnpm run lint');
    expect(diff.after).toContain('pnpm run check');
    expect(diff.after).toContain('pnpm run typecheck');
    expect(diff.after).toContain('pnpm run test');
  });
});

describe('autoUpdateWorkflowTask', () => {
  test('updates dependencies and validates the result', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const [diff] = await run(
      autoUpdateWorkflowTask.dryRun(fixtureDir('react-vite-tailwind'), profile)
    );

    expect(diff.after).toContain('pnpm update');
    expect(diff.after).toContain('pnpm dedupe');
    expect(diff.after).toContain('pnpm run lint');
    expect(diff.after).toContain('pnpm run typecheck');
    expect(diff.after).toContain('pnpm run test');
  });
});

describe('releaseWorkflowTask', () => {
  test('runs quality checks before release', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const [diff] = await run(
      releaseWorkflowTask.dryRun(fixtureDir('react-vite-tailwind'), profile)
    );

    expect(diff.after).toContain('pnpm run lint');
    expect(diff.after).toContain('pnpm run typecheck');
    expect(diff.after).toContain('pnpm run test');
    expect(diff.after).toContain('pnpm run release');
  });
});

describe('renovateTask', () => {
  test('renders the reference-derived renovate defaults', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const [diff] = await run(
      renovateTask.dryRun(fixtureDir('react-vite-tailwind'), profile)
    );
    const config = JSON.parse(diff.after);

    expect(config.extends).toContain('config:base');
    expect(config.extends).toContain('group:all');
    expect(config.timezone).toBe('Asia/Jakarta');
    expect(config.rangeStrategy).toBe('bump');
    expect(config.ignoreDeps).toEqual(['node', 'pnpm']);
    expect(config.updatePinnedDependencies).toBe(false);
    expect(config.stabilityDays).toBe(2);
    expect(config.major.enabled).toBe(false);
    expect(config.packageRules[0].automerge).toBe(true);
    expect(config.packageRules[0].groupName).toBe('all non-major dependencies');
  });
});
