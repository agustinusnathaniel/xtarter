import { withProject } from '@test/helpers/project.js';
import { run } from '@test/helpers/run.js';
import { describe, expect } from 'vite-plus/test';

describe('pnpm workspace root', () => {
  test('detects workspace root and handles task apply correctly', async () => {
    await withProject(
      {
        'package.json': JSON.stringify(
          {
            devDependencies: {
              czg: '^1.0.0',
            },
            name: 'test-workspace',
            scripts: {},
          },
          null,
          2
        ),
        'pnpm-workspace.yaml': 'packages:\n  - "packages/*"\n',
      },
      async ({ cwd, profile, readJson }) => {
        expect(profile.workspaceRoot).toBe(true);
        expect(profile.packageManager).toBe('pnpm');

        const { czgTask } = await import(
          '../../packages/tasks/src/release/czg.js'
        );
        const status = await run(czgTask.check(cwd, profile));
        expect(status).toBe('patch');

        const diffs = await run(czgTask.dryRun(cwd, profile));
        const pkgDiff = diffs.find((d) => d.filepath === 'package.json');
        expect(pkgDiff?.after).toContain('"commit": "czg"');

        await run(czgTask.apply(cwd, profile));

        const pkg = await readJson<{ scripts?: { commit?: string } }>(
          'package.json'
        );
        expect(pkg.scripts?.commit).toBe('czg');
      }
    );
  });

  test('sets workspaceRoot to false without pnpm-workspace.yaml', async () => {
    await withProject(
      {
        'package.json': JSON.stringify({ name: 'test-nonworkspace' }, null, 2),
      },
      async ({ profile }) => {
        expect(profile.workspaceRoot).toBe(false);
      }
    );
  });
});
