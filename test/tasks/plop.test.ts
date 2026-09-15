import { fixtureDir, fixtureProfile } from '@test/helpers/project.js';
import { run } from '@test/helpers/run.js';
import { describe, expect } from 'vite-plus/test';

import { plopTask } from '../../packages/tasks/src/codegen/plop.js';

const fixture = 'react-vite-tailwind' as const;
const cwd = fixtureDir(fixture);

describe('plopTask', () => {
  test('is applicable to all projects', async () => {
    expect(plopTask.applicable(await fixtureProfile(fixture))).toBe(true);
  });

  test('returns new on clean fixture', async () => {
    const status = await run(
      plopTask.check(cwd, await fixtureProfile(fixture))
    );
    expect(status).toBe('new');
  });

  test('renders generators with prompts and actions', async () => {
    const diffs = await run(
      plopTask.dryRun(cwd, await fixtureProfile(fixture))
    );

    expect(diffs[0].after).toContain("plop.setGenerator('component'");
    expect(diffs[0].after).toContain('prompts: [namePrompt]');
    expect(diffs[0].after).toContain('actions: [');
    expect(diffs[0].after).not.toContain('prompts: []');
    expect(diffs[0].after).not.toContain('actions: []');
  });
});
